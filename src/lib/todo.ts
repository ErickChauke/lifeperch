import { z } from "zod";
import { dayToDate, dateToDay } from "@/lib/money";
import { timeToMinutes, weekdayIndex } from "@/lib/timetable";

// Priorities and their fixed palette colors, drawn from the status ramp in
// globals.css. The color is derived from the value so the form picks a level,
// never a color. priorityRank orders high first when sorting a list.
export const PRIORITIES = [
  { value: "high", label: "High", color: "#e5644e" },
  { value: "normal", label: "Normal", color: "#5b8cff" },
  { value: "low", label: "Low", color: "#888f99" },
] as const;

export type Priority = (typeof PRIORITIES)[number]["value"];

const PRIORITY_VALUES = PRIORITIES.map((p) => p.value) as [
  Priority,
  ...Priority[],
];

export const priorityRank: Record<string, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

// Returns the palette color for a priority, falling back to the normal blue.
export function priorityColor(priority: string): string {
  return PRIORITIES.find((p) => p.value === priority)?.color ?? "#5b8cff";
}

// Validation for a to-do list: a title and an optional description.
export const todoCollectionSchema = z.object({
  title: z.string().min(1, "Name the list"),
  description: z.string().nullable().optional(),
});

export type TodoCollectionInput = z.infer<typeof todoCollectionSchema>;

// The two completion states. Completion stays a single status/completedAt: a
// recurring todo is only done on the day it was completed (see isDoneToday).
export const STATUSES = ["pending", "done"] as const;
export type Status = (typeof STATUSES)[number];

// Modules a todo can point at, with the route its chip jumps to. hrefBase mirrors
// the href in config/modules.config.ts.
export const LINKABLE_MODULES = [
  { value: "jobs", label: "Applications", hrefBase: "/jobs" },
  { value: "notes", label: "Notes", hrefBase: "/notes" },
  { value: "literature", label: "Literature", hrefBase: "/literature" },
  { value: "money", label: "Money", hrefBase: "/money" },
  { value: "health", label: "Health", hrefBase: "/health" },
  { value: "timeline", label: "Milestones", hrefBase: "/timeline" },
  { value: "timetable", label: "Timetable", hrefBase: "/timetable" },
] as const;

// Returns the link target for a linked module, or null when none is set. The id
// is matched for reverse lookups but not appended to the href: no module has an
// item-level route keyed by it, so the chip lands on the module page.
export function linkHref(
  linkedModule: string | null,
  linkedId: string | null,
): string | null {
  if (!linkedModule) return null;
  const mod = LINKABLE_MODULES.find((m) => m.value === linkedModule);
  if (!mod) return null;
  void linkedId;
  return mod.hrefBase;
}

const timeRegex = /^\d{2}:\d{2}$/;

// Shared validation for the todo form and the server actions. A todo can be
// dateless, tied to a specificDate, or recurring weekly on dayOfWeek. A start
// time needs a day anchor (recurring day or specific date) and an end time.
export const todoSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    notes: z.string().nullable(),
    priority: z.enum(PRIORITY_VALUES),
    tags: z.array(z.string()),
    isRecurring: z.boolean(),
    dayOfWeek: z.number().int().min(0).max(6).nullable(),
    specificDate: z.string().nullable(),
    startTime: z.string().regex(timeRegex, "Use HH:MM").nullable(),
    endTime: z.string().regex(timeRegex, "Use HH:MM").nullable(),
    linkedModule: z.string().nullable(),
    linkedId: z.string().nullable(),
    linkedLabel: z.string().nullable(),
  })
  .refine((d) => (d.isRecurring ? d.dayOfWeek !== null : true), {
    message: "Pick a day of the week",
    path: ["dayOfWeek"],
  })
  .refine((d) => (d.endTime ? !!d.startTime : true), {
    message: "Set a start time first",
    path: ["startTime"],
  })
  .refine(
    (d) =>
      d.startTime && d.endTime
        ? timeToMinutes(d.endTime) > timeToMinutes(d.startTime)
        : true,
    { message: "End time must be after start time", path: ["endTime"] },
  )
  .refine(
    (d) => (d.startTime ? d.isRecurring || !!d.specificDate : true),
    { message: "A timed todo needs a day or a date", path: ["startTime"] },
  );

