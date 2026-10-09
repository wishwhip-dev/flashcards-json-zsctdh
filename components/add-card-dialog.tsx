"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addCard } from "@/lib/data/deck";

/**
 * The add-card form, in a dialog over the home page so saving needs no navigation. An empty front
 * is refused with a message instead of saving a blank card; a failing write says so too.
 */
export function AddCardDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!front.trim()) {
      setError("The front cannot be empty — write the question or prompt first.");
      return;
    }
    if (!back.trim()) {
      setError("The back cannot be empty — write the answer first.");
      return;
    }
    setBusy(true);
    try {
      await addCard(front, back);
      setFront("");
      setBack("");
      setError(null);
      onOpenChange(false);
      toast.success("Card added. It is due for review right away.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The card could not be saved.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a card</DialogTitle>
          <DialogDescription>A new card is due for review as soon as it is saved.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void save(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-front">Front</Label>
            <Input
              id="card-front"
              name="front"
              value={front}
              onChange={(event) => setFront(event.target.value)}
              placeholder="What is the capital of France?"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-back">Back</Label>
            <Textarea
              id="card-back"
              name="back"
              value={back}
              onChange={(event) => setBack(event.target.value)}
              placeholder="Paris"
              rows={3}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            Save card
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}