"use client";

import { format, parseISO } from "date-fns";
import { dateToDay } from "@/lib/journal";
import { previewText } from "@/lib/notes";
import { htmlPreview } from "@/lib/rich-text";
import { cn } from "@/lib/utils";
import type { Entry } from "./journal-board";

// History rail beneath the calendar, newest first. Each row shows the day and
// the entry title (or a body snippet). Clicking a row selects its day. On a wide
// screen the list owns its scroll, so a long history never drags the calendar
// and the editor out of view; the heading stays put above it.
export function PastEntries({
  entries,
  selected,
  onSelect,
}: {
  entries: Entry[];
  selected: string;
  onSelect: (day: string) => void;
}) {
  return (
    <div className="flex flex-col lg:min-h-0 lg:flex-1">
      <p className="text-fg-3 mb-2 shrink-0 font-mono text-[10px] uppercase tracking-wider">
        Past entries
      </p>
      <div className="scrollbar-hide space-y-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-fg-3 text-sm">No entries yet</p>
        ) : (
          entries.map((entry) => {
            const day = dateToDay(entry.date);
            const titled = !!entry.title?.trim();
            const snippet =
              entry.bodyFormat === "html"
                ? htmlPreview(entry.body)
                : previewText(entry.body);
            const label = titled ? entry.title!.trim() : snippet || "-";
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect(day)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors",
                  day === selected ? "bg-surface-2" : "hover:bg-surface-2",
                )}
              >
                <span className="text-fg-2 w-14 shrink-0 font-mono text-sm">
                  {format(parseISO(day), "MMM d")}
                </span>
                <span
                  className={cn(
                    "flex-1 truncate text-sm",
                    titled ? "text-fg font-medium" : "text-fg-2",
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
