"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Notebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { NotebookModal } from "./notebook-modal";
import type { getCollections } from "@/actions/notes";

type Notebook = Awaited<ReturnType<typeof getCollections>>[number];

// Notes landing: a board of notebooks. Notes live inside a notebook.
export function NotebooksBoard({ notebooks }: { notebooks: Notebook[] }) {
  const [creating, setCreating] = useState(false);

  if (notebooks.length === 0) {
    return (
      <PageShell>
        <PageBody>
          <div className="mx-auto max-w-[560px] py-12 text-center">
            <p className="text-fg-3 font-mono text-[10.5px] uppercase tracking-[0.10em]">
              Records · Notes
            </p>
            <p className="text-fg-2 mt-3 text-[15px]">
              Nothing written down yet. Make a notebook - Uni, Ideas, Personal - and
              keep its notes together.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => setCreating(true)}>
                <Plus /> New notebook
              </Button>
            </div>
          </div>
          <NotebookModal open={creating} onOpenChange={setCreating} />
        </PageBody>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-fg text-2xl font-semibold">Notes</h1>
            <p className="text-fg-3 mt-1 font-mono text-xs">
              {notebooks.length} {notebooks.length === 1 ? "notebook" : "notebooks"}
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus /> New notebook
          </Button>
        </div>
      </PageHeader>

      <PageBody className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notebooks.map((notebook) => (
            <NotebookCard key={notebook.id} notebook={notebook} />
          ))}
        </div>
        <NotebookModal open={creating} onOpenChange={setCreating} />
      </PageBody>
    </PageShell>
  );
}

function NotebookCard({ notebook }: { notebook: Notebook }) {
  const count = notebook._count.notes;
  return (
    <Link
      href={`/notes/${notebook.id}`}
      className="group bg-surface hover:bg-surface-2 hover:border-border-2 focus-visible:border-accent-line flex flex-col gap-3 rounded-lg border p-4 transition-all hover:-translate-y-px"
    >
      <span className="bg-surface-2 text-fg-2 flex size-10 items-center justify-center rounded-sm">
        <Notebook className="size-5" strokeWidth={1.75} />
      </span>
      <div className="space-y-1">
        <span className="text-fg block truncate font-semibold">{notebook.title}</span>
        {notebook.description ? (
          <p className="text-fg-2 line-clamp-2 text-sm">{notebook.description}</p>
        ) : null}
      </div>
      <span className="text-fg-3 mt-auto font-mono text-xs">
        {count === 0 ? "Empty notebook" : `${count} ${count === 1 ? "note" : "notes"}`}
      </span>
    </Link>
  );
}
