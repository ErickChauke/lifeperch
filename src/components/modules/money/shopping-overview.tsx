"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCurrencyShort } from "@/lib/currency";
import { centsToRand } from "@/lib/money";
import { MoneyEmpty } from "./money-empty";
import { ShoppingListModal } from "./shopping-list-modal";
import type { getShoppingLists } from "@/actions/shopping";

export type ShoppingListWithItems = Awaited<
  ReturnType<typeof getShoppingLists>
>[number];

export function ShoppingOverview({ lists }: { lists: ShoppingListWithItems[] }) {
  const [creating, setCreating] = useState(false);

  const combinedToBuy = lists.reduce(
    (sum, list) =>
      sum +
      list.items
        .filter((i) => !i.bought)
        .reduce((s, i) => s + i.price * i.quantity, 0),
    0,
  );

  if (lists.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Money · Shopping"
          message="No shopping lists yet. Start one for a shop - a Checkers run, a hardware trip - and see what it'll cost."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> New list
            </Button>
          }
        />
        <ShoppingListModal open={creating} onOpenChange={setCreating} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-fg-2 text-sm">
          {lists.length} {lists.length === 1 ? "list" : "lists"} ·{" "}
          <span className="text-fg font-mono" title={formatCurrency(centsToRand(combinedToBuy))}>
            {formatCurrencyShort(centsToRand(combinedToBuy))}
          </span>{" "}
          to buy
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New list
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <ListCard key={list.id} list={list} />
        ))}
      </div>

      <ShoppingListModal open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function ListCard({ list }: { list: ShoppingListWithItems }) {
  const toBuy = list.items.filter((i) => !i.bought);
  const basket = list.items.filter((i) => i.bought);
  const estimate = toBuy.reduce((s, i) => s + i.price * i.quantity, 0);
  const spent = basket.reduce((s, i) => s + i.price * i.quantity, 0);
  const allDone = list.items.length > 0 && toBuy.length === 0;
  const itemWord = list.items.length === 1 ? "item" : "items";

  const meta =
    list.items.length === 0
      ? "Empty list"
      : allDone
        ? `All bought · ${list.items.length} ${itemWord}`
        : `${toBuy.length} to buy · ${list.items.length} ${itemWord}`;

  // When the list is cleared the estimate is zero, so show what was spent.
  const amount = allDone ? spent : estimate;

  return (
    <Link
      href={`/money/shopping/${list.id}`}
      className={cn(
        "bg-surface hover:bg-surface-2 hover:border-border-2 focus-visible:border-accent-line flex flex-col gap-2 rounded-lg border p-4 transition-all hover:-translate-y-px",
        allDone && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-fg min-w-0 truncate font-semibold">{list.title}</span>
        <span className="bg-surface-3 text-fg-2 shrink-0 rounded-full px-2 py-0.5 text-xs">
          {list.category}
        </span>
      </div>
      <span
        className="text-fg truncate font-mono text-2xl font-medium"
        title={formatCurrency(centsToRand(amount))}
      >
        {formatCurrencyShort(centsToRand(amount))}
      </span>
      <span className="text-fg-3 font-mono text-xs">{meta}</span>
    </Link>
  );
}
