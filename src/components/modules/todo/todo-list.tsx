"use client";

import { format, parseISO } from "date-fns";
import { dateToDay } from "@/lib/money";
import { weekdayIndex } from "@/lib/timetable";
import { groupByBucket, todoComparator } from "@/lib/todo";
import { TodoRow } from "./todo-row";
import type { Todo } from "./todo-board";

// True when a todo falls on a given "yyyy-MM-dd": a one-off on its date, a
// recurring todo on every matching weekday.
function dueOn(todo: Todo, day: string): boolean {
  if (todo.specificDate) return dateToDay(todo.specificDate) === day;
  if (todo.isRecurring && todo.dayOfWeek !== null) {
    return weekdayIndex(parseISO(day)) === todo.dayOfWeek;
  }
  return false;
}

// The main list. By default todos group into day buckets; selecting a calendar
// day other than today filters to that day's todos.
export function TodoList({
  todos,
  today,
  selected,
  onEdit,
  onClear,
}: {
  todos: Todo[];
  today: string;
  selected: string;
  onEdit: (todo: Todo) => void;
  onClear: () => void;
}) {
  if (selected !== today) {
    const dayTodos = todos.filter((t) => dueOn(t, selected)).sort(todoComparator(today));
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-fg text-sm font-semibold">
            {format(parseISO(selected), "EEEE d MMMM")}
          </h3>
          <button
            type="button"
            onClick={onClear}
            className="text-fg-2 hover:text-fg text-xs transition-colors"
          >
            View all
          </button>
        </div>
        {dayTodos.length === 0 ? (
          <p className="text-fg-3 text-sm">Nothing due on this day.</p>
        ) : (
          <div className="space-y-2">
            {dayTodos.map((todo) => (
              <TodoRow key={todo.id} todo={todo} today={today} onEdit={onEdit} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const groups = groupByBucket(todos, today).filter((g) => g.todos.length > 0);

  if (groups.length === 0) {
    return (
      <p className="text-fg-3 text-sm">
        No todos yet. Add one to start scheduling your week.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <h3 className="text-fg-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
            {group.label}
          </h3>
          {group.todos.map((todo) => (
            <TodoRow key={todo.id} todo={todo} today={today} onEdit={onEdit} />
          ))}
        </div>
      ))}
    </div>
  );
}
