import { differenceInDays, format, formatDistanceToNowStrict } from "date-fns";
import { previewText, UNTITLED } from "@/lib/notes";
import { htmlPreview } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import type { getCollection } from "@/actions/notes";

export type Note = NonNullable<
  Awaited<ReturnType<typeof getCollection>>
>["notes"][number];

// Relative for the last week ("2 hours ago"), then a calendar day.
function updatedLabel(date: Date): string {
  return differenceInDays(new Date(), date) < 7
    ? formatDistanceToNowStrict(date, { addSuffix: true })
    : format(date, "MMM d");
}

// A single note in the list grid. The whole card opens the note.
export function NoteCard({ note, onClick }: { note: Note; onClick: () => void }) {
  const untitled = note.title === UNTITLED;
  const preview =
    note.bodyFormat === "html"
      ? htmlPreview(note.body)
      : previewText(note.body);
  const shown = note.tags.slice(0, 3);
  const extra = note.tags.length - shown.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-3 rounded-md border border-border bg-surface p-4 text-left transition-all hover:-translate-y-px hover:border-border-2 hover:bg-surface-2 focus-visible:border-accent-line focus-visible:outline-none"
    >
      <div className="space-y-1.5">
        <p
          className={cn(
            "truncate text-[15px] font-semibold",
            untitled ? "text-fg-3 italic" : "text-fg",
          )}
        >
          {note.title}
        </p>
        {preview ? (
          <p className="text-fg-2 line-clamp-2 text-sm">{preview}</p>
        ) : null}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {shown.map((tag) => (
            <span
              key={tag}
              className="bg-surface-3 text-fg-2 rounded-full px-2 py-0.5 text-xs"
            >
              {tag}
            </span>
          ))}
          {extra > 0 ? (
            <span className="bg-surface-3 text-fg-3 rounded-full px-2 py-0.5 text-xs">
              +{extra}
            </span>
          ) : null}
        </div>
        <span className="text-fg-3 shrink-0 font-mono text-xs">
          {updatedLabel(note.updatedAt)}
        </span>
      </div>
    </button>
  );
}
