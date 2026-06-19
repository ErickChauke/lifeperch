import { format, startOfWeek, endOfWeek } from "date-fns";
import { getEvents } from "@/actions/timetable";
import { getTodos } from "@/actions/todo";
import { dateToDay } from "@/lib/money";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { TimetableBoard } from "@/components/modules/timetable/timetable-board";

// Timetable page. Fetches the user's events and time-blocked todos for the
// current week and hands them to the board. The week grid is the page's scroll
// region, so the board renders as the body.
export default async function TimetablePage() {
  const [events, todos] = await Promise.all([getEvents(), getTodos()]);

  // Keep only time-blocked todos that land in the current Monday-first week:
  // recurring ones always recur, one-offs only when their date falls in range.
  const now = new Date();
  const startDay = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const endDay = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekTodos = todos.filter((t) => {
    if (!t.startTime) return false;
    if (t.isRecurring) return t.dayOfWeek !== null;
    if (!t.specificDate) return false;
    const day = dateToDay(t.specificDate);
    return day >= startDay && day <= endDay;
  });

  return (
    <PageShell>
      <PageHeader>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]">
          Timetable
        </h2>
        <p className="text-fg-2 mt-1 text-sm">
          Your weekly lectures and shifts.
        </p>
      </PageHeader>
      <TimetableBoard events={events} todos={weekTodos} />
    </PageShell>
  );
}
