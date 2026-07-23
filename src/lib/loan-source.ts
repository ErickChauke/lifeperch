import { loanOutstanding } from "@/lib/loans";

// Server-only: re-points a loan at a different savings goal, settling up with
// both. Takes a transaction client so the caller can do it atomically.
//
// A source goal is only ever out by what is still owed. Borrowing took the
// principal out of it and every repayment puts a slice back, so its net position
// is exactly `outstanding`. Re-pointing therefore hands that figure back to the
// old goal and takes the same figure from the new one, which leaves every
// balance where it would have been had the loan been booked against the new goal
// from the start.
//
// A fully repaid loan is square with its source, so moving it moves no money.

type LoanRow = {
  id: string;
  goalId: string | null;
  principal: number;
  repaid: number;
};

type GoalWriter = {
  savingsGoal: {
    findFirst: (args: {
      where: { id: string; userId: string };
    }) => Promise<{ id: string; currentAmount: bigint } | null>;
    updateMany: (args: {
      where: { id: string; userId: string };
      data: { currentAmount: { increment?: bigint; decrement?: bigint } };
    }) => Promise<{ count: number }>;
  };
};

// Moves the loan's source. Returns the amount that changed hands, which is 0
// when nothing was owed or the source did not actually change. Throws when the
// new goal cannot cover what is still owed, before anything is written.
export async function moveLoanSource(
  tx: GoalWriter,
  userId: string,
  loan: LoanRow,
  nextGoalId: string | null,
): Promise<number> {
  const from = loan.goalId ?? null;
  const to = nextGoalId ?? null;
  if (from === to) return 0;

  const owed = loanOutstanding(loan);
  if (owed === 0) return 0;

  // Check the new goal can cover it before touching either side, so a rejected
  // move never leaves the old goal credited.
  if (to) {
    const goal = await tx.savingsGoal.findFirst({ where: { id: to, userId } });
    if (!goal) throw new Error("Goal not found");
    if (Number(goal.currentAmount) < owed)
      throw new Error("That goal does not hold enough to cover what is still owed");
  }

  if (from) {
    await tx.savingsGoal.updateMany({
      where: { id: from, userId },
      data: { currentAmount: { increment: BigInt(owed) } },
    });
  }
  if (to) {
    await tx.savingsGoal.updateMany({
      where: { id: to, userId },
      data: { currentAmount: { decrement: BigInt(owed) } },
    });
  }
  return owed;
}
