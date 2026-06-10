import { z } from "zod";

// Shared validation for the habit form and the server actions. A habit is either
// "boolean" (done / not done) or "count" (toward a daily target). target and unit
// only carry meaning for countable habits.
export const HABIT_KINDS = ["boolean", "count"] as const;
export type HabitKind = (typeof HABIT_KINDS)[number];

export const habitSchema = z.object({
  name: z.string().min(1, "Name a habit to keep"),
  kind: z.enum(HABIT_KINDS),
  target: z.number().int().min(1),
  unit: z.string().nullable(),
  icon: z.string().nullable(),
});

export type HabitInput = z.infer<typeof habitSchema>;

// The lucide icons offered in the habit modal as a label aid (never a status).
export const HABIT_ICONS = [
  "check-circle",
  "droplet",
  "book-open",
  "dumbbell",
  "pen-line",
] as const;

// True when a day's logged value counts the habit as done: any tick for a boolean,
// reaching the target for a countable.
export function habitMet(value: number, kind: string, target: number): boolean {
  return kind === "count" ? value >= Math.max(1, target) : value >= 1;
}

// Returns the previous "yyyy-MM-dd" day, computed in UTC so it never drifts.
function prevDay(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Counts consecutive met days ending at today. Today not yet met keeps the run
// alive (counts back from yesterday) rather than zeroing it mid-day.
export function computeStreak(metDays: Set<string>, today: string): number {
  let cursor = metDays.has(today) ? today : prevDay(today);
  let streak = 0;
  while (metDays.has(cursor)) {
    streak++;
    cursor = prevDay(cursor);
  }
  return streak;
}
