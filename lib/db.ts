/**
 * This application's database.
 *
 * The reusable half of the setup is in `lib/storage/` and is not edited. This file is the half
 * that describes the product: which tables exist, what is indexed, how the schema has changed over
 * time, and what a first visit starts with.
 */
import { defineDatabase } from "@/lib/storage/database";

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  /**
   * The current review interval, in days. 0 means the card is new or has lapsed and is due today.
   * Capped at 365 (one year) by the scheduler.
   */
  intervalDays: number;
  /**
   * The local calendar day (YYYY-MM-DD) the card next comes due, compared as a string so
   * daylight-saving shifts and midnight crossings cannot skip or repeat a day.
   */
  dueDay: string;
  /** The local calendar day the card was last rated, or null for a card never reviewed. */
  lastReviewedDay: string | null;
  createdAt: number;
};

/** Ids are generated here so the data layer never depends on an auto-increment round trip. */
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const database = defineDatabase<{ cards: Flashcard }>({
  // Part of the origin's storage identity. Renaming it does not migrate anything — it points the
  // application at a different, empty database and abandons the old one in place.
  name: "flashcards",
  versions: [
    // Only the primary key and the properties queried on. `front` and `back` are stored but never
    // filtered or sorted by, so indexing them would cost writes and buy nothing. New cards start
    // due today; the deck opens empty on purpose — the visitor brings or loads their own cards.
    { version: 1, stores: { cards: "id, dueDay, createdAt" } },
  ],
});
