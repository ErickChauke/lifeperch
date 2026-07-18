"use client";

import { useMemo, useState } from "react";
import { Plus, ArrowDown, ArrowUp } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { cn, formatZAR } from "@/lib/utils";
import { centsToRand, categoryHue } from "@/lib/money";
import { CategoryIcon } from "./category-icon";
import { Segmented } from "./segmented";
import { MoneyEmpty } from "./money-empty";
import { TransactionModal } from "./transaction-modal";
import type { getTransactions } from "@/actions/money";

export type Transaction = Awaited<ReturnType<typeof getTransactions>>[number];

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
] as const;

type TypeFilter = (typeof TYPE_FILTERS)[number]["value"];

// Groups transactions into day buckets in their existing (newest-first) order.
function groupByDay(txns: Transaction[]) {
  const groups: { key: string; date: Date; rows: Transaction[]; net: number }[] = [];
  for (const t of txns) {
    const key = format(t.date, "yyyy-MM-dd");
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, date: t.date, rows: [], net: 0 };
      groups.push(group);
    }
    group.rows.push(t);
    group.net += t.type === "income" ? t.amount : -t.amount;
  }
  return groups;
}

export function TransactionsBoard({
  transactions,
  initialCategory,
}: {
  transactions: Transaction[];
  initialCategory?: string;
}) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [category, setCategory] = useState<string | null>(initialCategory ?? null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesSearch =
        !q ||
        (t.description ?? "").toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      const matchesCategory = !category || t.category === category;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, search, typeFilter, category]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setCategory(null);
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  if (transactions.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Money"
          message="Nothing logged yet. Every rand in and out lives here - add the first one."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Add transaction
            </Button>
          }
        />
        <TransactionModal
          open={creating}
          onOpenChange={(o) => !o && closeModal()}
          transaction={null}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search transactions…"
        />
        <Segmented options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} />
        {category ? (
          <button
            type="button"
            onClick={() => setCategory(null)}
            className="bg-accent-soft text-accent-read border-accent-line flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
          >
            {category}
            <span aria-hidden>×</span>
          </button>
        ) : null}
        <Button onClick={() => setCreating(true)}>
          <Plus /> Add transaction
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="text-fg-3 flex flex-col items-start gap-3 py-10 text-sm">
          <p>No transactions match.</p>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-baseline justify-between px-1">
                <span className="text-fg-3 font-mono text-[11px] uppercase tracking-[0.10em]">
                  {format(group.date, "EEE · MMM d yyyy")}
                </span>
                <span className="text-fg-3 font-mono text-[11px]">
                  {group.net >= 0 ? "+" : "−"}
                  {formatZAR(centsToRand(Math.abs(group.net)))}
                </span>
              </div>
              <div className="bg-surface divide-border overflow-hidden rounded-lg border [&>*]:border-t [&>*:first-child]:border-t-0">
                {group.rows.map((t) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    onClick={() => setEditing(t)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TransactionModal
        open={creating || editing !== null}
        onOpenChange={(o) => !o && closeModal()}
        transaction={editing}
      />
    </div>
  );
}

function TransactionRow({
  transaction,
  onClick,
}: {
  transaction: Transaction;
  onClick: () => void;
}) {
  const income = transaction.type === "income";
  const label = transaction.description?.trim() || transaction.category;
  const hue = categoryHue(transaction.category);
  // Soft per-category tint driven by the --cat hue; Other stays neutral.
  const tint =
    "bg-[hsl(var(--cat)_60%_55%_/_0.14)] text-[hsl(var(--cat)_45%_36%)] dark:text-[hsl(var(--cat)_60%_74%)]";
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-surface-2 focus-visible:border-accent-line flex w-full items-center gap-3 border-transparent px-4 py-3 text-left transition-colors"
      style={hue !== null ? ({ "--cat": String(hue) } as React.CSSProperties) : undefined}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-sm",
          hue === null ? "bg-surface-2 text-fg-2" : tint,
        )}
      >
        <CategoryIcon category={transaction.category} className="size-[17px]" />
      </span>
      <span
        className={cn(
          "hidden shrink-0 rounded-full px-2 py-0.5 text-xs sm:inline-flex",
          hue === null ? "bg-surface-3 text-fg-2" : tint,
        )}
      >
        {transaction.category}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          transaction.description ? "text-fg" : "text-fg-2",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 font-mono text-[15px] font-medium tabular-nums",
          income ? "text-[var(--success)]" : "text-fg",
        )}
      >
        {income ? (
          <ArrowDown className="size-3.5" />
        ) : (
          <ArrowUp className="text-fg-3 size-3.5" />
        )}
        {income ? "+" : "−"}
        {formatZAR(centsToRand(transaction.amount))}
      </span>
    </button>
  );
}
