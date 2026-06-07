import { z } from "zod";

// Shared validation for the goal form and the server actions. Amounts are
// entered in rand and converted to cents in the action. A target of 0 means
// "unset" and surfaces the "set a target" hint on the card.
export const goalSchema = z.object({
  name: z.string().min(1, "Name the goal"),
  target: z.number().min(0, "Target cannot be negative"),
  current: z.number().min(0, "Saved amount cannot be negative"),
  monthly: z.number().min(0, "Monthly amount cannot be negative"),
});

export type GoalInput = z.infer<typeof goalSchema>;

// Returns progress toward the target as a whole percent, or null when the target
// is unset (so the card shows the "set a target" state, never a divide-by-zero).
export function goalPercent(currentCents: number, targetCents: number): number | null {
  if (targetCents <= 0) return null;
  return Math.round(Math.min(currentCents / targetCents, 1) * 100);
}

// Returns months remaining to reach the target at the monthly contribution rate.
// 0 once reached; null when there is no monthly amount or no target (no ETA).
export function monthsToGoal(
  currentCents: number,
  targetCents: number,
  monthlyCents: number,
): number | null {
  if (targetCents <= 0 || monthlyCents <= 0) return null;
  if (currentCents >= targetCents) return 0;
  return Math.ceil((targetCents - currentCents) / monthlyCents);
}
