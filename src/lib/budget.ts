import { z } from "zod";
import { MAX_AMOUNT } from "@/lib/currency";
import {
  parseISO,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  addWeeks,
  addDays,
  differenceInCalendarDays,
} from "date-fns";

const dayRegex = /^\d{4}-\d{2}-\d{2}$/;

// The period a plan covers. "custom" lets the user pick both ends; "month" and
// "week" snap to calendar bounds from a chosen anchor day.
export const PERIOD_TYPES = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "custom", label: "Custom" },
] as const;

export type PeriodType = (typeof PERIOD_TYPES)[number]["value"];

// A plan: a title and a period the actual-spend match runs over.
export const planSchema = z.object({
  title: z.string().min(1, "Name the plan"),
  periodType: z.enum(["month", "week", "custom"]),
  startDate: z.string().regex(dayRegex, "Use yyyy-MM-dd"),
  endDate: z.string().regex(dayRegex, "Use yyyy-MM-dd"),
});

export type PlanInput = z.infer<typeof planSchema>;

// A plan line: expected money in (income) or a planned allocation (expense).
// category matches the transaction categories so actuals can be summed by it.
// An expense line may instead fund a savings goal (goalId).
export const budgetItemSchema = z.object({
  kind: z.enum(["income", "expense"]),
  category: z.string().min(1, "Pick a category"),
  title: z.string().nullable().optional(),
  amount: z
    .number()
    .positive("Enter an amount greater than 0")
    .max(MAX_AMOUNT, "Amount is too large"),
  note: z.string().nullable().optional(),
  goalId: z.string().nullable().optional(),
});

export type BudgetItemInput = z.infer<typeof budgetItemSchema>;

// Returns the {start, end} day strings for a period type anchored on a day. For
// "custom" the end equals the anchor and the caller supplies its own end.
export function periodRange(
  type: PeriodType,
  anchor: string,
): { start: string; end: string } {
  const d = parseISO(anchor);
  if (type === "month") {
    return { start: day(startOfMonth(d)), end: day(endOfMonth(d)) };
  }
  if (type === "week") {
    return {
      start: day(startOfWeek(d, { weekStartsOn: 1 })),
      end: day(endOfWeek(d, { weekStartsOn: 1 })),
    };
  }
  return { start: anchor, end: anchor };
}

// A sensible default title for a freshly chosen period.
export function defaultTitle(type: PeriodType, start: string, end: string): string {
  if (type === "month") return format(parseISO(start), "MMMM yyyy");
  if (type === "week") return `Week of ${format(parseISO(start), "dd MMM")}`;
  return `${format(parseISO(start), "dd MMM")} - ${format(parseISO(end), "dd MMM")}`;
}

// A compact label for a plan's date range, e.g. "01 - 30 Jun 2026". Date inputs
// (stored @db.Date, UTC midnight) are read on their UTC calendar day so the label
// never drifts a day in a local timezone.
export function periodLabel(start: Date | string, end: Date | string): string {
  const s = parseISO(typeof start === "string" ? start : start.toISOString().slice(0, 10));
  const e = parseISO(typeof end === "string" ? end : end.toISOString().slice(0, 10));
  const sameMonth = format(s, "MMM yyyy") === format(e, "MMM yyyy");
  return sameMonth
    ? `${format(s, "dd")} - ${format(e, "dd MMM yyyy")}`
    : `${format(s, "dd MMM")} - ${format(e, "dd MMM yyyy")}`;
}

// The period that follows the given one: the next month/week, or for a custom
// range the same length shifted to start the day after it ends. Used to template
// a plan into the next period. Inputs may be day strings or @db.Date values.
export function nextPeriod(
  type: PeriodType,
  start: Date | string,
  end: Date | string,
): { start: string; end: string } {
  const s = parseISO(typeof start === "string" ? start : start.toISOString().slice(0, 10));
  const e = parseISO(typeof end === "string" ? end : end.toISOString().slice(0, 10));
  if (type === "month") {
    const next = addMonths(s, 1);
    return { start: day(startOfMonth(next)), end: day(endOfMonth(next)) };
  }
  if (type === "week") {
    return { start: day(addWeeks(s, 1)), end: day(addWeeks(e, 1)) };
  }
  const lengthDays = differenceInCalendarDays(e, s);
  const newStart = addDays(e, 1);
  return { start: day(newStart), end: day(addDays(newStart, lengthDays)) };
}

function day(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
