"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UNTITLED } from "@/lib/notes";
import { cn } from "@/lib/utils";
import { NoteContent } from "./note-content";
import type { Note } from "./notes-board";

// Read-only view of a single note: title, tags and the rendered body. Edit opens
// the note in the rich editor.
export function NoteDetail({
  note,
  onClose,
  onEdit,
}: {
  note: Note;
  onClose: () => void;
  onEdit: () => void;
}) {
  const untitled = note.title === UNTITLED;

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="text-fg-2 hover:text-fg inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" /> Notes
        </button>
        <Button type="button" size="sm" onClick={onEdit}>
          <Pencil /> Edit
        </Button>
      </div>

      <div className="space-y-5">
        <h1
          className={cn(
            "text-2xl font-semibold",
            untitled ? "text-fg-3 italic" : "text-fg",
          )}
        >
          {note.title}
        </h1>

        {note.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="bg-surface-3 text-fg-2 rounded-full px-2.5 py-1 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {note.body.trim() ? (
          <NoteContent body={note.body} bodyFormat={note.bodyFormat} />
        ) : (
          <p className="text-fg-4 text-sm">This note is empty.</p>
        )}
      </div>
    </div>
  );
}
