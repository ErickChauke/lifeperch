import { z } from "zod";

// Wishes carry a priority that drives card ordering (high first).
export const PRIORITIES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

export type Priority = (typeof PRIORITIES)[number]["value"];

const PRIORITY_VALUES = PRIORITIES.map((p) => p.value) as [Priority, ...Priority[]];

// Sort rank for a priority: high (0) sorts before low (2).
export function priorityRank(priority: string): number {
  const i = PRIORITIES.findIndex((p) => p.value === priority);
  return i === -1 ? PRIORITIES.length : i;
}

// Shared validation for the wish form and the server actions. Price is entered
// in rand and converted to cents in the action.
export const wishlistSchema = z.object({
  name: z.string().min(1, "Name the wish"),
  price: z.number().min(0, "Price cannot be negative"),
  priority: z.enum(PRIORITY_VALUES),
  category: z.string().min(1, "Pick a category"),
  note: z.string().nullable(),
});

export type WishlistInput = z.infer<typeof wishlistSchema>;
