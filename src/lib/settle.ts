import { prisma } from "@/lib/prisma";
import { loanOutstanding } from "@/lib/loans";

// Settling a plan line moves real money. A line pointed at a loan repays it and
// puts the money back into the goal the loan was taken from; a line pointed at a
// goal funds that goal directly. Both are reversible, so un-ticking a line,
// editing its amount or deleting it always leaves the balances where they should
// be. A line carries at most one target, enforced upstream in toItemRecord.

export type SettleTarget = {
  loanId: string | null;
  goalId: string | null;
  amount: number;
};

// Credits the line's amount to whatever it targets. Repayment is clamped to what
// is still owed so a line bigger than the debt cannot overpay it. Goal funding is
// deliberately not clamped: the money genuinely moved, so a goal is allowed to
// hold more than its target and the card shows it past 100%.
export async function settleItem(userId: string, item: SettleTarget) {
  if (item.loanId) {
    const loanId = item.loanId;
    await prisma.$transaction(async (tx) => {
      const loan = await tx.selfLoan.findFirst({ where: { id: loanId, userId } });
      if (!loan) return;
      const paid = Math.min(item.amount, loanOutstanding(loan));
      if (paid <= 0) return;
      const repaid = loan.repaid + paid;
      await tx.selfLoan.update({
        where: { id: loan.id },
        data: { repaid, settledAt: repaid >= loan.principal ? new Date() : null },
      });
      if (loan.goalId) {
        await tx.savingsGoal.updateMany({
          where: { id: loan.goalId, userId },
          data: { currentAmount: { increment: BigInt(paid) } },
        });
      }
    });
    return;
  }

  if (item.goalId && item.amount > 0) {
    await prisma.savingsGoal.updateMany({
      where: { id: item.goalId, userId },
      data: { currentAmount: { increment: BigInt(item.amount) } },
    });
  }
}

// Takes the credit back off when a line is un-ticked, re-pointed or deleted.
// Both sides clamp to what is actually there, so a balance can never go negative
// however the line was edited in between.
export async function unsettleItem(userId: string, item: SettleTarget) {
  if (item.loanId) {
    const loanId = item.loanId;
    await prisma.$transaction(async (tx) => {
      const loan = await tx.selfLoan.findFirst({ where: { id: loanId, userId } });
      if (!loan) return;
      const back = Math.min(item.amount, loan.repaid);
      if (back <= 0) return;
      const repaid = loan.repaid - back;
      await tx.selfLoan.update({
        where: { id: loan.id },
        data: { repaid, settledAt: repaid >= loan.principal ? loan.settledAt : null },
      });
      if (loan.goalId) {
        await tx.savingsGoal.updateMany({
          where: { id: loan.goalId, userId },
          data: { currentAmount: { decrement: BigInt(back) } },
        });
      }
    });
    return;
  }

  if (item.goalId) {
    const goalId = item.goalId;
    await prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findFirst({ where: { id: goalId, userId } });
      if (!goal) return;
      const back = Math.min(item.amount, Number(goal.currentAmount));
      if (back <= 0) return;
      await tx.savingsGoal.update({
        where: { id: goal.id },
        data: { currentAmount: { decrement: BigInt(back) } },
      });
    });
  }
}
