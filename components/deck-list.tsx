"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Flashcard } from "@/lib/db";
import { clearDeck, deleteCard } from "@/lib/data/deck";
import { formatDayKey, todayKey } from "@/lib/dates";

/** "3 days", or "New" for a card that is due today and has not grown an interval yet. */
function intervalLabel(days: number): string {
  if (days <= 0) return "New";
  return days === 1 ? "1 day" : `${days} days`;
}

function dueLabel(dueDay: string, today: string): string {
  if (dueDay === today) return "Today";
  if (dueDay < today) return `Overdue · ${formatDayKey(dueDay)}`;
  return formatDayKey(dueDay);
}

/**
 * Every card in the deck, with its schedule, one Delete per row, and a clearly destructive
 * delete-all behind a confirmation. On a phone the table becomes stacked rows so nothing has to
 * scroll sideways.
 */
export function DeckList({ cards, onAddCard }: { cards: Flashcard[]; onAddCard: () => void }) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const today = todayKey();

  const sorted = useMemo(
    () => [...cards].sort((a, b) => a.dueDay.localeCompare(b.dueDay) || a.createdAt - b.createdAt),
    [cards],
  );

  const removeOne = async (card: Flashcard) => {
    try {
      await deleteCard(card.id);
      toast.success(`Deleted "${card.front}".`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "The card could not be deleted.");
    }
  };

  const removeAll = async () => {
    setBusy(true);
    try {
      await clearDeck();
      setConfirmingClear(false);
      toast.success("All cards deleted. The deck is empty.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "The deck could not be emptied.");
    } finally {
      setBusy(false);
    }
  };

  if (cards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deck</CardTitle>
          <CardDescription>Your deck is empty.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Add a card by hand, or load a JSON deck file or the sample deck from the home page — loaded cards join whatever is already here.</p>
          <Button onClick={onAddCard}>Add card</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Deck</CardTitle>
            <CardDescription>
              {cards.length} {cards.length === 1 ? "card" : "cards"}, soonest due first.
            </CardDescription>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setConfirmingClear(true)}>
            Delete all cards
          </Button>
        </CardHeader>
        <CardContent>
          {/* Desktop: a real table. The wrapper scrolls if it must, so the page itself never does. */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Front</TableHead>
                    <TableHead>Back</TableHead>
                    <TableHead className="w-24">Interval</TableHead>
                    <TableHead className="w-40">Due</TableHead>
                    <TableHead className="w-20 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="max-w-64 font-medium">{card.front}</TableCell>
                      <TableCell className="max-w-64 text-muted-foreground">{card.back || "—"}</TableCell>
                      <TableCell className="tabular-nums">{intervalLabel(card.intervalDays)}</TableCell>
                      <TableCell>
                        <span className={card.dueDay <= today ? "font-medium" : ""}>{dueLabel(card.dueDay, today)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => void removeOne(card)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Phone: stacked rows, no sideways scrolling. */}
          <ul className="space-y-3 md:hidden">
            {sorted.map((card) => (
              <li key={card.id} className="rounded-lg border p-3">
                <p className="font-medium">{card.front}</p>
                <p className="mt-1 text-sm text-muted-foreground">{card.back || "—"}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {intervalLabel(card.intervalDays)} · due {dueLabel(card.dueDay, today)}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => void removeOne(card)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={confirmingClear} onOpenChange={setConfirmingClear}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all cards?</DialogTitle>
            <DialogDescription>
              This removes all {cards.length} {cards.length === 1 ? "card" : "cards"} and their schedules from this browser. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmingClear(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void removeAll()}>
              Delete all cards
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}