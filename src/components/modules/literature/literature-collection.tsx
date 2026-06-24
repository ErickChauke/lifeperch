"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { Segmented } from "@/components/modules/money/segmented";
import {
  renameCollection,
  updateCollectionDescription,
  deleteCollection,
} from "@/actions/literature";
import { PaperCard } from "./paper-card";
import { PaperModal } from "./paper-modal";
import type { getCollection } from "@/actions/literature";

type Topic = NonNullable<Awaited<ReturnType<typeof getCollection>>>;
type Paper = Topic["papers"][number];

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "to-read", label: "To read" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

export function LiteratureCollectionView({ collection }: { collection: Topic }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Paper | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const [editingTopic, setEditingTopic] = useState(false);
  const [titleDraft, setTitleDraft] = useState(collection.title);
  const [descDraft, setDescDraft] = useState(collection.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return collection.papers.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.authors.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      const matchesStatus = status === "all" || p.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [collection.papers, search, status]);

  const hasFilters = search.trim() !== "" || status !== "all";

  function clearFilters() {
    setSearch("");
    setStatus("all");
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  function saveTopic() {
    const clean = titleDraft.trim();
    if (!clean) return;
    startTransition(async () => {
      try {
        await renameCollection(collection.id, clean);
        await updateCollectionDescription(collection.id, descDraft);
        setEditingTopic(false);
      } catch {
        toast.error("Could not save the topic");
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
        await deleteCollection(collection.id);
        router.push("/literature");
      } catch {
        toast.error("Could not delete the topic");
      }
    });
  }

  return (
    <PageShell>
      <PageHeader className="space-y-4">
        <Link
          href="/literature"
          className="text-fg-3 hover:text-fg-2 inline-flex items-center gap-1 font-mono text-xs"
        >
          <ChevronLeft className="size-4" /> Literature
        </Link>

        {editingTopic ? (
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
              placeholder="What this topic is about (optional)"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveTopic} disabled={pending}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTopic(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-fg truncate text-2xl font-semibold">
                {collection.title}
              </h1>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Edit topic"
                  onClick={() => {
                    setTitleDraft(collection.title);
                    setDescDraft(collection.description ?? "");
                    setEditingTopic(true);
                  }}
                >
                  <Pencil className="text-fg-3 size-4" />
                </Button>
                <Button
                  size="sm"
                  variant={confirmDelete ? "destructive" : "ghost"}
                  aria-label="Delete topic"
                  onClick={onDelete}
                  disabled={pending}
                >
                  {confirmDelete ? "Delete topic?" : <Trash2 className="text-fg-3 size-4" />}
                </Button>
              </div>
            </div>
            {collection.description ? (
              <p className="text-fg-2 text-sm">{collection.description}</p>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="text-fg-3 pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search papers…"
              className="bg-surface-2 placeholder:text-fg-3 focus-visible:border-accent-line h-9 w-full rounded-sm border pl-8 pr-3 text-sm outline-none"
            />
          </div>
          <Segmented options={STATUS_FILTERS} value={status} onChange={setStatus} />
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          ) : null}
          <Button onClick={() => setCreating(true)}>
            <Plus /> Add paper
          </Button>
        </div>
      </PageHeader>

      <PageBody className="space-y-6">
        {collection.papers.length === 0 ? (
          <p className="text-fg-3 text-sm">
            No papers in this topic yet. Add the first one.
          </p>
        ) : filtered.length === 0 ? (
          <div className="text-fg-3 flex flex-col items-start gap-3 py-10 text-sm">
            <p>No papers match.</p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((paper) => (
              <PaperCard key={paper.id} paper={paper} onEdit={() => setEditing(paper)} />
            ))}
          </div>
        )}

        <PaperModal
          open={creating || editing !== null}
          onOpenChange={(o) => !o && closeModal()}
          collectionId={collection.id}
          paper={editing}
        />
      </PageBody>
    </PageShell>
  );
}
