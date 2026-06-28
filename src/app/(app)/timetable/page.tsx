import { getEvents } from "@/actions/timetable";
import { getTodos } from "@/actions/todo";
import { getJobs } from "@/actions/jobs";
import { getMilestones } from "@/actions/timeline";
import { PageShell } from "@/components/layout/page-shell";
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
      <TimetableBoard
        events={events}
        todos={todos}
        jobs={jobs}
        milestones={milestones}
      />
    </PageShell>
  );
}
