"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Lock, Upload, FileText, Image, Table, Archive, File, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fileKind, formatBytes } from "@/lib/vault";
import { lockVault, deleteDocument } from "@/actions/vault";
import { DocumentUploadModal } from "./document-upload-modal";
import type { getDocuments } from "@/actions/vault";

type Document = Awaited<ReturnType<typeof getDocuments>>[number];

const KIND_ICONS = {
  pdf: FileText,
  image: Image,
  sheet: Table,
  archive: Archive,
  file: File,
} as const;

export function VaultGrid({ documents }: { documents: Document[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  function relock() {
    startTransition(async () => {
      await lockVault();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-fg text-2xl font-semibold">Vault</h1>
          <p className="text-fg-3 mt-1 font-mono text-xs">
            {documents.length} {documents.length === 1 ? "document" : "documents"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={relock} disabled={pending}>
            <Lock /> Re-lock
          </Button>
          <Button onClick={() => setUploading(true)}>
            <Upload /> Upload
          </Button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="mx-auto max-w-[560px] py-12 text-center">
          <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.10em]">
            Archive · Vault
          </p>
          <p className="text-fg-2 mt-3 text-[15px]">
            The vault is open and empty. Upload your first document — an ID, a
            contract, a certificate — and it lives here, behind your PIN.
          </p>
          <div className="mt-6 flex justify-center">
            <Button onClick={() => setUploading(true)}>
              <Upload /> Upload
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {documents.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      <DocumentUploadModal open={uploading} onOpenChange={setUploading} />
    </div>
  );
}

function DocCard({ doc }: { doc: Document }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const Icon = KIND_ICONS[fileKind(doc.format)];
  const meta = [doc.format?.toUpperCase(), formatBytes(doc.bytes)].filter(Boolean).join(" · ");

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
        <span className="text-fg mt-3 line-clamp-2 block text-sm font-medium">{doc.title}</span>
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
          <button type="button" onClick={() => setConfirm(false)} className="text-fg-3">
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-auto space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="bg-surface-3 text-fg-2 truncate rounded-full px-2 py-0.5 text-xs">
              {doc.category}
            </span>
            <span className="text-fg-3 shrink-0 font-mono text-xs">
              {format(new Date(doc.createdAt), "dd MMM yyyy")}
            </span>
          </div>
          {meta ? <p className="text-fg-4 font-mono text-xs">{meta}</p> : null}
        </div>
      )}
    </div>
  );
}
