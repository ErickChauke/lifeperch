import { describe, it, expect, beforeEach } from "vitest";
import { moveLoanSource } from "@/lib/loan-source";

// Re-pointing a loan moves real money between goals, and there is no ledger to
// reconcile against, so these assert the balances themselves.
//
// The invariant: a source goal is only ever out by what is still owed. Borrowing
// took the principal out and each repayment puts a slice back. So after a move,
// the old goal must sit exactly where it would have had the loan never touched
// it, and the new goal exactly where it would have been all along.

type GoalRow = { id: string; userId: string; currentAmount: bigint };

const USER = "user-1";
const R = (rand: number) => rand * 100;

const db: { goals: GoalRow[] } = { goals: [] };

const tx = {
  savingsGoal: {
    findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
      db.goals.find((g) => g.id === where.id && g.userId === where.userId) ?? null,
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; userId: string };
      data: { currentAmount: { increment?: bigint; decrement?: bigint } };
    }) => {
      const rows = db.goals.filter(
        (g) => g.id === where.id && g.userId === where.userId,
      );
      for (const goal of rows) {
        if (data.currentAmount.increment !== undefined) {
          goal.currentAmount += data.currentAmount.increment;
        }
        if (data.currentAmount.decrement !== undefined) {
          goal.currentAmount -= data.currentAmount.decrement;
        }
      }
      return { count: rows.length };
    },
  },
};

function goal(id: string, rand: number, userId = USER): GoalRow {
  return { id, userId, currentAmount: BigInt(R(rand)) };
}

function balance(id: string): number {
  return Number(db.goals.find((g) => g.id === id)!.currentAmount);
}

function loan(over: Partial<{ goalId: string | null; principal: number; repaid: number }> = {}) {
  return {
    id: "loan-1",
    goalId: "goal-a" as string | null,
    principal: R(1000),
    repaid: 0,
    ...over,
  };
}

beforeEach(() => {
  db.goals = [goal("goal-a", 5000), goal("goal-b", 5000)];
});

describe("moveLoanSource", () => {
  it("hands the full principal back when nothing has been repaid", async () => {
    const moved = await moveLoanSource(tx, USER, loan(), "goal-b");
    expect(moved).toBe(R(1000));
    expect(balance("goal-a")).toBe(R(6000));
    expect(balance("goal-b")).toBe(R(4000));
  });

  // The old goal is out by the outstanding, not the principal: repayments have
  // already put part of it back. Moving the principal would over-credit it.
  it("moves only what is still owed on a part-repaid loan", async () => {
    const moved = await moveLoanSource(tx, USER, loan({ repaid: R(400) }), "goal-b");
    expect(moved).toBe(R(600));
    expect(balance("goal-a")).toBe(R(5600));
    expect(balance("goal-b")).toBe(R(4400));
  });

  it("moves nothing for a fully repaid loan, since it is already square", async () => {
    const moved = await moveLoanSource(tx, USER, loan({ repaid: R(1000) }), "goal-b");
    expect(moved).toBe(0);
    expect(balance("goal-a")).toBe(R(5000));
    expect(balance("goal-b")).toBe(R(5000));
  });

  it("only charges the new goal when the loan had no goal", async () => {
    const moved = await moveLoanSource(tx, USER, loan({ goalId: null }), "goal-b");
    expect(moved).toBe(R(1000));
    expect(balance("goal-b")).toBe(R(4000));
    expect(balance("goal-a")).toBe(R(5000));
  });

  it("only credits the old goal when moving to no goal", async () => {
    const moved = await moveLoanSource(tx, USER, loan(), null);
    expect(moved).toBe(R(1000));
    expect(balance("goal-a")).toBe(R(6000));
    expect(balance("goal-b")).toBe(R(5000));
  });

  it("does nothing when the source has not actually changed", async () => {
    const moved = await moveLoanSource(tx, USER, loan(), "goal-a");
    expect(moved).toBe(0);
    expect(balance("goal-a")).toBe(R(5000));
  });

  it("does nothing when both sides are no goal", async () => {
    const moved = await moveLoanSource(tx, USER, loan({ goalId: null }), null);
    expect(moved).toBe(0);
  });

  // A rejected move must write nothing at all, or the old goal keeps a credit
  // for a debt it no longer carries.
  it("refuses a goal that cannot cover the debt, leaving both balances untouched", async () => {
    db.goals = [goal("goal-a", 5000), goal("goal-b", 100)];
    await expect(moveLoanSource(tx, USER, loan(), "goal-b")).rejects.toThrow(
      /does not hold enough/,
    );
    expect(balance("goal-a")).toBe(R(5000));
    expect(balance("goal-b")).toBe(R(100));
  });

  it("accepts a goal holding exactly what is owed", async () => {
    db.goals = [goal("goal-a", 5000), goal("goal-b", 1000)];
    const moved = await moveLoanSource(tx, USER, loan(), "goal-b");
    expect(moved).toBe(R(1000));
    expect(balance("goal-b")).toBe(0);
  });

  it("rejects a goal that is not the user's", async () => {
    db.goals = [goal("goal-a", 5000), goal("goal-b", 5000, "user-2")];
    await expect(moveLoanSource(tx, USER, loan(), "goal-b")).rejects.toThrow(
      /not found/,
    );
    expect(balance("goal-a")).toBe(R(5000));
  });

  // Moving there and back must leave both balances exactly where they started.
  it("is reversible", async () => {
    const original = loan({ repaid: R(250) });
    await moveLoanSource(tx, USER, original, "goal-b");
    await moveLoanSource(tx, USER, { ...original, goalId: "goal-b" }, "goal-a");
    expect(balance("goal-a")).toBe(R(5000));
    expect(balance("goal-b")).toBe(R(5000));
  });
});
