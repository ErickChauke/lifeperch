"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { isDone, priorityColor } from "@/lib/todo";
import { toggleTodo } from "@/actions/todo";
import { cn } from "@/lib/utils";
import type { Todo } from "@/components/modules/todo/todo-board";

// The dashboard's Overdue and Today lists. Each row is a slim line with a
// completion checkbox; the page only renders this when todos exist.
export function TodaysTodos({
  today,
  dueToday,
  overdue,
}: {
  today: string;
  dueToday: Todo[];
  overdue: Todo[];
}) {
  return (
    <div className="mt-6 space-y-5">
      {overdue.length > 0 ? (
        <Section label="Overdue" todos={overdue} today={today} accent />
      ) : null}
      {dueToday.length > 0 ? (
        <Section label="Today" todos={dueToday} today={today} />
      ) : null}
    </div>
  );
}

function Section({
  label,
  todos,
  today,
  accent,
}: {
  label: string;
  todos: Todo[];
  today: string;
  accent?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h3
        className={cn(
          "font-mono text-[11px] font-semibold uppercase tracking-[0.08em]",
          accent ? "text-destructive" : "text-fg-3",
        )}
      >
        {label}
      </h3>
      <div className="space-y-1.5">
        {todos.map((todo) => (
          <DashRow key={todo.id} todo={todo} today={today} />
        ))}
      </div>
    </div>
  );
}

function DashRow({ todo, today }: { todo: Todo; today: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(isDone(todo, today));

  function toggle() {
    setDone((d) => !d);
    startTransition(async () => {
      try {
        await toggleTodo(todo.id);
      } catch {
        setDone((d) => !d);
        toast.error("Could not update todo");
      }
    });
  }

  return (
    <div className="bg-surface flex items-center gap-3 rounded-md border border-border px-3 py-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={done ? "Mark as pending" : "Mark as done"}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          done
            ? "bg-primary border-transparent text-[var(--accent-fg)]"
            : "border-border-2 text-transparent hover:border-accent-line",
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </button>
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: priorityColor(todo.priority) }}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          done ? "text-fg-4 line-through" : "text-fg",
        )}
      >
        {todo.title}
      </span>
      {todo.startTime ? (
        <span className="text-fg-3 shrink-0 font-mono text-[11px]">
          {todo.startTime}
        </span>
      ) : null}
    </div>
  );
}
