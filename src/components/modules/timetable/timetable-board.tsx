"use client";

import { useState } from "react";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
} from "date-fns";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateToDay } from "@/lib/money";
import { WeekView } from "./week-view";
import { EventModal } from "./event-modal";
import type { getEvents } from "@/actions/timetable";
import type { Todo } from "@/components/modules/todo/todo-board";

export type TimetableEvent = Awaited<ReturnType<typeof getEvents>>[number];

// Client container for the timetable. Owns the add/edit modal and which week is
// shown, scoping events and todos to that week before handing them to the grid.
export function TimetableBoard({
  events,
  todos,
}: {
  events: TimetableEvent[];
  todos: Todo[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TimetableEvent | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const weekStartDate = startOfWeek(addWeeks(now, weekOffset), {
    weekStartsOn: 1,
  });
  const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStartDate,
    end: weekEndDate,
  }).map((d) => format(d, "yyyy-MM-dd"));
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  // A one-off lands in this week when its date is in range; recurring items
  // (events and todos) recur every week.
  const inWeek = (specificDate: Date | null) => {
    if (!specificDate) return false;
    const d = dateToDay(specificDate);
    return d >= weekStart && d <= weekEnd;
  };

  const weekEvents = events.filter((e) =>
    e.isRecurring ? true : inWeek(e.specificDate),
  );
  const weekTimedTodos = todos.filter((t) =>
    t.startTime
      ? t.isRecurring
        ? t.dayOfWeek !== null
        : inWeek(t.specificDate)
      : false,
  );
  const allDayTodos = todos.filter((t) =>
    t.startTime
      ? false
      : t.isRecurring
        ? t.dayOfWeek !== null
        : inWeek(t.specificDate),
  );

  function openAdd() {
    setSelected(null);
    setOpen(true);
  }

  function openEdit(event: TimetableEvent) {
    setSelected(event);
    setOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-8 md:px-8 md:pb-10">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Previous week"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            size="sm"
            variant={weekOffset === 0 ? "secondary" : "ghost"}
            onClick={() => setWeekOffset(0)}
          >
            Today
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Next week"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <span className="text-fg-2 ml-2 text-sm font-medium">
            {format(weekStartDate, "d MMM")} – {format(weekEndDate, "d MMM")}
          </span>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus />
          Add event
        </Button>
      </div>
      <WeekView
        events={weekEvents}
        onEventClick={openEdit}
        todos={weekTimedTodos}
        allDayTodos={allDayTodos}
        weekDays={weekDays}
        today={today}
      />
      <EventModal open={open} onOpenChange={setOpen} event={selected} />
    </div>
  );
}
