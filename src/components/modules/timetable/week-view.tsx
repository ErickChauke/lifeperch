"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Flag, Milestone } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  WEEKDAYS,
  GRID_START_HOUR,
  GRID_END_HOUR,
  timeToMinutes,
  weekdayIndex,
} from "@/lib/timetable";
import { priorityColor, isDone } from "@/lib/todo";
import { dateToDay } from "@/lib/money";
import { cn } from "@/lib/utils";
import { EventCard } from "./event-card";
import { TodoBlockCard } from "./todo-block-card";
import type { TimetableEvent } from "./timetable-board";
import type { Todo } from "@/components/modules/todo/todo-board";

const HOUR_PX = 48;
// Breathing room at the top and bottom so the first and last hour labels,
// which sit centered on the grid edges, are not clipped.
const GRID_PAD = 8;
// Fallback duration for a timed todo saved without an end time.
const DEFAULT_TODO_MINUTES = 60;

// Anything schedulable onto the grid: an event or a todo share these fields.
type Schedulable = {
  isRecurring: boolean;
  dayOfWeek: number | null;
  specificDate: Date | null;
};

// Returns the Monday-first column index an item belongs to, or null.
function dayColumn(item: Schedulable): number | null {
  if (item.isRecurring) return item.dayOfWeek;
  if (item.specificDate) return weekdayIndex(new Date(item.specificDate));
  return null;
}

// True when an untimed todo is due on a given "yyyy-MM-dd".
function dueOn(todo: Todo, day: string): boolean {
  if (todo.specificDate) return dateToDay(todo.specificDate) === day;
  if (todo.isRecurring && todo.dayOfWeek !== null) {
    return weekdayIndex(parseISO(day)) === todo.dayOfWeek;
  }
  return false;
}

// A dated commitment from another module (job deadline, milestone) shown in the
// all-day strip.
export type WeekMark = {
  id: string;
  day: string;
  label: string;
  href: string;
  tone: "deadline" | "milestone";
};

