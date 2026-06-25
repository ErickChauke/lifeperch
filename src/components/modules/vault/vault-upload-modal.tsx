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
import { formatBytes } from "@/lib/vault";
import { uploadFile, MAX_UPLOAD_BYTES } from "@/lib/upload";
import { createCollection, createDocument } from "@/actions/vault";

type Phase = "idle" | "uploading" | "failed";

const NEW_FOLDER = "__new__";

// Top-level upload: pick a file, name it, and choose which open folder it lands
// in. With no folders yet, it creates one from the typed name and uploads into
// it. Password-protected folders are uploaded into from inside, after unlocking.
export function VaultUploadModal({
  folders,
  open,
  onOpenChange,
}: {
  folders: { id: string; title: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [folderId, setFolderId] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);

  const creatingFolder = folders.length === 0 || folderId === NEW_FOLDER;

  function reset() {
    setTitle("");
    setFolderId("");
    setNewFolder("");
    setFile(null);
    setRejected(null);
    setPhase("idle");
    setProgress(0);
  }

  function pick(f: File | null) {
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setRejected(`That file is ${formatBytes(f.size)} - the limit is 10 MB.`);
      return;
    }
    setRejected(null);
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function save() {
    if (!file || !title.trim()) return;
    if (creatingFolder && !newFolder.trim()) return;
    setPhase("uploading");
    setProgress(0);
    (async () => {
      try {
        const result = await uploadFile(file, "lifeperch/vault", setProgress);
        startTransition(async () => {
          try {
            const targetId = creatingFolder
              ? (await createCollection({ title: newFolder.trim() })).id
              : folderId;
            await createDocument(targetId, { title, ...result });
            toast.success("Document uploaded");
            reset();
            onOpenChange(false);
            router.push(`/vault/${targetId}`);
          } catch {
            setPhase("failed");
          }
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
  const saveDisabled =
    !file ||
    !title.trim() ||
    (creatingFolder ? !newFolder.trim() : !folderId) ||
    uploading;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="upload-title">Title</Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lease agreement"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="upload-folder">Folder</Label>
            {folders.length > 0 ? (
              <Select
                id="upload-folder"
                placeholder="Select a folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
                <option value={NEW_FOLDER}>+ New folder</option>
              </Select>
            ) : (
              <p className="text-fg-4 text-xs">
                No folders yet. Name one and it is created with your document inside.
              </p>
            )}
            {creatingFolder ? (
              <Input
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="New folder name"
                className="mt-1.5"
              />
            ) : null}
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
            <Button type="button" size="sm" onClick={save} disabled={saveDisabled}>
              {phase === "failed" ? "Retry" : uploading ? `${progress}%` : "Upload"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
