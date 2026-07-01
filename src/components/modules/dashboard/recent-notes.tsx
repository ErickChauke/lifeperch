import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";
import { UNTITLED } from "@/lib/notes";
import type { getRecentNotes } from "@/actions/notes";

type RecentNote = Awaited<ReturnType<typeof getRecentNotes>>[number];

// The most recently edited notes, linking into their notebook. Hidden when there
// are no notes yet.
export function RecentNotes({ notes }: { notes: RecentNote[] }) {
  if (notes.length === 0) return null;

  return (
    <div className="mt-8 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-fg-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
          Recent notes
        </h3>
        <Link
          href="/notes"
          className="text-fg-3 hover:text-fg-2 inline-flex items-center gap-1 text-xs"
        >
          Notes <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="space-y-1.5">
        {notes.map((note) => (
          <Link
            key={note.id}
            href={`/notes/${note.collectionId}`}
            className="bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-md border border-border px-3 py-2 transition-colors"
          >
            <FileText className="text-fg-4 size-4 shrink-0" strokeWidth={1.75} />
            <span className="text-fg min-w-0 flex-1 truncate text-sm">
              {note.title === UNTITLED ? "Untitled" : note.title}
            </span>
            <span className="text-fg-3 shrink-0 truncate text-[11px]">
              {note.collection.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
