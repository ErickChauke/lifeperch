import { getPlans } from "@/actions/budget";
import { PlanBoard } from "@/components/modules/money/plan-board";

// Plan tab: budget plans by period.
export default async function PlanPage() {
  const plans = await getPlans();
  return <PlanBoard plans={plans} />;
}
