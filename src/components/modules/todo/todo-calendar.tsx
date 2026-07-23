"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { weekdayIndex } from "@/lib/timetable";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

// Month grid date picker, Monday-first. Days carrying a due todo show a lime dot;
// recurring todos dot every matching weekday. Future days stay selectable since
// todos schedule forward. The view month follows the selected day.
export function TodoCalendar({
  selected,
  today,
  dueDays,
  recurringDays,
  markedDays,
  onSelect,
}: {
  selected: string;
  today: string;
  dueDays: Set<string>;
  recurringDays: Set<number>;
  markedDays?: Set<string>;
  onSelect: (day: string) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(parseISO(selected)));

  // Follow the selected day into its month while still allowing manual prev/next
  // navigation between selections. Adjusts state during render, not an effect.
  const [lastSelected, setLastSelected] = useState(selected);
  if (selected !== lastSelected) {
    setLastSelected(selected);
    setMonth(startOfMonth(parseISO(selected)));
  }

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="bg-surface shrink-0 rounded-md border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[15px] font-semibold">
          {format(month, "MMMM")}{" "}
          <span className="text-fg-2 font-mono">{format(month, "yyyy")}</span>
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setMonth(addMonths(month, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setMonth(addMonths(month, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="text-fg-3 mb-1 grid grid-cols-7 gap-1 text-center font-mono text-[10px] uppercase tracking-wider">
        {WEEKDAYS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const day = format(d, "yyyy-MM-dd");
          const inMonth = isSameMonth(d, month);
          const isToday = day === today;
          const isSelected = day === selected;
          const hasDue = dueDays.has(day) || recurringDays.has(weekdayIndex(d));
          const hasMark = markedDays?.has(day) ?? false;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-sm border font-mono text-sm transition-colors",
                isSelected
                  ? "bg-accent-soft text-fg border-accent-line"
                  : isToday
                    ? "text-fg border-accent-line"
                    : "border-transparent",
                !inMonth ? "text-fg-4" : "text-fg",
                !isSelected ? "hover:bg-surface-2" : "",
              )}
            >
              {format(d, "d")}
              {(hasDue || hasMark) && !isSelected ? (
                <span className="absolute bottom-1 flex gap-0.5">
                  {hasDue ? (
                    <span className="bg-primary size-1 rounded-full" />
                  ) : null}
                  {hasMark ? (
                    <span
                      className="size-1 rounded-full"
                      style={{ background: "#e2a93b" }}
                    />
                  ) : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
