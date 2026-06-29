"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Plus, Minus, ShoppingBag, X, ChevronLeft, Pencil, Trash2, Download, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { cn, formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { shoppingItemSchema } from "@/lib/shopping";
import {
  createShoppingItem,
  toggleBought,
  setQuantity,
  deleteShoppingItem,
  logListAsExpense,
  renameShoppingList,
  deleteShoppingList,
  importToShoppingList,
} from "@/actions/shopping";
import type { getShoppingList } from "@/actions/shopping";
import { ShoppingItemModal } from "./shopping-item-modal";
import { ImportPickerModal, type ImportSource } from "./import-picker-modal";
import { Segmented } from "./segmented";

type ShoppingListDetail = NonNullable<Awaited<ReturnType<typeof getShoppingList>>>;
export type Item = ShoppingListDetail["items"][number];

type StatusFilter = "all" | "pending" | "done";
const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "To buy" },
  { value: "done", label: "Bought" },
] as const;

export function ShoppingListDetailView({
  list,
  importSources,
}: {
  list: ShoppingListDetail;
  importSources: ImportSource[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(list.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const toBuy = list.items.filter((i) => !i.bought);
  const basket = list.items.filter((i) => i.bought);
  const estimate = toBuy.reduce((s, i) => s + i.price * i.quantity, 0);
  const basketTotal = basket.reduce((s, i) => s + i.price * i.quantity, 0);

  // Search filters the displayed rows by name; the summary totals stay on the
  // full list so the estimate reads the whole basket, not just a match.
  const q = search.trim().toLowerCase();
  const matchesSearch = (i: Item) => !q || i.name.toLowerCase().includes(q);
  const visibleToBuy = toBuy.filter(matchesSearch);
  const visibleBasket = basket.filter(matchesSearch);
  const noMatches =
    list.items.length > 0 &&
    visibleToBuy.length === 0 &&
    visibleBasket.length === 0;

  // "all" shows both sections, "pending" only the to-buy list, "done" only the
  // basket. The summary figure follows the selection.
  const showToBuy = status !== "done";
  const showBasket = status !== "pending";
  const done = status === "done";

  function add() {
    const parsed = shoppingItemSchema.safeParse({
      name,
      price: price === "" ? 0 : Number(price),
      quantity: 1,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the item");
      return;
    }
    startTransition(async () => {
      try {
        await createShoppingItem(list.id, parsed.data);
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

  function saveRename() {
    const clean = titleDraft.trim();
    if (!clean) return;
    startTransition(async () => {
      try {
        await renameShoppingList(list.id, clean);
        setRenaming(false);
      } catch {
        toast.error("Could not rename the list");
      }
    });
  }

  function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteShoppingList(list.id);
        router.push("/money/shopping");
      } catch {
        toast.error("Could not delete the list");
      }
    });
  }

  function logBasket() {
    startTransition(async () => {
      try {
        await logListAsExpense(list.id);
        toast.success("Logged as expense");
      } catch {
        toast.error("Could not log the basket");
      }
    });
  }

  return (
    <div className="space-y-6 pb-24">
      <Link
        href="/money/shopping"
        className="text-fg-3 hover:text-fg-2 inline-flex items-center gap-1 font-mono text-xs"
      >
        <ChevronLeft className="size-4" /> Shopping
      </Link>

      <div className="flex items-center justify-between gap-3">
        {renaming ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              autoFocus
              className="h-9 max-w-sm text-xl font-semibold"
            />
            <Button size="sm" onClick={saveRename} disabled={pending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="text-fg truncate text-2xl font-semibold">{list.title}</h1>
            <span className="bg-surface-3 text-fg-2 shrink-0 rounded-full px-2 py-0.5 text-xs">
              {list.category}
            </span>
          </div>
        )}
        {!renaming ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Rename list"
              onClick={() => {
                setTitleDraft(list.title);
                setRenaming(true);
              }}
            >
              <Pencil className="text-fg-3 size-4" />
            </Button>
            <Button
              size="sm"
              variant={confirmDelete ? "destructive" : "ghost"}
              aria-label="Delete list"
              onClick={onDelete}
              disabled={pending}
            >
              {confirmDelete ? "Delete list?" : <Trash2 className="text-fg-3 size-4" />}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.10em]">
          {done ? "Bought" : "Estimated"}
        </span>
        <span className="text-fg font-mono text-2xl">
          {formatZAR(centsToRand(done ? basketTotal : estimate))}
        </span>
        <span className="text-fg-3 text-sm whitespace-nowrap">
          {done
            ? `${basket.length} ${basket.length === 1 ? "item" : "items"} bought`
            : `${toBuy.length} ${toBuy.length === 1 ? "item" : "items"} to buy`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add an item…"
          className="h-9 w-full sm:w-auto sm:min-w-[180px] sm:flex-1"
        />
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-28 sm:flex-none">
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
          <Button onClick={add} disabled={pending} className="shrink-0">
            <Plus /> Add
          </Button>
        </div>
      </div>

      {importSources.length > 0 ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setImporting(true)}>
            <Download /> Import from wishlist or plans
          </Button>
        </div>
      ) : null}

      {list.items.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search items…"
          />
          <Segmented options={STATUS_FILTERS} value={status} onChange={setStatus} />
        </div>
      ) : null}

      {list.items.length === 0 ? (
        <p className="text-fg-3 text-sm">Nothing on this list yet. Add the first thing you need.</p>
      ) : noMatches ? (
        <div className="text-fg-3 flex flex-col items-start gap-3 py-10 text-sm">
          <p>No items match.</p>
          <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
            Clear
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {showToBuy && visibleToBuy.length > 0 ? (
            <div className="bg-surface divide-border overflow-hidden rounded-lg border [&>*]:border-t [&>*:first-child]:border-t-0">
              {visibleToBuy.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  pending={pending}
                  onToggle={() => run(() => toggleBought(item.id), "Could not update")}
                  onQty={(q) => run(() => setQuantity(item.id, q), "Could not update")}
                  onRemove={() => run(() => deleteShoppingItem(item.id), "Could not remove")}
                  onEdit={() => setEditing(item)}
                />
              ))}
            </div>
          ) : null}

          {showBasket && visibleBasket.length > 0 ? (
            <div className="space-y-2">
              <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.10em]">
                In the basket
              </p>
              <div className="bg-surface-2 divide-border overflow-hidden rounded-lg border [&>*]:border-t [&>*:first-child]:border-t-0">
                {visibleBasket.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    pending={pending}
                    onToggle={() => run(() => toggleBought(item.id), "Could not update")}
                    onQty={(q) => run(() => setQuantity(item.id, q), "Could not update")}
                    onRemove={() => run(() => deleteShoppingItem(item.id), "Could not remove")}
                    onEdit={() => setEditing(item)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <ShoppingItemModal
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        item={editing}
      />

      <ImportPickerModal
        open={importing}
        onOpenChange={setImporting}
        title="Import to this list"
        sources={importSources}
        onImport={(picked) =>
          importToShoppingList(
            list.id,
            picked as { type: "wish" | "plan"; id: string }[],
          )
        }
      />

      {basket.length > 0 ? (
        <div className="bg-surface border-border-2 fixed inset-x-5 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-[1100px] items-center justify-between gap-3 rounded-lg border px-5 py-3 shadow-[var(--shadow-pop)] md:left-[272px] md:right-8 md:mx-0">
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
  onEdit,
}: {
  item: Item;
  pending: boolean;
  onToggle: () => void;
  onQty: (quantity: number) => void;
  onRemove: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 sm:items-center">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-label={item.bought ? "Move out of basket" : "Add to basket"}
        className={cn(
          "mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border transition-colors sm:mt-0",
          item.bought
            ? "border-transparent bg-[var(--accent)] text-[var(--accent-fg)]"
            : "border-border-2 bg-surface",
        )}
      >
        {item.bought ? <Check className="size-3.5" /> : null}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${item.name}`}
            className={cn(
              "min-w-0 break-words text-left text-sm sm:truncate",
              item.bought ? "text-fg-3 line-through" : "text-fg",
            )}
          >
            {item.name}
          </button>
          {item.originType ? <OriginChip originType={item.originType} /> : null}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3">
          {item.quantity > 1 ? (
            <span className="text-fg-3 shrink-0 font-mono text-sm tabular-nums sm:hidden">
              × {item.quantity}
            </span>
          ) : null}
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => onQty(item.quantity - 1)}
              disabled={pending || item.quantity <= 1}
              className="bg-surface-2 text-fg-3 flex size-8 items-center justify-center rounded-[8px] disabled:opacity-40 sm:size-6"
              aria-label="Decrease quantity"
            >
              <Minus className="size-3" />
            </button>
            <span className="text-fg-2 w-6 text-center font-mono text-sm">{item.quantity}</span>
            <button
              type="button"
              onClick={() => onQty(item.quantity + 1)}
              disabled={pending}
              className="bg-surface-2 text-fg-3 flex size-8 items-center justify-center rounded-[8px] sm:size-6"
              aria-label="Increase quantity"
            >
              <Plus className="size-3" />
            </button>
          </div>
          <span className="text-fg w-24 shrink-0 text-right font-mono text-sm tabular-nums">
            {formatZAR(centsToRand(item.price * item.quantity))}
          </span>
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            aria-label="Remove item"
            className="text-fg-4 hover:text-[var(--danger)] flex size-8 shrink-0 items-center justify-center transition-colors sm:size-auto"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// A quiet chip marking an item that was imported from another module.
function OriginChip({ originType }: { originType: string }) {
  const label =
    originType === "wish"
      ? "from wishlist"
      : originType === "plan"
        ? "from plan"
        : "from shopping";
  return (
    <span className="text-fg-3 inline-flex w-fit items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em]">
      <Link2 className="size-3" />
      {label}
    </span>
  );
}
