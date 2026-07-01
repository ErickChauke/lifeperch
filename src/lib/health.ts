import { z } from "zod";

const dayRegex = /^\d{4}-\d{2}-\d{2}$/;

// Shared validation for the meal form and the server actions. time is an optional
// "HH:mm" clock string used to sort rows; calories are optional throughout.
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const mealSchema = z.object({
  date: z.string().regex(dayRegex, "Use yyyy-MM-dd"),
  type: z.enum(MEAL_TYPES),
  name: z.string().min(1, "Name the meal"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Use HH:mm")
    .nullable(),
  calories: z.number().int().min(0).nullable(),
});

export type MealInput = z.infer<typeof mealSchema>;

// Per-type label, lucide glyph, and the sensible clock time the modal pre-fills
// when adding to that group.
export const MEAL_TYPE_META: Record<
  MealType,
  { label: string; icon: string; defaultTime: string }
> = {
  breakfast: { label: "Breakfast", icon: "sunrise", defaultTime: "07:30" },
  lunch: { label: "Lunch", icon: "sun", defaultTime: "12:30" },
  dinner: { label: "Dinner", icon: "sunset", defaultTime: "19:00" },
  snack: { label: "Snack", icon: "cookie", defaultTime: "15:30" },
};

// Returns the seven "yyyy-MM-dd" days (Monday first) of the week containing day.
export function weekDays(day: string): string[] {
  const d = new Date(`${day}T00:00:00.000Z`);
  const dow = d.getUTCDay(); // 0 = Sunday
  const back = (dow + 6) % 7; // days since Monday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - back);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setUTCDate(monday.getUTCDate() + i);
    return x.toISOString().slice(0, 10);
  });
}

// Sums calories across meals, returning null when none of them carry a value so
// the UI can degrade to a muted dash rather than show a misleading 0.
export function calorieTotal(meals: { calories: number | null }[]): number | null {
  const withCals = meals.filter((m) => m.calories != null);
  if (withCals.length === 0) return null;
  return withCals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
}

// Meal plans are reusable templates: a plan holds ordered slots (Breakfast,
// Lunch...), each with several swappable options. They live alongside the dated
// meal log above, not replacing it.
export const mealPlanOptionSchema = z.object({
  name: z.string().min(1, "Name the option"),
  calories: z.number().int().min(0).nullable(),
  notes: z.string().nullable(),
});

export const mealPlanSlotSchema = z.object({
  label: z.string().min(1, "Name the slot"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  options: z.array(mealPlanOptionSchema),
});

export const mealPlanSchema = z.object({
  name: z.string().min(1, "Name the plan"),
  notes: z.string().nullable(),
  active: z.boolean(),
  linkedModule: z.string().nullable(),
  linkedId: z.string().nullable(),
  linkedLabel: z.string().nullable(),
  slots: z.array(mealPlanSlotSchema),
});

export type MealPlanInput = z.infer<typeof mealPlanSchema>;

// The slot labels a fresh plan starts with, matching the meal-log groups.
export const DEFAULT_PLAN_SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"];

// Workout routines are reusable templates of ordered exercises. sets/reps/weight
// are all optional so a routine can be as loose as a list of moves.
export const routineExerciseSchema = z.object({
  name: z.string().min(1, "Name the exercise"),
  sets: z.number().int().min(0).nullable(),
  reps: z.number().int().min(0).nullable(),
  weight: z.number().min(0).nullable(),
  notes: z.string().nullable(),
});

export const workoutRoutineSchema = z.object({
  name: z.string().min(1, "Name the routine"),
  notes: z.string().nullable(),
  active: z.boolean(),
  linkedModule: z.string().nullable(),
  linkedId: z.string().nullable(),
  linkedLabel: z.string().nullable(),
  exercises: z.array(routineExerciseSchema),
});

export type WorkoutRoutineInput = z.infer<typeof workoutRoutineSchema>;

// A workout session is a dated log, optionally against a routine. durationMin is
// the session length in minutes.
export const workoutSessionSchema = z.object({
  date: z.string().regex(dayRegex, "Use yyyy-MM-dd"),
  routineId: z.string().nullable(),
  name: z.string().min(1, "Name the session"),
  durationMin: z.number().int().min(0).nullable(),
  notes: z.string().nullable(),
  linkedModule: z.string().nullable(),
  linkedId: z.string().nullable(),
  linkedLabel: z.string().nullable(),
});

export type WorkoutSessionInput = z.infer<typeof workoutSessionSchema>;

// Medicines and supplements. dose and schedule are free text (e.g. "1000 IU",
// "morning, with food"). A taken-today check stores one log row per day.
export const medicineSchema = z.object({
  name: z.string().min(1, "Name it"),
  dose: z.string().nullable(),
  schedule: z.string().nullable(),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
  days: z.array(z.number().int().min(0).max(6)),
  active: z.boolean(),
  linkedModule: z.string().nullable(),
  linkedId: z.string().nullable(),
  linkedLabel: z.string().nullable(),
});

export type MedicineInput = z.infer<typeof medicineSchema>;

// A standing health rule or "don't" (e.g. "no eating mushrooms"). category is an
// optional grouping label; active retires a rule without losing it.
export const healthRuleSchema = z.object({
  text: z.string().min(1, "Write the rule"),
  category: z.string().nullable(),
  active: z.boolean(),
});

export type HealthRuleInput = z.infer<typeof healthRuleSchema>;

// A quick health-journal jotting tied to a day.
export const healthNoteSchema = z.object({
  date: z.string().regex(dayRegex, "Use yyyy-MM-dd"),
  body: z.string().min(1, "Write something"),
});

export type HealthNoteInput = z.infer<typeof healthNoteSchema>;

// Renders a routine's set/rep/weight line, e.g. "4 x 8 · 60kg", skipping the
// parts that are not set.
export function exerciseDetail(ex: {
  sets: number | null;
  reps: number | null;
  weight: number | null;
}): string {
  const parts: string[] = [];
  if (ex.sets != null && ex.reps != null) parts.push(`${ex.sets} x ${ex.reps}`);
  else if (ex.sets != null) parts.push(`${ex.sets} sets`);
  else if (ex.reps != null) parts.push(`${ex.reps} reps`);
  if (ex.weight != null) parts.push(`${ex.weight}kg`);
  return parts.join(" · ");
}
