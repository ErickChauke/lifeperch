import { z } from "zod";
import { MAX_AMOUNT } from "@/lib/currency";

// Lists deal only in spending categories (re-exported from money, which already
// excludes investing).
export { SPENDING_CATEGORIES } from "@/lib/money";

// Shared validation for the new-list modal. A list carries the category; its
// items inherit it.
export const shoppingListSchema = z.object({
  title: z.string().min(1, "Name the list"),
  category: z.string().min(1, "Pick a category"),
});

export type ShoppingListInput = z.infer<typeof shoppingListSchema>;

// Shared validation for the quick-add row. Price is entered in rand and
// converted to cents in the action; the category comes from the parent list.
export const shoppingItemSchema = z.object({
  name: z.string().min(1, "Name the item"),
  price: z
    .number()
    .min(0, "Price cannot be negative")
    .max(MAX_AMOUNT, "Price is too large"),
  quantity: z.number().int().min(1, "Quantity is at least 1"),
});

export type ShoppingItemInput = z.infer<typeof shoppingItemSchema>;

// Returns the line total in cents for a unit price and quantity.
export function lineTotal(priceCents: number, quantity: number): number {
  return priceCents * quantity;
}
