import { getLoans } from "@/actions/loans";
import { getGoals } from "@/actions/goals";
import { LoansBoard } from "@/components/modules/money/loans-board";

// Loans tab: money borrowed from yourself. Goals are passed so a new loan can
// be sourced from a goal's balance.
export default async function LoansPage() {
  const [loans, goals] = await Promise.all([getLoans(), getGoals()]);
  return <LoansBoard loans={loans} goals={goals} />;
}
