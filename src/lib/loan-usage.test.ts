import { describe, it, expect, beforeEach, vi } from "vitest";

// A loan's "used" is derived by summing every row that draws from it, across two
// tables. Getting this wrong lets a loan be over-drawn across the plan and
// shopping modules, so the merge is asserted directly against an in-memory
// stand-in for the two groupBy queries (same harness style as settle.test.ts).

type Row = {
  userId: string;
  originType: string | null;
  originId: string | null;
  amount: number;
};

const { db, client } = vi.hoisted(() => {
  const db: { budget: Row[]; shopping: Row[] } = { budget: [], shopping: [] };

  // Minimal groupBy: filter by the where, group by originId, sum one field.
  function groupBy(
    rows: Row[],
    where: { userId: string; originType: string; originId: { in: string[] } },
    field: "amount" | "price",
  ) {
    const ids = new Set(where.originId.in);
    const totals = new Map<string, number>();
    for (const r of rows) {
      if (r.userId !== where.userId) continue;
      if (r.originType !== where.originType) continue;
      if (!r.originId || !ids.has(r.originId)) continue;
      totals.set(r.originId, (totals.get(r.originId) ?? 0) + r.amount);
    }
    return [...totals.entries()].map(([originId, total]) => ({
      originId,
      _sum: { [field]: total },
    }));
  }

  const client = {
    budgetItem: {
      groupBy: async ({ where }: { where: Parameters<typeof groupBy>[1] }) =>
        groupBy(db.budget, where, "amount"),
    },
    shoppingItem: {
      groupBy: async ({ where }: { where: Parameters<typeof groupBy>[1] }) =>
        groupBy(db.shopping, where, "price"),
    },
  };

  return { db, client };
});

vi.mock("@/lib/prisma", () => ({ prisma: client }));

const { sumLoanUsed } = await import("@/lib/loan-usage");

const USER = "user-1";
const R = (rand: number) => rand * 100;

function planDraw(loanId: string, rand: number, userId = USER): Row {
  return { userId, originType: "loan", originId: loanId, amount: R(rand) };
}
function shopDraw(loanId: string, rand: number, userId = USER): Row {
  return { userId, originType: "loan", originId: loanId, amount: R(rand) };
}

beforeEach(() => {
  db.budget = [];
  db.shopping = [];
});

describe("sumLoanUsed", () => {
  it("returns an empty map when no loan ids are given", async () => {
    const used = await sumLoanUsed(USER, []);
    expect(used.size).toBe(0);
  });

  it("sums a plan draw", async () => {
    db.budget = [planDraw("loan-1", 500)];
    const used = await sumLoanUsed(USER, ["loan-1"]);
    expect(used.get("loan-1")).toBe(R(500));
  });

  it("sums a shopping draw", async () => {
    db.shopping = [shopDraw("loan-1", 300)];
    const used = await sumLoanUsed(USER, ["loan-1"]);
    expect(used.get("loan-1")).toBe(R(300));
  });

  // The whole point: a loan drawn from in both modules is used by the total.
  it("adds plan and shopping draws for the same loan", async () => {
    db.budget = [planDraw("loan-1", 500)];
    db.shopping = [shopDraw("loan-1", 300)];
    const used = await sumLoanUsed(USER, ["loan-1"]);
    expect(used.get("loan-1")).toBe(R(800));
  });

  it("keeps separate loans separate", async () => {
    db.budget = [planDraw("loan-1", 500), planDraw("loan-2", 100)];
    db.shopping = [shopDraw("loan-1", 200)];
    const used = await sumLoanUsed(USER, ["loan-1", "loan-2"]);
    expect(used.get("loan-1")).toBe(R(700));
    expect(used.get("loan-2")).toBe(R(100));
  });

  it("adds up multiple draws of the same loan in one module", async () => {
    db.shopping = [shopDraw("loan-1", 200), shopDraw("loan-1", 150)];
    const used = await sumLoanUsed(USER, ["loan-1"]);
    expect(used.get("loan-1")).toBe(R(350));
  });

  it("ignores another user's draws and non-loan origins", async () => {
    db.budget = [
      planDraw("loan-1", 999, "other-user"),
      { userId: USER, originType: "wish", originId: "loan-1", amount: R(111) },
    ];
    db.shopping = [shopDraw("loan-1", 999, "other-user")];
    const used = await sumLoanUsed(USER, ["loan-1"]);
    expect(used.get("loan-1")).toBeUndefined();
  });

  it("leaves an undrawn loan absent so callers read it as zero", async () => {
    db.budget = [planDraw("loan-1", 500)];
    const used = await sumLoanUsed(USER, ["loan-1", "loan-2"]);
    expect(used.get("loan-2")).toBeUndefined();
    expect(used.get("loan-2") ?? 0).toBe(0);
  });
});
