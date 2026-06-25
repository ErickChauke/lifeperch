"use client";

import { useState, useTransition } from "react";
import { X, MapPin, Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { cn, formatZAR } from "@/lib/utils";
import { centsToRand } from "@/lib/money";
import { APP_STAGES, APP_OUTCOMES, STAGE_META, OUTCOME_META } from "@/lib/jobs";
import { STAGE_TONE, OUTCOME_TONE, tint } from "./tones";
import {
  moveJob,
  setOutcome,
  addStage,
  updateStage,
  deleteStage,
  deleteJob,
} from "@/actions/jobs";
import type { Application } from "./jobs-board";

const STAGE_OPTIONS = APP_STAGES.map((s) => ({ value: s, label: STAGE_META[s].label }));

export function StageDrawer({
  application,
  onClose,
  onEdit,
}: {
  application: Application | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!application) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="bg-surface fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[420px] flex-col border-l shadow-[var(--shadow-pop)]">
        <DrawerBody key={application.id} application={application} onClose={onClose} onEdit={onEdit} />
      </div>
    </>
  );
}

function DrawerBody({
  application,
  onClose,
  onEdit,
}: {
  application: Application;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [noteText, setNoteText] = useState("");
  const [noteLabel, setNoteLabel] = useState(STAGE_META[application.status as keyof typeof STAGE_META]?.label ?? "Applied");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmNote, setConfirmNote] = useState<string | null>(null);
  const [confirmApp, setConfirmApp] = useState(false);

  const tone = STAGE_TONE[application.status] ?? "var(--text-3)";

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
      } catch {
        // toasts are raised by the form-level actions; quick controls stay quiet
      }
    });
  }

  function saveNote() {
    const note = noteText.trim();
    if (!note) return;
    run(async () => {
      if (editingId) await updateStage(editingId, { label: noteLabel, note, date: null });
      else await addStage(application.id, { label: noteLabel, note, date: null });
      setNoteText("");
      setEditingId(null);
    });
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b p-5">
        <div className="min-w-0">
          <h2 className="text-fg truncate text-xl font-semibold tracking-tight">
            {application.organisation}
          </h2>
          <p className="text-fg-2 text-sm">{application.position}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ color: tone, background: tint(tone) }}
            >
              {STAGE_META[application.status as keyof typeof STAGE_META]?.label}
            </span>
            {application.location ? (
              <span className="text-fg-3 flex items-center gap-1 text-xs">
                <MapPin className="size-3.5" strokeWidth={1.75} />
                {application.location}
              </span>
            ) : null}
            {application.appliedDate ? (
              <span className="text-fg-3 font-mono text-xs tabular-nums">
                {format(new Date(application.appliedDate), "dd MMM yyyy")}
              </span>
            ) : null}
            {application.deadline ? (
              <span className="text-fg-3 font-mono text-xs tabular-nums">
                Closes {format(new Date(application.deadline), "dd MMM yyyy")}
              </span>
            ) : null}
            {application.url ? (
              <button
                type="button"
                onClick={() => window.open(application.url!, "_blank", "noopener")}
                className="text-fg-3 hover:text-fg-2 flex items-center gap-1 text-xs"
              >
                <ExternalLink className="size-3.5" strokeWidth={1.75} />
                Posting
              </button>
            ) : null}
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-5">
        {/* Detail */}
        {application.description ? (
          <div className="mb-5">
            <p className="text-fg-3 mb-1 font-mono text-xs">DESCRIPTION</p>
            <p className="text-fg text-sm whitespace-pre-wrap">
              {application.description}
            </p>
          </div>
        ) : null}

        {application.value != null ? (
          <div className="mb-5">
            <p className="text-fg-3 font-mono text-xs">VALUE</p>
            <p className="text-fg mt-0.5 font-mono text-sm tabular-nums">
              {formatZAR(centsToRand(application.value))}
            </p>
          </div>
        ) : null}

        {/* Stage control */}
        <p className="text-fg-3 mb-2 font-mono text-xs">STAGE</p>
        <div className="bg-surface-2 flex flex-wrap gap-1 rounded-full p-1">
          {STAGE_OPTIONS.map((opt) => {
            const active = opt.value === application.status;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={pending}
                onClick={() => run(() => moveJob(application.id, opt.value))}
                className={cn(
                  "flex-1 rounded-full px-2 py-1 text-xs font-medium transition-colors",
                  active ? "bg-surface text-fg shadow-[var(--shadow-card)]" : "text-fg-3 hover:text-fg-2",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Outcome control */}
        {application.status === "outcome" ? (
          <div className="mt-3">
            <p className="text-fg-3 mb-2 font-mono text-xs">RESULT</p>
            <div className="flex gap-2">
              {APP_OUTCOMES.map((o) => {
                const active = application.outcome === o;
                const oTone = OUTCOME_TONE[o];
                return (
                  <button
                    key={o}
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setOutcome(application.id, active ? null : o))}
                    className={cn(
                      "flex-1 rounded-full border px-2 py-1.5 text-xs font-medium transition-colors",
                      active ? "border-transparent" : "border-border text-fg-3 hover:text-fg-2",
                    )}
                    style={active ? { color: oTone, background: tint(oTone) } : undefined}
                  >
                    {OUTCOME_META[o].label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Notes history */}
        <p className="text-fg-3 mt-6 mb-2 font-mono text-xs">NOTES</p>
        <div className="space-y-3">
          {application.stages.map((stage) => (
            <div key={stage.id} className="group">
              <div className="flex items-center justify-between gap-2">
                <span className="text-fg-3 font-mono text-xs uppercase">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-fg-4 font-mono text-xs tabular-nums">
                    {format(new Date(stage.createdAt), "dd MMM yyyy")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(stage.id);
                      setNoteLabel(stage.label);
                      setNoteText(stage.note);
                    }}
                    className="text-fg-4 hover:text-fg-2 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Pencil className="size-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirmNote === stage.id
                        ? run(() => deleteStage(stage.id))
                        : setConfirmNote(stage.id)
                    }
                    className={cn(
                      "transition-opacity",
                      confirmNote === stage.id
                        ? "opacity-100"
                        : "text-fg-4 hover:text-[var(--danger)] opacity-0 group-hover:opacity-100",
                    )}
                    style={confirmNote === stage.id ? { color: "var(--danger)" } : undefined}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
              <p className="text-fg mt-1 text-sm">{stage.note}</p>
            </div>
          ))}
          {application.stages.length === 0 ? (
            <p className="text-fg-4 text-sm">No notes yet.</p>
          ) : null}
        </div>

        {/* Add / edit note */}
        <div className="mt-4 space-y-2">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note…"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <Select
              value={noteLabel}
              onChange={(e) => setNoteLabel(e.target.value)}
              className="flex-1"
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Button size="sm" onClick={saveNote} disabled={pending || !noteText.trim()}>
              <Plus /> {editingId ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t p-5">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil /> Edit
        </Button>
        <Button
          variant={confirmApp ? "destructive" : "ghost"}
          size="sm"
          disabled={pending}
          onClick={() =>
            confirmApp
              ? run(async () => {
                  await deleteJob(application.id);
                  onClose();
                })
              : setConfirmApp(true)
          }
        >
          {confirmApp ? "Delete application?" : "Delete"}
        </Button>
      </div>
    </>
  );
}
