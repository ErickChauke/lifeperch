"use client";

import {
  WEEKDAYS,
  GRID_START_HOUR,
  GRID_END_HOUR,
  timeToMinutes,
  weekdayIndex,
} from "@/lib/timetable";
import { EventCard } from "./event-card";
import type { TimetableEvent } from "./timetable-board";

const HOUR_PX = 48;

// Returns the Monday-first column index an event belongs to, or null.
function dayColumn(event: TimetableEvent): number | null {
  if (event.isRecurring) return event.dayOfWeek;
  if (event.specificDate) return weekdayIndex(new Date(event.specificDate));
  return null;
}

// Weekly time grid: a time gutter plus seven day columns. Events are
// positioned by their start and end time.
export function WeekView({
  events,
  onEventClick,
}: {
  events: TimetableEvent[];
  onEventClick: (event: TimetableEvent) => void;
}) {
  const hours: number[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) hours.push(h);
  const bodyHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_PX;

  return (
    <div className="overflow-x-auto rounded-xl border">
      <div className="flex min-w-[720px]">
        <div className="w-14 shrink-0">
          <div className="h-10 border-b" />
          <div className="relative" style={{ height: bodyHeight }}>
            {hours.map((h, i) => (
              <div
                key={h}
                className="text-muted-foreground absolute right-1 -translate-y-1/2 text-[11px]"
                style={{ top: i * HOUR_PX }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>

        {WEEKDAYS.map((day, dayIdx) => {
          const dayEvents = events.filter((e) => dayColumn(e) === dayIdx);
          return (
            <div key={day} className="flex-1 border-l">
              <div className="flex h-10 items-center justify-center border-b text-xs font-medium">
                {day.slice(0, 3)}
              </div>
              <div className="relative" style={{ height: bodyHeight }}>
                {hours.slice(1).map((h, i) => (
                  <div
                    key={h}
                    className="border-border/50 absolute inset-x-0 border-t"
                    style={{ top: (i + 1) * HOUR_PX }}
                  />
                ))}
                {dayEvents.map((event) => {
                  const start =
                    timeToMinutes(event.startTime) - GRID_START_HOUR * 60;
                  const end = timeToMinutes(event.endTime) - GRID_START_HOUR * 60;
                  const top = Math.max(0, (start / 60) * HOUR_PX);
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
