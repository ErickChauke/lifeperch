import { z } from "zod";
import { WEEKDAYS } from "@/lib/timetable";

// Shared validation for the habit form and the server actions. A habit is a
// simple check-off ("none", the default) or "count" (toward a daily target);
// target and unit only carry meaning for countable habits. Legacy "boolean"
// habits read as a check-off too. Description is an optional note.
export const HABIT_KINDS = ["none", "count"] as const;
export type HabitKind = (typeof HABIT_KINDS)[number];

const timeRegex = /^\d{2}:\d{2}$/;

// A habit can recur every day, on specific weekdays, or a number of times a week
// (flexible days). startTime gives it a slot; startDate is when tracking begins.
// A habit can also point at another module (e.g. a todo) via the linked fields.
export const habitSchema = z
  .object({
    name: z.string().min(1, "Name a habit to keep"),
    description: z.string().nullable(),
    kind: z.enum(HABIT_KINDS),
    target: z.number().int().min(1),
    unit: z.string().nullable(),
    icon: z.string().nullable(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)),
    weeklyTarget: z.number().int().min(1).max(7).nullable(),
    startTime: z.string().regex(timeRegex, "Use HH:MM").nullable(),
    endTime: z.string().regex(timeRegex, "Use HH:MM").nullable(),
    startDate: z.string().nullable(),
    linkedModule: z.string().nullable(),
    linkedId: z.string().nullable(),
    linkedLabel: z.string().nullable(),
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
  );

export type HabitInput = z.infer<typeof habitSchema>;

// "HH:MM" to minutes since midnight.
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// The lucide icons offered in the habit modal as a label aid (never a status).
// Names map to components in habit-icon.tsx.
export const HABIT_ICONS = [
  "check-circle",
  "droplet",
  "book-open",
  "dumbbell",
  "pen-line",
  "heart",
  "moon",
  "sun",
  "coffee",
  "apple",
  "footprints",
  "brain",
  "music",
  "leaf",
  "bike",
  "code",
  "sparkles",
  "alarm-clock",
] as const;

// The fields the schedule helpers read; a full Habit record satisfies it.
type HabitSchedule = {
  daysOfWeek: number[];
  weeklyTarget: number | null;
  startDate: Date | null;
};

export type FrequencyMode = "daily" | "days" | "weekly";

// Which scheduling mode a habit uses, derived from its fields.
export function frequencyMode(h: HabitSchedule): FrequencyMode {
  if (h.weeklyTarget != null) return "weekly";
  if (h.daysOfWeek.length > 0) return "days";
  return "daily";
}

// Monday-first weekday index (0=Mon...6=Sun) of a "yyyy-MM-dd" day, in UTC.
function weekdayOf(day: string): number {
  const dow = new Date(`${day}T00:00:00.000Z`).getUTCDay();
  return (dow + 6) % 7;
}

// True when a habit is expected on a given "yyyy-MM-dd": before its start date it
// is never expected; a weekly (flexible) habit is eligible any day; a weekday
// habit only on its days; a daily habit every day.
export function isHabitExpected(h: HabitSchedule, day: string): boolean {
  if (h.startDate && day < h.startDate.toISOString().slice(0, 10)) return false;
  if (h.weeklyTarget != null) return true;
  if (h.daysOfWeek.length > 0) return h.daysOfWeek.includes(weekdayOf(day));
  return true;
}

// A short human label for a habit's cadence, e.g. "Daily", "Mon, Wed, Fri",
// "4x / week".
export function frequencyLabel(h: HabitSchedule): string {
  if (h.weeklyTarget != null) return `${h.weeklyTarget}x / week`;
  if (h.daysOfWeek.length > 0) {
    return [...h.daysOfWeek]
      .sort((a, b) => a - b)
      .map((d) => WEEKDAYS[d].slice(0, 3))
      .join(", ");
  }
  return "Daily";
}

// True when a day's logged value counts the habit as done: any tick for a simple
// check-off, reaching the target for a countable.
export function habitMet(value: number, kind: string, target: number): boolean {
  return kind === "count" ? value >= Math.max(1, target) : value >= 1;
}

// Returns the previous "yyyy-MM-dd" day, computed in UTC so it never drifts.
function prevDay(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// The last n days ending at today as "yyyy-MM-dd", oldest first. Used to draw a
// habit's recent consistency at a glance.
export function lastNDays(today: string, n: number): string[] {
  const out: string[] = [];
  const base = new Date(`${today}T00:00:00.000Z`);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// The days of the current week so far, Monday through today, as "yyyy-MM-dd".
export function currentWeekDays(today: string): string[] {
  return lastNDays(today, weekdayOf(today) + 1);
}

// Counts consecutive met days ending at today, considering only days the habit
// is expected on (off days neither count nor break the run). Today not yet met
// keeps the run alive rather than zeroing it mid-day.
export function computeStreak(
  metDays: Set<string>,
  today: string,
  isExpected: (day: string) => boolean = () => true,
): number {
  let cursor = today;
  let streak = 0;
  let isToday = true;
  for (let guard = 0; guard < 400; guard++) {
    if (isExpected(cursor)) {
      if (metDays.has(cursor)) streak++;
      else if (!isToday) break;
    }
    isToday = false;
    cursor = prevDay(cursor);
  }
  return streak;
}
