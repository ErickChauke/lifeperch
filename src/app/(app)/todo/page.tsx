import { getTodos, getCollections } from "@/actions/todo";
import { getJobs } from "@/actions/jobs";
import { getMilestones } from "@/actions/timeline";
import { dateToDay } from "@/lib/money";
import { TodoHome, type TodoMark } from "@/components/modules/todo/todo-home";

// To-Do home: a cross-list surface that runs the day. Per-list boards live
// at /todo/[id]; the lists grid is at /todo/lists. Job deadlines and milestone
// target dates are marked on the side calendar so all dated work shares a view.
export default async function TodoPage() {
  const [todos, collections, jobs, milestones] = await Promise.all([
    getTodos(),
    getCollections(),
    getJobs(),
    getMilestones(),
  ]);

  const marks: TodoMark[] = [
    ...jobs
      .filter((j) => j.deadline && j.status !== "outcome")
      .map((j) => ({
        id: `j-${j.id}`,
        day: dateToDay(j.deadline!),
        label: `${j.position} · ${j.organisation}`,
        href: "/jobs",
        tone: "deadline" as const,
      })),
    ...milestones
      .filter((m) => m.status !== "done")
      .map((m) => ({
        id: `m-${m.id}`,
        day: dateToDay(m.targetDate),
        label: m.title,
        href: "/timeline",
        tone: "milestone" as const,
      })),
  ];

  return <TodoHome todos={todos} collections={collections} marks={marks} />;
}
