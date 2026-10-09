"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { Flashcard } from "@/lib/db";
import { LEARNED_INTERVAL_DAYS } from "@/lib/data/deck";
import { addDaysToKey, formatDayKey, todayKey } from "@/lib/dates";

const chartConfig = {
  due: { label: "Cards due", color: "var(--chart-1)" },
} satisfies ChartConfig;

/**
 * The deck at a glance: how many cards come due on each of the next 7 days, drawn with the
 * project's Recharts wrapper, beside the totals — everything in the deck, what is due today, and
 * what has been learned (an interval of 7 days or more).
 */
export function StatsPanel({ cards }: { cards: Flashcard[] }) {
  const today = todayKey();

  const data = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const card of cards) byDay.set(card.dueDay, (byDay.get(card.dueDay) ?? 0) + 1);
    return Array.from({ length: 7 }, (_, offset) => {
      const day = addDaysToKey(today, offset);
      return { day, label: formatDayKey(day), due: byDay.get(day) ?? 0 };
    });
  }, [cards, today]);

  const dueToday = cards.filter((card) => card.dueDay <= today).length;
  const learned = cards.filter((card) => card.intervalDays >= LEARNED_INTERVAL_DAYS).length;

  const readouts = [
    { label: "Total cards", value: cards.length },
    { label: "Due today", value: dueToday },
    { label: "Learned (7 days or more)", value: learned },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {readouts.map(({ label, value }) => (
          <Card key={label} className="py-4">
            <CardContent className="px-3 sm:px-6">
              <p className="text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground sm:text-sm">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming due</CardTitle>
          <CardDescription>Cards due on each of the next 7 days, starting today.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={12} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="due" fill="var(--color-due)" radius={4} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}