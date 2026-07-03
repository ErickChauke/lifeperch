import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import type { getReading } from "@/actions/literature";

type Paper = Awaited<ReturnType<typeof getReading>>[number];

// Papers the user is currently reading, linking into their topic. Hidden when
// nothing is in progress.
export function ReadingList({ papers }: { papers: Paper[] }) {
  if (papers.length === 0) return null;

  return (
    <div className="mt-8 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-fg-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
          Reading
        </h3>
        <Link
          href="/literature"
          className="text-fg-3 hover:text-fg-2 inline-flex items-center gap-1 text-xs"
        >
          Literature <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="space-y-1.5">
        {papers.map((paper) => (
          <Link
            key={paper.id}
            href={`/literature/${paper.collectionId}`}
            className="bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-md border border-border px-3 py-2 transition-colors"
          >
            <BookOpen className="text-fg-4 size-4 shrink-0" strokeWidth={1.75} />
            <span className="text-fg min-w-0 flex-1 truncate text-sm">
              {paper.title}
            </span>
            {paper.authors ? (
              <span className="text-fg-3 shrink-0 truncate text-[11px]">
                {paper.authors}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
