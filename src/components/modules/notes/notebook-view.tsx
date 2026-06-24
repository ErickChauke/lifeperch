"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import {
  renameCollection,
  updateCollectionDescription,
  deleteCollection,
} from "@/actions/notes";
import { NoteCard } from "./note-card";
import { NoteEditor } from "./note-editor";
import { NoteDetail } from "./note-detail";
import type { getCollection } from "@/actions/notes";

type Notebook = NonNullable<Awaited<ReturnType<typeof getCollection>>>;
type Note = Notebook["notes"][number];

// One notebook: its notes with search and a tag filter, plus the read view and
// the editor. Mirrors the old notes board, scoped to a single notebook.
export function NotebookView({ notebook }: { notebook: Notebook }) {
  const router = useRouter();
  const notes = notebook.notes;
  const [pending, startTransition] = useTransition();

  const [viewing, setViewing] = useState<Note | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const [editingBook, setEditingBook] = useState(false);
  const [titleDraft, setTitleDraft] = useState(notebook.title);
  const [descDraft, setDescDraft] = useState(notebook.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  function saveBook() {
    const clean = titleDraft.trim();
    if (!clean) return;
    startTransition(async () => {
      try {
        await renameCollection(notebook.id, clean);
        await updateCollectionDescription(notebook.id, descDraft);
        setEditingBook(false);
      } catch {
        toast.error("Could not save the notebook");
      }
    });
  }

  function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteCollection(notebook.id);
        router.push("/notes");
      } catch {
        toast.error("Could not delete the notebook");
      }
    });
  }

  if (creating || editing) {
    return (
      <PageShell>
        <PageBody className="pt-6 md:pt-10">
          <NoteEditor note={editing} collectionId={notebook.id} onClose={closeEditor} />
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

  const hasFilters = search.trim() !== "" || activeTags.length > 0;

  return (
    <PageShell>
      <PageHeader className="space-y-4">
        <Link
          href="/notes"
          className="text-fg-3 hover:text-fg-2 inline-flex items-center gap-1 font-mono text-xs"
        >
          <ChevronLeft className="size-4" /> Notes
        </Link>

        {editingBook ? (
          <div className="space-y-2">
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              autoFocus
              className="h-9 max-w-sm text-xl font-semibold"
            />
            <Textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              placeholder="What this notebook holds (optional)"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveBook} disabled={pending}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingBook(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-fg truncate text-2xl font-semibold">
                {notebook.title}
              </h1>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Edit notebook"
                  onClick={() => {
                    setTitleDraft(notebook.title);
                    setDescDraft(notebook.description ?? "");
                    setEditingBook(true);
                  }}
                >
                  <Pencil className="text-fg-3 size-4" />
                </Button>
                <Button
                  size="sm"
                  variant={confirmDelete ? "destructive" : "ghost"}
                  aria-label="Delete notebook"
                  onClick={onDelete}
                  disabled={pending}
                >
                  {confirmDelete ? "Delete notebook?" : <Trash2 className="text-fg-3 size-4" />}
                </Button>
              </div>
            </div>
            {notebook.description ? (
              <p className="text-fg-2 text-sm">{notebook.description}</p>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="bg-surface-2 placeholder:text-fg-3 focus-visible:border-accent-line h-9 w-full rounded-sm border pl-8 pr-3 text-sm outline-none"
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

        {notes.length === 0 ? (
          <p className="text-fg-3 text-sm">
            Nothing in this notebook yet. Start your first note.
          </p>
        ) : filtered.length === 0 ? (
          <div className="text-fg-3 flex flex-col items-start gap-3 py-10 text-sm">
            <p>No notes match.</p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((note) => (
              <NoteCard key={note.id} note={note} onClick={() => setViewing(note)} />
            ))}
          </div>
        )}
      </PageBody>
    </PageShell>
  );
}