// Weekly time grid: a time gutter plus seven day columns. Events are positioned
// by their start and end time. Time-blocked todos overlay as distinct blocks.
// Untimed todos and cross-module marks due in the week sit in an all-day strip.
export function WeekView({
  events,
  onEventClick,
  todos = [],
  allDayTodos = [],
  marks = [],
  weekDays,
  today,
}: {
  events: TimetableEvent[];
  onEventClick: (event: TimetableEvent) => void;
  todos?: Todo[];
  allDayTodos?: Todo[];
  marks?: WeekMark[];
  weekDays: string[];
  today: string;
}) {
  const hours: number[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) hours.push(h);
  const bodyHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_PX + GRID_PAD * 2;

  // On launch, land on the morning (07:00) or earlier if something starts
  // before it, and bring today's column into view, while the full day and week
  // stay scrollable. The horizontal nudge matters on mobile, where only a few
  // day columns fit at once.
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Defer to the next frame so the grid is laid out before we scroll it; on
    // mobile the height is not settled when the effect first runs.
    const raf = requestAnimationFrame(() => {
      const starts = [
        ...events.map((e) => timeToMinutes(e.startTime)),
        ...todos
          .filter((t) => t.startTime)
          .map((t) => timeToMinutes(t.startTime!)),
      ];
      const earliest = starts.length ? Math.floor(Math.min(...starts) / 60) : 7;
      const target = Math.min(earliest, 7);
      el.scrollTop = Math.max(0, (target - GRID_START_HOUR) * HOUR_PX + GRID_PAD);

      const col = todayColRef.current;
      if (col) {
        // Align today's column just past the sticky time gutter (w-14 = 56px).
        const offset =
          col.getBoundingClientRect().left - el.getBoundingClientRect().left;
        el.scrollLeft = Math.max(0, el.scrollLeft + offset - 56);
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allDay = allDayTodos
    .map((t) => ({ todo: t, day: weekDays.find((d) => dueOn(t, d)) }))
    .filter((x): x is { todo: Todo; day: string } => Boolean(x.day))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const sortedMarks = [...marks].sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {allDay.length > 0 || sortedMarks.length > 0 ? (
        <div className="bg-surface shrink-0 rounded-[var(--r-lg)] border p-3">
          <p className="text-fg-3 mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
            All day
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allDay.map(({ todo, day }) => (
              <Link
                key={todo.id}
                href="/todo"
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
              </Link>
            ))}
            {sortedMarks.map((mark) => (
              <Link
                key={mark.id}
                href={mark.href}
                className="bg-surface-2 hover:bg-surface-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors"
              >
                {mark.tone === "deadline" ? (
                  <Flag className="text-destructive size-3 shrink-0" />
                ) : (
                  <Milestone className="text-accent size-3 shrink-0" />
                )}
                <span className="text-fg max-w-[14rem] truncate">
                  {mark.label}
                </span>
                <span className="text-fg-3 shrink-0 font-mono text-[10.5px]">
                  {format(parseISO(mark.day), "EEE")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="bg-surface scrollbar-hide max-h-[70svh] min-h-0 flex-1 overflow-auto overscroll-none rounded-[var(--r-lg)] border md:max-h-none"
      >
        <div className="flex min-w-[720px]">
          <div className="bg-surface sticky left-0 z-20 w-14 shrink-0">
            <div className="bg-surface sticky top-0 z-30 h-10 border-b" />
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

          {WEEKDAYS.map((day, dayIdx) => {
            const dayEvents = events.filter((e) => dayColumn(e) === dayIdx);
            const dayTodos = todos.filter(
              (t) => t.startTime && dayColumn(t) === dayIdx,
            );
            const dayStr = weekDays[dayIdx];
            const isToday = dayStr === today;
            return (
              <div
                key={day}
                ref={isToday ? todayColRef : undefined}
                className="flex-1 border-l"
              >
                <div
                  className={cn(
                    "bg-surface sticky top-0 z-10 flex h-10 items-center justify-center gap-1 border-b font-mono text-xs font-medium uppercase tracking-[0.04em]",
                    isToday ? "text-fg" : "text-fg-3",
                  )}
                >
                  <span>{day.slice(0, 3)}</span>
                  <span className={isToday ? "text-accent" : "text-fg-2"}>
                    {format(parseISO(dayStr), "d")}
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
                  {dayEvents.map((event) => {
                    const start =
                      timeToMinutes(event.startTime) - GRID_START_HOUR * 60;
                    const end = timeToMinutes(event.endTime) - GRID_START_HOUR * 60;
                    const top = Math.max(0, (start / 60) * HOUR_PX) + GRID_PAD;
                    const height = Math.max(18, ((end - start) / 60) * HOUR_PX - 2);
                    return (
                      <div
                        key={event.id}
                        className="absolute inset-x-1"
                        style={{ top, height }}
                      >
                        <EventCard
                          event={event}
                          onClick={() => onEventClick(event)}
                        />
                      </div>
                    );
                  })}
                  {dayTodos.map((todo) => {
                    const startMin = timeToMinutes(todo.startTime!);
                    const endMin = todo.endTime
                      ? timeToMinutes(todo.endTime)
                      : startMin + DEFAULT_TODO_MINUTES;
                    const start = startMin - GRID_START_HOUR * 60;
                    const end = endMin - GRID_START_HOUR * 60;
                    const top = Math.max(0, (start / 60) * HOUR_PX) + GRID_PAD;
                    const height = Math.max(18, ((end - start) / 60) * HOUR_PX - 2);
                    return (
                      <div
                        key={todo.id}
                        className="absolute inset-x-1 z-10"
                        style={{ top, height }}
                      >
                        <TodoBlockCard todo={todo} today={today} />
                      </div>
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