export type TodoInput = z.infer<typeof todoSchema>;

// The todo fields the pure helpers below read. A full Todo record satisfies it.
type TodoLike = {
  status: string;
  priority: string;
  isRecurring: boolean;
  dayOfWeek: number | null;
  specificDate: Date | null;
  startTime: string | null;
  completedAt: Date | null;
};

// Whole-day difference between two "yyyy-MM-dd" days, computed in UTC.
function dayDiff(from: string, to: string): number {
  return Math.round(
    (dayToDate(to).getTime() - dayToDate(from).getTime()) / 86_400_000,
  );
}

// The day a todo is due as "yyyy-MM-dd", or null when it is a dateless backlog
// item. A recurring todo resolves to its next occurrence on or after today.
export function dueDay(todo: TodoLike, today: string): string | null {
  if (todo.specificDate) return dateToDay(todo.specificDate);
  if (todo.isRecurring && todo.dayOfWeek !== null) {
    const delta = (todo.dayOfWeek - weekdayIndex(dayToDate(today)) + 7) % 7;
    const d = dayToDate(today);
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

// True for a one-off todo whose date has passed and is not yet done. Recurring
// todos never read as overdue, they simply recur.
export function isOverdue(todo: TodoLike, today: string): boolean {
  if (todo.isRecurring || !todo.specificDate) return false;
  if (isDone(todo, today)) return false;
  return dayDiff(today, dateToDay(todo.specificDate)) < 0;
}

export type Bucket = "today" | "tomorrow" | "week" | "later" | "none";

// The day-bucket a todo falls into. Overdue one-offs surface under Today so they
// stay in view.
export function bucketOf(todo: TodoLike, today: string): Bucket {
  const due = dueDay(todo, today);
  if (due === null) return "none";
  const diff = dayDiff(today, due);
  if (diff <= 0) return "today";
  if (diff === 1) return "tomorrow";
  const toSunday = 6 - weekdayIndex(dayToDate(today));
  if (diff <= toSunday) return "week";
  return "later";
}

// True when a todo counts as done today. A one-off stays done; a recurring todo
// is done only on its completedAt day and reverts to pending the next day.
export function isDoneToday(todo: TodoLike, today: string): boolean {
  return (
    todo.status === "done" &&
    todo.completedAt != null &&
    dateToDay(todo.completedAt) === today
  );
}

// The done state used by the UI: persistent for one-offs, day-scoped for
// recurring todos.
export function isDone(todo: TodoLike, today: string): boolean {
  if (todo.status !== "done") return false;
  return todo.isRecurring ? isDoneToday(todo, today) : true;
}

// Sort order within a bucket: overdue first, then timed ascending, then by
// priority, with done todos sinking to the bottom.
export function todoComparator(today: string) {
  return (a: TodoLike, b: TodoLike): number => {
    const doneA = isDone(a, today);
    const doneB = isDone(b, today);
    if (doneA !== doneB) return doneA ? 1 : -1;

    const overdueA = isOverdue(a, today);
    const overdueB = isOverdue(b, today);
    if (overdueA !== overdueB) return overdueA ? -1 : 1;

    if (a.startTime && b.startTime) {
      const diff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      if (diff !== 0) return diff;
    } else if (a.startTime || b.startTime) {
      return a.startTime ? -1 : 1;
    }

    return priorityRank[a.priority] - priorityRank[b.priority];
  };
}

// The buckets in display order with their section labels.
export const BUCKETS: { key: Bucket; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "week", label: "This week" },
  { key: "later", label: "Later" },
  { key: "none", label: "No date" },
];

// Groups todos into the ordered day buckets, each sorted by todoComparator.
export function groupByBucket<T extends TodoLike>(todos: T[], today: string) {
  const compare = todoComparator(today);
  return BUCKETS.map(({ key, label }) => ({
    key,
    label,
    todos: todos.filter((t) => bucketOf(t, today) === key).sort(compare),
  }));
}
