import { differenceInCalendarDays } from "date-fns";
import { monthlyEquivalent } from "@/lib/basic";
import { randToCents, dayToDate } from "@/lib/money";

// An optional second contribution alongside the monthly one. It either repeats
// on a cadence or arrives once on a date, e.g. an expected payment from work.
export const EXTRA_FREQUENCIES = [
  { value: "month", label: "Every month" },
  { value: "week", label: "Every week" },
  { value: "day", label: "Every day" },
  { value: "once", label: "Once, on a date" },
] as const;

export type ExtraFrequency = (typeof EXTRA_FREQUENCIES)[number]["value"];

export type ExtraPlan = {
  extraAmount: number;
  extraFrequency: string | null;
  extraDate: Date | null;
};

const DAYS_PER_MONTH = 365 / 12;

// Maps the extra fields from a form to what is stored. An extra with no amount
// clears the cadence, and only a one-off keeps a date, so a stale date can
// never linger on a repeating extra. Amount comes in as rand, stored as cents.
export function toExtraRecord(data: {
  extraAmount: number;
  extraFrequency: string | null;
  extraDate: string | null;
}) {
  const cents = randToCents(data.extraAmount);
  const frequency = cents > 0 && data.extraFrequency ? data.extraFrequency : null;
  return {
    extraAmount: cents,
    extraFrequency: frequency,
    extraDate:
      frequency === "once" && data.extraDate ? dayToDate(data.extraDate) : null,
  };
}

// Returns the cents a repeating extra adds each month. A one-off adds nothing
// to the rate; it lands as a lump on its date instead.
export function extraMonthly(plan: ExtraPlan): number {
  if (plan.extraAmount <= 0 || !plan.extraFrequency) return 0;
  if (plan.extraFrequency === "once") return 0;
  return monthlyEquivalent(plan.extraAmount, plan.extraFrequency);
}

// Returns the one-off lump and how many months out it is, or null when the plan
// has no one-off. A date already past counts as landing now.
function lump(plan: ExtraPlan, today: Date): { amount: number; months: number } | null {
  if (plan.extraAmount <= 0 || plan.extraFrequency !== "once" || !plan.extraDate) {
    return null;
  }
  const days = Math.max(differenceInCalendarDays(plan.extraDate, today), 0);
  return { amount: plan.extraAmount, months: days / DAYS_PER_MONTH };
}

// Returns the months needed to clear `remaining` cents at `monthly` cents a
// month plus the extra plan, or null when nothing is going in. A one-off only
// helps from the date it lands, so the estimate is piecewise, not a flat divide.
export function monthsToClear(
  remaining: number,
  monthly: number,
  plan: ExtraPlan,
  today: Date = new Date(),
): number | null {
  if (remaining <= 0) return 0;
  const rate = monthly + extraMonthly(plan);
  const one = lump(plan, today);

  if (!one) return rate > 0 ? remaining / rate : null;
  if (rate <= 0) return one.amount >= remaining ? one.months : null;

  // Cleared on the monthly rate alone before the lump ever arrives.
  const plain = remaining / rate;
  if (plain <= one.months) return plain;

  const leftover = remaining - (rate * one.months + one.amount);
  return leftover <= 0 ? one.months : one.months + leftover / rate;
}

// Returns a short description of the extra for the cards, or null when there is
// no extra set.
export function extraLabel(plan: ExtraPlan, format: (cents: number) => string): string | null {
  if (plan.extraAmount <= 0 || !plan.extraFrequency) return null;
  const amount = format(plan.extraAmount);
  if (plan.extraFrequency === "once") return `${amount} once`;
  if (plan.extraFrequency === "week") return `${amount} weekly`;
  if (plan.extraFrequency === "day") return `${amount} daily`;
  return `${amount} monthly`;
}
