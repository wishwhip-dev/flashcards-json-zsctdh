/**
 * The deck's data access: every read and write of cards goes through here, never Dexie directly.
 *
 * Scheduling (the `nextSchedule` rules below) lives here too, so the components only decide *that*
 * a card was rated and let the data layer decide *what that means* for its interval and due date.
 */
import { database, newId, type Flashcard } from "@/lib/db";
import { addDaysToKey, todayKey } from "@/lib/dates";

const cards = async () => (await database.ready()).cards;

/** The scheduler caps an interval at one year, however many Easy ratings follow. */
export const MAX_INTERVAL_DAYS = 365;

/** A card with an interval this long counts as learned in the stats. */
export const LEARNED_INTERVAL_DAYS = 7;

export type Rating = "again" | "good" | "easy";

export async function listCards(): Promise<Flashcard[]> {
  return (await cards()).orderBy("createdAt").toArray();
}

export async function addCard(front: string, back: string): Promise<Flashcard> {
  const card: Flashcard = {
    id: newId(),
    front: front.trim(),
    back: back.trim(),
    intervalDays: 0,
    dueDay: todayKey(),
    lastReviewedDay: null,
    createdAt: Date.now(),
  };
  await (await cards()).put(card);
  return card;
}

export async function deleteCard(id: string): Promise<void> {
  await (await cards()).delete(id);
}

export async function clearDeck(): Promise<void> {
  await (await cards()).clear();
}

/**
 * What a rating means. A new card (interval 0):
 *
 * - **Again** is due again today and comes back within the session; its interval resets to 0.
 * - **Good** is due tomorrow (interval 1); each further Good doubles the current interval.
 * - **Easy** jumps four days out (interval 4); each further Easy multiplies from there.
 *
 * Both grow capped at one year. "Good, Good, then Easy" lands at 5 days — four or longer.
 */
export function nextSchedule(card: Pick<Flashcard, "intervalDays">, rating: Rating): { intervalDays: number; dueDay: string } {
  const today = todayKey();
  if (rating === "again") return { intervalDays: 0, dueDay: today };

  const current = Math.max(0, Math.floor(card.intervalDays));
  const grown = rating === "easy"
    ? current === 0 ? 4 : Math.round(current * 2.5)
    : current === 0 ? 1 : Math.round(current * 2);
  const floor = rating === "easy" ? 4 : 1;
  const intervalDays = Math.min(MAX_INTERVAL_DAYS, Math.max(floor, grown));
  return { intervalDays, dueDay: addDaysToKey(today, intervalDays) };
}

export async function rateCard(id: string, rating: Rating): Promise<void> {
  const table = await cards();
  const card = await table.get(id);
  if (!card) throw new Error("That card is no longer in the deck.");
  const schedule = nextSchedule(card, rating);
  const updated = await table.update(id, {
    intervalDays: schedule.intervalDays,
    dueDay: schedule.dueDay,
    lastReviewedDay: todayKey(),
  });
  if (updated === 0) throw new Error("That card could not be updated.");
}

/** One card as the documented deck file describes it. */
export type ParsedDeckCard = { front: string; back: string };

/**
 * Validate the parsed shape of a deck file: `{"cards":[{"front":"...","back":"..."}]}`. The back is
 * optional; a card with no front, or a file with no cards array, is rejected with a message that
 * names the problem and the offending card, ready to show on the page.
 */
export function parseDeckJson(value: unknown): ParsedDeckCard[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error('The file is not a deck: expected a JSON object with a "cards" array.');
  }
  const { cards: list } = value as { cards?: unknown };
  if (list === undefined) throw new Error('The file has no "cards" array — deck files look like {"cards":[{"front":"...","back":"..."}]}.');
  if (!Array.isArray(list)) throw new Error('The file\'s "cards" value is not an array.');

  return list.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Card ${index + 1} is not an object.`);
    }
    const { front, back } = entry as { front?: unknown; back?: unknown };
    if (typeof front !== "string" || front.trim() === "") {
      throw new Error(`Card ${index + 1} has no front text.`);
    }
    return {
      front: front.trim(),
      back: typeof back === "string" ? back.trim() : "",
    };
  });
}

export type LoadResult = { added: number; skipped: number };

/**
 * Add parsed cards to the deck without removing what is already there. A card whose front matches
 * an existing card's (or one already seen in this batch) is skipped, so loading the same file twice
 * adds nothing the second time. Returns both counts so the page can report them separately.
 */
export async function addParsedCards(parsed: ParsedDeckCard[]): Promise<LoadResult> {
  const table = await cards();
  const seen = new Set((await table.toArray()).map((card) => card.front.trim().toLowerCase()));
  const fresh: Flashcard[] = [];
  let skipped = 0;
  for (const { front, back } of parsed) {
    const key = front.toLowerCase();
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    fresh.push({
      id: newId(),
      front,
      back,
      intervalDays: 0,
      dueDay: todayKey(),
      lastReviewedDay: null,
      createdAt: Date.now(),
    });
  }
  if (fresh.length) await table.bulkAdd(fresh);
  return { added: fresh.length, skipped };
}
