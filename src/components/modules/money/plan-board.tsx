"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { periodLabel } from "@/lib/budget";
import { MoneyEmpty } from "./money-empty";
import { PlanModal } from "./plan-modal";
import type { getPlans } from "@/actions/budget";

type Plan = Awaited<ReturnType<typeof getPlans>>[number];

// Plan tab: a board of budget plans, one per period. Each plan groups expected
// money in and planned allocations out.
export function PlanBoard({ plans }: { plans: Plan[] }) {
  const [creating, setCreating] = useState(false);

  if (plans.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Money · Plan"
          message="No plans yet. Make one for a month or a week, log the money you expect in, and plan where it goes - each allocation eats into what's left."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> New plan
            </Button>
          }
        />
        <PlanModal open={creating} onOpenChange={setCreating} plan={null} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-fg-2 text-sm">
          {plans.length} {plans.length === 1 ? "plan" : "plans"}
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus /> New plan
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      <PlanModal open={creating} onOpenChange={setCreating} plan={null} />
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const income = plan.items
    .filter((i) => i.kind === "income")
    .reduce((s, i) => s + i.amount, 0);
  const planned = plan.items
    .filter((i) => i.kind === "expense")
    .reduce((s, i) => s + i.amount, 0);
  const left = income - planned;

  return (
    <Link
      href={`/money/plan/${plan.id}`}
      className="bg-surface hover:bg-surface-2 hover:border-border-2 focus-visible:border-accent-line flex flex-col gap-2 rounded-lg border p-4 transition-all hover:-translate-y-px"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-fg truncate font-semibold">{plan.title}</span>
        <span className="bg-surface-2 text-fg-2 flex size-8 shrink-0 items-center justify-center rounded-sm">
          <CalendarRange className="size-4" strokeWidth={1.75} />
        </span>
      </div>
      <span className="font-mono text-xs" style={{ color: "var(--info)" }}>
        {periodLabel(plan.startDate, plan.endDate)}
      </span>
      <span className="text-fg-3 mt-1 font-mono text-[10.5px] uppercase tracking-[0.08em]">
        {left < 0 ? "over budget" : "left to allocate"}
      </span>
      <span
        className="text-fg font-mono text-2xl font-medium"
        style={left < 0 ? { color: "var(--danger)" } : undefined}
      >
        {formatZAR(centsToRand(left))}
      </span>
      <span className="text-fg-3 font-mono text-xs">
        of {formatZAR(centsToRand(income))} money in
      </span>
    </Link>
  );
}
