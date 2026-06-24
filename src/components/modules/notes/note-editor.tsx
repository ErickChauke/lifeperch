"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { noteSchema, normalizeTags, type NoteInput } from "@/lib/notes";
import { seedHtml } from "@/lib/rich-text";
import { createNote, updateNote, deleteNote } from "@/actions/notes";
import { RichEditor } from "@/components/rich-text/rich-editor";
import type { Note } from "./note-card";

// The note editor: title, tag set, and a rich WYSIWYG body, with explicit save.
// Delete asks for one inline confirm. A null note is a new note that is not
// persisted until first save (into collectionId). Legacy markdown notes are
// converted to html to seed the editor and saved back as html.
export function NoteEditor({
  note,
  collectionId,
  onClose,
}: {
  note: Note | null;
  collectionId: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isDirty },
  } = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: note?.title ?? "",
      body: note?.body ?? "",
      bodyFormat: note?.bodyFormat === "html" ? "html" : "markdown",
      tags: note?.tags ?? [],
    },
  });

  const tags = useWatch({ control, name: "tags" }) ?? [];

  // Seed the editor with html: rich notes pass through, legacy markdown notes
  // are converted best-effort.
  const initialHtml = useMemo(
    () => seedHtml(note?.body ?? "", note?.bodyFormat ?? "markdown"),
    [note],
  );

  function addTag() {
    const next = normalizeTags([...tags, tagDraft]);
    setValue("tags", next, { shouldDirty: true });
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setValue(
      "tags",
      tags.filter((t) => t !== tag),
      { shouldDirty: true },
    );
  }

  function onSubmit(values: NoteInput) {
    const payload: NoteInput = { ...values, bodyFormat: "html" };
    startTransition(async () => {
      try {
        if (note) await updateNote(note.id, payload);
        else await createNote(collectionId, payload);
        toast.success(note ? "Note saved" : "Note created");
        onClose();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    if (!note) return;
    startTransition(async () => {
      try {
        await deleteNote(note.id);
        toast.success("Note deleted");
        onClose();
      } catch {
        toast.error("Could not delete note");
      }
    });
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <button
        type="button"
        onClick={onClose}
        className="text-fg-2 hover:text-fg mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" /> Notes
      </button>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <input
          {...register("title")}
          placeholder="Untitled note"
          className="placeholder:text-fg-4 w-full bg-transparent text-2xl font-semibold outline-none"
        />

        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-surface-3 text-fg-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-destructive transition-colors"
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
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="+ tag"
            className="placeholder:text-fg-4 w-20 bg-transparent text-xs outline-none"
          />
        </div>

        <RichEditor
          initialHtml={initialHtml}
          placeholder="Write your note…"
          onChange={(html) => setValue("body", html, { shouldDirty: true })}
        />

        <div className="flex items-center justify-between gap-2 pt-2">
          <div>
            {note ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={onDelete}
                    disabled={pending}
                  >
                    Delete note?
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  disabled={pending}
                >
                  Delete
                </Button>
              )
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {isDirty ? (
              <span className="text-fg-3 font-mono text-xs">Unsaved</span>
            ) : null}
            <Button type="submit" disabled={pending}>
              {note ? "Save" : "Create note"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
