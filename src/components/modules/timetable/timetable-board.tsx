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
import { PageHeader } from "@/components/layout/page-shell";
import { dateToDay } from "@/lib/money";
import { isHabitExpected } from "@/lib/habits";
import { isDone } from "@/lib/todo";
import { weekdayIndex, timeToMinutes } from "@/lib/timetable";
import { WeekView, type WeekMark, type HabitBlock } from "./week-view";
import { EventModal } from "./event-modal";
import type { getEvents } from "@/actions/timetable";
import type { getJobs } from "@/actions/jobs";
import type { getMilestones } from "@/actions/timeline";
import type { getHabits } from "@/actions/habits";
import type { Todo } from "@/components/modules/todo/todo-board";

export type TimetableEvent = Awaited<ReturnType<typeof getEvents>>[number];
type Job = Awaited<ReturnType<typeof getJobs>>[number];
type Milestone = Awaited<ReturnType<typeof getMilestones>>[number];
type Habit = Awaited<ReturnType<typeof getHabits>>[number];

// Client container for the timetable. Owns the add/edit modal and which week is
// shown, scoping events, todos and cross-module dates to that week.
export function TimetableBoard({
  events,
  todos,
  jobs,
  milestones,
  habits,
}: {
  events: TimetableEvent[];
  todos: Todo[];
  jobs: Job[];
  milestones: Milestone[];
  habits: Habit[];
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

  // A todo linked to the timetable overrides the events it overlaps while still
  // pending; once done the event returns and the done todo drops off the grid,
  // so the week reads as normal again.
  const colOf = (item: {
    isRecurring: boolean;
    dayOfWeek: number | null;
    specificDate: Date | null;
  }): number | null =>
    item.isRecurring
      ? item.dayOfWeek
      : item.specificDate
        ? weekdayIndex(new Date(item.specificDate))
        : null;
  const overlaps = (aS: number, aE: number, bS: number, bE: number) =>
    aS < bE && bS < aE;
  const overriders = weekTimedTodos.filter(
    (t) => t.linkedModule === "timetable" && !isDone(t, today),
  );
  const visibleEvents = weekEvents.filter((e) => {
    const eStart = timeToMinutes(e.startTime);
    const eEnd = timeToMinutes(e.endTime);
    const eCol = colOf(e);
    return !overriders.some((t) => {
      if (colOf(t) !== eCol) return false;
      const tStart = timeToMinutes(t.startTime!);
      const tEnd = t.endTime ? timeToMinutes(t.endTime) : tStart + 60;
      return overlaps(tStart, tEnd, eStart, eEnd);
    });
  });
  const visibleTodos = weekTimedTodos.filter(
    (t) => !(t.linkedModule === "timetable" && isDone(t, today)),
  );

  const marks: WeekMark[] = [
    ...jobs
      .filter((j) => j.deadline && j.status !== "outcome" && inWeek(j.deadline))
      .map((j) => ({
        id: `j-${j.id}`,
        day: dateToDay(j.deadline!),
        label: `${j.position} · ${j.organisation}`,
        href: "/jobs",
        tone: "deadline" as const,
      })),
    ...milestones
      .filter((m) => m.status !== "done" && inWeek(m.targetDate))
      .map((m) => ({
        id: `m-${m.id}`,
        day: dateToDay(m.targetDate),
        label: m.title,
        href: "/timeline",
        tone: "milestone" as const,
      })),
  ];

  // Timed habits with a fixed cadence (daily or specific weekdays) drop onto the
  // grid on each day of the week they are expected. Flexible (weekly) habits have
  // no fixed slot, so they stay off the grid.
  const habitBlocks: HabitBlock[] = [];
  for (const h of habits) {
    if (!h.startTime || h.weeklyTarget != null) continue;
    weekDays.forEach((day, i) => {
      if (isHabitExpected(h, day)) {
        habitBlocks.push({
          id: `${h.id}-${i}`,
          dayIdx: i,
          startTime: h.startTime!,
          endTime: h.endTime,
          name: h.name,
          icon: h.icon,
        });
      }
    });
  }

  function openAdd() {
    setSelected(null);
    setOpen(true);
  }

  function openEdit(event: TimetableEvent) {
    setSelected(event);
    setOpen(true);
  }

  const sameMonth =
    format(weekStartDate, "MMM") === format(weekEndDate, "MMM");
  const rangeLabel = sameMonth
    ? `${format(weekStartDate, "d")} – ${format(weekEndDate, "d MMM")}`
    : `${format(weekStartDate, "d MMM")} – ${format(weekEndDate, "d MMM")}`;

  return (
    <>
      <PageHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.01em]">
              Timetable
            </h2>
            <p className="text-fg-2 mt-1 text-sm">
              Your weekly lectures and shifts.
            </p>
          </div>
          {/* On mobile the action sits in the title row to use the space; on
              desktop it lives in the week-nav row below. */}
          <Button size="sm" onClick={openAdd} className="shrink-0 sm:hidden">
            <Plus />
            Add event
          </Button>
        </div>
      </PageHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-8 md:px-8 md:pb-10">
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
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
          </div>
          <span className="text-fg-2 shrink-0 text-sm font-medium whitespace-nowrap">
            {rangeLabel}
          </span>
          <Button
            size="sm"
            onClick={openAdd}
            className="ml-auto hidden shrink-0 sm:inline-flex"
          >
            <Plus />
            Add event
          </Button>
        </div>
        <WeekView
        events={visibleEvents}
        onEventClick={openEdit}
        todos={visibleTodos}
        allDayTodos={allDayTodos}
        marks={marks}
        habits={habitBlocks}
        weekDays={weekDays}
        today={today}
      />
        <EventModal open={open} onOpenChange={setOpen} event={selected} />
      </div>
    </>
  );
}
