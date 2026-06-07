import { getTransactions } from "@/actions/money";
import { getGoals } from "@/actions/goals";
import { getShoppingItems } from "@/actions/shopping";
import { getWishes } from "@/actions/wishlist";
import { DashboardBoard } from "@/components/modules/money/dashboard-board";

// Money dashboard. Fetches everything the overview aggregates and hands it to
// the board, which owns the month/year scale.
export default async function MoneyPage() {
  const [transactions, goals, shopping, wishes] = await Promise.all([
    getTransactions(),
    getGoals(),
    getShoppingItems(),
    getWishes(),
  ]);
  return (
    <DashboardBoard
      transactions={transactions}
      goals={goals}
      shopping={shopping}
      wishes={wishes}
    />
  );
}
