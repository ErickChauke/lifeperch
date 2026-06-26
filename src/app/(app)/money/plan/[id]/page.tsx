import { notFound } from "next/navigation";
import { getPlan } from "@/actions/budget";
import { getGoals } from "@/actions/goals";
import { getCollections } from "@/actions/wishlist";
import { getShoppingLists } from "@/actions/shopping";
import { PlanDetailView } from "@/components/modules/money/plan-detail";
import type { ImportSource } from "@/components/modules/money/import-picker-modal";

// One budget plan: its lines and the planned-vs-actual figures for its period.
// Goals are passed so an allocation can fund one and show its progress. Open
// wishes and shopping items are gathered so they can be imported as expense lines.
export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [plan, goals, collections, lists] = await Promise.all([
    getPlan(id),
    getGoals(),
    getCollections(),
    getShoppingLists(),
  ]);
  if (!plan) notFound();

  const linked = new Set(plan.items.map((i) => i.originId).filter(Boolean));

  const importSources: ImportSource[] = [
    ...collections.flatMap((c) =>
      c.items
        .filter((w) => !w.completed && !linked.has(w.id))
        .map((w) => ({
          type: "wish" as const,
          id: w.id,
          name: w.name,
          price: w.price,
          group: "From your wishlist",
        })),
    ),
    ...lists.flatMap((l) =>
      l.items
        .filter((i) => !i.bought && !linked.has(i.id))
        .map((i) => ({
          type: "shopping" as const,
          id: i.id,
          name: i.name,
          price: i.price * i.quantity,
          group: "From shopping",
        })),
    ),
  ];

  return <PlanDetailView plan={plan} goals={goals} importSources={importSources} />;
}
