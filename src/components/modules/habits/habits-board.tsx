"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { habitMet } from "@/lib/habits";
import { HabitCard } from "./habit-card";
import { HabitModal } from "./habit-modal";
import type { getHabits } from "@/actions/habits";

export type Habit = Awaited<ReturnType<typeof getHabits>>[number];

export function HabitsBoard({
  habits,
  today,
}: {
  habits: Habit[];
  today: string;
}) {
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);

  const doneCount = habits.filter((h) =>
    habitMet(h.todayValue, h.kind, h.target),
  ).length;
  const dateLabel = format(new Date(`${today}T00:00:00`), "dd MMM yyyy");

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  return (
    <PageShell>
      <PageHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
            <p className="text-fg-3 mt-1 font-mono text-xs tabular-nums">
              {dateLabel} · {doneCount} / {habits.length} done
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus /> Add habit
          </Button>
        </div>
      </PageHeader>

      <PageBody className="space-y-6">
        {habits.length === 0 ? (
          <MoneyEmpty
            eyebrow="Daily · Habits"
            message="No habits yet. Pick one small thing to keep - a glass of water, ten minutes of reading - and check it off here each day."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus /> Add habit
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                today={today}
                onEdit={() => setEditing(habit)}
              />
            ))}
          </div>
        )}

        <HabitModal
          open={creating || editing !== null}
          onOpenChange={(o) => !o && closeModal()}
          habit={editing}
        />
      </PageBody>
    </PageShell>
  );
}
