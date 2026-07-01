import Link from "next/link";
import { parseISO } from "date-fns";
import { Pill, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { weekdayIndex } from "@/lib/timetable";
import type { getMedicines } from "@/actions/medicines";

type Medicine = Awaited<ReturnType<typeof getMedicines>>[number];

// Today's active medicines and how many are ticked off, linking to Health to act.
// A medicine counts for today when it has no day filter or lists today. Hidden
// when nothing is due.
export function MedsToday({
  medicines,
  today,
}: {
  medicines: Medicine[];
  today: string;
}) {
  const dow = weekdayIndex(parseISO(today));
  const todays = medicines.filter(
    (m) => m.active && (m.days.length === 0 || m.days.includes(dow)),
  );
  if (todays.length === 0) return null;

  const taken = todays.filter((m) => m.takenToday).length;

  return (
    <div className="mt-8 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-fg-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
          Meds today
        </h3>
        <span className="text-fg-3 font-mono text-xs">
          {taken} of {todays.length} taken
        </span>
      </div>
      <Link
        href="/health"
        className="bg-surface hover:bg-surface-2 block rounded-md border border-border p-3 transition-colors"
      >
        <div className="flex flex-wrap gap-1.5">
          {todays.map((m) => (
            <span
              key={m.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
                m.takenToday
                  ? "bg-surface-3 text-fg-4 line-through"
                  : "bg-surface-2 text-fg",
              )}
            >
              {m.takenToday ? (
                <Check className="size-3 shrink-0 text-[var(--success)]" />
              ) : (
                <Pill className="size-3 shrink-0 text-[var(--success)]" />
              )}
              {m.name}
            </span>
          ))}
        </div>
      </Link>
    </div>
  );
}
