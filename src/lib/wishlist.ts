import { z } from "zod";
import { MAX_DB_AMOUNT } from "@/lib/currency";

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

// Shared validation for the new-collection modal. A collection carries the
// category; its wishes inherit it.
export const collectionSchema = z.object({
  title: z.string().min(1, "Name the list"),
  category: z.string().nullable(),
  description: z.string().nullable(),
});

export type CollectionInput = z.infer<typeof collectionSchema>;

// Shared validation for the wish form. Price is entered in rand and converted to
// cents in the action; the category comes from the parent collection.
export const wishlistSchema = z.object({
  name: z.string().min(1, "Name the wish"),
  price: z
    .number()
    .min(0, "Price cannot be negative")
    .max(MAX_DB_AMOUNT, "Price is too large"),
  priority: z.enum(PRIORITY_VALUES),
  note: z.string().nullable(),
});

export type WishlistInput = z.infer<typeof wishlistSchema>;
