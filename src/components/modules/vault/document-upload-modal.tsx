"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, X, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DOCUMENT_CATEGORIES, formatBytes } from "@/lib/vault";
import { uploadFile, MAX_UPLOAD_BYTES } from "@/lib/upload";
import { createDocument } from "@/actions/vault";

type Phase = "idle" | "uploading" | "failed";

export function DocumentUploadModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);

  function reset() {
    setTitle("");
    setCategory(DOCUMENT_CATEGORIES[0]);
    setFile(null);
    setRejected(null);
    setPhase("idle");
    setProgress(0);
  }

  function pick(f: File | null) {
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setRejected(`That file is ${formatBytes(f.size)} — the limit is 10 MB.`);
      return;
    }
    setRejected(null);
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function save() {
    if (!file || !title.trim()) return;
    setPhase("uploading");
    setProgress(0);
    (async () => {
      try {
        const result = await uploadFile(file, "lifeperch/vault", setProgress);
        startTransition(async () => {
          await createDocument({ title, category, ...result });
          toast.success("Document uploaded");
          reset();
          onOpenChange(false);
          router.refresh();
        });
      } catch {
        setPhase("failed");
      }
    })();
  }

  function close(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  const uploading = phase === "uploading";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Upload to vault</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lease agreement"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-category">Category</Label>
            <Select
              id="doc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>File</Label>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="bg-surface-2 flex items-center gap-3 rounded-md border p-3">
                <FileText className="text-fg-3 size-5 shrink-0" />
                <span className="text-fg min-w-0 flex-1 truncate text-sm">{file.name}</span>
                <span className="text-fg-3 shrink-0 font-mono text-xs">
                  {formatBytes(file.size)}
                </span>
                {!uploading ? (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    aria-label="Clear file"
                    className="text-fg-4 hover:text-[var(--danger)]"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="bg-surface-2 border-border-2 text-fg-3 hover:text-fg-2 flex w-full flex-col items-center gap-1.5 rounded-md border border-dashed p-5"
              >
                <UploadCloud className="size-5" />
                <span className="text-sm">Drop a file or browse</span>
                <span className="text-fg-4 font-mono text-xs">
                  PDF, image, doc or sheet · max 10 MB
                </span>
              </button>
            )}
            {rejected ? <p className="text-xs text-[var(--danger)]">{rejected}</p> : null}
            {uploading ? (
              <div className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progress}%`, background: "var(--accent)" }}
                />
              </div>
            ) : null}
            {phase === "failed" ? (
              <p className="text-xs text-[var(--danger)]">
                Upload failed. Check your connection and try again.
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => close(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={!file || !title.trim() || uploading}>
              {phase === "failed" ? "Retry" : uploading ? `${progress}%` : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
