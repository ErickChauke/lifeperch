"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, ArrowUpRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Segmented } from "@/components/modules/money/segmented";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { linkHref } from "@/lib/todo";
import { dateToDay } from "@/lib/money";
import { exerciseDetail } from "@/lib/health";
import { WorkoutRoutineModal } from "./workout-routine-modal";
import { WorkoutSessionModal } from "./workout-session-modal";
import type { getRoutines, getSessions } from "@/actions/workouts";

export type Routine = Awaited<ReturnType<typeof getRoutines>>[number];
export type WorkoutSession = Awaited<ReturnType<typeof getSessions>>[number];

type View = "sessions" | "routines";

const VIEWS = [
  { value: "sessions", label: "Sessions" },
  { value: "routines", label: "Routines" },
] as const;

// One dated session row: date, name, the routine it followed, and a duration.
function SessionRow({
  session,
  onEdit,
}: {
  session: WorkoutSession;
  onEdit: () => void;
}) {
  const href = linkHref(session.linkedModule, session.linkedId);
  return (
    <button
      type="button"
      onClick={onEdit}
      className="hover:bg-surface-2 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
    >
      <span className="text-fg-3 w-[58px] shrink-0 font-mono text-xs tabular-nums">
        {format(new Date(`${dateToDay(session.date)}T00:00:00`), "dd MMM")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-fg block truncate text-[15px]">
          {session.name}
        </span>
        {session.routine || session.notes ? (
          <span className="text-fg-3 block truncate text-xs">
            {session.routine ? session.routine.name : null}
            {session.routine && session.notes ? " · " : null}
            {session.notes}
          </span>
        ) : null}
      </span>
      {href ? (
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="bg-surface-2 text-fg-2 hover:text-fg hover:bg-surface-3 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] transition-colors"
        >
          {session.linkedLabel || session.linkedModule}
          <ArrowUpRight className="size-3" />
        </Link>
      ) : null}
      {session.durationMin != null ? (
        <span className="text-fg-2 shrink-0 font-mono text-sm tabular-nums">
          {session.durationMin}
          <span className="text-fg-4"> min</span>
        </span>
      ) : null}
    </button>
  );
}

// One routine card: its exercises with set/rep/weight detail.
function RoutineCard({
  routine,
  onEdit,
}: {
  routine: Routine;
  onEdit: () => void;
}) {
  const href = linkHref(routine.linkedModule, routine.linkedId);
  return (
    <div className="bg-surface flex flex-col gap-3 rounded-[var(--r)] border p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-fg truncate text-[15px] font-medium">
              {routine.name}
            </h3>
            {!routine.active ? (
              <span className="text-fg-4 shrink-0 text-[11px]">archived</span>
            ) : null}
          </div>
          {routine.notes ? (
            <p className="text-fg-3 mt-0.5 line-clamp-2 text-xs">
              {routine.notes}
            </p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          aria-label="Edit routine"
        >
          <Pencil />
        </Button>
      </div>

      {href ? (
        <Link
          href={href}
          className="bg-surface-2 text-fg-2 hover:text-fg hover:bg-surface-3 inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] transition-colors"
        >
          {routine.linkedLabel || routine.linkedModule}
          <ArrowUpRight className="size-3" />
        </Link>
      ) : null}

      <div className="bg-surface-2 divide-border overflow-hidden rounded-md border [&>*]:border-t [&>*:first-child]:border-t-0">
        {routine.exercises.length === 0 ? (
          <p className="text-fg-4 px-3 py-1.5 text-xs">No exercises</p>
        ) : (
          routine.exercises.map((ex) => {
            const detail = exerciseDetail(ex);
            return (
              <div
                key={ex.id}
                className="flex items-center justify-between gap-2 px-3 py-1.5"
              >
                <span className="text-fg min-w-0 flex-1 truncate text-sm">
                  {ex.name}
                </span>
                {detail ? (
                  <span className="text-fg-3 shrink-0 font-mono text-xs tabular-nums">
                    {detail}
                  </span>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// The Workouts area: dated session log and reusable routines, switched by a small
// inner toggle.
export function WorkoutsSection({
  routines,
  sessions,
  today,
}: {
  routines: Routine[];
  sessions: WorkoutSession[];
  today: string;
}) {
  const [view, setView] = useState<View>("sessions");
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [creatingRoutine, setCreatingRoutine] = useState(false);
  const [editingSession, setEditingSession] = useState<WorkoutSession | null>(
    null,
  );
  const [creatingSession, setCreatingSession] = useState(false);
  const [search, setSearch] = useState("");

  const routineOptions = useMemo(
    () => routines.map((r) => ({ id: r.id, name: r.name })),
    [routines],
  );

  const filteredRoutines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return routines;
    return routines.filter((r) => r.name.toLowerCase().includes(q));
  }, [routines, search]);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.notes ?? "").toLowerCase().includes(q),
    );
  }, [sessions, search]);

  const empty = view === "sessions" ? sessions.length === 0 : routines.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="scrollbar-hide -mx-1 overflow-x-auto px-1">
          <Segmented options={VIEWS} value={view} onChange={setView} />
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={view === "sessions" ? "Search sessions…" : "Search routines…"}
        />
        {view === "sessions" ? (
          <Button onClick={() => setCreatingSession(true)}>
            <Plus /> Log session
          </Button>
        ) : (
          <Button onClick={() => setCreatingRoutine(true)}>
            <Plus /> New routine
          </Button>
        )}
      </div>

      {empty ? (
        view === "sessions" ? (
          <MoneyEmpty
            eyebrow="Records · Health"
            message="No workouts logged yet. After a session, jot it down here - pick a routine if you follow one, add how long it took, and your training history builds up."
            action={
              <Button onClick={() => setCreatingSession(true)}>
                <Plus /> Log session
              </Button>
            }
          />
        ) : (
          <MoneyEmpty
            eyebrow="Records · Health"
            message="No routines yet. Build one - a push day, a leg day - with its exercises and target sets and reps, then log sessions against it."
            action={
              <Button onClick={() => setCreatingRoutine(true)}>
                <Plus /> New routine
              </Button>
            }
          />
        )
      ) : view === "sessions" ? (
        filteredSessions.length === 0 ? (
          <p className="text-fg-3 py-10 text-sm">No sessions match.</p>
        ) : (
          <div className="bg-surface divide-border overflow-hidden rounded-[var(--r)] border [&>*]:border-t [&>*:first-child]:border-t-0">
            {filteredSessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onEdit={() => setEditingSession(session)}
              />
            ))}
          </div>
        )
      ) : filteredRoutines.length === 0 ? (
        <p className="text-fg-3 py-10 text-sm">No routines match.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filteredRoutines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onEdit={() => setEditingRoutine(routine)}
            />
          ))}
        </div>
      )}

      <WorkoutRoutineModal
        open={creatingRoutine || editingRoutine !== null}
        onOpenChange={(o) => {
          if (!o) {
            setCreatingRoutine(false);
            setEditingRoutine(null);
          }
        }}
        routine={editingRoutine}
      />
      <WorkoutSessionModal
        open={creatingSession || editingSession !== null}
        onOpenChange={(o) => {
          if (!o) {
            setCreatingSession(false);
            setEditingSession(null);
          }
        }}
        session={editingSession}
        routines={routineOptions}
        today={today}
      />
    </div>
  );
}
