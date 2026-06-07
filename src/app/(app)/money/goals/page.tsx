import { getGoals } from "@/actions/goals";
import { GoalsBoard } from "@/components/modules/money/goals-board";

// Savings goals page.
export default async function GoalsPage() {
  const goals = await getGoals();
  return <GoalsBoard goals={goals} />;
}
