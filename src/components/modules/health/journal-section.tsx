"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { dateToDay } from "@/lib/money";
import { HealthNoteModal } from "./health-note-modal";
import type { getHealthNotes } from "@/actions/health-notes";

export type HealthNote = Awaited<ReturnType<typeof getHealthNotes>>[number];

// The Journal area: dated health jottings, newest first.
export function JournalSection({
  notes,
  today,
}: {
  notes: HealthNote[];
  today: string;
}) {
  const [editing, setEditing] = useState<HealthNote | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.body.toLowerCase().includes(q));
  }, [notes, search]);

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  if (notes.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Health"
          message="No notes yet. Jot how you're feeling, a symptom, a reaction to a meal - quick lines, dated, so you can look back."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> New note
            </Button>
          }
        />
        <HealthNoteModal
          open={creating}
          onOpenChange={(o) => !o && closeModal()}
          note={null}
          today={today}
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
          placeholder="Search notes…"
        />
        <Button onClick={() => setCreating(true)}>
          <Plus /> New note
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-fg-3 py-10 text-sm">No notes match.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setEditing(note)}
              className="bg-surface hover:bg-surface-2 block w-full rounded-[var(--r)] border p-4 text-left shadow-[var(--shadow-card)] transition-colors"
            >
              <p className="text-fg-3 font-mono text-xs tabular-nums">
                {format(
                  new Date(`${dateToDay(note.date)}T00:00:00`),
                  "dd MMM yyyy",
                )}
              </p>
              <p className="text-fg mt-1 text-sm whitespace-pre-wrap">
                {note.body}
              </p>
            </button>
          ))}
        </div>
      )}

      <HealthNoteModal
        open={creating || editing !== null}
        onOpenChange={(o) => !o && closeModal()}
        note={editing}
        today={today}
      />
    </div>
  );
}
