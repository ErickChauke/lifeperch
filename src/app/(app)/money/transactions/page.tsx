import { getTransactions } from "@/actions/money";
import { TransactionsBoard } from "@/components/modules/money/transactions-board";

// Transaction log. An optional ?category= drill-in from the dashboard pre-filters
// the list.
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const transactions = await getTransactions();
  return <TransactionsBoard transactions={transactions} initialCategory={category} />;
}
