"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MOOD_DEFAULT, type EntryInput } from "@/lib/journal";
import { seedHtml } from "@/lib/rich-text";
import { createEntry, updateEntry, deleteEntry } from "@/actions/journal";
import { RichEditor } from "@/components/rich-text/rich-editor";
import { JournalAttachments } from "./journal-attachments";
import type { Entry } from "./journal-board";

// Editor for the selected day. One entry per day: a day with no entry opens
// blank; saving creates or updates it. Mood is no longer surfaced, but the
// existing value is preserved on update (new entries keep the neutral default).
// Attachments appear once the entry is saved, since a file needs an entry id.
export function EntryEditor({
  day,
  entry,
}: {
  day: string;
  entry: Entry | null;
}) {
  // The id is tracked in state so a brand-new day can flip to "saved" and reveal
  // the attachment section without a full remount.
  const [entryId, setEntryId] = useState<string | null>(entry?.id ?? null);
  const [title, setTitle] = useState(entry?.title ?? "");
  // Seed the editor with html: rich entries pass through, legacy plain entries
  // are converted best-effort.
  const [body, setBody] = useState(() =>
    seedHtml(entry?.body ?? "", entry?.bodyFormat ?? "markdown"),
  );
  // Bumped on delete to remount the editor with fresh blank content.
  const [editorKey, setEditorKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mood = entry?.mood ?? MOOD_DEFAULT;
  const [pending, startTransition] = useTransition();

  const exists = entryId !== null;

  function onSave() {
    const values: EntryInput = {
      date: day,
      title: title.trim() || null,
      body,
      bodyFormat: "html",
      mood,
    };
    startTransition(async () => {
      try {
        if (exists) {
          await updateEntry(values);
        } else {
          const created = await createEntry(values);
          setEntryId(created.id);
        }
        toast.success(exists ? "Entry updated" : "Entry saved");
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      try {
        await deleteEntry(day);
        setEntryId(null);
        setTitle("");
        setBody(seedHtml("", "markdown"));
        setEditorKey((k) => k + 1);
        setConfirmDelete(false);
        toast.success("Entry deleted");
      } catch {
        toast.error("Could not delete entry");
      }
    });
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div>
        <p className="text-fg-3 font-mono text-[10px] uppercase tracking-wider">
          Daily · Journal
        </p>
        <p className="text-fg-2 mt-1 font-mono text-lg">
          {format(parseISO(day), "EEE · MMM d yyyy")}
        </p>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Give the day a title…"
        className="placeholder:text-fg-4 w-full bg-transparent text-2xl font-semibold outline-none"
      />

      <RichEditor
        key={editorKey}
        initialHtml={body}
        placeholder="How was today? A line or two is enough."
        minHeightClass="min-h-[280px]"
        onChange={setBody}
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          {exists ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onDelete}
                  disabled={pending}
                >
                  Delete entry?
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
        <Button onClick={onSave} disabled={pending}>
          {exists ? "Update" : "Save"}
        </Button>
      </div>

      {exists ? (
        <JournalAttachments
          entryId={entryId}
          initial={entry?.attachments ?? []}
        />
      ) : (
        <p className="text-fg-4 border-border border-t pt-5 text-sm">
          Save the entry to add attachments.
        </p>
      )}
    </div>
  );
}
