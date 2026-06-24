"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { FileText, Image, Table, Archive, File, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fileKind, formatBytes } from "@/lib/vault";
import { deleteDocument } from "@/actions/vault";
import type { getCollection } from "@/actions/vault";

export type VaultDoc = NonNullable<
  Awaited<ReturnType<typeof getCollection>>
>["documents"][number];

const KIND_ICONS = {
  pdf: FileText,
  image: Image,
  sheet: Table,
  archive: Archive,
  file: File,
} as const;

// A single document tile inside a card: file icon, title, format/size and date,
// with a hover delete. Grouping now lives in the card, so there is no category.
export function DocCard({ doc }: { doc: VaultDoc }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const Icon = KIND_ICONS[fileKind(doc.format)];
  const meta = [doc.format?.toUpperCase(), formatBytes(doc.bytes)]
    .filter(Boolean)
    .join(" · ");

  function open() {
    window.open(doc.url, "_blank", "noopener");
  }

  function remove() {
    startTransition(async () => {
      try {
        await deleteDocument(doc.id);
        router.refresh();
      } catch {
        toast.error("Could not delete the document");
      }
    });
  }

  return (
    <div className="group bg-surface hover:bg-surface-2 hover:border-border-2 relative flex flex-col gap-3 rounded-lg border p-4 transition-all hover:-translate-y-px">
      <button
        type="button"
        onClick={() => setConfirm(true)}
        aria-label="Delete document"
        className="text-fg-4 hover:text-[var(--danger)] absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="size-4" />
      </button>

      <button type="button" onClick={open} className="text-left">
        <span className="bg-surface-2 text-fg-2 flex size-10 items-center justify-center rounded-sm">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        <span className="text-fg mt-3 line-clamp-2 block text-sm font-medium">
          {doc.title}
        </span>
      </button>

      {confirm ? (
        <div className="mt-auto flex items-center gap-2 text-xs">
          <span className="text-fg-2">Delete?</span>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="font-medium text-[var(--danger)]"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            className="text-fg-3"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-auto flex items-center justify-between gap-2">
          {meta ? <p className="text-fg-4 font-mono text-xs">{meta}</p> : <span />}
          <span className="text-fg-3 shrink-0 font-mono text-xs">
            {format(new Date(doc.createdAt), "dd MMM yyyy")}
          </span>
        </div>
      )}
    </div>
  );
}
