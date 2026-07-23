"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

// Month grid date picker, Monday-first. Days with an entry carry a lime dot;
// future days are dimmed and not selectable. The view month follows the
// selected day so picking a past entry jumps to its month.
export function Calendar({
  selected,
  today,
  entryDays,
  onSelect,
}: {
  selected: string;
  today: string;
  entryDays: Set<string>;
  onSelect: (day: string) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(parseISO(selected)));
  const todayDate = startOfDay(parseISO(today));

  // Follow the selected day into its month (e.g. picking a past entry), while
  // still allowing manual prev/next navigation between selections. This adjusts
  // state during render rather than in an effect.
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
          const isFuture = isAfter(startOfDay(d), todayDate);
          const isToday = day === today;
          const isSelected = day === selected;
          const hasEntry = entryDays.has(day);
          return (
            <button
              key={day}
              type="button"
              disabled={isFuture}
              onClick={() => onSelect(day)}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-sm border font-mono text-sm transition-colors",
                isSelected
                  ? "bg-accent-soft text-fg border-accent-line"
                  : isToday
                    ? "text-fg border-accent-line"
                    : "border-transparent",
                isFuture || !inMonth ? "text-fg-4" : "text-fg",
                isFuture
                  ? "cursor-not-allowed"
                  : !isSelected
                    ? "hover:bg-surface-2"
                    : "",
              )}
            >
              {format(d, "d")}
              {hasEntry && !isSelected ? (
                <span className="bg-primary absolute bottom-1 size-1 rounded-full" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
