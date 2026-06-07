"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Minus, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn, formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { SPENDING_CATEGORIES, shoppingSchema } from "@/lib/shopping";
import { CategoryIcon } from "./category-icon";
import { MoneyEmpty } from "./money-empty";
import {
  createShoppingItem,
  toggleBought,
  setQuantity,
  deleteShoppingItem,
  logBasketAsExpense,
} from "@/actions/shopping";
import type { getShoppingItems } from "@/actions/shopping";

export type ShoppingItem = Awaited<ReturnType<typeof getShoppingItems>>[number];

function lineTotalCents(item: ShoppingItem) {
  return item.price * item.quantity;
}

export function ShoppingBoard({ items }: { items: ShoppingItem[] }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<string>(SPENDING_CATEGORIES[0].value);

  const toBuy = items.filter((i) => !i.bought);
  const basket = items.filter((i) => i.bought);

  const estimate = toBuy.reduce((sum, i) => sum + lineTotalCents(i), 0);
  const basketTotal = basket.reduce((sum, i) => sum + lineTotalCents(i), 0);

  function add() {
    const parsed = shoppingSchema.safeParse({
      name,
      price: price === "" ? 0 : Number(price),
      category,
      quantity: 1,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the item");
      return;
    }
    startTransition(async () => {
      try {
        await createShoppingItem(parsed.data);
        setName("");
        setPrice("");
      } catch {
        toast.error("Could not add item");
      }
    });
  }

  function run(fn: () => Promise<void>, message: string) {
    startTransition(async () => {
      try {
        await fn();
      } catch {
        toast.error(message);
      }
    });
  }

  function logBasket() {
    startTransition(async () => {
      try {
        await logBasketAsExpense();
        toast.success("Logged as expense");
      } catch {
        toast.error("Could not log the basket");
      }
    });
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-baseline gap-3">
        <span className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.10em]">
          Estimated
        </span>
        <span className="text-fg font-mono text-2xl">{formatZAR(centsToRand(estimate))}</span>
        <span className="text-fg-3 text-sm">
          {toBuy.length} {toBuy.length === 1 ? "item" : "items"} to buy
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add an item…"
          className="h-9 min-w-[180px] flex-1"
        />
        <div className="relative w-28">
          <span className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm">
            R
          </span>
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="h-9 pl-7 font-mono"
          />
        </div>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 w-auto"
        >
          {SPENDING_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.value}
            </option>
          ))}
        </Select>
        <Button onClick={add} disabled={pending}>
          <Plus /> Add
        </Button>
      </div>

      {items.length === 0 ? (
        <MoneyEmpty
          eyebrow="Records · Money · Shopping"
          message="Nothing on the list. Jot down what you need, see what it'll cost, then log the shop in one tap."
          action={null}
        />
      ) : (
        <div className="space-y-5">
          {toBuy.length > 0 ? (
            <div className="bg-surface divide-border overflow-hidden rounded-lg border [&>*]:border-t [&>*:first-child]:border-t-0">
              {toBuy.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  pending={pending}
                  onToggle={() => run(() => toggleBought(item.id), "Could not update")}
                  onQty={(q) => run(() => setQuantity(item.id, q), "Could not update")}
                  onRemove={() => run(() => deleteShoppingItem(item.id), "Could not remove")}
                />
              ))}
            </div>
          ) : null}

          {basket.length > 0 ? (
            <div className="space-y-2">
              <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.10em]">
                In the basket
              </p>
              <div className="bg-surface-2 divide-border overflow-hidden rounded-lg border [&>*]:border-t [&>*:first-child]:border-t-0">
                {basket.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    pending={pending}
                    onToggle={() => run(() => toggleBought(item.id), "Could not update")}
                    onQty={(q) => run(() => setQuantity(item.id, q), "Could not update")}
                    onRemove={() => run(() => deleteShoppingItem(item.id), "Could not remove")}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {basket.length > 0 ? (
        <div className="bg-surface border-border-2 fixed inset-x-8 bottom-4 z-20 mx-auto flex max-w-[1100px] items-center justify-between gap-3 rounded-lg border px-5 py-3 shadow-[var(--shadow-pop)] md:left-[272px] md:right-8 md:mx-0">
          <span className="text-fg-2 text-sm">
            {basket.length} in basket ·{" "}
            <span className="text-fg font-mono">{formatZAR(centsToRand(basketTotal))}</span>
          </span>
          <Button onClick={logBasket} disabled={pending}>
            <ShoppingBag /> Log as expense
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ItemRow({
  item,
  pending,
  onToggle,
  onQty,
  onRemove,
}: {
  item: ShoppingItem;
  pending: boolean;
  onToggle: () => void;
  onQty: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-label={item.bought ? "Move out of basket" : "Add to basket"}
        className={cn(
          "flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border transition-colors",
          item.bought
            ? "border-transparent bg-[var(--accent)] text-[var(--accent-fg)]"
            : "border-border-2 bg-surface",
        )}
      >
        {item.bought ? <Check className="size-3.5" /> : null}
      </button>
      <CategoryIcon category={item.category} className="text-fg-3 size-4 shrink-0" />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          item.bought ? "text-fg-3 line-through" : "text-fg",
        )}
      >
        {item.name}
      </span>
      <span className="bg-surface-3 text-fg-2 hidden shrink-0 rounded-full px-2 py-0.5 text-xs sm:block">
        {item.category}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onQty(item.quantity - 1)}
          disabled={pending || item.quantity <= 1}
          className="bg-surface-2 text-fg-2 flex size-6 items-center justify-center rounded-[8px] disabled:opacity-40"
          aria-label="Decrease quantity"
        >
          <Minus className="size-3" />
        </button>
        <span className="text-fg w-6 text-center font-mono text-sm">{item.quantity}</span>
        <button
          type="button"
          onClick={() => onQty(item.quantity + 1)}
          disabled={pending}
          className="bg-surface-2 text-fg-2 flex size-6 items-center justify-center rounded-[8px]"
          aria-label="Increase quantity"
        >
          <Plus className="size-3" />
        </button>
      </div>
      <span className="text-fg w-24 shrink-0 text-right font-mono text-sm">
        {formatZAR(centsToRand(lineTotalCents(item)))}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={pending}
        aria-label="Remove item"
        className="text-fg-4 hover:text-[var(--danger)] shrink-0 transition-colors"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
