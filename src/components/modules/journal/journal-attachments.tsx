"use client";

import { useRef, useState } from "react";
import {
  FileText,
  Image,
  Table,
  Archive,
  File,
  Paperclip,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { fileKind, formatBytes } from "@/lib/vault";
import { uploadFile, MAX_UPLOAD_BYTES } from "@/lib/upload";
import {
  addJournalAttachment,
  deleteJournalAttachment,
} from "@/actions/journal";
import { Button } from "@/components/ui/button";
import type { Entry } from "./journal-board";

type Attachment = Entry["attachments"][number];

const KIND_ICONS = {
  pdf: FileText,
  image: Image,
  sheet: Table,
  archive: Archive,
  file: File,
} as const;

// Manages a journal entry's file attachments. Holds its own list state seeded
// from the server so a freshly added or removed row shows immediately without
// refetching the parent entry.
export function JournalAttachments({
  entryId,
  initial,
}: {
  entryId: string;
  initial: Attachment[];
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function onPick(file: File | null) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`That file is ${formatBytes(file.size)} - the limit is 10 MB.`);
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadFile(file, "lifeperch/journal", setProgress);
      const row = await addJournalAttachment(entryId, {
        name: file.name,
        ...result,
      });
      setAttachments((prev) => [...prev, row]);
    } catch {
      toast.error("Could not attach that file");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteJournalAttachment(id);
    } catch {
      toast.error("Could not remove that attachment");
    }
  }

  return (
    <div className="border-border space-y-3 border-t pt-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-fg-2 flex items-center gap-1.5 text-sm font-medium">
          <Paperclip className="size-4" /> Attachments
        </h2>
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
        >
          {uploading ? `${progress}%` : "Attach file"}
        </Button>
      </div>

      {uploading ? (
        <div className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: "var(--accent)" }}
          />
        </div>
      ) : null}

      {attachments.length === 0 ? (
        <p className="text-fg-4 text-sm">No files attached.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => {
            const Icon = KIND_ICONS[fileKind(a.format)];
            const size = formatBytes(a.bytes);
            return (
              <li
                key={a.id}
                className="bg-surface-2 group flex items-center gap-3 rounded-md border p-2.5"
              >
                <span className="bg-surface-3 text-fg-2 flex size-8 shrink-0 items-center justify-center rounded-sm">
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-fg truncate text-sm">{a.name}</p>
                  {size ? (
                    <p className="text-fg-4 font-mono text-xs">{size}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => window.open(a.url, "_blank", "noopener")}
                  aria-label="Open in new tab"
                  className="text-fg-4 hover:text-fg-2 shrink-0 transition-colors"
                >
                  <ExternalLink className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  aria-label="Remove attachment"
                  className="text-fg-4 shrink-0 transition-colors hover:text-[var(--danger)]"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
