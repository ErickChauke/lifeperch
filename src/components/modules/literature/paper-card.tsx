"use client";

import { FileText, Link as LinkIcon } from "lucide-react";
import { statusLabel } from "@/lib/literature";
import type { getCollection } from "@/actions/literature";

export type Paper = NonNullable<
  Awaited<ReturnType<typeof getCollection>>
>["papers"][number];

// Status badge tint: meaning rides the status tokens, never the lime accent.
const STATUS_TONE: Record<string, string> = {
  "to-read": "var(--info)",
  reading: "var(--warning)",
  read: "var(--success)",
};

export function PaperCard({ paper, onEdit }: { paper: Paper; onEdit: () => void }) {
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
            {paper.fileUrl ? (
              <FileText className="size-3.5" />
            ) : (
              <LinkIcon className="size-3.5" />
            )}
            {paper.fileUrl ? "PDF" : "Link"}
          </button>
        ) : (
          <span className="text-fg-4 font-mono text-xs">-</span>
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
