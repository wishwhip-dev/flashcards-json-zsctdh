"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Flashcard } from "@/lib/db";
import { rateCard, type Rating } from "@/lib/data/deck";

/**
 * One review session, over a snapshot of the due cards taken when it started.
 *
 * The card shows its front; clicking it — or Space or Enter — flips it to the back, and it stays
 * flipped until a rating is chosen. Again brings the card back later in the same session; Good and
 * Easy push it into the future. Keys 1, 2 and 3 rate the card, but do nothing while the front is
 * showing: the only thing a key does there is flip it.
 */
export function ReviewSession({ queue: initialQueue, onRestart }: { queue: Flashcard[]; onRestart: () => void }) {
  const [queue, setQueue] = useState<Flashcard[]>(() => initialQueue);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<{ again: number; good: number; easy: number }>({ again: 0, good: 0, easy: 0 });

  const done = index >= queue.length;
  const current = done ? undefined : queue[index];

  const rate = async (rating: Rating) => {
    if (!current || !flipped || busy) return;
    const card = current;
    setBusy(true);
    try {
      // The schedule is written first: if the write fails the session does not pretend it happened.
      await rateCard(card.id, rating);
      setCounts((c) => ({ ...c, [rating]: c[rating] + 1 }));
      setFlipped(false);
      setIndex((i) => i + 1);
      if (rating === "again") setQueue((q) => [...q, card]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the rating.");
    } finally {
      setBusy(false);
    }
  };

  useSessionKeys({ flipped, busy, done, onFlip: () => setFlipped(true), onRate: rate });

  if (done) {
    const reviewed = counts.again + counts.good + counts.easy;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session complete</CardTitle>
          <CardDescription>
            {reviewed === 0 ? "Nothing was rated in this session." : `You reviewed ${reviewed} ${reviewed === 1 ? "card" : "cards"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            {(["again", "good", "easy"] as const).map((rating) => (
              <div key={rating} className="rounded-lg border bg-muted/40 px-2 py-3">
                <p className="text-2xl font-semibold tabular-nums">{counts[rating]}</p>
                <p className="text-sm capitalize text-muted-foreground">{rating}</p>
              </div>
            ))}
          </div>
          <Button onClick={onRestart} className="w-full sm:w-auto">
            Review again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Card {index + 1} of {queue.length}
        </span>
        <span>{queue.length - index - 1} after this one</span>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={flipped ? "The back of the card, showing the answer" : "The front of the card. Click, or press Space, to flip it"}
        onClick={() => {
          if (!flipped) setFlipped(true);
        }}
        className="flex min-h-48 w-full cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-xl border bg-card px-4 py-8 text-center shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-8"
      >
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{flipped ? "Back" : "Front"}</span>
        <p className="text-xl font-medium text-balance sm:text-2xl">{flipped ? current.back || "No back was recorded for this card." : current.front}</p>
        <span className="text-xs text-muted-foreground">{flipped ? "Rate the card below" : "Click, or press Space, to flip"}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(
          [
            { rating: "again" as const, label: "Again", key: "1", variant: "destructive" as const },
            { rating: "good" as const, label: "Good", key: "2", variant: "default" as const },
            { rating: "easy" as const, label: "Easy", key: "3", variant: "secondary" as const },
          ]
        ).map(({ rating, label, key, variant }) => (
          <Button
            key={rating}
            variant={variant}
            size="lg"
            disabled={!flipped || busy}
            onClick={() => void rate(rating)}
            className="h-14 flex-col gap-1 px-2"
          >
            <span className="text-sm sm:text-base">{label}</span>
            <span className="text-xs opacity-70">key {key}</span>
          </Button>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Space or Enter flips the card. 1 rates Again, 2 rates Good, 3 rates Easy.
      </p>
    </div>
  );
}

/**
 * The session's keyboard handling, mounted only while a session is running. Space and Enter flip,
 * and 1, 2, 3 rate — but only once the back is showing. Re-subscribed on every render so the
 * handler always sees the latest flipped/busy/done state.
 */
function useSessionKeys({
  flipped,
  busy,
  done,
  onFlip,
  onRate,
}: {
  flipped: boolean;
  busy: boolean;
  done: boolean;
  onFlip: () => void;
  onRate: (rating: Rating) => Promise<void>;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Keys mean "flip or rate" only when nothing else has focus: on a button, an input or a tab,
      // Space and Enter already belong to that control.
      if (target && (target.closest("button, a, input, textarea, select, [contenteditable='true']") || target.isContentEditable)) return;
      if (done) return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (!flipped) onFlip();
        return;
      }
      if (!flipped || busy) return;
      if (event.key === "1") {
        event.preventDefault();
        void onRate("again");
      } else if (event.key === "2") {
        event.preventDefault();
        void onRate("good");
      } else if (event.key === "3") {
        event.preventDefault();
        void onRate("easy");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
}