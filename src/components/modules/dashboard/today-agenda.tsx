import Link from "next/link";
import { parseISO } from "date-fns";
import { timeToMinutes, weekdayIndex } from "@/lib/timetable";
import { priorityColor } from "@/lib/todo";
import { dateToDay } from "@/lib/money";
import type { TimetableEvent } from "@/components/modules/timetable/timetable-board";
import type { Todo } from "@/components/modules/todo/todo-board";

type Item = {
  id: string;
  start: string;
  end: string | null;
  label: string;
  sub: string;
  color: string;
  href: string;
};

// True when a recurring or one-off item lands on the given day.
function onToday(
  item: { isRecurring: boolean; dayOfWeek: number | null; specificDate: Date | null },
  today: string,
  todayIdx: number,
): boolean {
  if (item.isRecurring) return item.dayOfWeek === todayIdx;
  return !!item.specificDate && dateToDay(item.specificDate) === today;
}

// Today's time-ordered agenda: timetable events and time-blocked todos for the
// day, merged and sorted by start time. Read-only; rows deep-link to their home.
export function TodayAgenda({
  events,
  todos,
  today,
}: {
  events: TimetableEvent[];
  todos: Todo[];
  today: string;
}) {
  const todayIdx = weekdayIndex(parseISO(today));

  const items: Item[] = [
    ...events
      .filter((e) => onToday(e, today, todayIdx))
      .map((e) => ({
        id: `e-${e.id}`,
        start: e.startTime,
        end: e.endTime,
        label: e.title,
        sub: e.location ?? e.type,
        color: e.color,
        href: "/timetable",
      })),
    ...todos
      .filter((t) => t.startTime && onToday(t, today, todayIdx))
      .map((t) => ({
        id: `t-${t.id}`,
        start: t.startTime!,
        end: t.endTime,
        label: t.title,
        sub: "Todo",
        color: priorityColor(t.priority),
        href: "/timetable",
      })),
  ].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  if (items.length === 0) return null;

  return (
    <div className="mt-8 space-y-2">
      <h3 className="text-fg-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
        Today's schedule
      </h3>
      <div className="space-y-1.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-md border border-border px-3 py-2 transition-colors"
          >
            <span className="text-fg-3 w-20 shrink-0 font-mono text-[11px]">
              {item.start}
              {item.end ? `–${item.end}` : ""}
            </span>
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-fg min-w-0 flex-1 truncate text-sm">
              {item.label}
            </span>
            <span className="text-fg-3 shrink-0 text-[11px]">{item.sub}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
