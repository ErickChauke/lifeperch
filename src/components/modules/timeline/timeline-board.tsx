"use client";

import { Fragment, useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { dateToDay } from "@/lib/money";
import { STATUS_META, isOverdue } from "@/lib/timeline";
import { MilestoneModal } from "./milestone-modal";
import type { getMilestones } from "@/actions/timeline";

export type Milestone = Awaited<ReturnType<typeof getMilestones>>[number];

// Status tokens: meaning rides these, never the lime accent.
const STATUS_TONE: Record<string, string> = {
  planned: "var(--info)",
  "in-progress": "var(--warning)",
  done: "var(--success)",
};

export function TimelineBoard({ milestones, today }: { milestones: Milestone[]; today: string }) {
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [creating, setCreating] = useState(false);

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
          <p className="text-fg-3 mt-1 font-mono text-xs tabular-nums">
            {milestones.length} {milestones.length === 1 ? "milestone" : "milestones"}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Add milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <MoneyEmpty
          eyebrow="Archive · Timeline"
          message="Nothing on the timeline yet. Set a milestone you're aiming at — a move, a qualification, a trip — and watch the rail fill in by date."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Add milestone
            </Button>
          }
        />
      ) : (
        <div className="relative">
          <div className="bg-border absolute top-2 bottom-2 left-[7px] w-px" aria-hidden />
          <div className="space-y-5">
            {milestones.map((m, i) => {
              const day = dateToDay(m.targetDate);
              const month = day.slice(0, 7);
              const prevMonth = i > 0 ? dateToDay(milestones[i - 1].targetDate).slice(0, 7) : null;
              const showMonth = month !== prevMonth;
              const overdue = isOverdue(m.status, day, today);
              const tone = overdue ? "var(--danger)" : STATUS_TONE[m.status] ?? "var(--text-3)";
              return (
                <Fragment key={m.id}>
                  {showMonth ? (
                    <div className="relative pl-8">
                      <span className="text-fg-3 font-mono text-xs uppercase tracking-[0.10em]">
                        {format(m.targetDate, "MMM yyyy")}
                      </span>
                    </div>
                  ) : null}
                  <div className="relative pl-8">
                    <span
                      className="bg-surface absolute top-1.5 left-0 size-3.5 rounded-full border-2"
                      style={{ borderColor: tone }}
                      aria-hidden
                    />
                    <MilestoneCard milestone={m} overdue={overdue} onEdit={() => setEditing(m)} />
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      <MilestoneModal
        open={creating || editing !== null}
        onOpenChange={(o) => !o && closeModal()}
        milestone={editing}
      />
    </div>
  );
}

function MilestoneCard({
  milestone,
  overdue,
  onEdit,
}: {
  milestone: Milestone;
  overdue: boolean;
  onEdit: () => void;
}) {
  const tone = STATUS_TONE[milestone.status] ?? "var(--text-3)";
  const track = milestone.timeline?.name;
  return (
    <div
      onClick={onEdit}
      className="bg-surface hover:bg-surface-2 hover:border-border-2 flex cursor-pointer flex-col gap-2 rounded-[var(--r)] border p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-px"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{ color: tone, background: `color-mix(in oklch, ${tone} 15%, transparent)` }}
          >
            {STATUS_META[milestone.status as keyof typeof STATUS_META]?.label}
          </span>
          {track ? (
            <span className="bg-surface-3 text-fg-2 rounded-full px-2 py-0.5 text-xs">{track}</span>
          ) : null}
        </div>
        {overdue ? (
          <span
            className="flex items-center gap-1 font-mono text-sm tabular-nums"
            style={{ color: "var(--danger)" }}
          >
            <AlertTriangle className="size-3.5" strokeWidth={1.75} />
            {format(milestone.targetDate, "dd MMM yyyy")}
          </span>
        ) : (
          <span className="text-fg-3 font-mono text-sm tabular-nums">
            {format(milestone.targetDate, "dd MMM yyyy")}
          </span>
        )}
      </div>

      <p className="text-fg line-clamp-2 text-lg font-semibold tracking-tight">{milestone.title}</p>
      {milestone.description ? (
        <p className={cn("text-fg-2 line-clamp-2 text-sm")}>{milestone.description}</p>
      ) : null}
      {overdue ? (
        <span className="text-xs" style={{ color: "var(--danger)" }}>
          Overdue
        </span>
      ) : null}
    </div>
  );
}
