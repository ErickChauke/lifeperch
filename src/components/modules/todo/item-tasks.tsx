"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isDone, priorityColor, type TodoInput } from "@/lib/todo";
import { getLinkedTodos, quickAddTodo, toggleTodo } from "@/actions/todo";
import { cn } from "@/lib/utils";
import type { Todo } from "./todo-board";

// Tasks tied to an item in another module. Reads the todos linked back to this
// item and lets you capture a new one, which lands in the oldest list with the
// link prefilled so it shows on both sides. Drop it onto any detail surface.
export function ItemTasks({
  module,
  id,
  label,
  today,
}: {
  module: string;
  id: string;
  label: string;
  today: string;
}) {
  const [tasks, setTasks] = useState<Todo[] | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    getLinkedTodos(module, id)
      .then(setTasks)
      .catch(() => setTasks([]));
  }, [module, id]);

  useEffect(() => {
    load();
  }, [load]);

  function add() {
    const title = draft.trim();
    if (!title) return;
    const input: TodoInput = {
      title,
      notes: null,
      priority: "normal",
      tags: [],
      isRecurring: false,
      dayOfWeek: null,
      specificDate: null,
      startTime: null,
      endTime: null,
      linkedModule: module,
      linkedId: id,
      linkedLabel: label,
    };
    setDraft("");
    startTransition(async () => {
      try {
        await quickAddTodo(input);
        load();
      } catch {
        setDraft(title);
        toast.error("Could not add the task");
      }
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-fg-3 font-mono text-xs uppercase tracking-[0.04em]">
        Tasks
      </p>
      {tasks && tasks.length > 0 ? (
        <div className="space-y-1.5">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} today={today} onChange={load} />
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a task for this"
          className="flex-1"
        />
        <Button
          type="button"
          size="sm"
          onClick={add}
          disabled={pending || !draft.trim()}
        >
          <Plus /> Add
        </Button>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  today,
  onChange,
}: {
  task: Todo;
  today: string;
  onChange: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(isDone(task, today));

  function toggle() {
    setDone((d) => !d);
    startTransition(async () => {
      try {
        await toggleTodo(task.id);
        onChange();
      } catch {
        setDone((d) => !d);
        toast.error("Could not update task");
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
        style={{ background: priorityColor(task.priority) }}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          done ? "text-fg-4 line-through" : "text-fg",
        )}
      >
        {task.title}
      </span>
      {task.startTime ? (
        <span className="text-fg-3 shrink-0 font-mono text-[11px]">
          {task.startTime}
        </span>
      ) : null}
    </div>
  );
}
