"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  parseISO,
} from "date-fns";
import { Plus, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { Segmented } from "@/components/modules/money/segmented";
import { dateToDay } from "@/lib/money";
import { weekdayIndex } from "@/lib/timetable";
import {
  bucketOf,
  dueDay,
  groupByBucket,
  isDone,
  todoComparator,
  type TodoInput,
} from "@/lib/todo";
import { quickAddTodo, createTodo } from "@/actions/todo";
import { TodoCalendar } from "./todo-calendar";
import { TodoRow } from "./todo-row";
import { TodoModal } from "./todo-modal";
import { ProjectModal } from "./project-modal";
import type { Todo } from "./todo-board";
import type { getCollections } from "@/actions/todo";

type Project = Awaited<ReturnType<typeof getCollections>>[number];
type Tab = "today" | "week" | "upcoming" | "done";

const TAB_LABELS: Record<Tab, string> = {
  today: "Today",
  week: "This week",
  upcoming: "Upcoming",
  done: "Done",
};

// True when a todo falls on a given "yyyy-MM-dd": a one-off on its date, a
// recurring todo on every matching weekday.
function dueOn(todo: Todo, day: string): boolean {
  if (todo.specificDate) return dateToDay(todo.specificDate) === day;
  if (todo.isRecurring && todo.dayOfWeek !== null) {
    return weekdayIndex(parseISO(day)) === todo.dayOfWeek;
  }
  return false;
}

// Friendly heading for a day: Today / Tomorrow / full date.
function dayLabel(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === format(addDays(parseISO(today), 1), "yyyy-MM-dd")) return "Tomorrow";
  return format(parseISO(day), "EEEE d MMMM");
}

