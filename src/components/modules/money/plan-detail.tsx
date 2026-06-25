"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Trash2, Plus, Copy, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { periodLabel } from "@/lib/budget";
import { goalPercent } from "@/lib/goals";
import { deletePlan, duplicatePlan } from "@/actions/budget";
import { PlanModal } from "./plan-modal";
import { PlanItemModal } from "./plan-item-modal";
import type { getPlan, getPlans } from "@/actions/budget";
import type { getGoals } from "@/actions/goals";

type Plan = NonNullable<Awaited<ReturnType<typeof getPlan>>>;
type Item = Plan["items"][number];
type Goal = Awaited<ReturnType<typeof getGoals>>[number];
type PlanForEdit = Awaited<ReturnType<typeof getPlans>>[number];

const sum = (items: Item[]) => items.reduce((s, i) => s + i.amount, 0);

export function PlanDetailView({ plan, goals }: { plan: Plan; goals: Goal[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingPlan, setEditingPlan] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const goalsById = new Map(goals.map((g) => [g.id, g]));
  const [itemModal, setItemModal] = useState<{
    open: boolean;
    item: Item | null;
    kind: "income" | "expense";
  }>({ open: false, item: null, kind: "expense" });

  const income = plan.items.filter((i) => i.kind === "income");
  const expense = plan.items.filter((i) => i.kind === "expense");
  const plannedIn = sum(income);
  const plannedOut = sum(expense);
  const left = plannedIn - plannedOut;
  const actualIn = Object.values(plan.actual.income).reduce((s, v) => s + v, 0);
  const actualOut = Object.values(plan.actual.expense).reduce((s, v) => s + v, 0);

  function openItem(item: Item | null, kind: "income" | "expense") {
    setItemModal({ open: true, item, kind });
  }

  function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deletePlan(plan.id);
        router.push("/money/plan");
      } catch {
        toast.error("Could not delete the plan");
      }
    });
  }

  function onDuplicate() {
    startTransition(async () => {
      try {
        const created = await duplicatePlan(plan.id);
        router.push(`/money/plan/${created.id}`);
      } catch {
        toast.error("Could not duplicate the plan");
      }
    });
  }

  // The plan shape getPlans returns (no actual), for the edit modal.
  const planForEdit: PlanForEdit = {
    id: plan.id,
    userId: plan.userId,
    title: plan.title,
    periodType: plan.periodType,
    startDate: plan.startDate,
    endDate: plan.endDate,
    items: plan.items,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };

  return (
    <div className="space-y-6">
      <Link
        href="/money/plan"
        className="text-fg-3 hover:text-fg-2 inline-flex items-center gap-1 font-mono text-xs"
      >
        <ChevronLeft className="size-4" /> Plan
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-fg truncate text-2xl font-semibold">{plan.title}</h1>
          <p className="text-fg-3 mt-1 font-mono text-xs">
            {periodLabel(plan.startDate, plan.endDate)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Duplicate to next period"
            onClick={onDuplicate}
            disabled={pending}
          >
            <Copy className="text-fg-3 size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Edit plan"
            onClick={() => setEditingPlan(true)}
          >
            <Pencil className="text-fg-3 size-4" />
          </Button>
          <Button
            size="sm"
            variant={confirmDelete ? "destructive" : "ghost"}
            aria-label="Delete plan"
            onClick={onDelete}
            disabled={pending}
          >
            {confirmDelete ? "Delete plan?" : <Trash2 className="text-fg-3 size-4" />}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-surface grid grid-cols-3 gap-3 rounded-lg border p-4">
        <Figure label="Money in" value={plannedIn} />
        <Figure label="Planned out" value={plannedOut} />
        <Figure label="Left" value={left} danger={left < 0} />
        <p className="text-fg-3 col-span-3 font-mono text-xs">
          Actual this period · in {formatZAR(centsToRand(actualIn))} · out{" "}
          {formatZAR(centsToRand(actualOut))}
        </p>
      </div>

      {/* Money in */}
      <Section
        title="Money in"
        onAdd={() => openItem(null, "income")}
        empty="No income planned yet. Add what you expect to come in."
        show={income.length > 0}
      >
        {income.map((item) => {
          const received = plan.actual.income[item.category] ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openItem(item, "income")}
              className="bg-surface hover:bg-surface-2 hover:border-border-2 flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors"
            >
              <span className="text-fg text-sm font-medium">{item.category}</span>
              <span className="text-right">
                <span className="text-fg block font-mono text-sm">
                  {formatZAR(centsToRand(item.amount))}
                </span>
                <span className="text-fg-3 font-mono text-xs">
                  received {formatZAR(centsToRand(received))}
                </span>
              </span>
            </button>
          );
        })}
      </Section>

      {/* Planned out */}
      <Section
        title="Planned out"
        onAdd={() => openItem(null, "expense")}
        empty="Nothing allocated yet. Plan where the money goes."
        show={expense.length > 0}
      >
        {expense.map((item) => (
          <ExpenseRow
            key={item.id}
            item={item}
            spent={plan.actual.expense[item.category] ?? 0}
            goal={item.goalId ? (goalsById.get(item.goalId) ?? null) : null}
            onEdit={() => openItem(item, "expense")}
          />
        ))}
      </Section>

      <PlanModal open={editingPlan} onOpenChange={setEditingPlan} plan={planForEdit} />
      <PlanItemModal
        open={itemModal.open}
        onOpenChange={(o) => setItemModal((s) => ({ ...s, open: o }))}
        planId={plan.id}
        item={itemModal.item}
        defaultKind={itemModal.kind}
        goals={goals}
      />
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
    <div>
      <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.08em]">
        {label}
      </p>
      <p
        className="text-fg mt-1 font-mono text-lg font-medium tabular-nums"
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

function ExpenseRow({
  item,
  spent,
  goal,
  onEdit,
}: {
  item: Item;
  spent: number;
  goal: Goal | null;
  onEdit: () => void;
}) {
  const planned = item.amount;

  // A goal-funded line shows the goal and its overall progress instead of a
  // per-category spend bar.
  if (goal) {
    const pct = goalPercent(goal.currentAmount, goal.targetAmount);
    return (
      <button
        type="button"
        onClick={onEdit}
        className="bg-surface hover:bg-surface-2 hover:border-border-2 flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-accent-read flex items-center gap-1.5 text-sm font-medium">
            <Target className="size-3.5" /> {goal.name}
          </span>
          <span className="text-fg font-mono text-sm">
            {formatZAR(centsToRand(planned))}
          </span>
        </div>
        <span className="text-fg-3 font-mono text-xs">
          funding this goal
          {pct !== null ? ` · ${pct}% of target` : ""}
        </span>
      </button>
    );
  }

  const over = spent > planned;
  const remaining = planned - spent;
  const pct = planned > 0 ? Math.min((spent / planned) * 100, 100) : 0;

  return (
    <button
      type="button"
      onClick={onEdit}
      className="bg-surface hover:bg-surface-2 hover:border-border-2 flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-fg text-sm font-medium">{item.category}</span>
        <span className="text-fg font-mono text-sm">
          {formatZAR(centsToRand(planned))}
        </span>
      </div>
      <div className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: over ? "var(--danger)" : "var(--text-3)",
          }}
        />
      </div>
      <span
        className="font-mono text-xs"
        style={{ color: over ? "var(--danger)" : "var(--text-3)" }}
      >
        spent {formatZAR(centsToRand(spent))} ·{" "}
        {over
          ? `over by ${formatZAR(centsToRand(-remaining))}`
          : `${formatZAR(centsToRand(remaining))} left`}
      </span>
    </button>
  );
}
