"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, FolderPlus, Folder, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { lockVault } from "@/actions/vault";
import { CardModal } from "./card-modal";
import { VaultUploadModal } from "./vault-upload-modal";
import type { getCollections } from "@/actions/vault";

type Collection = Awaited<ReturnType<typeof getCollections>>[number];

export function VaultBoard({ collections }: { collections: Collection[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  // Open (no-password) folders are the upload targets from here; locked folders
  // are uploaded into from inside, after unlocking.
  const openFolders = collections
    .filter((c) => !c.passwordHash)
    .map((c) => ({ id: c.id, title: c.title }));

  function relock() {
    startTransition(async () => {
      await lockVault();
      router.refresh();
    });
  }

  return (
    <PageShell>
      <PageHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-fg text-2xl font-semibold">Vault</h1>
            <p className="text-fg-3 mt-1 font-mono text-xs">
              {collections.length} {collections.length === 1 ? "folder" : "folders"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={relock} disabled={pending}>
              <Lock /> Re-lock
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
              <FolderPlus /> New folder
            </Button>
            <Button size="sm" onClick={() => setUploading(true)}>
              <Upload /> Upload
            </Button>
          </div>
        </div>
      </PageHeader>

      <PageBody className="space-y-6">
        {collections.length === 0 ? (
          <div className="mx-auto max-w-[560px] py-12 text-center">
            <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.10em]">
              Archive · Vault
            </p>
            <p className="text-fg-2 mt-3 text-[15px]">
              The vault is open and empty. Upload your first document - an ID, a
              contract, a certificate - or make a folder to group them in.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={() => setCreating(true)}>
                <FolderPlus /> New folder
              </Button>
              <Button onClick={() => setUploading(true)}>
                <Upload /> Upload
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <CardTile key={collection.id} collection={collection} />
            ))}
          </div>
        )}

        <CardModal open={creating} onOpenChange={setCreating} />
        <VaultUploadModal
          folders={openFolders}
          open={uploading}
          onOpenChange={setUploading}
        />
      </PageBody>
    </PageShell>
  );
}

function CardTile({ collection }: { collection: Collection }) {
  const count = collection._count.documents;
  const locked = Boolean(collection.passwordHash);

  return (
    <Link
      href={`/vault/${collection.id}`}
      className="group bg-surface hover:bg-surface-2 hover:border-border-2 focus-visible:border-accent-line flex flex-col gap-3 rounded-lg border p-4 transition-all hover:-translate-y-px"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="bg-surface-2 text-fg-2 flex size-10 items-center justify-center rounded-sm">
          <Folder className="size-5" strokeWidth={1.75} />
        </span>
        {locked ? (
          <span className="text-fg-4" aria-label="Password protected">
            <Lock className="size-4" />
          </span>
        ) : null}
      </div>

      <div className="space-y-1">
        <span className="text-fg block truncate font-semibold">{collection.title}</span>
        {collection.description ? (
          <p className="text-fg-2 line-clamp-2 text-sm">{collection.description}</p>
        ) : null}
      </div>

      <span className="text-fg-3 mt-auto font-mono text-xs">
        {count === 0
          ? "Empty folder"
          : `${count} ${count === 1 ? "document" : "documents"}`}
      </span>
    </Link>
  );
}
