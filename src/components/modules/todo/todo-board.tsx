"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { dateToDay } from "@/lib/money";
import {
  renameCollection,
  updateCollectionDescription,
  deleteCollection,
} from "@/actions/todo";
import { TodoCalendar } from "./todo-calendar";
import { TodoList } from "./todo-list";
import { TodoModal } from "./todo-modal";
import type { getTodos, getCollection } from "@/actions/todo";

export type Todo = Awaited<ReturnType<typeof getTodos>>[number];
type Project = NonNullable<Awaited<ReturnType<typeof getCollection>>>;

// One list: its todos as a list and a calendar, plus the add/edit modal. The
// header carries the list title, edit and delete.
export function TodoBoard({ project }: { project: Project }) {
  const router = useRouter();
  const todos = project.todos;
  const today = format(new Date(), "yyyy-MM-dd");
  const [selected, setSelected] = useState(today);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [pending, startTransition] = useTransition();

  const [editingProject, setEditingProject] = useState(false);
  const [titleDraft, setTitleDraft] = useState(project.title);
  const [descDraft, setDescDraft] = useState(project.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  function saveProject() {
    const clean = titleDraft.trim();
    if (!clean) return;
    startTransition(async () => {
      try {
        await renameCollection(project.id, clean);
        await updateCollectionDescription(project.id, descDraft);
        setEditingProject(false);
      } catch {
        toast.error("Could not save the project");
      }
    });
  }

  function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteCollection(project.id);
        router.push("/todo/lists");
      } catch {
        toast.error("Could not delete the project");
      }
    });
  }

  return (
    <PageShell>
      <PageHeader className="space-y-4">
        <Link
          href="/todo/lists"
          className="text-fg-3 hover:text-fg-2 inline-flex items-center gap-1 font-mono text-xs"
        >
          <ChevronLeft className="size-4" /> Lists
        </Link>

        {editingProject ? (
          <div className="space-y-2">
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              autoFocus
              className="h-9 max-w-sm text-xl font-semibold"
            />
            <Textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              placeholder="What this list is about (optional)"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveProject} disabled={pending}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingProject(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-fg truncate text-[22px] font-semibold tracking-[-0.01em]">
                {project.title}
              </h2>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Edit list"
                  onClick={() => {
                    setTitleDraft(project.title);
                    setDescDraft(project.description ?? "");
                    setEditingProject(true);
                  }}
                >
                  <Pencil className="text-fg-3 size-4" />
                </Button>
                <Button
                  size="sm"
                  variant={confirmDelete ? "destructive" : "ghost"}
                  aria-label="Delete list"
                  onClick={onDelete}
                  disabled={pending}
                >
                  {confirmDelete ? "Delete list?" : <Trash2 className="text-fg-3 size-4" />}
                </Button>
              </div>
            </div>
            {project.description ? (
              <p className="text-fg-2 text-sm">{project.description}</p>
            ) : null}
          </div>
        )}
      </PageHeader>

      {/* The calendar and Add todo stay put from lg up while the list scrolls on
          its own, so a long list never pushes them off screen. Below lg the
          layout stacks and the page scrolls as one surface. */}
      <PageBody className="pt-2 md:pt-2 lg:overflow-hidden">
        <div className="flex flex-col gap-6 lg:h-full lg:min-h-0 lg:flex-row">
          <div className="flex w-full flex-col gap-4 lg:min-h-0 lg:w-[300px] lg:shrink-0">
            <TodoCalendar
              selected={selected}
              today={today}
              dueDays={dueDays}
              recurringDays={recurringDays}
              onSelect={setSelected}
            />
            <Button onClick={openAdd} className="w-full shrink-0">
              <Plus />
              Add todo
            </Button>
          </div>
          <div className="scrollbar-hide min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto">
            <TodoList
              todos={todos}
              today={today}
              selected={selected}
              onEdit={openEdit}
              onClear={() => setSelected(today)}
            />
          </div>
        </div>
        <TodoModal
          open={open}
          onOpenChange={setOpen}
          collectionId={project.id}
          todo={editing}
        />
      </PageBody>
    </PageShell>
  );
}
