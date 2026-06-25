import { notFound } from "next/navigation";
import { getPlan } from "@/actions/budget";
import { PlanDetailView } from "@/components/modules/money/plan-detail";

// One budget plan: its lines and the planned-vs-actual figures for its period.
export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getPlan(id);
  if (!plan) notFound();
  return <PlanDetailView plan={plan} />;
}
