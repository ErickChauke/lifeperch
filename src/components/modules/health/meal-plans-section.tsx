"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ArrowUpRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { linkHref } from "@/lib/todo";
import { MealPlanModal } from "./meal-plan-modal";
import type { getMealPlans } from "@/actions/meal-plans";

export type MealPlan = Awaited<ReturnType<typeof getMealPlans>>[number];

// Groups a thousands-separated kcal figure, or null when an option has no value.
function kcal(value: number | null): string | null {
  if (value == null) return null;
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} kcal`;
}

function PlanCard({ plan, onEdit }: { plan: MealPlan; onEdit: () => void }) {
  const href = linkHref(plan.linkedModule, plan.linkedId);
  return (
    <div className="bg-surface flex flex-col gap-3 rounded-[var(--r)] border p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-fg truncate text-[15px] font-medium">
              {plan.name}
            </h3>
            {!plan.active ? (
              <span className="text-fg-4 shrink-0 text-[11px]">archived</span>
            ) : null}
          </div>
          {plan.notes ? (
            <p className="text-fg-3 mt-0.5 line-clamp-2 text-xs">{plan.notes}</p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          aria-label="Edit plan"
        >
          <Pencil />
        </Button>
      </div>

      {href ? (
        <Link
          href={href}
          className="bg-surface-2 text-fg-2 hover:text-fg hover:bg-surface-3 inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] transition-colors"
        >
          {plan.linkedLabel || plan.linkedModule}
          <ArrowUpRight className="size-3" />
        </Link>
      ) : null}

      <div className="space-y-3">
        {plan.slots.map((slot) => (
          <div key={slot.id} className="space-y-1">
            <p className="text-fg-2 text-xs font-medium">{slot.label}</p>
            <div className="bg-surface-2 divide-border overflow-hidden rounded-md border [&>*]:border-t [&>*:first-child]:border-t-0">
              {slot.options.length === 0 ? (
                <p className="text-fg-4 px-3 py-1.5 text-xs">No options</p>
              ) : (
                slot.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5"
                  >
                    <span className="text-fg min-w-0 flex-1 truncate text-sm">
                      {opt.name}
                    </span>
                    {kcal(opt.calories) ? (
                      <span className="text-fg-3 shrink-0 font-mono text-xs tabular-nums">
                        {kcal(opt.calories)}
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// The meal-plans area: searchable grid of reusable plan templates, each a set of
// slots with swappable options.
export function MealPlansSection({ mealPlans }: { mealPlans: MealPlan[] }) {
  const [editing, setEditing] = useState<MealPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mealPlans;
    return mealPlans.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.notes ?? "").toLowerCase().includes(q),
    );
  }, [mealPlans, search]);

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  if (mealPlans.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Health"
          message="No meal plans yet. Build one with a few slots - breakfast, lunch - and drop in a couple of swappable options for each, so you can mix and match through the week."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> New plan
            </Button>
          }
        />
        <MealPlanModal
          open={creating}
          onOpenChange={(o) => !o && closeModal()}
          plan={null}
        />
      </>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search plans…"
        />
        <Button onClick={() => setCreating(true)}>
          <Plus /> New plan
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-fg-3 flex flex-col items-start gap-3 py-10 text-sm">
          <p>No plans match.</p>
          <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
            Clear
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filtered.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => setEditing(plan)}
            />
          ))}
        </div>
      )}

      <MealPlanModal
        open={creating || editing !== null}
        onOpenChange={(o) => !o && closeModal()}
        plan={editing}
      />
    </div>
  );
}
