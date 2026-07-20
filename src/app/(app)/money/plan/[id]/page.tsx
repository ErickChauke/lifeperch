import { notFound } from "next/navigation";
import { getPlan } from "@/actions/budget";
import { getGoals } from "@/actions/goals";
import { getCollections } from "@/actions/wishlist";
import { getShoppingLists } from "@/actions/shopping";
import { getFixedItems } from "@/actions/basic";
import { getLoans } from "@/actions/loans";
import { loanUnused } from "@/lib/loans";
import { formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { PlanDetailView } from "@/components/modules/money/plan-detail";
import type { ImportSource } from "@/components/modules/money/import-picker-modal";

// One budget plan: its lines and the planned-vs-actual figures for its period.
// Goals are passed so an allocation can fund one and show its progress. Open
// wishes, shopping items, fixed items and loans are gathered so they can be
// imported as lines.
export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [plan, goals, collections, lists, fixed, loans] = await Promise.all([
    getPlan(id),
    getGoals(),
    getCollections(),
    getShoppingLists(),
    getFixedItems(),
    getLoans(),
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
          kind: "expense" as const,
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
          kind: "expense" as const,
        })),
    ),
    ...fixed
      .filter((f) => !linked.has(f.id))
      .map((f) => ({
        type: "fixed" as const,
        id: f.id,
        name: f.title,
        price: f.amount,
        group: "From basics",
        kind: f.kind === "income" ? ("income" as const) : ("expense" as const),
      })),
    // Borrowed money is cash in, so a loan imports into the money-in side. It is
    // a pot drawn down across plans, so unlike the other sources it stays listed
    // once used and shows greyed with the reason instead of disappearing.
    ...loans.map((l) => {
      const left = loanUnused(l);
      return {
        type: "loan" as const,
        id: l.id,
        name: l.title,
        price: left,
        group: "From your loans",
        kind: "income" as const,
        // Only the pot running dry or the debt closing takes a loan off the
        // table; drawing part of it leaves the rest available, here included.
        editableAmount: true,
        disabled: l.settledAt !== null || left <= 0,
        hint: l.settledAt
          ? "settled"
          : left <= 0
            ? "fully used"
            : `${formatZAR(centsToRand(left))} left to use`,
      };
    }),
  ];

  return (
    <PlanDetailView
      plan={plan}
      goals={goals}
      loans={loans}
      importSources={importSources}
    />
  );
}
