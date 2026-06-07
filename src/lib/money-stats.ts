import { isSameMonth, isSameYear } from "date-fns";
import { INVESTMENT_CATEGORY } from "@/lib/money";

// Minimal shape the stats helpers need. Works with the Prisma Transaction rows
// (amounts in cents, date a Date).
export type Txn = { type: string; amount: number; category: string; date: Date };

// Narrows a transaction list to a month or a whole year around a reference date.
export function txnsInPeriod<T extends Txn>(
  txns: T[],
  scale: "month" | "year",
  ref: Date,
): T[] {
  return txns.filter((t) =>
    scale === "month" ? isSameMonth(t.date, ref) : isSameYear(t.date, ref),
  );
}

// The four headline figures (cents). Investing (the Investment category) is split
// out of spending: NET is what is left after both spending and investing.
export function summarize(txns: Txn[]) {
  let income = 0;
  let spent = 0;
  let invested = 0;
  for (const t of txns) {
    if (t.type === "income") income += t.amount;
    else if (t.category === INVESTMENT_CATEGORY) invested += t.amount;
    else spent += t.amount;
  }
  return { income, spent, invested, net: income - spent - invested };
}

// Spending per category (cents), excluding income and investing, biggest first.
export function spendingByCategory(txns: Txn[]) {
  const map = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== "expense" || t.category === INVESTMENT_CATEGORY) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return Array.from(map, ([category, total]) => ({ category, total }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

// Income vs spending (cents) for each given month start. Expense excludes
// investing so it matches the SPENT figure.
export function monthlyTotals(txns: Txn[], monthStarts: Date[]) {
  return monthStarts.map((month) => {
    let income = 0;
    let expense = 0;
    for (const t of txns) {
      if (!isSameMonth(t.date, month)) continue;
      if (t.type === "income") income += t.amount;
      else if (t.category !== INVESTMENT_CATEGORY) expense += t.amount;
    }
    return { month, income, expense };
  });
}
