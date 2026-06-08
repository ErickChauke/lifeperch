"use client";

import { useRef, useState, useTransition } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/modules/money/segmented";
import { LIT_STATUSES, type LitStatus } from "@/lib/literature";
import { uploadFile, MAX_UPLOAD_BYTES } from "@/lib/upload";
import { formatBytes } from "@/lib/vault";
import { createLit, updateLit, deleteLit } from "@/actions/literature";
import type { Paper } from "./literature-board";

const SOURCES = [
  { value: "pdf", label: "PDF" },
  { value: "link", label: "Link" },
] as const;

type Source = (typeof SOURCES)[number]["value"];

export function PaperModal({
  open,
  onOpenChange,
  paper,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paper: Paper | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        {/* Mounted only while open, so the form initialises from the paper once. */}
        {open ? <PaperForm paper={paper} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function PaperForm({ paper, onClose }: { paper: Paper | null; onClose: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState(paper?.title ?? "");
  const [authors, setAuthors] = useState(paper?.authors ?? "");
  const [year, setYear] = useState(paper?.year?.toString() ?? "");
  const [status, setStatus] = useState<LitStatus>((paper?.status as LitStatus) ?? "to-read");
  const [source, setSource] = useState<Source>(
    paper?.fileUrl ? "pdf" : paper?.url ? "link" : "pdf",
  );
  const [url, setUrl] = useState(paper?.url ?? "");
  const [fileUrl, setFileUrl] = useState<string | null>(paper?.fileUrl ?? null);
  const [publicId, setPublicId] = useState<string | null>(paper?.publicId ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState(paper?.notes ?? "");
  const [tags, setTags] = useState<string[]>(paper?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rejected, setRejected] = useState<string | null>(null);

  function pick(f: File | null) {
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) {
      setRejected(`That file is ${formatBytes(f.size)} — the limit is 10 MB.`);
      return;
    }
    setRejected(null);
    setFile(f);
  }

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (!tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTags([...tags, tag]);
    }
    setTagDraft("");
  }

  function save() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    (async () => {
      let nextFileUrl: string | null = null;
      let nextPublicId: string | null = null;
      let nextUrl: string | null = null;

      try {
        if (source === "pdf") {
          if (file) {
            setUploading(true);
            const result = await uploadFile(file, "lifeperch/literature", setProgress);
            nextFileUrl = result.url;
            nextPublicId = result.publicId;
            setUploading(false);
          } else {
            nextFileUrl = fileUrl;
            nextPublicId = publicId;
          }
        } else {
          nextUrl = url.trim() || null;
        }
      } catch {
        setUploading(false);
        toast.error("Upload failed");
        return;
      }

      const input = {
        title: title.trim(),
        authors,
        year: year.trim() ? Number(year) : null,
        status,
        url: nextUrl,
        fileUrl: nextFileUrl,
        publicId: nextPublicId,
        notes,
        tags,
      };

      startTransition(async () => {
        try {
          if (paper) await updateLit(paper.id, input);
          else await createLit(input);
          toast.success(paper ? "Paper updated" : "Paper added");
          onClose();
        } catch {
          toast.error("Something went wrong");
        }
      });
    })();
  }

  function onDelete() {
    if (!paper) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteLit(paper.id);
        toast.success("Paper deleted");
        onClose();
      } catch {
        toast.error("Could not delete paper");
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{paper ? "Edit paper" : "Add paper"}</DialogTitle>
      </DialogHeader>

      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="space-y-1.5">
          <Label htmlFor="lit-title">Title</Label>
          <Input
            id="lit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Attention Is All You Need"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lit-authors">Authors</Label>
          <Input
            id="lit-authors"
            value={authors}
            onChange={(e) => setAuthors(e.target.value)}
            placeholder="e.g. Vaswani, Shazeer, Parmar…"
          />
        </div>

        <div className="flex gap-3">
          <div className="w-28 space-y-1.5">
            <Label htmlFor="lit-year">Year</Label>
            <Input
              id="lit-year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="font-mono"
              placeholder="2017"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="lit-status">Status</Label>
            <Select
              id="lit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as LitStatus)}
            >
              {LIT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Source</Label>
          <Segmented options={SOURCES} value={source} onChange={setSource} />
          {source === "link" ? (
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-2 font-mono"
              placeholder="https://…"
            />
          ) : (
            <div className="mt-2">
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />
              {file || fileUrl ? (
                <div className="bg-surface-2 flex items-center gap-3 rounded-md border p-3">
                  <FileText className="text-fg-3 size-5 shrink-0" />
                  <span className="text-fg min-w-0 flex-1 truncate text-sm">
                    {file ? file.name : "Stored PDF"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setFileUrl(null);
                      setPublicId(null);
                    }}
                    aria-label="Clear file"
                    className="text-fg-4 hover:text-[var(--danger)]"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="bg-surface-2 border-border-2 text-fg-3 hover:text-fg-2 flex w-full flex-col items-center gap-1.5 rounded-md border border-dashed p-4"
                >
                  <UploadCloud className="size-5" />
                  <span className="text-sm">Drop a PDF or browse</span>
                  <span className="text-fg-4 font-mono text-xs">max 10 MB</span>
                </button>
              )}
              {rejected ? <p className="mt-1 text-xs text-[var(--danger)]">{rejected}</p> : null}
              {uploading ? (
                <div className="bg-surface-3 mt-2 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${progress}%`, background: "var(--accent)" }}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lit-notes">Notes</Label>
          <Textarea
            id="lit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why it matters, where you stopped…"
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Tags</Label>
          <div className="bg-surface-2 flex flex-wrap items-center gap-1.5 rounded-sm border p-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-surface-3 text-fg-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  aria-label={`Remove ${tag}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagDraft);
                } else if (e.key === "Backspace" && !tagDraft && tags.length) {
                  setTags(tags.slice(0, -1));
                }
              }}
              placeholder="Add a tag…"
              className="placeholder:text-fg-3 min-w-[100px] flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        {paper ? (
          <Button
            type="button"
            variant={confirmDelete ? "destructive" : "ghost"}
            size="sm"
            onClick={onDelete}
            disabled={pending}
          >
            {confirmDelete ? "Delete paper?" : "Delete"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={pending || uploading}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={pending || uploading}>
            {uploading ? `${progress}%` : paper ? "Save" : "Add"}
          </Button>
        </div>
      </div>
    </>
  );
}
