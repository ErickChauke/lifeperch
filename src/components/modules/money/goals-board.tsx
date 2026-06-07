"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { addMonths, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn, formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { goalPercent, monthsToGoal } from "@/lib/goals";
import { MoneyEmpty } from "./money-empty";
import { GoalModal } from "./goal-modal";
import type { getGoals } from "@/actions/goals";

export type Goal = Awaited<ReturnType<typeof getGoals>>[number];

export function GoalsBoard({ goals }: { goals: Goal[] }) {
  const [editing, setEditing] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

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
          <span className="text-fg font-mono">{formatZAR(centsToRand(totalSaved))}</span>{" "}
          across {goals.length} {goals.length === 1 ? "goal" : "goals"}
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New goal
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onClick={() => setEditing(goal)} />
        ))}
      </div>

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
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
  const eta = monthsToGoal(goal.currentAmount, goal.targetAmount, goal.monthlyAmount);

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-surface hover:bg-surface-2 hover:border-border-2 focus-visible:border-accent-line flex flex-col gap-3 rounded-lg border p-4 text-left transition-all hover:-translate-y-px"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-fg truncate font-medium">{goal.name}</span>
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
        <span className="font-mono">
          <span className="text-fg text-lg font-medium">
            {formatZAR(centsToRand(goal.currentAmount))}
          </span>
          <span className="text-fg-2 text-sm">
            {" / "}
            {unset ? "—" : formatZAR(centsToRand(goal.targetAmount))}
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
        monthly={goal.monthlyAmount}
        eta={eta}
      />
    </button>
  );
}

function GoalFoot({
  reached,
  unset,
  remaining,
  monthly,
  eta,
}: {
  reached: boolean;
  unset: boolean;
  remaining: number;
  monthly: number;
  eta: number | null;
}) {
  if (reached) {
    return <p className="font-mono text-xs text-[var(--success)]">Goal reached</p>;
  }
  if (unset) {
    return <p className="font-mono text-xs text-[var(--warning)]">No target set yet</p>;
  }
  if (monthly <= 0 || eta === null) {
    return (
      <p className="font-mono text-xs">
        <span className="text-fg-3">{formatZAR(centsToRand(remaining))} to go</span>
        <span className="text-[var(--warning)]"> · set a monthly amount for an ETA</span>
      </p>
    );
  }
  return (
    <p className="font-mono text-xs">
      <span className="text-fg-3">{formatZAR(centsToRand(remaining))} to go</span>
      <span className="text-fg-2">
        {" · ≈ "}
        {eta} months · {format(addMonths(new Date(), eta), "MMM yyyy")}
      </span>
    </p>
  );
}
