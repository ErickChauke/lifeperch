"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Pencil,
  Trash2,
  Plus,
  Copy,
  Target,
  CheckCircle2,
  Circle,
  Download,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn, formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { periodLabel } from "@/lib/budget";
import { goalPercent } from "@/lib/goals";
import { deletePlan, duplicatePlan, toggleItemComplete, importToPlan } from "@/actions/budget";
import { PlanModal } from "./plan-modal";
import { PlanItemModal } from "./plan-item-modal";
import { ImportPickerModal, type ImportSource } from "./import-picker-modal";
import { Segmented } from "./segmented";

type StatusFilter = "all" | "pending" | "done";
const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "done", label: "Done" },
] as const;
import type { getPlan, getPlans } from "@/actions/budget";
import type { getGoals } from "@/actions/goals";

type Plan = NonNullable<Awaited<ReturnType<typeof getPlan>>>;
type Item = Plan["items"][number];
type Goal = Awaited<ReturnType<typeof getGoals>>[number];
type PlanForEdit = Awaited<ReturnType<typeof getPlans>>[number];

const sum = (items: Item[]) => items.reduce((s, i) => s + i.amount, 0);

// The bold line heading: the chosen title, falling back to the category.
function headingFor(item: Item): string {
  return item.title?.trim() || item.category;
}

// Label for the chip on a line that was imported from another module.
function originLabel(originType: string): string {
  return originType === "wish"
    ? "from wishlist"
    : originType === "shopping"
      ? "from shopping"
      : originType === "fixed"
        ? "from basics"
        : "from plan";
}

// The muted line under the heading: the category (only when a custom title has
// taken its place) and the description, joined.
function subFor(item: Item): string {
  return [item.title?.trim() ? item.category : null, item.note?.trim() || null]
    .filter(Boolean)
    .join(" · ");
}

