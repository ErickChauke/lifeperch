"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { NoteCard } from "./note-card";
import { NoteEditor } from "./note-editor";
import { NoteDetail } from "./note-detail";
import type { getNotes } from "@/actions/notes";

export type Note = Awaited<ReturnType<typeof getNotes>>[number];

// Client container for Notes. Owns the list/editor view, search string, and the
// active tag filter. Search and tag filters combine with AND, both client-side
// for instant feedback over the user's full note set.
export function NotesBoard({ notes }: { notes: Note[] }) {
  const [viewing, setViewing] = useState<Note | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      const matchesSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q);
      const matchesTags = activeTags.every((t) => n.tags.includes(t));
      return matchesSearch && matchesTags;
    });
  }, [notes, search, activeTags]);

  function toggleTag(tag: string) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function clearFilters() {
    setSearch("");
    setActiveTags([]);
  }

  function closeEditor() {
    setCreating(false);
    setEditing(null);
  }

  if (creating || editing) {
    return (
      <PageShell>
        <PageBody className="pt-6 md:pt-10">
          <NoteEditor note={editing} onClose={closeEditor} />
        </PageBody>
      </PageShell>
    );
  }

  if (viewing) {
    return (
      <PageShell>
        <PageBody className="pt-6 md:pt-10">
          <NoteDetail
            note={viewing}
            onClose={() => setViewing(null)}
            onEdit={() => {
              setEditing(viewing);
              setViewing(null);
            }}
          />
        </PageBody>
      </PageShell>
    );
  }

  if (notes.length === 0) {
    return (
      <PageShell>
        <PageBody>
          <div className="mx-auto max-w-[560px] py-12 text-center">
            <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.10em]">
              Records · Notes
            </p>
            <p className="text-fg-2 mt-3 text-[15px]">
              Nothing written down yet. Notes is where ideas and reference live
              - start one.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => setCreating(true)}>
                <Plus /> New note
              </Button>
            </div>
          </div>
        </PageBody>
      </PageShell>
    );
  }

  const hasFilters = search.trim() !== "" || activeTags.length > 0;

  return (
    <PageShell>
      <PageHeader>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="bg-surface-2 placeholder:text-fg-3 h-9 w-full rounded-sm border border-border pl-8 pr-3 text-sm outline-none focus-visible:border-accent-line"
            />
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus /> New note
          </Button>
        </div>
      </PageHeader>

      <PageBody className="space-y-6">
        {allTags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {allTags.map((tag) => {
              const active = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    active
                      ? "bg-accent-soft text-accent-read border-accent-line"
                      : "bg-surface-3 text-fg-2 hover:text-fg border-transparent",
                  )}
                >
                  {tag}
                </button>
              );
            })}
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            ) : null}
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="text-fg-3 flex flex-col items-start gap-3 py-10 text-sm">
            <p>No notes match.</p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => setViewing(note)}
              />
            ))}
          </div>
        )}
      </PageBody>
    </PageShell>
  );
}
