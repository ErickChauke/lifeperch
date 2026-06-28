"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Flame } from "lucide-react";
import { toast } from "sonner";
import { setHabitLog } from "@/actions/habits";
import { cn } from "@/lib/utils";
import type { getHabits } from "@/actions/habits";

type Habit = Awaited<ReturnType<typeof getHabits>>[number];

// Today's habits with a one-tap check-off. Boolean habits flip done; count
// habits step up by one until the target is met, then reset. Optimistic, with a
// refresh to resync the streak.
export function TodayHabits({
  habits,
  today,
}: {
  habits: Habit[];
  today: string;
}) {
  if (habits.length === 0) return null;

  return (
    <div className="mt-8 space-y-2">
      <h3 className="text-fg-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
        Habits
      </h3>
      <div className="space-y-1.5">
        {habits.map((habit) => (
          <HabitRow key={habit.id} habit={habit} today={today} />
        ))}
      </div>
    </div>
  );
}

function HabitRow({ habit, today }: { habit: Habit; today: string }) {
  const router = useRouter();
  const [value, setValue] = useState(habit.todayValue);
  const [pending, startTransition] = useTransition();
  const met = value >= habit.target;

  function step() {
    const next = met ? 0 : habit.kind === "count" ? value + 1 : habit.target;
    setValue(next);
    startTransition(async () => {
      try {
        await setHabitLog(habit.id, today, next);
        router.refresh();
      } catch {
        setValue(habit.todayValue);
        toast.error("Could not update habit");
      }
    });
  }

  return (
    <div className="bg-surface flex items-center gap-3 rounded-md border border-border px-3 py-2">
      <button
        type="button"
        onClick={step}
        disabled={pending}
        aria-label={met ? "Mark as not done" : "Mark as done"}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          met
            ? "bg-primary border-transparent text-[var(--accent-fg)]"
            : "border-border-2 text-transparent hover:border-accent-line",
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </button>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          met ? "text-fg-4" : "text-fg",
        )}
      >
        {habit.name}
      </span>
      {habit.kind === "count" ? (
        <span className="text-fg-3 shrink-0 font-mono text-[11px]">
          {value}/{habit.target}
          {habit.unit ? ` ${habit.unit}` : ""}
        </span>
      ) : null}
      {habit.streak > 0 ? (
        <span className="text-fg-3 inline-flex shrink-0 items-center gap-1 font-mono text-[11px]">
          <Flame className="size-3" />
          {habit.streak}
        </span>
      ) : null}
    </div>
  );
}
