"use client";

import { useMemo, useState } from "react";
import { Plus, Search, FileText, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/literature";
import { Segmented } from "@/components/modules/money/segmented";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { PaperModal } from "./paper-modal";
import type { getLit } from "@/actions/literature";

export type Paper = Awaited<ReturnType<typeof getLit>>[number];

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "to-read", label: "To read" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

// Status badge tint: meaning rides the status tokens, never the lime accent.
const STATUS_TONE: Record<string, string> = {
  "to-read": "var(--info)",
  reading: "var(--warning)",
  read: "var(--success)",
};

export function LiteratureBoard({ papers }: { papers: Paper[] }) {
  const [editing, setEditing] = useState<Paper | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return papers.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.authors.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      const matchesStatus = status === "all" || p.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [papers, search, status]);

  const hasFilters = search.trim() !== "" || status !== "all";

  function clearFilters() {
    setSearch("");
    setStatus("all");
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
  }

  if (papers.length === 0) {
    return (
      <>
        <MoneyEmpty
          eyebrow="Records · Literature"
          message="No papers yet. Track what you're reading — a title, who wrote it, and a link or a PDF — and your shelf fills in here."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Add paper
            </Button>
          }
        />
        <PaperModal open={creating} onOpenChange={(o) => !o && closeModal()} paper={null} />
      </>
    );
  }

  return (
    <div className="space-y-6">
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

      {filtered.length === 0 ? (
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
        paper={editing}
      />
    </div>
  );
}

function PaperCard({ paper, onEdit }: { paper: Paper; onEdit: () => void }) {
  const tone = STATUS_TONE[paper.status] ?? "var(--text-3)";
  const source = paper.fileUrl ? paper.fileUrl : paper.url;
  const visibleTags = paper.tags.slice(0, 4);
  const overflow = paper.tags.length - visibleTags.length;

  return (
    <div
      onClick={onEdit}
      className="bg-surface hover:bg-surface-2 hover:border-border-2 flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-all hover:-translate-y-px"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-xs"
          style={{
            color: tone,
            background: `color-mix(in oklch, ${tone} 15%, transparent)`,
          }}
        >
          {statusLabel(paper.status)}
        </span>
        {source ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              window.open(source, "_blank", "noopener");
            }}
            className="text-fg-3 hover:text-fg-2 flex items-center gap-1 font-mono text-xs"
          >
            {paper.fileUrl ? <FileText className="size-3.5" /> : <LinkIcon className="size-3.5" />}
            {paper.fileUrl ? "PDF" : "Link"}
          </button>
        ) : (
          <span className="text-fg-4 font-mono text-xs">—</span>
        )}
      </div>

      <p className="text-fg line-clamp-2 text-lg font-semibold">{paper.title}</p>

      {paper.authors || paper.year ? (
        <p className="flex items-center gap-1.5 text-sm">
          {paper.authors ? (
            <span className="text-fg-2 min-w-0 truncate">{paper.authors}</span>
          ) : null}
          {paper.authors && paper.year ? <span className="text-fg-4">·</span> : null}
          {paper.year ? (
            <span className="text-fg-3 shrink-0 font-mono">{paper.year}</span>
          ) : null}
        </p>
      ) : null}

      {paper.tags.length > 0 ? (
        <div className="flex items-center gap-1.5 overflow-hidden">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="bg-surface-3 text-fg-2 shrink-0 rounded-full px-2 py-0.5 text-xs"
            >
              {tag}
            </span>
          ))}
          {overflow > 0 ? (
            <span className="bg-surface-2 text-fg-3 shrink-0 rounded-full px-2 py-0.5 text-xs">
              +{overflow}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
