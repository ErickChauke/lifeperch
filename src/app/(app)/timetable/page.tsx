import { getEvents } from "@/actions/timetable";
import { getTodos } from "@/actions/todo";
import { getJobs } from "@/actions/jobs";
import { getMilestones } from "@/actions/timeline";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { TimetableBoard } from "@/components/modules/timetable/timetable-board";

// Timetable page. Fetches the user's events, todos and dated commitments and
// hands them to the board, which scopes them to the week it is showing. The week
// grid is the page's scroll region, so the board renders as the body.
export default async function TimetablePage() {
  const [events, todos, jobs, milestones] = await Promise.all([
    getEvents(),
    getTodos(),
    getJobs(),
    getMilestones(),
  ]);

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
      <TimetableBoard
        events={events}
        todos={todos}
        jobs={jobs}
        milestones={milestones}
      />
    </PageShell>
  );
}
