"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  WEEKDAYS,
  GRID_START_HOUR,
  GRID_END_HOUR,
  timeToMinutes,
  weekdayIndex,
} from "@/lib/timetable";
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

// Weekly time grid: a time gutter plus seven day columns. Events are positioned
// by their start and end time. Time-blocked todos overlay as distinct blocks.
export function WeekView({
  events,
  onEventClick,
  todos = [],
}: {
  events: TimetableEvent[];
  onEventClick: (event: TimetableEvent) => void;
  todos?: Todo[];
}) {
  const hours: number[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) hours.push(h);
  const bodyHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_PX + GRID_PAD * 2;
  const today = format(new Date(), "yyyy-MM-dd");

  const todayCol = weekdayIndex(new Date());

  // On launch, land on the morning (07:00) or earlier if something starts
  // before it, and bring today's column into view, while the full day and week
  // stay scrollable. The horizontal nudge matters on mobile, where only a few
  // day columns fit at once.
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const starts = [
      ...events.map((e) => timeToMinutes(e.startTime)),
      ...todos.filter((t) => t.startTime).map((t) => timeToMinutes(t.startTime!)),
    ];
    const earliest = starts.length ? Math.floor(Math.min(...starts) / 60) : 7;
    const target = Math.min(earliest, 7);
    el.scrollTop = Math.max(0, (target - GRID_START_HOUR) * HOUR_PX + GRID_PAD);

    const col = todayColRef.current;
    if (col) {
      // Align today's column just past the sticky time gutter (w-14 = 56px).
      const offset = col.getBoundingClientRect().left - el.getBoundingClientRect().left;
      el.scrollLeft = Math.max(0, el.scrollLeft + offset - 56);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
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
          return (
            <div
              key={day}
              ref={dayIdx === todayCol ? todayColRef : undefined}
              className="flex-1 border-l"
            >
              <div className="bg-surface text-fg-3 sticky top-0 z-10 flex h-10 items-center justify-center border-b font-mono text-xs font-medium uppercase tracking-[0.04em]">
                {day.slice(0, 3)}
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
  );
}
