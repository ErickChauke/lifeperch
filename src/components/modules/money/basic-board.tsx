"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { monthlyEquivalent, frequencyShort } from "@/lib/basic";
import { MoneyEmpty } from "./money-empty";
import { FixedItemModal } from "./fixed-item-modal";
import type { getFixedItems } from "@/actions/basic";

export type FixedItem = Awaited<ReturnType<typeof getFixedItems>>[number];

// Basic tab: fixed recurring money in and out. Amounts are normalised to a
// monthly figure for the summary so daily/weekly/monthly items compare.
export function BasicBoard({ items }: { items: FixedItem[] }) {
  const [modal, setModal] = useState<{ open: boolean; item: FixedItem | null }>({
    open: false,
    item: null,
  });

  const income = items.filter((i) => i.kind === "income");
  const expense = items.filter((i) => i.kind === "expense");
  const monthlyIn = income.reduce((s, i) => s + monthlyEquivalent(i.amount, i.frequency), 0);
  const monthlyOut = expense.reduce((s, i) => s + monthlyEquivalent(i.amount, i.frequency), 0);
  const net = monthlyIn - monthlyOut;

  const openNew = () => setModal({ open: true, item: null });
  const openItem = (item: FixedItem) => setModal({ open: true, item });
  const setOpen = (o: boolean) => setModal((s) => ({ ...s, open: o }));

  if (items.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Money · Basic"
          message="Nothing fixed yet. Set the amounts that repeat - salary, rent, subscriptions - and see what they add up to each month. Fixed costs can be imported into a plan."
          action={
            <Button onClick={openNew}>
              <Plus /> New fixed item
            </Button>
          }
        />
        <FixedItemModal open={modal.open} onOpenChange={setOpen} item={modal.item} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-fg-2 text-sm">
          {items.length} fixed {items.length === 1 ? "item" : "items"}
        </p>
        <Button onClick={openNew}>
          <Plus /> New fixed item
        </Button>
      </div>

      {/* Monthly-equivalent summary */}
      <div className="bg-surface grid grid-cols-1 gap-2 rounded-lg border p-4 sm:grid-cols-3 sm:gap-3">
        <Figure label="In / month" value={monthlyIn} />
        <Figure label="Out / month" value={monthlyOut} />
        <Figure label="Net / month" value={net} danger={net < 0} />
      </div>

      <Section title="Money in" onAdd={openNew} empty="No fixed income yet." show={income.length > 0}>
        {income.map((item) => (
          <FixedRow key={item.id} item={item} onEdit={() => openItem(item)} />
        ))}
      </Section>

      <Section title="Money out" onAdd={openNew} empty="No fixed costs yet." show={expense.length > 0}>
        {expense.map((item) => (
          <FixedRow key={item.id} item={item} onEdit={() => openItem(item)} />
        ))}
      </Section>

      <FixedItemModal open={modal.open} onOpenChange={setOpen} item={modal.item} />
    </div>
  );
}

function Figure({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:block">
      <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.08em]">{label}</p>
      <p
        className="text-fg font-mono text-lg font-medium tabular-nums sm:mt-1"
        style={danger ? { color: "var(--danger)" } : undefined}
      >
        {formatZAR(centsToRand(value))}
      </p>
    </div>
  );
}

function Section({
  title,
  onAdd,
  empty,
  show,
  children,
}: {
  title: string;
  onAdd: () => void;
  empty: string;
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-fg-2 text-sm font-semibold">{title}</h2>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus /> Add
        </Button>
      </div>
      {show ? (
        <div className="space-y-2">{children}</div>
      ) : (
        <p className="text-fg-3 text-sm">{empty}</p>
      )}
    </div>
  );
}

function FixedRow({ item, onEdit }: { item: FixedItem; onEdit: () => void }) {
  const sub = [item.category, item.note?.trim() || null].filter(Boolean).join(" · ");
  const monthly = monthlyEquivalent(item.amount, item.frequency);
  const showMonthly = item.frequency !== "month";

  return (
    <button
      type="button"
      onClick={onEdit}
      className="bg-surface hover:border-border-2 flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors"
    >
      <span className="min-w-0 flex-1">
        <span className="text-fg block truncate text-sm font-medium">{item.title}</span>
        {sub ? <span className="text-fg-3 block truncate text-xs">{sub}</span> : null}
      </span>
      <span className="shrink-0 text-right">
        <span className="text-fg block font-mono text-sm">
          {formatZAR(centsToRand(item.amount))}
          <span className="text-fg-3"> / {frequencyShort(item.frequency)}</span>
        </span>
        {showMonthly ? (
          <span className="text-fg-3 font-mono text-xs">~{formatZAR(centsToRand(monthly))}/mo</span>
        ) : null}
      </span>
    </button>
  );
}
