"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Repeat, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { isDone, isOverdue, priorityColor, linkHref } from "@/lib/todo";
import { WEEKDAYS } from "@/lib/timetable";
import { toggleTodo } from "@/actions/todo";
import { cn } from "@/lib/utils";
import type { Todo } from "./todo-board";

// One todo line: a completion checkbox, the title with a priority pip, optional
// time and recurrence badges, tags, and a chip that jumps to a linked module.
// The body opens the edit modal; the chip and checkbox stop that.
export function TodoRow({
  todo,
  today,
  onEdit,
}: {
  todo: Todo;
  today: string;
  onEdit: (todo: Todo) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(isDone(todo, today));
  const overdue = isOverdue(todo, today);

  // Chips that jump to connected modules. A linked module gets its chip; a timed
  // todo is a timetable item by default, so it also gets a timetable chip. A todo
  // can carry more than one.
  const moduleHref = linkHref(todo.linkedModule, todo.linkedId);
  const chips: { key: string; href: string; label: string }[] = [];
  if (moduleHref) {
    chips.push({
      key: "module",
      href: moduleHref,
      label: todo.linkedLabel || todo.linkedModule || "",
    });
  }
  if (todo.startTime != null && todo.linkedModule !== "timetable") {
    chips.push({ key: "timetable", href: "/timetable", label: "timetable" });
  }

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
    <div className="bg-surface group flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
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

      <button
        type="button"
        onClick={() => onEdit(todo)}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: priorityColor(todo.priority) }}
          />
          <span
            className={cn(
              "truncate text-sm font-medium",
              done ? "text-fg-4 line-through" : "text-fg",
            )}
          >
            {todo.title}
          </span>
          {todo.startTime ? (
            <span className="text-fg-3 shrink-0 font-mono text-[11px]">
              {todo.startTime}
              {todo.endTime ? `–${todo.endTime}` : ""}
            </span>
          ) : null}
          {todo.isRecurring && todo.dayOfWeek !== null ? (
            <span className="text-fg-3 inline-flex shrink-0 items-center gap-1 text-[11px]">
              <Repeat className="size-3" />
              {WEEKDAYS[todo.dayOfWeek].slice(0, 3)}
            </span>
          ) : null}
        </div>
        {todo.tags.length > 0 || overdue ? (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-3.5">
            {overdue ? (
              <span className="text-destructive font-mono text-[10.5px] uppercase tracking-wider">
                Overdue
              </span>
            ) : null}
            {todo.tags.map((tag) => (
              <span
                key={tag}
                className="bg-surface-3 text-fg-2 rounded-full px-2 py-0.5 text-[11px]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </button>

      {chips.length > 0 ? (
        <div className="flex shrink-0 items-center gap-1.5">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-2 text-fg-2 hover:text-fg hover:bg-surface-3 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] transition-colors"
            >
              {chip.label}
              <ArrowUpRight className="size-3" />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
