"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBody } from "@/components/layout/page-shell";
import { dateToDay } from "@/lib/money";
import { TodoCalendar } from "./todo-calendar";
import { TodoList } from "./todo-list";
import { TodoModal } from "./todo-modal";
import type { getTodos } from "@/actions/todo";

export type Todo = Awaited<ReturnType<typeof getTodos>>[number];

// Client container for the todo page. Owns the selected day and the add/edit
// modal, and feeds the calendar the days that carry a due todo.
export function TodoBoard({ todos }: { todos: Todo[] }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selected, setSelected] = useState(today);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);

  const dueDays = useMemo(() => {
    const set = new Set<string>();
    todos.forEach((t) => {
      if (!t.isRecurring && t.specificDate) set.add(dateToDay(t.specificDate));
    });
    return set;
  }, [todos]);

  const recurringDays = useMemo(() => {
    const set = new Set<number>();
    todos.forEach((t) => {
      if (t.isRecurring && t.dayOfWeek !== null) set.add(t.dayOfWeek);
    });
    return set;
  }, [todos]);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(todo: Todo) {
    setEditing(todo);
    setOpen(true);
  }

  return (
    <PageBody className="pt-2 md:pt-2">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex w-full flex-col gap-4 lg:w-[300px] lg:shrink-0">
            <TodoCalendar
              selected={selected}
              today={today}
              dueDays={dueDays}
              recurringDays={recurringDays}
              onSelect={setSelected}
            />
            <Button onClick={openAdd} className="w-full">
              <Plus />
              Add todo
            </Button>
          </div>
          <div className="min-w-0 flex-1">
            <TodoList
              todos={todos}
              today={today}
              selected={selected}
              onEdit={openEdit}
              onClear={() => setSelected(today)}
            />
          </div>
        </div>
        <TodoModal open={open} onOpenChange={setOpen} todo={editing} />
    </PageBody>
  );
}
