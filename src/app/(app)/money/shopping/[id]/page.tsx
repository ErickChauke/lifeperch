import { notFound } from "next/navigation";
import { getShoppingList } from "@/actions/shopping";
import { getCollections } from "@/actions/wishlist";
import { getPlans } from "@/actions/budget";
import { getLoans } from "@/actions/loans";
import { loanUnused } from "@/lib/loans";
import { formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { ShoppingListDetailView } from "@/components/modules/money/shopping-list-detail";
import type { ImportSource } from "@/components/modules/money/import-picker-modal";

// One shopping list, scoped. Also gathers open wishes, plan expense lines and
// loans so the user can import them into this list to spend against.
export default async function ShoppingListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [list, collections, plans, loans] = await Promise.all([
    getShoppingList(id),
    getCollections(),
    getPlans(),
    getLoans(),
  ]);
  if (!list) notFound();

  const linked = new Set(list.items.map((i) => i.originId).filter(Boolean));

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
    ...plans.flatMap((p) =>
      p.items
        .filter((i) => i.kind === "expense" && !i.completed && !linked.has(i.id))
        .map((i) => ({
          type: "plan" as const,
          id: i.id,
          name: i.title ?? i.category,
          price: i.amount,
          group: "From your plans",
        })),
    ),
    // A loan is a pot drawn down across plans and lists, so unlike the other
    // sources it stays listed once used and shows greyed with the reason. The
    // amount is trimmable, so only part of what is left may be drawn in.
    ...loans.map((l) => {
      const left = loanUnused(l);
      return {
        type: "loan" as const,
        id: l.id,
        name: l.title,
        price: left,
        group: "From your loans",
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

  return <ShoppingListDetailView list={list} importSources={importSources} />;
}
