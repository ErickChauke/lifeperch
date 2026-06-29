"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { habitMet } from "@/lib/habits";
import { HabitCard } from "./habit-card";
import { HabitModal, type TodoOption } from "./habit-modal";
import type { getHabits } from "@/actions/habits";

export type Habit = Awaited<ReturnType<typeof getHabits>>[number];

export function HabitsBoard({
  habits,
  todos,
  today,
}: {
  habits: Habit[];
  todos: TodoOption[];
  today: string;
}) {
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return habits;
    return habits.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.description ?? "").toLowerCase().includes(q),
    );
  }, [habits, search]);

  const doneCount = habits.filter((h) =>
    habitMet(h.todayValue, h.kind, h.target),
  ).length;
  const pct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;
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
          {habits.length > 0 ? (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Add habit
            </Button>
          ) : null}
        </div>
        {habits.length > 0 ? (
          <>
            <div className="bg-surface-2 mt-4 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: "var(--success)" }}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search habits…"
              />
            </div>
          </>
        ) : null}
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
        ) : filtered.length === 0 ? (
          <div className="text-fg-3 flex flex-col items-start gap-3 py-10 text-sm">
            <p>No habits match.</p>
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
              Clear
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {filtered.map((habit) => (
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
          todos={todos}
        />
      </PageBody>
    </PageShell>
  );
}
