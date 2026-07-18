import { z } from "zod";
import { MAX_AMOUNT } from "@/lib/currency";

// Money is stored in cents (integer) everywhere in the database and converted
// to rand at the form/display boundary, so there is no floating-point drift.
export function randToCents(rand: number): number {
  return Math.round(rand * 100);
}

export function centsToRand(cents: number): number {
  return cents / 100;
}

// Strips a leading minus so a number input can never hold a negative value.
// Used on the onChange of money/quantity inputs together with min="0".
export function stripNegative(value: string): string {
  return value.replace(/-/g, "");
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
export const INVESTMENT_CATEGORY = "Investments";

// Category presets. value doubles as the stored string and the label; icon is a
// lucide-react name mapped to a component in the UI (see modules/money). hue is
// the category's soft tint (degrees); Other stays neutral with no hue.
export const EXPENSE_CATEGORIES = [
  { value: "Groceries", icon: "shopping-cart", hue: 130 },
  { value: "Rent / Mortgage", icon: "house", hue: 25 },
  { value: "Transport", icon: "car", hue: 215 },
  { value: "Eating Out", icon: "utensils", hue: 40 },
  { value: "Utilities", icon: "plug", hue: 55 },
  { value: "Phone & Internet", icon: "wifi", hue: 190 },
  { value: "Health", icon: "heart-pulse", hue: 345 },
  { value: "Education", icon: "graduation-cap", hue: 260 },
  { value: "Shopping", icon: "shopping-bag", hue: 315 },
  { value: "Entertainment", icon: "clapperboard", hue: 280 },
  { value: "Work Expenses", icon: "briefcase", hue: 230 },
  { value: "Childcare / Family", icon: "baby", hue: 20 },
  { value: "Pets", icon: "paw-print", hue: 95 },
  { value: "Travel", icon: "plane", hue: 200 },
  { value: "Gifts & Donations", icon: "gift", hue: 330 },
  { value: "Debt Repayments", icon: "credit-card", hue: 10 },
  { value: "Savings", icon: "piggy-bank", hue: 160 },
  { value: INVESTMENT_CATEGORY, icon: "trending-up", hue: 170 },
  { value: "Insurance", icon: "umbrella", hue: 245 },
  { value: "Taxes", icon: "landmark", hue: 70 },
  { value: "Banking Fees", icon: "banknote", hue: 205 },
  { value: "Maintenance & Repairs", icon: "wrench", hue: 30 },
  { value: "Subscriptions", icon: "repeat", hue: 265 },
  { value: "Other", icon: "circle-dashed" },
] as const;

export const INCOME_CATEGORIES = [
  { value: "Salary", icon: "wallet", hue: 145 },
  { value: "Freelance", icon: "laptop", hue: 210 },
  { value: "Gift", icon: "gift", hue: 330 },
  { value: "Refund", icon: "rotate-ccw", hue: 185 },
  { value: "Other", icon: "circle-dashed" },
] as const;

// Spending categories are the expense categories minus investing - used by the
// shopping list and wishlist, which never deal in investments.
export const SPENDING_CATEGORIES = EXPENSE_CATEGORIES.filter(
  (c) => c.value !== INVESTMENT_CATEGORY,
);

// Returns the lucide icon name for a category, falling back to a neutral glyph.
export function categoryIcon(category: string): string {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  return all.find((c) => c.value === category)?.icon ?? "circle-dashed";
}

// Returns the tint hue for a category, or null for Other/unknown (neutral).
export function categoryHue(category: string): number | null {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const preset = all.find((c) => c.value === category);
  return preset && "hue" in preset ? preset.hue : null;
}

// Returns the category list for a transaction type.
export function categoriesFor(type: "income" | "expense") {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

// Shared validation for the transaction form and the server actions. The amount
// is entered in rand and converted to cents in the action.
export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .number()
    .positive("Enter an amount greater than 0")
    .max(MAX_AMOUNT, "Amount is too large"),
  category: z.string().min(1, "Pick a category"),
  date: z.string().regex(dateRegex, "Use yyyy-MM-dd"),
  description: z.string().nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
