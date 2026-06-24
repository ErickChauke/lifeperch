"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MOOD_DEFAULT, type EntryInput } from "@/lib/journal";
import { seedHtml } from "@/lib/rich-text";
import { createEntry, updateEntry } from "@/actions/journal";
import { RichEditor } from "@/components/rich-text/rich-editor";
import type { Entry } from "./journal-board";

// Editor for the selected day. One entry per day: a day with no entry opens
// blank; saving creates or updates it. Mood is no longer surfaced, but the
// existing value is preserved on update (new entries keep the neutral default).
export function EntryEditor({
  day,
  entry,
}: {
  day: string;
  entry: Entry | null;
}) {
  const exists = entry !== null;
  const [title, setTitle] = useState(entry?.title ?? "");
  // Seed the editor with html: rich entries pass through, legacy plain entries
  // are converted best-effort.
  const [body, setBody] = useState(() =>
    seedHtml(entry?.body ?? "", entry?.bodyFormat ?? "markdown"),
  );
  const mood = entry?.mood ?? MOOD_DEFAULT;
  const [pending, startTransition] = useTransition();

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
        if (exists) await updateEntry(values);
        else await createEntry(values);
        toast.success(exists ? "Entry updated" : "Entry saved");
      } catch {
        toast.error("Something went wrong");
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
        initialHtml={body}
        placeholder="How was today? A line or two is enough."
        minHeightClass="min-h-[280px]"
        onChange={setBody}
      />

      <div className="flex justify-end pt-1">
        <Button onClick={onSave} disabled={pending}>
          {exists ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
}
