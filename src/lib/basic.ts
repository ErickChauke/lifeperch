import { z } from "zod";
import { MAX_DB_AMOUNT } from "@/lib/currency";

// The cadences a fixed item can repeat on. value is the stored string; the Basic
// page normalises each to a monthly figure for its summary.
export const FREQUENCIES = [
  { value: "month", label: "Monthly", short: "mo" },
  { value: "week", label: "Weekly", short: "wk" },
  { value: "day", label: "Daily", short: "day" },
] as const;

export type Frequency = (typeof FREQUENCIES)[number]["value"];

// Average weeks and days per month, used to put weekly and daily amounts on the
// same monthly scale (52 weeks and 365 days spread over 12 months).
const WEEKS_PER_MONTH = 52 / 12;
const DAYS_PER_MONTH = 365 / 12;

// Converts a cents amount at some cadence into its monthly-equivalent cents, so
// daily, weekly and monthly items can be summed on one scale. Rounded to cents.
export function monthlyEquivalent(amountCents: number, frequency: string): number {
  if (frequency === "week") return Math.round(amountCents * WEEKS_PER_MONTH);
  if (frequency === "day") return Math.round(amountCents * DAYS_PER_MONTH);
  return amountCents;
}

// Returns the short cadence suffix for a frequency (e.g. "mo"), month as fallback.
export function frequencyShort(frequency: string): string {
  return FREQUENCIES.find((f) => f.value === frequency)?.short ?? "mo";
}

// Returns the full cadence label for a frequency (e.g. "Monthly").
export function frequencyLabel(frequency: string): string {
  return FREQUENCIES.find((f) => f.value === frequency)?.label ?? "Monthly";
}

// Shared validation for the fixed-item form and its server actions. The amount is
// entered in rand and converted to cents in the action.
export const fixedItemSchema = z.object({
  kind: z.enum(["income", "expense"]),
  category: z.string().min(1, "Pick a category"),
  title: z.string().min(1, "Give it a name").max(80, "Keep the name shorter"),
  amount: z
    .number()
    .positive("Enter an amount greater than 0")
    .max(MAX_DB_AMOUNT, "Amount is too large"),
  frequency: z.enum(["month", "week", "day"]),
  note: z.string().nullable(),
});

export type FixedItemInput = z.infer<typeof fixedItemSchema>;
