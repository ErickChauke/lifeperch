import { describe, it, expect, beforeEach, vi } from "vitest";

// Settlement is the one place plan lines move real money, and it had no test
// coverage because the repo has no Prisma-mocking harness. This file carries a
// small in-memory stand-in for the handful of Prisma calls settle.ts makes, so
// the balances themselves can be asserted rather than the calls.

type GoalRow = { id: string; userId: string; currentAmount: bigint };
type LoanRow = {
  id: string;
  userId: string;
  goalId: string | null;
  principal: number;
  repaid: number;
  settledAt: Date | null;
};
type AmountOp = { increment?: bigint; decrement?: bigint };

const { db, client } = vi.hoisted(() => {
  const db: { goals: GoalRow[]; loans: LoanRow[] } = { goals: [], loans: [] };

  function apply(current: bigint, op: AmountOp): bigint {
    if (op.increment !== undefined) return current + op.increment;
    if (op.decrement !== undefined) return current - op.decrement;
    return current;
  }

  const savingsGoal = {
    findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
      db.goals.find((g) => g.id === where.id && g.userId === where.userId) ?? null,
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { currentAmount: AmountOp };
    }) => {
      const goal = db.goals.find((g) => g.id === where.id);
      if (!goal) throw new Error("goal not found");
      goal.currentAmount = apply(goal.currentAmount, data.currentAmount);
      return goal;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; userId: string };
      data: { currentAmount: AmountOp };
    }) => {
      const rows = db.goals.filter(
        (g) => g.id === where.id && g.userId === where.userId,
      );
      for (const goal of rows) {
        goal.currentAmount = apply(goal.currentAmount, data.currentAmount);
      }
      return { count: rows.length };
    },
  };

  const selfLoan = {
    findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
      db.loans.find((l) => l.id === where.id && l.userId === where.userId) ?? null,
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<LoanRow>;
    }) => {
      const loan = db.loans.find((l) => l.id === where.id);
      if (!loan) throw new Error("loan not found");
      Object.assign(loan, data);
      return loan;
    },
  };

  type Tx = { savingsGoal: typeof savingsGoal; selfLoan: typeof selfLoan };

  const client = {
    savingsGoal,
    selfLoan,
    $transaction: async <T>(fn: (tx: Tx) => Promise<T>) => fn({ savingsGoal, selfLoan }),
  };

  return { db, client };
});

vi.mock("@/lib/prisma", () => ({ prisma: client }));

const { settleItem, unsettleItem } = await import("@/lib/settle");

const USER = "user-1";
const OTHER = "user-2";
const R = (rand: number) => rand * 100; // rand to cents, matching randToCents

function goal(id: string, rand: number, userId = USER): GoalRow {
  return { id, userId, currentAmount: BigInt(R(rand)) };
}

function balance(id: string): number {
  return Number(db.goals.find((g) => g.id === id)!.currentAmount);
}

function loanRow(over: Partial<LoanRow> = {}): LoanRow {
  return {
    id: "loan-1",
    userId: USER,
    goalId: "goal-1",
    principal: R(6000),
    repaid: 0,
    settledAt: null,
    ...over,
  };
}

beforeEach(() => {
  db.goals = [];
  db.loans = [];
});

