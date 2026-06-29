"use client";

import { useEffect, useState, useTransition } from "react";
import { Flame, Check, Minus, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { frequencyLabel } from "@/lib/habits";
import { HabitIcon } from "./habit-icon";
import { setHabitLog } from "@/actions/habits";
import type { Habit } from "./habits-board";

// A soft status tint at ~14% over transparent, matching the design's status fills.
const SUCCESS_TINT = "color-mix(in oklch, var(--success) 14%, transparent)";

export function HabitCard({
  habit,
  today,
  onEdit,
}: {
  habit: Habit;
  today: string;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const count = habit.kind === "count";
  // Optimistic today value: update on tap, reconcile when the server refreshes.
  const [done, setDone] = useState(habit.todayValue);
  useEffect(() => setDone(habit.todayValue), [habit.todayValue]);
  const complete = count ? done >= Math.max(1, habit.target) : done >= 1;

  function set(value: number) {
    const next = Math.max(0, value);
    setDone(next);
    startTransition(async () => {
      try {
        await setHabitLog(habit.id, today, next);
      } catch {
        setDone(habit.todayValue);
        toast.error("Could not update habit");
      }
    });
  }

  return (
    <div className="group bg-surface hover:bg-surface-2 hover:border-border-2 flex flex-col gap-4 rounded-[var(--r)] border p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-px">
      <div onClick={onEdit} className="flex cursor-pointer flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <span className="bg-surface-2 text-fg-2 flex size-10 items-center justify-center rounded-[var(--r-sm)]">
            <HabitIcon name={habit.icon} className="size-[18px]" />
          </span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1 font-mono text-sm",
                habit.streak > 0 ? "text-fg-2" : "text-fg-4",
              )}
            >
              <Flame
                className={cn("size-[15px]", habit.streak > 0 ? "text-fg-3" : "text-fg-4")}
                strokeWidth={1.75}
              />
              {habit.streak}
            </span>
            <Pencil className="text-fg-4 group-hover:text-fg-2 size-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-fg line-clamp-2 text-lg font-semibold tracking-tight">
            {habit.name}
            {habit.description ? (
              <span className="text-fg-3 text-sm font-normal">
                {" "}
                · {habit.description}
              </span>
            ) : null}
          </p>
          <p className="text-fg-3 font-mono text-xs">
            {[
              habit.weeklyTarget != null
                ? `${habit.weekDone} / ${habit.weeklyTarget} this week`
                : frequencyLabel(habit),
              habit.startTime,
              count
                ? `Target ${habit.target}${habit.unit ? ` ${habit.unit}` : ""}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {/* Last seven days, oldest to today, as a consistency strip. */}
      <div className="flex items-center justify-between gap-1">
        {habit.last7.map((d) => (
          <span
            key={d.day}
            title={d.day}
            className={cn(
              "h-2 flex-1 rounded-full",
              d.met ? "" : d.expected ? "bg-surface-3" : "bg-surface-2 opacity-50",
              d.day === today && !d.met ? "ring-border-2 ring-1" : "",
            )}
            style={d.met ? { background: "var(--success)" } : undefined}
          />
        ))}
      </div>

      {/* Check-in foot - its own click target, never opens the editor. */}
      {count ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={pending || done <= 0}
              onClick={() => set(done - 1)}
              className="bg-surface-2 text-fg-2 hover:text-fg flex size-9 items-center justify-center rounded-full transition-colors disabled:opacity-40"
            >
              <Minus className="size-4" strokeWidth={1.75} />
            </button>
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "font-mono text-base whitespace-nowrap tabular-nums",
                  complete ? "" : "text-fg",
                )}
                style={complete ? { color: "var(--success)" } : undefined}
              >
                {done} / {habit.target}
              </span>
              {habit.unit ? <span className="text-fg-3 text-xs">{habit.unit}</span> : null}
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => set(done + 1)}
              className="bg-surface-2 text-fg-2 hover:text-fg flex size-9 items-center justify-center rounded-full transition-colors disabled:opacity-40"
            >
              {complete ? <Check className="size-4" strokeWidth={1.75} /> : <Plus className="size-4" strokeWidth={1.75} />}
            </button>
          </div>
          <div className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (done / Math.max(1, habit.target)) * 100)}%`,
                background: "var(--success)",
              }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => set(complete ? 0 : 1)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-full p-2 text-sm font-medium transition-colors",
            complete ? "" : "bg-surface-2 text-fg-2 hover:text-fg",
          )}
          style={complete ? { background: SUCCESS_TINT, color: "var(--success)" } : undefined}
        >
          <Check className="size-4" strokeWidth={1.75} />
          {complete ? "Done today" : "Mark done"}
        </button>
      )}
    </div>
  );
}
