import { getFixedItems } from "@/actions/basic";
import { BasicBoard } from "@/components/modules/money/basic-board";

// Basic tab: fixed recurring money in and out (salary, rent, subscriptions).
export default async function BasicPage() {
  const items = await getFixedItems();
  return <BasicBoard items={items} />;
}
