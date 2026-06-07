import { getShoppingItems } from "@/actions/shopping";
import { ShoppingBoard } from "@/components/modules/money/shopping-board";

// Shopping list page.
export default async function ShoppingPage() {
  const items = await getShoppingItems();
  return <ShoppingBoard items={items} />;
}
