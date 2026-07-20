import { z } from "zod";
import { MAX_DB_AMOUNT } from "@/lib/currency";

// Shared validation for the loan form and the server actions. Amounts are
// entered in rand and converted to cents in the action. goalId null means the
// loan is taken against general savings rather than a specific goal.
export const loanSchema = z.object({
  title: z.string().min(1, "Name the loan"),
  amount: z
    .number()
    .min(0.01, "Borrow at least something")
    .max(MAX_DB_AMOUNT, "Amount is too large"),
  goalId: z.string().nullable(),
  monthly: z
    .number()
    .min(0, "Monthly amount cannot be negative")
    .max(MAX_DB_AMOUNT, "Amount is too large"),
  extraAmount: z
    .number()
    .min(0, "Extra cannot be negative")
    .max(MAX_DB_AMOUNT, "Amount is too large"),
  extraFrequency: z.enum(["month", "week", "day", "once"]).nullable(),
  extraDate: z.string().nullable(),
  note: z.string().optional(),
});

export type LoanInput = z.infer<typeof loanSchema>;

// Edit form: the principal and source are fixed once borrowed; only the plan
// around the loan can change.
export const loanUpdateSchema = loanSchema.pick({
  title: true,
  monthly: true,
  extraAmount: true,
  extraFrequency: true,
  extraDate: true,
  note: true,
});

export type LoanUpdateInput = z.infer<typeof loanUpdateSchema>;

// Returns the unpaid part of a loan in cents.
export function loanOutstanding(loan: { principal: number; repaid: number }): number {
  return Math.max(loan.principal - loan.repaid, 0);
}

// Returns what is left of the borrowed money to use, in cents. Use is derived
// from the plan lines imported from the loan, so it self-corrects when a line
// changes.
export function loanUnused(loan: { principal: number; used: number }): number {
  return Math.max(loan.principal - loan.used, 0);
}

// Returns how much the plan lines overshoot the principal, in cents. Non-zero
// only when a line was edited upwards after import.
export function loanOverdrawn(loan: { principal: number; used: number }): number {
  return Math.max(loan.used - loan.principal, 0);
}
