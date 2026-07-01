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
import { priorityColor } from "@/lib/todo";
import { cn } from "@/lib/utils";
import { EventCard } from "./event-card";
import { TodoBlockCard } from "./todo-block-card";
import { HabitIcon } from "@/components/modules/habits/habit-icon";
import type { TimetableEvent } from "./timetable-board";
import type { Todo } from "@/components/modules/todo/todo-board";

// A timed habit occurrence on the grid for one day of the visible week.
export type HabitBlock = {
  id: string;
  dayIdx: number;
  startTime: string;
  endTime: string | null;
  name: string;
  icon: string | null;
};

const HABIT_TONE = "var(--info)";

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

// A dated commitment from another module (job deadline, milestone) shown in the
// all-day strip.
export type WeekMark = {
  id: string;
  day: string;
  label: string;
  href: string;
  tone: "deadline" | "milestone";
};

// One chip in the all-day strip: a todo or a cross-module mark. dayLabel is a
// short pre-formatted hint (weekday or date) shown on the right, or null when the
// group already implies the day (Today, Not scheduled).
export type AllDayChip =
  | {
      kind: "todo";
      id: string;
      title: string;
      priority: string;
      dayLabel: string | null;
    }
  | {
      kind: "mark";
      id: string;
      label: string;
      tone: "deadline" | "milestone";
      href: string;
      dayLabel: string | null;
    };

// A labeled cluster of chips in the all-day strip (Overdue, Today, ...). A null
// label renders the chips with no sub-heading, matching the flat week strip.
export type AllDayGroup = {
  key: string;
  label: string | null;
  chips: AllDayChip[];
};

// Weekly time grid: a time gutter plus seven day columns. Events are positioned
// by their start and end time. Time-blocked todos overlay as distinct blocks.
// Untimed todos and cross-module marks due in the week sit in an all-day strip.
export function WeekView({
  events,
  onEventClick,
  todos = [],
  allDayGroups = [],
  habits = [],
  weekDays,
  today,
}: {
  events: TimetableEvent[];
  onEventClick: (event: TimetableEvent) => void;
  todos?: Todo[];
  allDayGroups?: AllDayGroup[];
  habits?: HabitBlock[];
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

      // Horizontally land on the first day with something on the grid, else
      // today, else the start of the week. Matters on mobile, where only a few
      // day columns fit at once.
      const cols = [...events, ...todos.filter((t) => t.startTime)]
        .map(dayColumn)
        .filter((c): c is number => c !== null);
      const todayIdx = weekDays.indexOf(today);
      const targetCol = cols.length
        ? Math.min(...cols)
        : todayIdx >= 0
          ? todayIdx
          : 0;
      // Day columns share the width left of the 56px sticky time gutter.
      const colWidth = (el.scrollWidth - 56) / 7;
      el.scrollLeft = Math.max(0, targetCol * colWidth);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {allDayGroups.length > 0 ? (
        <div className="bg-surface shrink-0 rounded-[var(--r-lg)] border p-3">
          <p className="text-fg-3 mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
            All day
          </p>
          <div className="space-y-2.5">
            {allDayGroups.map((group) => (
              <div key={group.key} className="space-y-1.5">
                {group.label ? (
                  <p className="text-fg-4 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]">
                    {group.label}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  {group.chips.map((chip) =>
                    chip.kind === "todo" ? (
                      <Link
                        key={chip.id}
                        href="/todo"
                        className="bg-surface-2 hover:bg-surface-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors"
                      >
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ background: priorityColor(chip.priority) }}
                        />
                        <span className="text-fg max-w-[14rem] truncate">
                          {chip.title}
                        </span>
                        {chip.dayLabel ? (
                          <span className="text-fg-3 shrink-0 font-mono text-[10.5px]">
                            {chip.dayLabel}
                          </span>
                        ) : null}
                      </Link>
                    ) : (
                      <Link
                        key={chip.id}
                        href={chip.href}
                        className="bg-surface-2 hover:bg-surface-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors"
                      >
                        {chip.tone === "deadline" ? (
                          <Flag className="text-destructive size-3 shrink-0" />
                        ) : (
                          <Milestone className="text-accent size-3 shrink-0" />
                        )}
                        <span className="text-fg max-w-[14rem] truncate">
                          {chip.label}
                        </span>
                        {chip.dayLabel ? (
                          <span className="text-fg-3 shrink-0 font-mono text-[10.5px]">
                            {chip.dayLabel}
                          </span>
                        ) : null}
                      </Link>
                    ),
                  )}
                </div>
              </div>
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
              <div key={day} className="flex-1 border-l">
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
                  {habits
                    .filter((h) => h.dayIdx === dayIdx)
                    .map((h) => {
                      const startMin = timeToMinutes(h.startTime);
                      const endMin = h.endTime
                        ? timeToMinutes(h.endTime)
                        : startMin + DEFAULT_TODO_MINUTES;
                      const start = startMin - GRID_START_HOUR * 60;
                      const end = endMin - GRID_START_HOUR * 60;
                      const top = Math.max(0, (start / 60) * HOUR_PX) + GRID_PAD;
                      const height = Math.max(
                        18,
                        ((end - start) / 60) * HOUR_PX - 2,
                      );
                      return (
                        <Link
                          key={h.id}
                          href="/habits"
                          className="absolute inset-x-1 z-20 block overflow-hidden rounded-[var(--r-sm)] border px-1.5 py-1 transition-opacity hover:opacity-80"
                          style={{
                            top,
                            height,
                            background: `color-mix(in oklch, ${HABIT_TONE} 14%, transparent)`,
                            borderColor: HABIT_TONE,
                          }}
                        >
                          <p
                            className="flex items-center gap-1 truncate text-xs font-medium"
                            style={{ color: HABIT_TONE }}
                          >
                            <HabitIcon name={h.icon} className="size-3 shrink-0" />
                            {h.name}
                          </p>
                          <p className="text-fg-3 truncate font-mono text-[11px]">
                            {h.startTime}
                            {h.endTime ? `–${h.endTime}` : ""}
                          </p>
                        </Link>
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
