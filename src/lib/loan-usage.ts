import { prisma } from "@/lib/prisma";

// A loan's "used" is derived, never stored: the sum of every row that draws from
// it, tagged originType "loan". Draws now live in two tables, budget plan lines
// (BudgetItem.amount) and shopping list items (ShoppingItem.price, always
// quantity 1 for a draw), so the sum must span both or a loan could be
// over-drawn across the two modules. Returns cents used, per loan id.
export async function sumLoanUsed(
  userId: string,
  loanIds: string[],
): Promise<Map<string, number>> {
  const used = new Map<string, number>();
  if (loanIds.length === 0) return used;

  const [plan, shopping] = await Promise.all([
    prisma.budgetItem.groupBy({
      by: ["originId"],
      where: { userId, originType: "loan", originId: { in: loanIds } },
      _sum: { amount: true },
    }),
    prisma.shoppingItem.groupBy({
      by: ["originId"],
      where: { userId, originType: "loan", originId: { in: loanIds } },
      _sum: { price: true },
    }),
  ]);

  for (const row of plan) {
    if (!row.originId) continue;
    used.set(row.originId, (used.get(row.originId) ?? 0) + (row._sum.amount ?? 0));
  }
  for (const row of shopping) {
    if (!row.originId) continue;
    used.set(row.originId, (used.get(row.originId) ?? 0) + (row._sum.price ?? 0));
  }
  return used;
}
