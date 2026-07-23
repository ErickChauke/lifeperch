"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { dateToDay } from "@/lib/journal";
import { PageShell, PageBody } from "@/components/layout/page-shell";
import { Calendar } from "./calendar";
import { EntryEditor } from "./entry-editor";
import { PastEntries } from "./past-entries";
import type { getEntries } from "@/actions/journal";

export type Entry = Awaited<ReturnType<typeof getEntries>>[number];

// Client container for Journal. Owns the selected day; the calendar, editor,
// and past-entries list all read from and write to it.
export function JournalBoard({ entries }: { entries: Entry[] }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selected, setSelected] = useState(today);

  const byDay = useMemo(() => {
    const map = new Map<string, Entry>();
    entries.forEach((e) => map.set(dateToDay(e.date), e));
    return map;
  }, [entries]);

  const entryDays = useMemo(() => new Set(byDay.keys()), [byDay]);
  const selectedEntry = byDay.get(selected) ?? null;

  return (
    <PageShell>
      {/* Two columns that each own their scroll from lg up, so the page itself
          stays pinned (design-system 10). Below lg the layout stacks and the
          page scrolls as one surface, so the height bounds are lg-only. */}
      <PageBody className="pt-6 md:pt-10 lg:overflow-hidden">
        <div className="flex flex-col gap-6 lg:h-full lg:min-h-0 lg:flex-row">
          <div className="flex w-full flex-col gap-6 lg:min-h-0 lg:w-[300px] lg:shrink-0">
            <Calendar
              selected={selected}
              today={today}
              entryDays={entryDays}
              onSelect={setSelected}
            />
            <PastEntries
              entries={entries}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
          <div className="scrollbar-hide min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto">
            <EntryEditor key={selected} day={selected} entry={selectedEntry} />
          </div>
        </div>
      </PageBody>
    </PageShell>
  );
}
