"use client";

import { useState } from "react";
import { Plus, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { HealthRuleModal } from "./health-rule-modal";
import type { getHealthRules } from "@/actions/health-rules";

export type HealthRule = Awaited<ReturnType<typeof getHealthRules>>[number];

// The Rules area: standing "don'ts" and restrictions, shown as a plain list.
export function RulesSection({ rules }: { rules: HealthRule[] }) {
  const [editing, setEditing] = useState<HealthRule | null>(null);
  const [creating, setCreating] = useState(false);

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  if (rules.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Health"
          message="No rules yet. Jot the standing don'ts you want to keep in view - foods to avoid, limits to hold - and they stay listed here."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Add rule
            </Button>
          }
        />
        <HealthRuleModal
          open={creating}
          onOpenChange={(o) => !o && closeModal()}
          rule={null}
        />
      </>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus /> Add rule
        </Button>
      </div>

      <div className="bg-surface divide-border overflow-hidden rounded-[var(--r)] border [&>*]:border-t [&>*:first-child]:border-t-0">
        {rules.map((rule) => (
          <button
            key={rule.id}
            type="button"
            onClick={() => setEditing(rule)}
            className="hover:bg-surface-2 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
          >
            <Ban
              className={cn(
                "size-4 shrink-0",
                rule.active ? "text-fg-3" : "text-fg-4",
              )}
              strokeWidth={1.75}
            />
            <span
              className={cn(
                "min-w-0 flex-1 text-[15px]",
                rule.active ? "text-fg" : "text-fg-4 line-through",
              )}
            >
              {rule.text}
            </span>
            {rule.category ? (
              <span className="bg-surface-2 text-fg-3 shrink-0 rounded-full px-2 py-0.5 text-[11px]">
                {rule.category}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <HealthRuleModal
        open={creating || editing !== null}
        onOpenChange={(o) => !o && closeModal()}
        rule={editing}
      />
    </div>
  );
}