describe("goal-linked line", () => {
  it("funds the goal when the line is ticked", async () => {
    db.goals = [goal("goal-1", 1000)];
    await settleItem(USER, { loanId: null, goalId: "goal-1", amount: R(500) });
    expect(balance("goal-1")).toBe(R(1500));
  });

  it("takes it back when the line is unticked", async () => {
    db.goals = [goal("goal-1", 1000)];
    const line = { loanId: null, goalId: "goal-1", amount: R(500) };
    await settleItem(USER, line);
    await unsettleItem(USER, line);
    expect(balance("goal-1")).toBe(R(1000));
  });

  // The path updateItem takes on a done line: reverse the old, apply the new.
  // Getting this wrong strands credit, which is what PR #124 fixed.
  it("nets to the new amount when a done line is edited R500 to R800", async () => {
    db.goals = [goal("goal-1", 1000)];
    await settleItem(USER, { loanId: null, goalId: "goal-1", amount: R(500) });
    await unsettleItem(USER, { loanId: null, goalId: "goal-1", amount: R(500) });
    await settleItem(USER, { loanId: null, goalId: "goal-1", amount: R(800) });
    expect(balance("goal-1")).toBe(R(1800));
  });

  it("moves the money across when a done line is re-pointed to another goal", async () => {
    db.goals = [goal("goal-1", 1000), goal("goal-2", 200)];
    await settleItem(USER, { loanId: null, goalId: "goal-1", amount: R(500) });
    await unsettleItem(USER, { loanId: null, goalId: "goal-1", amount: R(500) });
    await settleItem(USER, { loanId: null, goalId: "goal-2", amount: R(500) });
    expect(balance("goal-1")).toBe(R(1000));
    expect(balance("goal-2")).toBe(R(700));
  });

  it("returns the money when every done line of a deleted plan is reversed", async () => {
    db.goals = [goal("goal-1", 1000)];
    const lines = [
      { loanId: null, goalId: "goal-1", amount: R(300) },
      { loanId: null, goalId: "goal-1", amount: R(450) },
    ];
    for (const line of lines) await settleItem(USER, line);
    expect(balance("goal-1")).toBe(R(1750));
    for (const line of lines) await unsettleItem(USER, line);
    expect(balance("goal-1")).toBe(R(1000));
  });

  it("allows an overshoot past the target, since the money genuinely moved", async () => {
    db.goals = [goal("goal-1", 900)];
    await settleItem(USER, { loanId: null, goalId: "goal-1", amount: R(400) });
    expect(balance("goal-1")).toBe(R(1300));
  });

  it("clamps the reversal so a balance never goes negative", async () => {
    db.goals = [goal("goal-1", 100)];
    await unsettleItem(USER, { loanId: null, goalId: "goal-1", amount: R(500) });
    expect(balance("goal-1")).toBe(0);
  });

  it("ignores a zero amount rather than writing a no-op", async () => {
    db.goals = [goal("goal-1", 1000)];
    await settleItem(USER, { loanId: null, goalId: "goal-1", amount: 0 });
    await unsettleItem(USER, { loanId: null, goalId: "goal-1", amount: 0 });
    expect(balance("goal-1")).toBe(R(1000));
  });

  it("leaves another user's goal alone", async () => {
    db.goals = [goal("goal-1", 1000, OTHER)];
    await settleItem(USER, { loanId: null, goalId: "goal-1", amount: R(500) });
    expect(balance("goal-1")).toBe(R(1000));
  });
});

describe("loan-linked line", () => {
  it("repays the loan and credits its source goal", async () => {
    db.goals = [goal("goal-1", 1000)];
    db.loans = [loanRow()];
    await settleItem(USER, { loanId: "loan-1", goalId: null, amount: R(500) });
    expect(db.loans[0].repaid).toBe(R(500));
    expect(balance("goal-1")).toBe(R(1500));
  });

  it("clamps repayment to what is still owed, so a big line cannot overpay", async () => {
    db.goals = [goal("goal-1", 1000)];
    db.loans = [loanRow({ principal: R(600), repaid: R(400) })];
    await settleItem(USER, { loanId: "loan-1", goalId: null, amount: R(500) });
    expect(db.loans[0].repaid).toBe(R(600));
    expect(balance("goal-1")).toBe(R(1200));
  });

  it("stamps settledAt once the principal is covered and clears it on reversal", async () => {
    db.goals = [goal("goal-1", 1000)];
    db.loans = [loanRow({ principal: R(500) })];
    const line = { loanId: "loan-1", goalId: null, amount: R(500) };
    await settleItem(USER, line);
    expect(db.loans[0].settledAt).toBeInstanceOf(Date);
    await unsettleItem(USER, line);
    expect(db.loans[0].settledAt).toBeNull();
    expect(db.loans[0].repaid).toBe(0);
    expect(balance("goal-1")).toBe(R(1000));
  });

  it("clamps the reversal to what was actually repaid", async () => {
    db.goals = [goal("goal-1", 1000)];
    db.loans = [loanRow({ repaid: R(200) })];
    await unsettleItem(USER, { loanId: "loan-1", goalId: null, amount: R(500) });
    expect(db.loans[0].repaid).toBe(0);
    expect(balance("goal-1")).toBe(R(800));
  });

  it("moves no goal when the loan was taken against general savings", async () => {
    db.goals = [goal("goal-1", 1000)];
    db.loans = [loanRow({ goalId: null })];
    await settleItem(USER, { loanId: "loan-1", goalId: null, amount: R(500) });
    expect(db.loans[0].repaid).toBe(R(500));
    expect(balance("goal-1")).toBe(R(1000));
  });

  it("takes the loan branch and ignores goalId when a line somehow carries both", async () => {
    db.goals = [goal("goal-1", 1000), goal("goal-2", 100)];
    db.loans = [loanRow()];
    await settleItem(USER, { loanId: "loan-1", goalId: "goal-2", amount: R(500) });
    expect(balance("goal-1")).toBe(R(1500));
    expect(balance("goal-2")).toBe(R(100));
  });

  it("leaves another user's loan alone", async () => {
    db.goals = [goal("goal-1", 1000)];
    db.loans = [loanRow({ userId: OTHER })];
    await settleItem(USER, { loanId: "loan-1", goalId: null, amount: R(500) });
    expect(db.loans[0].repaid).toBe(0);
    expect(balance("goal-1")).toBe(R(1000));
  });
});
