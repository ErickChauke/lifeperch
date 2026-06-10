"use client";

import { useState, useTransition } from "react";
import { Plus, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { APP_STAGES, STAGE_META, OUTCOME_META } from "@/lib/jobs";
import { STAGE_TONE, OUTCOME_TONE, tint } from "./tones";
import { moveJob } from "@/actions/jobs";
import { ApplicationModal } from "./application-modal";
import { StageDrawer } from "./stage-drawer";
import type { getJobs } from "@/actions/jobs";

export type Application = Awaited<ReturnType<typeof getJobs>>[number];

export function JobsBoard({ applications }: { applications: Application[] }) {
  const [, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const editingApp = editingId ? applications.find((a) => a.id === editingId) ?? null : null;
  const drawerApp = drawerId ? applications.find((a) => a.id === drawerId) ?? null : null;

  function closeModal() {
    setCreating(false);
    setEditingId(null);
  }

  function drop(status: string) {
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const app = applications.find((a) => a.id === id);
    if (!app || app.status === status) return;
    startTransition(() => moveJob(id, status));
  }

  if (applications.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Applications"
          message="No applications yet. Add the first thing you're applying for — a job, a bursary, a grant — and move it along as things happen: applied, interview, offer, outcome."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Add application
            </Button>
          }
        />
        <ApplicationModal open={creating} onOpenChange={(o) => !o && closeModal()} application={null} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-fg-3 mt-1 font-mono text-xs tabular-nums">
            {applications.length} {applications.length === 1 ? "application" : "applications"}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Add application
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {APP_STAGES.map((stage) => {
          const cards = applications.filter((a) => a.status === stage);
          const tone = STAGE_TONE[stage] ?? "var(--text-3)";
          return (
            <div
              key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(stage)}
              className="bg-surface-2 flex flex-col gap-3 rounded-[var(--r-lg)] border p-3"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-fg-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="size-2 rounded-full" style={{ background: tone }} />
                  {STAGE_META[stage].label}
                </span>
                <span className="text-fg-3 font-mono text-xs tabular-nums">{cards.length}</span>
              </div>

              {cards.length === 0 ? (
                <div className="border-border-2 text-fg-4 rounded-[var(--r)] border border-dashed px-3 py-6 text-center text-xs">
                  Nothing here
                </div>
              ) : (
                cards.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    onOpen={() => setDrawerId(app.id)}
                    onDragStart={() => setDragId(app.id)}
                    onDragEnd={() => setDragId(null)}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      <ApplicationModal
        open={creating || editingId !== null}
        onOpenChange={(o) => !o && closeModal()}
        application={editingApp}
      />
      <StageDrawer
        application={drawerApp}
        onClose={() => setDrawerId(null)}
        onEdit={() => drawerApp && setEditingId(drawerApp.id)}
      />
    </div>
  );
}

function ApplicationCard({
  application,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  application: Application;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const isOutcome = application.status === "outcome" && application.outcome;
  const oTone = application.outcome ? OUTCOME_TONE[application.outcome] : "var(--text-3)";
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className="bg-surface hover:bg-surface-2 hover:border-border-2 flex cursor-pointer flex-col gap-2 rounded-[var(--r)] border p-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-px"
    >
      <p className="text-fg truncate text-[15px] font-semibold">{application.organisation}</p>
      <p className="text-fg-2 truncate text-sm">{application.position}</p>
      {application.location ? (
        <p className="text-fg-4 flex items-center gap-1 text-xs">
          <MapPin className="size-3" strokeWidth={1.75} />
          {application.location}
        </p>
      ) : null}
      <div className="mt-1 flex items-center justify-between gap-2">
        {application.value != null ? (
          <span className="text-fg-2 font-mono text-xs tabular-nums">
            {formatZAR(centsToRand(application.value))}
          </span>
        ) : (
          <span />
        )}
        {application.appliedDate ? (
          <span className="text-fg-3 font-mono text-xs tabular-nums">
            {format(new Date(application.appliedDate), "dd MMM yyyy")}
          </span>
        ) : null}
      </div>
      {isOutcome ? (
        <span
          className="w-fit rounded-full px-2 py-0.5 text-xs"
          style={{ color: oTone, background: tint(oTone) }}
        >
          {OUTCOME_META[application.outcome as keyof typeof OUTCOME_META].label}
        </span>
      ) : null}
    </div>
  );
}