export function PlanDetailView({
  plan,
  goals,
  importSources,
}: {
  plan: Plan;
  goals: Goal[];
  importSources: ImportSource[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingPlan, setEditingPlan] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importing, setImporting] = useState<null | "income" | "expense">(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const goalsById = new Map(goals.map((g) => [g.id, g]));
  const [itemModal, setItemModal] = useState<{
    open: boolean;
    item: Item | null;
    kind: "income" | "expense";
  }>({ open: false, item: null, kind: "expense" });

  // The status filter narrows both lists (and so the summary figures) to done or
  // not-yet-done lines. "all" leaves everything as before.
  const matchStatus = (i: Item) =>
    status === "all" ? true : status === "done" ? i.completed : !i.completed;
  const income = plan.items.filter((i) => i.kind === "income" && matchStatus(i));
  const expense = plan.items.filter((i) => i.kind === "expense" && matchStatus(i));
  // Each section imports only sources of its own kind.
  const incomeSources = importSources.filter((s) => s.kind === "income");
  const expenseSources = importSources.filter((s) => s.kind !== "income");
  const plannedIn = sum(income);
  const plannedOut = sum(expense);
  const left = plannedIn - plannedOut;

  // Each planned-out line draws down the money in. cumulative is the running total
  // allocated through that line, so a line shows what is spent so far and what is
  // left of the income after it.
  let runningOut = 0;
  const expenseRows = expense.map((item) => {
    runningOut += item.amount;
    return { item, cumulative: runningOut };
  });
  const actualIn = Object.values(plan.actual.income).reduce((s, v) => s + v, 0);
  const actualOut = Object.values(plan.actual.expense).reduce((s, v) => s + v, 0);

  function openItem(item: Item | null, kind: "income" | "expense") {
    setItemModal({ open: true, item, kind });
  }

  // Marks a line done or undone. Done logs a transaction and greys the line; the
  // refresh pulls the updated plan (and actuals) back from the server.
  function toggleComplete(id: string) {
    startTransition(async () => {
      try {
        await toggleItemComplete(id);
        router.refresh();
      } catch {
        toast.error("Could not update the line");
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
      <div className="bg-surface grid grid-cols-1 gap-2 rounded-lg border p-4 sm:grid-cols-3 sm:gap-3">
        <Figure label="Money in" value={plannedIn} />
        <Figure label="Planned out" value={plannedOut} />
        <Figure label="Left" value={left} danger={left < 0} />
        <div className="text-fg-3 col-span-1 flex flex-col gap-0.5 font-mono text-xs sm:col-span-3 sm:flex-row sm:gap-0">
          <span>Actual this period</span>
          <span>
            <span className="hidden sm:inline"> · </span>in {formatZAR(centsToRand(actualIn))}
          </span>
          <span>
            <span className="hidden sm:inline"> · </span>out {formatZAR(centsToRand(actualOut))}
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <Segmented options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </div>

      {/* Money in */}
      <Section
        title="Money in"
        onAdd={() => openItem(null, "income")}
        onImport={incomeSources.length > 0 ? () => setImporting("income") : undefined}
        empty="No income planned yet. Add what you expect to come in."
        show={income.length > 0}
      >
        {income.map((item) => {
          const received = plan.actual.income[item.category] ?? 0;
          const sub = subFor(item);
          return (
            <div
              key={item.id}
              className="bg-surface hover:border-border-2 rounded-lg border p-3 transition-colors"
            >
              <button
                type="button"
                onClick={() => openItem(item, "income")}
                className={cn(
                  "flex w-full items-center justify-between gap-3 text-left",
                  item.completed && "opacity-50",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="text-fg block truncate text-sm font-medium">
                    {headingFor(item)}
                  </span>
                  {sub ? (
                    <span className="text-fg-3 block truncate text-xs">{sub}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right">
                  <span className="text-fg block font-mono text-sm">
                    {formatZAR(centsToRand(item.amount))}
                  </span>
                  <span className="text-fg-3 font-mono text-xs">
                    received {formatZAR(centsToRand(received))}
                  </span>
                </span>
              </button>
              <div className="mt-2 flex justify-end">
                <CompleteToggle
                  completed={item.completed}
                  pending={pending}
                  onToggle={() => toggleComplete(item.id)}
                />
              </div>
            </div>
          );
        })}
      </Section>

      {/* Planned out */}
      <Section
        title="Planned out"
        onAdd={() => openItem(null, "expense")}
        onImport={expenseSources.length > 0 ? () => setImporting("expense") : undefined}
        empty="Nothing allocated yet. Plan where the money goes."
        show={expense.length > 0}
      >
        {expenseRows.map(({ item, cumulative }) => (
          <ExpenseRow
            key={item.id}
            item={item}
            cumulative={cumulative}
            plannedIn={plannedIn}
            goal={item.goalId ? (goalsById.get(item.goalId) ?? null) : null}
            pending={pending}
            onEdit={() => openItem(item, "expense")}
            onToggleComplete={() => toggleComplete(item.id)}
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
      <ImportPickerModal
        open={importing !== null}
        onOpenChange={(o) => !o && setImporting(null)}
        title={importing === "income" ? "Import money in" : "Import planned out"}
        sources={importing === "income" ? incomeSources : expenseSources}
        onImport={(picked) =>
          importToPlan(plan.id, picked as { type: "wish" | "shopping" | "fixed"; id: string }[])
        }
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
    <div className="flex items-baseline justify-between gap-3 sm:block">
      <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.08em]">
        {label}
      </p>
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
  onImport,
  empty,
  show,
  children,
}: {
  title: string;
  onAdd: () => void;
  onImport?: () => void;
  empty: string;
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-fg-2 text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {onImport ? (
            <Button size="sm" variant="outline" onClick={onImport}>
              <Download /> Import
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus /> Add
          </Button>
        </div>
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
  cumulative,
  plannedIn,
  goal,
  pending,
  onEdit,
  onToggleComplete,
}: {
  item: Item;
  cumulative: number;
  plannedIn: number;
  goal: Goal | null;
  pending: boolean;
  onEdit: () => void;
  onToggleComplete: () => void;
}) {
  const planned = item.amount;
  const dim = item.completed && "opacity-50";

  // A goal-funded line shows the goal and its overall progress instead of the
  // running draw-down bar.
  if (goal) {
    const pct = goalPercent(goal.currentAmount, goal.targetAmount);
    return (
      <div className="bg-surface hover:border-border-2 rounded-lg border p-3 transition-colors">
        <button
          type="button"
          onClick={onEdit}
          className={cn("flex w-full flex-col gap-2 text-left", dim)}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-accent-read flex items-center gap-1.5 text-sm font-medium">
              <Target className="size-3.5" /> {headingFor(item)}
            </span>
            <span className="text-fg font-mono text-sm">
              {formatZAR(centsToRand(planned))}
            </span>
          </div>
          <span className="text-fg-3 font-mono text-xs">
            funding {goal.name}
            {pct !== null ? ` · ${pct}% of target` : ""}
          </span>
          {item.note ? (
            <span className="text-fg-3 truncate text-xs">{item.note}</span>
          ) : null}
        </button>
        <div className="mt-2 flex justify-end">
          <CompleteToggle
            completed={item.completed}
            pending={pending}
            onToggle={onToggleComplete}
          />
        </div>
      </div>
    );
  }

  // Running draw-down: cumulative is everything planned out through this line, so
  // "spent" climbs down the list and "left" is the income remaining after it.
  const remaining = plannedIn - cumulative;
  const over = remaining < 0;
  const pct =
    plannedIn > 0
      ? Math.min((cumulative / plannedIn) * 100, 100)
      : cumulative > 0
        ? 100
        : 0;
  const sub = subFor(item);

  return (
    <div className="bg-surface hover:border-border-2 rounded-lg border p-3 transition-colors">
      <button
        type="button"
        onClick={onEdit}
        className={cn("flex w-full flex-col gap-2 text-left", dim)}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1">
            <span className="text-fg block truncate text-sm font-medium">{headingFor(item)}</span>
            {sub ? (
              <span className="text-fg-3 block truncate text-xs">{sub}</span>
            ) : null}
            {item.originType ? (
              <span className="text-fg-3 mt-0.5 flex w-fit items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em]">
                <Link2 className="size-3" /> {originLabel(item.originType)}
              </span>
            ) : null}
          </span>
          <span className="text-fg shrink-0 font-mono text-sm">
            {formatZAR(centsToRand(planned))}
          </span>
        </div>
        <div className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: over ? "var(--danger)" : "var(--accent)",
            }}
          />
        </div>
        <span
          className="font-mono text-xs"
          style={{ color: over ? "var(--danger)" : "var(--text-3)" }}
        >
          spent {formatZAR(centsToRand(cumulative))} ·{" "}
          {over
            ? `over by ${formatZAR(centsToRand(-remaining))}`
            : `${formatZAR(centsToRand(remaining))} left`}
        </span>
      </button>
      <div className="mt-2 flex justify-end">
        <CompleteToggle
          completed={item.completed}
          pending={pending}
          onToggle={onToggleComplete}
        />
      </div>
    </div>
  );
}

// The bottom-right tick on a plan line. Marking it done logs a transaction and
// greys the line; the label spells out the colour so it never stands alone.
function CompleteToggle({
  completed,
  pending,
  onToggle,
}: {
  completed: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs transition-colors",
        completed ? "text-accent-read" : "text-fg-3 hover:text-fg-2",
      )}
    >
      {completed ? (
        <CheckCircle2 className="size-4" />
      ) : (
        <Circle className="size-4" />
      )}
      {completed ? "Done" : "Mark done"}
    </button>
  );
}
