import { z } from "zod";

// Money is stored in cents (integer) everywhere in the database and converted
// to rand at the form/display boundary, so there is no floating-point drift.
export function randToCents(rand: number): number {
  return Math.round(rand * 100);
}

export function centsToRand(cents: number): number {
  return cents / 100;
}

// The "yyyy-MM-dd" <-> UTC-midnight Date helpers for the @db.Date column, so the
// stored day never drifts with the local timezone (same convention as journal).
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function dateToDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Investing is carried by this expense category and reframed on the dashboard as
// its own figure, excluded from the spending donut and the SPENT total.
export const INVESTMENT_CATEGORY = "Investment";

// Category presets. value doubles as the stored string and the label; icon is a
// lucide-react name mapped to a component in the UI (see modules/money).
export const EXPENSE_CATEGORIES = [
  { value: "Groceries", icon: "shopping-cart" },
  { value: "Rent", icon: "house" },
  { value: "Transport", icon: "car" },
  { value: "Eating out", icon: "utensils" },
  { value: "Utilities", icon: "plug" },
  { value: "Health", icon: "heart-pulse" },
  { value: "Entertainment", icon: "clapperboard" },
  { value: "Shopping", icon: "shopping-bag" },
  { value: INVESTMENT_CATEGORY, icon: "trending-up" },
  { value: "Other", icon: "circle-dashed" },
] as const;

export const INCOME_CATEGORIES = [
  { value: "Salary", icon: "wallet" },
  { value: "Freelance", icon: "laptop" },
  { value: "Gift", icon: "gift" },
  { value: "Refund", icon: "rotate-ccw" },
  { value: "Other", icon: "circle-dashed" },
] as const;

// Spending categories are the expense categories minus investing — used by the
// shopping list and wishlist, which never deal in investments.
export const SPENDING_CATEGORIES = EXPENSE_CATEGORIES.filter(
  (c) => c.value !== INVESTMENT_CATEGORY,
);

// Returns the lucide icon name for a category, falling back to a neutral glyph.
export function categoryIcon(category: string): string {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  return all.find((c) => c.value === category)?.icon ?? "circle-dashed";
}

// Returns the category list for a transaction type.
export function categoriesFor(type: "income" | "expense") {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

// Shared validation for the transaction form and the server actions. The amount
// is entered in rand and converted to cents in the action.
export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive("Enter an amount greater than 0"),
  category: z.string().min(1, "Pick a category"),
  date: z.string().regex(dateRegex, "Use yyyy-MM-dd"),
  description: z.string().nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
