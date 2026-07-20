"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  loanSchema,
  loanUpdateSchema,
  loanOutstanding,
  type LoanInput,
  type LoanUpdateInput,
} from "@/lib/loans";
import { toExtraRecord } from "@/lib/extra";
import { randToCents } from "@/lib/money";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function revalidateLoans() {
  revalidatePath("/money");
  revalidatePath("/money/loans");
  revalidatePath("/money/goals");
  revalidatePath("/dashboard");
}

// Fetches the user's loans, open first, newest first within each group. Each loan
// carries what has been used from it: the sum of the plan lines imported from it,
// so the figure follows edits to those lines with no extra bookkeeping.
export async function getLoans() {
  const userId = await requireUserId();
  const loans = await prisma.selfLoan.findMany({
    where: { userId },
    orderBy: [{ settledAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    include: { goal: { select: { id: true, name: true } } },
  });
  if (loans.length === 0) return [];

  const drawn = await prisma.budgetItem.groupBy({
    by: ["originId"],
    where: { userId, originType: "loan", originId: { in: loans.map((l) => l.id) } },
    _sum: { amount: true },
  });
  const byLoan = new Map(drawn.map((d) => [d.originId, d._sum.amount ?? 0]));
  return loans.map((l) => ({ ...l, used: byLoan.get(l.id) ?? 0 }));
}

// Borrows from yourself. A goal-sourced loan moves the amount out of the
// goal's balance, so the borrow cannot exceed what the goal holds.
export async function createLoan(input: LoanInput) {
  const userId = await requireUserId();
  const data = loanSchema.parse(input);
  const principal = randToCents(data.amount);

  await prisma.$transaction(async (tx) => {
    if (data.goalId) {
      const goal = await tx.savingsGoal.findFirst({
        where: { id: data.goalId, userId },
      });
      if (!goal) throw new Error("Goal not found");
      if (Number(goal.currentAmount) < principal)
        throw new Error("The goal does not hold that much");
      await tx.savingsGoal.update({
        where: { id: goal.id },
        data: { currentAmount: { decrement: BigInt(principal) } },
      });
    }
    await tx.selfLoan.create({
      data: {
        userId,
        goalId: data.goalId,
        title: data.title.trim(),
        principal,
        monthlyAmount: randToCents(data.monthly),
        ...toExtraRecord(data),
        note: data.note?.trim() || null,
      },
    });
  });
  revalidateLoans();
}

// Records a repayment. Goal-sourced repayments flow back into the goal's
// balance; the loan settles once fully repaid. Over-payment is clamped.
export async function repayLoan(id: string, amountRand: number) {
  const userId = await requireUserId();
  const amount = randToCents(amountRand);
  if (amount <= 0) throw new Error("Repay at least something");

  await prisma.$transaction(async (tx) => {
    const loan = await tx.selfLoan.findFirst({ where: { id, userId } });
    if (!loan || loan.settledAt) throw new Error("Loan not found");
    const paid = Math.min(amount, loanOutstanding(loan));
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
  revalidateLoans();
}

// Updates the plan around a loan. The principal and source stay fixed.
export async function updateLoan(id: string, input: LoanUpdateInput) {
  const userId = await requireUserId();
  const data = loanUpdateSchema.parse(input);
  await prisma.selfLoan.updateMany({
    where: { id, userId },
    data: {
      title: data.title.trim(),
      monthlyAmount: randToCents(data.monthly),
      ...toExtraRecord(data),
      note: data.note?.trim() || null,
    },
  });
  revalidateLoans();
}

// Deletes a loan record. An unsettled balance is written off, not returned to
// the source goal - the money was spent.
export async function deleteLoan(id: string) {
  const userId = await requireUserId();
  await prisma.selfLoan.deleteMany({ where: { id, userId } });
  revalidateLoans();
}
