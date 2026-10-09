"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDrop } from "@/components/file-drop";
import { AddCardDialog } from "@/components/add-card-dialog";
import { DeckList } from "@/components/deck-list";
import { ReviewSession } from "@/components/review-session";
import { StatsPanel } from "@/components/stats-panel";
import { database, type Flashcard } from "@/lib/db";
import { addParsedCards, listCards, parseDeckJson } from "@/lib/data/deck";
import { SAMPLE_DECK } from "@/lib/data/sample-deck";
import { formatDayKey, todayKey } from "@/lib/dates";
import { readAsJson } from "@/lib/files";
import { useStorageStatus, useStoredQuery } from "@/lib/storage/react";

type Tab = "review" | "deck" | "stats";

type LoadSummary = { fileName: string; added: number; skipped: number };

function loadMessage(summary: LoadSummary): string {
  const { fileName, added, skipped } = summary;
  if (added === 0 && skipped === 0) return `${fileName} contained no cards — 0 came in.`;
  if (added === 0) return `0 cards came in from ${fileName} — all ${skipped} were already in the deck.`;
  const skippedPart = skipped === 0 ? "" : `, ${skipped} skipped as already in the deck`;
  return `Loaded ${added} ${added === 1 ? "card" : "cards"} from ${fileName}${skippedPart}.`;
}

/** The whole app, one page: review, deck, stats, and everything that grows the deck. */
export function FlashcardsApp() {
  const { data: cards, isLoading } = useStoredQuery(database, listCards);
  const storageStatus = useStorageStatus(database);

  const [tab, setTab] = useState<Tab>("review");
  const [addOpen, setAddOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState(0);
  const [sessionQueue, setSessionQueue] = useState<Flashcard[]>([]);
  const [loadSummary, setLoadSummary] = useState<LoadSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingDeck, setLoadingDeck] = useState(false);

  const dueCards = useMemo(() => {
    if (!cards) return [];
    const today = todayKey();
    return cards.filter((card) => card.dueDay <= today);
  }, [cards]);

  const nextDueDay = useMemo(() => {
    if (!cards) return null;
    const today = todayKey();
    const future = cards
      .filter((card) => card.dueDay > today)
      .map((card) => card.dueDay)
      .sort();
    return future[0] ?? null;
  }, [cards]);

  /** Starts (or restarts) a review session over a snapshot of what is due right now. */
  const startSession = () => {
    setSessionQueue(dueCards);
    setSessionToken((token) => token + 1);
    setTab("review");
  };

  const loadCards = async (parsed: { front: string; back: string }[], fileName: string) => {
    setLoadingDeck(true);
    try {
      const result = await addParsedCards(parsed);
      const summary = { fileName, ...result };
      setLoadSummary(summary);
      setLoadError(null);
      const message = loadMessage(summary);
      if (result.added === 0) toast(message);
      else toast.success(message);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The cards could not be added.";
      setLoadSummary(null);
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoadingDeck(false);
    }
  };

  const handleDeckFile = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      const value = await readAsJson<unknown>(file);
      await loadCards(parseDeckJson(value), file.name);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : `${file.name} could not be read.`;
      setLoadSummary(null);
      setLoadError(message);
      toast.error(message);
    }
  };

  const loadSampleDeck = () => void loadCards(SAMPLE_DECK.cards, "the built-in sample deck");

  return (
    <div className="space-y-6">
      {storageStatus === "memory" && (
        <Alert>
          <AlertTitle>This browser will not keep your deck</AlertTitle>
          <AlertDescription>
            Storage was refused here, so your cards live in memory only and are gone when the tab closes.
          </AlertDescription>
        </Alert>
      )}

      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Spaced repetition</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Flashcards</h1>
        <div aria-live="polite" className="text-muted-foreground">
          {isLoading ? (
            <Skeleton className="inline-block h-5 w-56 align-middle" />
          ) : cards ? (
            <>
              <span className="font-medium text-foreground">{cards.length}</span>{" "}
              {cards.length === 1 ? "card" : "cards"} in the deck,{" "}
              <span className="font-medium text-foreground">{dueCards.length}</span> due for review right now.
            </>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" onClick={startSession}>
            Review cards
          </Button>
          <Button size="lg" variant="outline" onClick={() => setAddOpen(true)}>
            Add card
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Grow your deck</CardTitle>
          <CardDescription>
            Load cards from a JSON file with a &quot;cards&quot; array of front/back pairs, or start with the built-in sample. Loaded cards join the deck — nothing already here is removed, and fronts the deck already has are skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <FileDrop
              accept="application/json,.json"
              label="Load JSON deck"
              onFiles={(files) => void handleDeckFile(files)}
              disabled={loadingDeck}
              className="flex-1"
            >
              or drop a deck file here
            </FileDrop>
            <Button variant="outline" size="lg" disabled={loadingDeck} onClick={loadSampleDeck} className="sm:mt-1">
              Load sample deck
            </Button>
          </div>
          {loadingDeck && <p className="text-sm text-muted-foreground">Loading cards…</p>}
          {loadSummary && (
            <p role="status" className="text-sm font-medium">
              {loadMessage(loadSummary)}
            </p>
          )}
          {loadError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {loadError}
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="deck">Deck</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : !cards ? null : cards.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Nothing to review yet</CardTitle>
                <CardDescription>Your deck is empty.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>Add a card by hand, or load a JSON deck file or the built-in sample deck using the buttons above.</p>
                <Button onClick={() => setAddOpen(true)}>Add card</Button>
              </CardContent>
            </Card>
          ) : sessionToken > 0 && sessionQueue.length > 0 ? (
            <ReviewSession key={sessionToken} queue={sessionQueue} onRestart={startSession} />
          ) : dueCards.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Nothing to review right now</CardTitle>
                <CardDescription>No cards are due today.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {nextDueDay ? (
                  <p>
                    The next card comes due on <span className="font-medium text-foreground">{formatDayKey(nextDueDay)}</span>.
                  </p>
                ) : (
                  <p>Every card in the deck is waiting on a schedule.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {dueCards.length} {dueCards.length === 1 ? "card is" : "cards are"} due for review
                </CardTitle>
                <CardDescription>Flip each card, then rate how well you knew it.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="lg" onClick={startSession}>
                  Review cards
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deck" className="mt-4">
          {isLoading ? <Skeleton className="h-56 w-full" /> : cards ? <DeckList cards={cards} onAddCard={() => setAddOpen(true)} /> : null}
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          {isLoading ? <Skeleton className="h-56 w-full" /> : cards ? <StatsPanel cards={cards} /> : null}
        </TabsContent>
      </Tabs>

      <AddCardDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}