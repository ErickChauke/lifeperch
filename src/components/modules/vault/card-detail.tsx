"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pencil, Trash2, Upload, Settings, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import {
  renameCollection,
  deleteCollection,
  lockCollection,
} from "@/actions/vault";
import { DocCard } from "./doc-card";
import { CardSettingsModal } from "./card-settings-modal";
import { DocumentUploadModal } from "./document-upload-modal";
import type { getCollection } from "@/actions/vault";

type CardDetail = NonNullable<Awaited<ReturnType<typeof getCollection>>>;

export function CardDetailView({ collection }: { collection: CardDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(collection.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const locked = Boolean(collection.passwordHash);
  const count = collection.documents.length;

  function saveRename() {
    const clean = titleDraft.trim();
    if (!clean) return;
    startTransition(async () => {
      try {
        await renameCollection(collection.id, clean);
        setRenaming(false);
      } catch {
        toast.error("Could not rename the folder");
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
        router.push("/vault");
      } catch {
        toast.error("Could not delete the folder");
      }
    });
  }

  function relock() {
    startTransition(async () => {
      await lockCollection(collection.id);
      router.refresh();
    });
  }

  return (
    <PageShell>
      <PageHeader className="space-y-4">
        <Link
          href="/vault"
          className="text-fg-3 hover:text-fg-2 inline-flex items-center gap-1 font-mono text-xs"
        >
          <ChevronLeft className="size-4" /> Vault
        </Link>

        <div className="flex items-center justify-between gap-3">
          {renaming ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                autoFocus
                className="h-9 max-w-sm text-xl font-semibold"
              />
              <Button size="sm" onClick={saveRename} disabled={pending}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="text-fg truncate text-2xl font-semibold">
                {collection.title}
              </h1>
              {locked ? (
                <span className="text-fg-4" aria-label="Password protected">
                  <Lock className="size-4" />
                </span>
              ) : null}
            </div>
          )}
          {!renaming ? (
            <div className="flex shrink-0 items-center gap-1">
              {locked ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={relock}
                  disabled={pending}
                >
                  <Lock /> Re-lock
                </Button>
              ) : null}
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Folder settings"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="text-fg-3 size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Rename folder"
                onClick={() => {
                  setTitleDraft(collection.title);
                  setRenaming(true);
                }}
              >
                <Pencil className="text-fg-3 size-4" />
              </Button>
              <Button
                size="sm"
                variant={confirmDelete ? "destructive" : "ghost"}
                aria-label="Delete folder"
                onClick={onDelete}
                disabled={pending}
              >
                {confirmDelete ? "Delete folder?" : <Trash2 className="text-fg-3 size-4" />}
              </Button>
            </div>
          ) : null}
        </div>

        {collection.description ? (
          <p className="text-fg-2 text-sm">{collection.description}</p>
        ) : null}
      </PageHeader>

      <PageBody className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-fg-3 font-mono text-xs">
            {count} {count === 1 ? "document" : "documents"}
          </p>
          <Button onClick={() => setUploading(true)}>
            <Upload /> Upload
          </Button>
        </div>

        {count === 0 ? (
          <p className="text-fg-3 text-sm">
            Nothing in this folder yet. Upload your first document.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {collection.documents.map((doc) => (
              <DocCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </PageBody>

      <CardSettingsModal
        id={collection.id}
        description={collection.description}
        locked={locked}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <DocumentUploadModal
        collectionId={collection.id}
        open={uploading}
        onOpenChange={setUploading}
      />
    </PageShell>
  );
}
