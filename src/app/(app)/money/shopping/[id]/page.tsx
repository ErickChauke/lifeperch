import { notFound } from "next/navigation";
import { getShoppingList } from "@/actions/shopping";
import { getCollections } from "@/actions/wishlist";
import { getPlans } from "@/actions/budget";
import { ShoppingListDetailView } from "@/components/modules/money/shopping-list-detail";
import type { ImportSource } from "@/components/modules/money/import-picker-modal";

// One shopping list, scoped. Also gathers open wishes and plan expense lines so
// the user can import them into this list.
export default async function ShoppingListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [list, collections, plans] = await Promise.all([
    getShoppingList(id),
    getCollections(),
    getPlans(),
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
  ];

  return <ShoppingListDetailView list={list} importSources={importSources} />;
}
