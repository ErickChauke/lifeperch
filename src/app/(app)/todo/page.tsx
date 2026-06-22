import { getTodos } from "@/actions/todo";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { TodoBoard } from "@/components/modules/todo/todo-board";

// To-Do page. Fetches the user's todos and hands them to the board, which owns
// the calendar, the grouped list, and the add/edit modal.
export default async function TodoPage() {
  const todos = await getTodos();

  return (
    <PageShell>
      <PageHeader>
        <h2 className="text-[22px] font-semibold tracking-[-0.01em]">To-Do</h2>
        <p className="text-fg-2 mt-1 text-sm">
          Your scheduled tasks, by day and on the calendar.
        </p>
      </PageHeader>
      <TodoBoard todos={todos} />
    </PageShell>
  );
}
