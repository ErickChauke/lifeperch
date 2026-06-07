import { z } from "zod";

// The shopping list deals only in spending categories (re-exported from money,
// which already excludes investing).
export { SPENDING_CATEGORIES } from "@/lib/money";

// Shared validation for the quick-add row and the server actions. Price is
// entered in rand and converted to cents in the action.
export const shoppingSchema = z.object({
  name: z.string().min(1, "Name the item"),
  price: z.number().min(0, "Price cannot be negative"),
  category: z.string().min(1, "Pick a category"),
  quantity: z.number().int().min(1, "Quantity is at least 1"),
});

export type ShoppingInput = z.infer<typeof shoppingSchema>;

// Returns the line total in cents for a unit price and quantity.
export function lineTotal(priceCents: number, quantity: number): number {
  return priceCents * quantity;
}
