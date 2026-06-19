import Link from "next/link";
import { priorityColor, isDone } from "@/lib/todo";
import { cn } from "@/lib/utils";
import type { Todo } from "@/components/modules/todo/todo-board";

// A time-blocked todo drawn on the week grid. Distinct from an event: a dashed,
// priority-tinted block, muted once done. Read-only here, so it links to /todo
// rather than calling a todo action.
export function TodoBlockCard({ todo, today }: { todo: Todo; today: string }) {
  const color = priorityColor(todo.priority);
  const done = isDone(todo, today);

  return (
    <Link
      href="/todo"
      className="block h-full w-full overflow-hidden rounded-[var(--r-sm)] border border-dashed px-1.5 py-1 text-left transition-opacity hover:opacity-80"
      style={{
        backgroundColor: `${color}14`,
        borderColor: color,
        opacity: done ? 0.5 : 1,
      }}
    >
      <p
        className={cn("truncate text-xs font-medium", done && "line-through")}
        style={{ color }}
      >
        {todo.title}
      </p>
      <p className="text-fg-3 truncate font-mono text-[11px]">
        {todo.startTime}
        {todo.endTime ? `–${todo.endTime}` : ""}
      </p>
    </Link>
  );
}
