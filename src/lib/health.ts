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