// The unified To-Do home: one cross-project surface with view tabs, a project
// filter, quick capture, a side calendar and progress. Per-project boards live
// on at /todo/[id]; the projects grid moves to /todo/projects.
export function TodoHome({
  todos,
  collections,
}: {
  todos: Todo[];
  collections: Project[];
}) {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");

  const [tab, setTab] = useState<Tab>("today");
  const [projectId, setProjectId] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      projectId === "all"
        ? todos
        : todos.filter((t) => t.collectionId === projectId),
    [todos, projectId],
  );

  const weekEnd = useMemo(
    () => format(endOfWeek(parseISO(today), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    [today],
  );

  const counts = useMemo(() => {
    let todayN = 0;
    let weekN = 0;
    let upcomingN = 0;
    let doneN = 0;
    for (const t of filtered) {
      const done = isDone(t, today);
      if (done) {
        doneN += 1;
        continue;
      }
      const bucket = bucketOf(t, today);
      if (bucket === "today") todayN += 1;
      else upcomingN += 1;
      const due = dueDay(t, today);
      if (due !== null && due >= today && due <= weekEnd) weekN += 1;
    }
    return { today: todayN, week: weekN, upcoming: upcomingN, done: doneN };
  }, [filtered, today, weekEnd]);

  const dueDays = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((t) => {
      if (!t.isRecurring && t.specificDate) set.add(dateToDay(t.specificDate));
    });
    return set;
  }, [filtered]);

  const recurringDays = useMemo(() => {
    const set = new Set<number>();
    filtered.forEach((t) => {
      if (t.isRecurring && t.dayOfWeek !== null) set.add(t.dayOfWeek);
    });
    return set;
  }, [filtered]);

  const tabOptions: { value: Tab; label: string }[] = [
    { value: "today", label: `Today${counts.today ? ` · ${counts.today}` : ""}` },
    { value: "week", label: `This week${counts.week ? ` · ${counts.week}` : ""}` },
    {
      value: "upcoming",
      label: `Upcoming${counts.upcoming ? ` · ${counts.upcoming}` : ""}`,
    },
    { value: "done", label: `Done${counts.done ? ` · ${counts.done}` : ""}` },
  ];

  // The collection the + todo modal and explicit form writes land in: the
  // filtered project, else the first project. Hidden when no project exists.
  const modalCollectionId = projectId !== "all" ? projectId : collections[0]?.id;

  function openEdit(todo: Todo) {
    setEditing(todo);
    setOpen(true);
  }

  function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    const input: TodoInput = {
      title,
      notes: null,
      priority: "normal",
      tags: [],
      isRecurring: false,
      dayOfWeek: null,
      specificDate: tab === "today" ? today : null,
      startTime: null,
      endTime: null,
      linkedModule: null,
      linkedId: null,
      linkedLabel: null,
    };
    setDraft("");
    startTransition(async () => {
      try {
        if (projectId !== "all") await createTodo(projectId, input);
        else await quickAddTodo(input);
        router.refresh();
      } catch {
        setDraft(title);
        toast.error("Could not add the task");
      }
    });
  }

  const sortedDay = useMemo(() => {
    if (!selectedDay) return [];
    return filtered
      .filter((t) => dueOn(t, selectedDay))
      .sort(todoComparator(today));
  }, [filtered, selectedDay, today]);

  return (
    <PageShell>
      <PageHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[22px] font-semibold tracking-[-0.01em]">To-Do</h2>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/todo/projects"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              <FolderKanban /> Projects
            </Link>
            {collections.length === 0 ? (
              <Button size="sm" onClick={() => setCreatingProject(true)}>
                <Plus /> New project
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus /> Todo
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={quickAdd}>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={pending}
            placeholder={
              tab === "today" ? "Add a task for today..." : "Add to backlog..."
            }
          />
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="scrollbar-hide max-w-full overflow-x-auto">
            <Segmented<Tab>
              options={tabOptions}
              value={tab}
              onChange={(v) => {
                setTab(v);
                setSelectedDay(null);
              }}
            />
          </div>
          <Select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-auto min-w-[10rem]"
          >
            <option value="all">All projects</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </div>
      </PageHeader>

      <PageBody className="pt-2 md:pt-2">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="order-2 w-full lg:order-1 lg:w-[300px] lg:shrink-0">
            <TodoCalendar
              selected={selectedDay ?? today}
              today={today}
              dueDays={dueDays}
              recurringDays={recurringDays}
              onSelect={(day) => setSelectedDay(day === today ? null : day)}
            />
          </div>
          <div className="order-1 min-w-0 flex-1 lg:order-2">
            {selectedDay ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-fg text-sm font-semibold">
                    {dayLabel(selectedDay, today)}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="text-fg-2 hover:text-fg text-xs transition-colors"
                  >
                    Back to {TAB_LABELS[tab]}
                  </button>
                </div>
                {sortedDay.length === 0 ? (
                  <p className="text-fg-3 text-sm">Nothing due on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {sortedDay.map((todo) => (
                      <TodoRow
                        key={todo.id}
                        todo={todo}
                        today={today}
                        onEdit={openEdit}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : tab === "today" ? (
              <TodayView todos={filtered} today={today} onEdit={openEdit} />
            ) : tab === "week" ? (
              <WeekView
                todos={filtered}
                today={today}
                weekEnd={weekEnd}
                onEdit={openEdit}
              />
            ) : tab === "upcoming" ? (
              <UpcomingView todos={filtered} today={today} onEdit={openEdit} />
            ) : (
              <DoneView todos={filtered} today={today} onEdit={openEdit} />
            )}
          </div>
        </div>

        {modalCollectionId ? (
          <TodoModal
            open={open}
            onOpenChange={setOpen}
            collectionId={modalCollectionId}
            todo={editing}
          />
        ) : null}
        <ProjectModal open={creatingProject} onOpenChange={setCreatingProject} />
      </PageBody>
    </PageShell>
  );
}

// Today: overdue + due-today, with a progress bar and N of M done.
function TodayView({
  todos,
  today,
  onEdit,
}: {
  todos: Todo[];
  today: string;
  onEdit: (todo: Todo) => void;
}) {
  const list = todos
    .filter((t) => bucketOf(t, today) === "today")
    .sort(todoComparator(today));
  const total = list.length;
  const done = list.filter((t) => isDone(t, today)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (total === 0) {
    return (
      <p className="text-fg-3 text-sm">
        Nothing due today. Enjoy the breathing room or pull something forward.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-fg-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
            Progress
          </span>
          <span className="text-fg-2 font-mono text-xs">
            {done} of {total} done
          </span>
        </div>
        <div className="bg-surface-2 h-2 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="space-y-2">
        {list.map((todo) => (
          <TodoRow key={todo.id} todo={todo} today={today} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

// This week: a section per day from today to the end of the week.
function WeekView({
  todos,
  today,
  weekEnd,
  onEdit,
}: {
  todos: Todo[];
  today: string;
  weekEnd: string;
  onEdit: (todo: Todo) => void;
}) {
  const days = eachDayOfInterval({
    start: parseISO(today),
    end: parseISO(weekEnd),
  }).map((d) => format(d, "yyyy-MM-dd"));

  const sections = days
    .map((day) => ({
      day,
      todos: todos.filter((t) => dueOn(t, day)).sort(todoComparator(today)),
    }))
    .filter((s) => s.todos.length > 0);

  if (sections.length === 0) {
    return (
      <p className="text-fg-3 text-sm">
        Nothing scheduled for the rest of the week.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.day} className="space-y-2">
          <h3 className="text-fg-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
            {dayLabel(section.day, today)}
          </h3>
          {section.todos.map((todo) => (
            <TodoRow key={todo.id} todo={todo} today={today} onEdit={onEdit} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Upcoming and backlog: the day buckets after Today (Tomorrow, This week,
// Later, No date).
function UpcomingView({
  todos,
  today,
  onEdit,
}: {
  todos: Todo[];
  today: string;
  onEdit: (todo: Todo) => void;
}) {
  const groups = groupByBucket(
    todos.filter((t) => !isDone(t, today)),
    today,
  ).filter((g) => g.key !== "today" && g.todos.length > 0);

  if (groups.length === 0) {
    return (
      <p className="text-fg-3 text-sm">
        No upcoming tasks. Capture one above to fill your backlog.
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

// Done: completed items grouped by the day they were finished, newest first.
function DoneView({
  todos,
  today,
  onEdit,
}: {
  todos: Todo[];
  today: string;
  onEdit: (todo: Todo) => void;
}) {
  const done = todos.filter((t) => isDone(t, today));

  if (done.length === 0) {
    return (
      <p className="text-fg-3 text-sm">
        Nothing finished yet. Tick something off and it lands here.
      </p>
    );
  }

  const byDay = new Map<string, Todo[]>();
  for (const t of done) {
    const day = t.completedAt ? dateToDay(t.completedAt) : "";
    const list = byDay.get(day) ?? [];
    list.push(t);
    byDay.set(day, list);
  }
  const days = [...byDay.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <div key={day} className="space-y-2">
          <h3 className="text-fg-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
            {day ? dayLabel(day, today) : "Completed"}
          </h3>
          {byDay.get(day)!.map((todo) => (
            <TodoRow key={todo.id} todo={todo} today={today} onEdit={onEdit} />
          ))}
        </div>
      ))}
    </div>
  );
}
