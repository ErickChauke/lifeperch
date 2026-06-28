import { z } from "zod";

// Shared validation for the habit form and the server actions. A habit is a
// simple check-off ("none", the default) or "count" (toward a daily target);
// target and unit only carry meaning for countable habits. Legacy "boolean"
// habits read as a check-off too. Description is an optional note.
export const HABIT_KINDS = ["none", "count"] as const;
export type HabitKind = (typeof HABIT_KINDS)[number];

export const habitSchema = z.object({
  name: z.string().min(1, "Name a habit to keep"),
  description: z.string().nullable(),
  kind: z.enum(HABIT_KINDS),
  target: z.number().int().min(1),
  unit: z.string().nullable(),
  icon: z.string().nullable(),
});

export type HabitInput = z.infer<typeof habitSchema>;

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
