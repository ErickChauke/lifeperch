import { z } from "zod";
import { addDays } from "date-fns";
import { MAX_AMOUNT } from "@/lib/currency";

// Shared validation for the goal form and the server actions. Amounts are
// entered in rand and converted to cents in the action. A target of 0 means
// "unset" and surfaces the "set a target" hint on the card.
export const goalSchema = z.object({
  name: z.string().min(1, "Name the goal"),
  target: z
    .number()
    .min(0, "Target cannot be negative")
    .max(MAX_AMOUNT, "Amount is too large"),
  current: z
    .number()
    .min(0, "Saved amount cannot be negative")
    .max(MAX_AMOUNT, "Amount is too large"),
  monthly: z
    .number()
    .min(0, "Monthly amount cannot be negative")
    .max(MAX_AMOUNT, "Amount is too large"),
});

export type GoalInput = z.infer<typeof goalSchema>;

// Returns progress toward the target as a whole percent, or null when the target
// is unset (so the card shows the "set a target" state, never a divide-by-zero).
export function goalPercent(currentCents: number, targetCents: number): number | null {
  if (targetCents <= 0) return null;
  return Math.round(Math.min(currentCents / targetCents, 1) * 100);
}

// Returns the fractional months remaining to reach the target at the monthly
// contribution rate. 0 once reached; null when there is no monthly amount or
// no target (no ETA). Callers format the value with formatEta.
export function monthsToGoal(
  currentCents: number,
  targetCents: number,
  monthlyCents: number,
): number | null {
  if (targetCents <= 0 || monthlyCents <= 0) return null;
  if (currentCents >= targetCents) return 0;
  return (targetCents - currentCents) / monthlyCents;
}

const DAYS_PER_MONTH = 365 / 12;

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

// Formats a fractional month count in the largest sensible unit: years from
// 12 months, whole months under a year, weeks under a month, days under a
// week. Years keep one decimal, so 28 months reads "2.3 years".
export function formatEta(months: number): string {
  const days = months * DAYS_PER_MONTH;
  if (Math.round(months) >= 12) {
    const years = Math.round((months / 12) * 10) / 10;
    return plural(years, "year");
  }
  if (months >= 1) return plural(Math.ceil(months), "month");
  if (days >= 7) return plural(Math.max(Math.round(days / 7), 1), "week");
  return plural(Math.max(Math.ceil(days), 1), "day");
}

// Projects the calendar date the goal is reached at the current rate.
export function etaTargetDate(months: number): Date {
  return addDays(new Date(), Math.ceil(months * DAYS_PER_MONTH));
}
