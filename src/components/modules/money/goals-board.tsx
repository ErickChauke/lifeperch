"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCurrencyShort } from "@/lib/currency";
import { centsToRand } from "@/lib/money";
import { goalPercent, goalRemaining, formatEta, etaTargetDate } from "@/lib/goals";
import { monthsToClear, extraLabel } from "@/lib/extra";
import { MoneyEmpty } from "./money-empty";
import { GoalModal } from "./goal-modal";
import { Segmented } from "./segmented";
import type { getGoals } from "@/actions/goals";

export type Goal = Awaited<ReturnType<typeof getGoals>>[number];

type StatusFilter = "all" | "pending" | "done";
const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "In progress" },
  { value: "done", label: "Reached" },
] as const;

export function GoalsBoard({ goals }: { goals: Goal[] }) {
  const [editing, setEditing] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");

  // A goal is "reached" once it hits 100 percent. The filter and the Saved total
  // follow the selection.
  const isReached = (g: Goal) => {
    const pct = goalPercent(g.currentAmount, g.targetAmount);
    return pct !== null && pct >= 100;
  };
  const visible = goals.filter((g) =>
    status === "all" ? true : status === "done" ? isReached(g) : !isReached(g),
  );
  const totalSaved = visible.reduce((sum, g) => sum + g.currentAmount, 0);

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  if (goals.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Money"
          message="No goals yet. Name something you're saving toward and watch the bar fill."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> New goal
            </Button>
          }
        />
        <GoalModal
          open={creating}
          onOpenChange={(o) => !o && closeModal()}
          goal={null}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-fg-2 text-sm">
          Saved{" "}
          <span className="text-fg font-mono" title={formatCurrency(centsToRand(totalSaved))}>
            {formatCurrencyShort(centsToRand(totalSaved))}
          </span>{" "}
          across {visible.length} {visible.length === 1 ? "goal" : "goals"}
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New goal
        </Button>
      </div>

      <div className="flex justify-end">
        <Segmented options={STATUS_FILTERS} value={status} onChange={setStatus} />
      </div>

      {visible.length === 0 ? (
        <p className="text-fg-3 text-sm">No goals here yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onClick={() => setEditing(goal)} />
          ))}
        </div>
      )}

      <GoalModal
        open={creating || editing !== null}
        onOpenChange={(o) => !o && closeModal()}
        goal={editing}
      />
    </div>
  );
}

function GoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const percent = goalPercent(goal.currentAmount, goal.targetAmount);
  const reached = percent !== null && percent >= 100;
  const unset = goal.targetAmount <= 0;
  const remaining = goalRemaining(goal);
  const eta = unset ? null : monthsToClear(remaining, goal.monthlyAmount, goal);
  const extra = extraLabel(goal, (cents) => formatCurrencyShort(centsToRand(cents)));

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-surface hover:bg-surface-2 hover:border-border-2 focus-visible:border-accent-line flex flex-col gap-3 rounded-lg border p-4 text-left transition-all hover:-translate-y-px"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-fg min-w-0 truncate font-medium">{goal.name}</span>
        {reached ? (
          <span className="shrink-0 rounded-full bg-[color-mix(in_oklch,var(--success)_15%,transparent)] px-2 py-0.5 text-[11px] text-[var(--success)]">
            Reached
          </span>
        ) : unset ? (
          <span className="shrink-0 rounded-full bg-[color-mix(in_oklch,var(--warning)_15%,transparent)] px-2 py-0.5 text-[11px] text-[var(--warning)]">
            Set a target
          </span>
        ) : null}
      </div>

      <div className="bg-surface-3 h-2.5 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full")}
          style={{
            width: `${percent ?? 0}%`,
            background: reached ? "var(--success)" : "var(--accent)",
          }}
        />
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span
          className="min-w-0 truncate font-mono"
          title={
            unset
              ? formatCurrency(centsToRand(goal.currentAmount))
              : `${formatCurrency(centsToRand(goal.currentAmount))} / ${formatCurrency(centsToRand(goal.targetAmount))}`
          }
        >
          <span className="text-fg text-lg font-medium">
            {formatCurrencyShort(centsToRand(goal.currentAmount))}
          </span>
          <span className="text-fg-2 text-sm">
            {" / "}
            {unset ? "-" : formatCurrencyShort(centsToRand(goal.targetAmount))}
          </span>
        </span>
        {percent !== null ? (
          <span
            className={cn(
              "font-mono text-sm",
              reached ? "text-[var(--success)]" : "text-fg-3",
            )}
          >
            {percent}%
          </span>
        ) : null}
      </div>

      <GoalFoot
        reached={reached}
        unset={unset}
        remaining={remaining}
        eta={eta}
        extra={extra}
      />
    </button>
  );
}

function GoalFoot({
  reached,
  unset,
  remaining,
  eta,
  extra,
}: {
  reached: boolean;
  unset: boolean;
  remaining: number;
  eta: number | null;
  extra: string | null;
}) {
  if (reached) {
    return <p className="font-mono text-xs text-[var(--success)]">Goal reached</p>;
  }
  if (unset) {
    return <p className="font-mono text-xs text-[var(--warning)]">No target set yet</p>;
  }
  if (eta === null) {
    return (
      <p className="font-mono text-xs break-words">
        <span className="text-fg-3" title={formatCurrency(centsToRand(remaining))}>
          {formatCurrencyShort(centsToRand(remaining))} to go
        </span>
        <span className="text-[var(--warning)]"> · set a monthly amount for an ETA</span>
      </p>
    );
  }
  return (
    <p className="font-mono text-xs break-words">
      <span className="text-fg-3" title={formatCurrency(centsToRand(remaining))}>
        {formatCurrencyShort(centsToRand(remaining))} to go
      </span>
      <span className="text-fg-2">
        {" · ≈ "}
        {formatEta(eta)} · {format(etaTargetDate(eta), "MMM yyyy")}
      </span>
      {extra ? <span className="text-fg-3">{` · plus ${extra}`}</span> : null}
    </p>
  );
}
