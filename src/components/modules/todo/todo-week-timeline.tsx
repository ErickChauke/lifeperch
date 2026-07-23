"use client";

import { useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import {
  GRID_START_HOUR,
  GRID_END_HOUR,
  timeToMinutes,
  weekdayIndex,
} from "@/lib/timetable";
import { dateToDay } from "@/lib/money";
import { isDone, priorityColor, todoComparator } from "@/lib/todo";
import { cn } from "@/lib/utils";
import type { Todo } from "./todo-board";

const HOUR_PX = 48;
// Breathing room so the first and last hour labels are not clipped.
const GRID_PAD = 8;
// Fallback duration for a timed todo saved without an end time.
const DEFAULT_TODO_MINUTES = 60;

// True when a todo falls on a given "yyyy-MM-dd": a one-off on its date, a
// recurring todo on every matching weekday.
function dueOn(todo: Todo, day: string): boolean {
  if (todo.specificDate) return dateToDay(todo.specificDate) === day;
  if (todo.isRecurring && todo.dayOfWeek !== null) {
    return weekdayIndex(parseISO(day)) === todo.dayOfWeek;
  }
  return false;
}

// The week laid out on an hour grid, one column per day from today to the end of
// the week. Time-blocked todos sit at their start/end; untimed todos for the
// week show in an all-day strip above the grid. Clicking a todo opens its editor.
export function TodoWeekTimeline({
  days,
  todos,
  today,
  onEdit,
}: {
  days: string[];
  todos: Todo[];
  today: string;
  onEdit: (todo: Todo) => void;
}) {
  const hours: number[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) hours.push(h);
  const bodyHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_PX + GRID_PAD * 2;

  // On launch, land on the morning (07:00) or earlier if a timed todo starts
  // before it, while the full day stays scrollable above and below.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const starts = todos
        .filter((t) => t.startTime)
        .map((t) => timeToMinutes(t.startTime!));
      const earliest = starts.length ? Math.floor(Math.min(...starts) / 60) : 7;
      const target = Math.min(earliest, 7);
      el.scrollTop = Math.max(0, (target - GRID_START_HOUR) * HOUR_PX + GRID_PAD);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allDay = todos
    .filter((t) => !t.startTime)
    .map((t) => ({ todo: t, day: days.find((d) => dueOn(t, d)) }))
    .filter((x): x is { todo: Todo; day: string } => Boolean(x.day))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

  return (
    <div className="space-y-3">
      {allDay.length > 0 ? (
        <div className="bg-surface rounded-md border border-border p-3">
          <p className="text-fg-3 mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
            All day
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allDay.map(({ todo, day }) => (
              <button
                key={todo.id}
                type="button"
                onClick={() => onEdit(todo)}
                className="bg-surface-2 hover:bg-surface-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors"
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: priorityColor(todo.priority) }}
                />
                <span
                  className={cn(
                    "max-w-[14rem] truncate",
                    isDone(todo, today) ? "text-fg-4 line-through" : "text-fg",
                  )}
                >
                  {todo.title}
                </span>
                <span className="text-fg-3 shrink-0 font-mono text-[10.5px]">
                  {format(parseISO(day), "EEE")}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="bg-surface scrollbar-hide max-h-[70vh] overflow-auto overscroll-none rounded-md border border-border"
      >
        <div className="flex min-w-[640px]">
          <div className="bg-surface sticky left-0 z-20 w-14 shrink-0">
            <div className="bg-surface sticky top-0 z-30 h-10 border-b border-border" />
            <div className="relative" style={{ height: bodyHeight }}>
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="text-fg-3 absolute right-1 -translate-y-1/2 font-mono text-[11px]"
                  style={{ top: i * HOUR_PX + GRID_PAD }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          {days.map((day) => {
            const dayTodos = todos
              .filter((t) => t.startTime && dueOn(t, day))
              .sort(todoComparator(today));
            const isToday = day === today;
            return (
              <div key={day} className="flex-1 border-l border-border">
                <div
                  className={cn(
                    "bg-surface sticky top-0 z-10 flex h-10 items-center justify-center gap-1 border-b border-border font-mono text-xs font-medium uppercase tracking-[0.04em]",
                    isToday ? "text-fg" : "text-fg-3",
                  )}
                >
                  <span>{format(parseISO(day), "EEE")}</span>
                  <span className={isToday ? "text-accent-read" : "text-fg-2"}>
                    {format(parseISO(day), "d")}
                  </span>
                </div>
                <div className="relative" style={{ height: bodyHeight }}>
                  {hours.slice(1).map((h, i) => (
                    <div
                      key={h}
                      className="absolute inset-x-0 border-t border-[var(--border)]"
                      style={{ top: (i + 1) * HOUR_PX + GRID_PAD }}
                    />
                  ))}
                  {dayTodos.map((todo) => {
                    const startMin = timeToMinutes(todo.startTime!);
                    const endMin = todo.endTime
                      ? timeToMinutes(todo.endTime)
                      : startMin + DEFAULT_TODO_MINUTES;
                    const start = startMin - GRID_START_HOUR * 60;
                    const end = endMin - GRID_START_HOUR * 60;
                    const top = Math.max(0, (start / 60) * HOUR_PX) + GRID_PAD;
                    const height = Math.max(
                      18,
                      ((end - start) / 60) * HOUR_PX - 2,
                    );
                    const color = priorityColor(todo.priority);
                    const done = isDone(todo, today);
                    return (
                      <button
                        key={todo.id}
                        type="button"
                        onClick={() => onEdit(todo)}
                        className="absolute inset-x-1 z-10 block overflow-hidden rounded-[var(--r-sm)] border border-dashed px-1.5 py-1 text-left transition-opacity hover:opacity-80"
                        style={{
                          top,
                          height,
                          backgroundColor: `${color}14`,
                          borderColor: color,
                          opacity: done ? 0.5 : 1,
                        }}
                      >
                        <p
                          className={cn(
                            "truncate text-xs font-medium",
                            done && "line-through",
                          )}
                          style={{ color }}
                        >
                          {todo.title}
                        </p>
                        <p className="text-fg-3 truncate font-mono text-[11px]">
                          {todo.startTime}
                          {todo.endTime ? `–${todo.endTime}` : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
