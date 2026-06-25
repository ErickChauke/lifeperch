import { notFound } from "next/navigation";
import { getPlan } from "@/actions/budget";
import { getGoals } from "@/actions/goals";
import { PlanDetailView } from "@/components/modules/money/plan-detail";

// One budget plan: its lines and the planned-vs-actual figures for its period.
// Goals are passed so an allocation can fund one and show its progress.
export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [plan, goals] = await Promise.all([getPlan(id), getGoals()]);
  if (!plan) notFound();
  return <PlanDetailView plan={plan} goals={goals} />;
}
