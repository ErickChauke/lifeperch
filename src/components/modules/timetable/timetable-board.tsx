"use client";

import { useState } from "react";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-shell";
import { dateToDay } from "@/lib/money";
import { isHabitExpected } from "@/lib/habits";
import { isDone, isOverdue, dueDay } from "@/lib/todo";
import { weekdayIndex, timeToMinutes } from "@/lib/timetable";
import {
  WeekView,
  type WeekMark,
  type HabitBlock,
  type AllDayGroup,
  type AllDayChip,
} from "./week-view";
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
  // A timed todo is a timetable item by default: while pending it overrides the
  // events it overlaps; once done it drops off the grid and the underlying event
  // returns, so the week reads as normal again.
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
  const overriders = weekTimedTodos.filter((t) => !isDone(t, today));
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
  const visibleTodos = weekTimedTodos.filter((t) => !isDone(t, today));

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
    ...jobs
      .filter((j) => j.status !== "outcome")
      .flatMap((j) =>
        j.stages
          .filter((s) => s.date && inWeek(s.date))
          .map((s) => ({
            id: `s-${s.id}`,
            day: dateToDay(s.date!),
            label: `${s.label} · ${j.organisation}`,
            href: "/jobs",
            tone: "interview" as const,
          })),
      ),
  ];

  // Untimed todos feed the all-day strip. On the current week it reads as a task
  // triage: overdue first, then today, the rest of the week, then the dateless
  // backlog, with completed items dropped so pending work leads. Other weeks keep
  // a simple day-tagged strip of that week's pending items.
  const untimedPending = todos.filter((t) => !t.startTime && !isDone(t, today));

  const todoChip = (t: Todo, dayLabel: string | null): AllDayChip => ({
    kind: "todo",
    id: t.id,
    title: t.title,
    priority: t.priority,
    dayLabel,
  });
  const markChip = (m: WeekMark, dayLabel: string | null): AllDayChip => ({
    kind: "mark",
    id: m.id,
    label: m.label,
    tone: m.tone,
    href: m.href,
    dayLabel,
  });

  // True when an untimed todo is due on a given "yyyy-MM-dd" within the week.
  const dueOnDay = (t: Todo, day: string): boolean => {
    if (t.specificDate) return dateToDay(t.specificDate) === day;
    if (t.isRecurring && t.dayOfWeek !== null) {
      return weekdayIndex(parseISO(day)) === t.dayOfWeek;
    }
    return false;
  };

  const wkMarks = [...marks].sort((a, b) => (a.day < b.day ? -1 : 1));

  let allDayGroups: AllDayGroup[];
  if (weekOffset === 0) {
    const overdueTodos = untimedPending
      .filter((t) => isOverdue(t, today))
      .sort((a, b) =>
        dateToDay(a.specificDate!) < dateToDay(b.specificDate!) ? -1 : 1,
      );
    const overdueIds = new Set(overdueTodos.map((t) => t.id));
    const placed = untimedPending
      .filter((t) => !overdueIds.has(t.id))
      .map((t) => ({ t, day: weekDays.find((d) => dueOnDay(t, d)) }))
      .filter((x): x is { t: Todo; day: string } => Boolean(x.day))
      .sort((a, b) => (a.day < b.day ? -1 : 1));
    const unscheduled = untimedPending.filter(
      (t) => dueDay(t, today) === null,
    );

    allDayGroups = [
      {
        key: "overdue",
        label: "Overdue",
        chips: [
          ...overdueTodos.map((t) =>
            todoChip(t, format(t.specificDate!, "MMM d")),
          ),
          ...wkMarks
            .filter((m) => m.day < today)
            .map((m) => markChip(m, format(parseISO(m.day), "MMM d"))),
        ],
      },
      {
        key: "today",
        label: "Today",
        chips: [
          ...placed
            .filter((x) => x.day === today)
            .map((x) => todoChip(x.t, null)),
          ...wkMarks
            .filter((m) => m.day === today)
            .map((m) => markChip(m, null)),
        ],
      },
      {
        key: "week",
        label: "This week",
        chips: [
          ...placed
            .filter((x) => x.day !== today)
            .map((x) => todoChip(x.t, format(parseISO(x.day), "EEE"))),
          ...wkMarks
            .filter((m) => m.day > today)
            .map((m) => markChip(m, format(parseISO(m.day), "EEE"))),
        ],
      },
      {
        key: "none",
        label: "Not scheduled",
        chips: unscheduled.map((t) => todoChip(t, null)),
      },
    ].filter((g) => g.chips.length > 0);
  } else {
    const chips: AllDayChip[] = [
      ...untimedPending
        .map((t) => ({ t, day: weekDays.find((d) => dueOnDay(t, d)) }))
        .filter((x): x is { t: Todo; day: string } => Boolean(x.day))
        .sort((a, b) => (a.day < b.day ? -1 : 1))
        .map((x) => todoChip(x.t, format(parseISO(x.day), "EEE"))),
      ...wkMarks.map((m) => markChip(m, format(parseISO(m.day), "EEE"))),
    ];
    allDayGroups = chips.length > 0 ? [{ key: "week", label: null, chips }] : [];
  }

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
        allDayGroups={allDayGroups}
        habits={habitBlocks}
        weekDays={weekDays}
        today={today}
      />
        <EventModal open={open} onOpenChange={setOpen} event={selected} />
      </div>
    </>
  );
}
