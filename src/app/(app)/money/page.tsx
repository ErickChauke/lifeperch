import { getTransactions } from "@/actions/money";
import { getGoals } from "@/actions/goals";
import { getShoppingLists } from "@/actions/shopping";
import { getCollections } from "@/actions/wishlist";
import { getLoans } from "@/actions/loans";
import { loanOutstanding } from "@/lib/loans";
import { extraMonthly } from "@/lib/extra";
import { DashboardBoard } from "@/components/modules/money/dashboard-board";
import { DebtBanner } from "@/components/modules/money/debt-banner";

// Money dashboard. Fetches everything the overview aggregates and hands it to
// the board, which owns the month/year scale.
export default async function MoneyPage() {
  const [transactions, goals, shoppingLists, collections, loans] = await Promise.all([
    getTransactions(),
    getGoals(),
    getShoppingLists(),
    getCollections(),
    getLoans(),
  ]);
  const openLoans = loans.filter((l) => !l.settledAt);
  const debt = openLoans.reduce((sum, l) => sum + loanOutstanding(l), 0);
  const repaying = openLoans.reduce((sum, l) => sum + l.monthlyAmount + extraMonthly(l), 0);
  return (
    <div className="space-y-6">
      <DebtBanner debtCents={debt} monthlyCents={repaying} />
      <DashboardBoard
        transactions={transactions}
        goals={goals}
        shoppingLists={shoppingLists}
        collections={collections}
      />
    </div>
  );
}
