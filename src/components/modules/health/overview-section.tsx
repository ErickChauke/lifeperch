"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Check,
  ChevronRight,
  Ban,
  ArrowUpRight,
  Pill,
  UtensilsCrossed,
  NotebookPen,
  Dumbbell,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { linkHref } from "@/lib/todo";
import { dateToDay } from "@/lib/money";
import { calorieTotal } from "@/lib/health";
import { setMedicineTaken } from "@/actions/medicines";
import type { Meal } from "./meals-log";
import type { MealPlan } from "./meal-plans-section";
import type { Routine, WorkoutSession } from "./workouts-section";
import type { Medicine } from "./medicines-section";
import type { HealthRule } from "./rules-section";
import type { HealthNote } from "./journal-section";

const NB = String.fromCharCode(160);

function kcal(value: number | null): string {
  if (value == null) return "-";
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, NB)}${NB}kcal`;
}

// A section card with a header and an optional "view all" affordance.
function Panel({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof Pill;
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface flex flex-col gap-3 rounded-[var(--r)] border p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-fg-2 flex items-center gap-2 text-sm font-medium">
          <Icon className="text-fg-3 size-4" strokeWidth={1.75} />
          {title}
        </span>
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="text-fg-3 hover:text-fg flex items-center gap-0.5 text-xs transition-colors"
          >
            {action.label}
            <ChevronRight className="size-3.5" />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

// A soft status tint matching the design's status fills.
const SUCCESS_TINT = "color-mix(in oklch, var(--success) 14%, transparent)";

// One medicine row in the today checklist, with an optimistic taken toggle.
function MedRow({ medicine, today }: { medicine: Medicine; today: string }) {
  const [pending, startTransition] = useTransition();
  const [taken, setTaken] = useState(medicine.takenToday);
  useEffect(() => setTaken(medicine.takenToday), [medicine.takenToday]);

  function toggle() {
    const next = !taken;
    setTaken(next);
    startTransition(async () => {
      try {
        await setMedicineTaken(medicine.id, today, next);
      } catch {
        setTaken(medicine.takenToday);
        toast.error("Could not update");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="hover:bg-surface-2 -mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          taken ? "border-transparent" : "border-border-2",
        )}
        style={taken ? { background: SUCCESS_TINT } : undefined}
      >
        {taken ? (
          <Check
            className="size-3.5"
            strokeWidth={2}
            style={{ color: "var(--success)" }}
          />
        ) : null}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          taken ? "text-fg-3" : "text-fg",
        )}
      >
        {medicine.name}
      </span>
      {medicine.dose ? (
        <span className="text-fg-4 shrink-0 text-xs">{medicine.dose}</span>
      ) : null}
    </button>
  );
}

// The Overview area: a snapshot of today across the health module.
export function OverviewSection({
  meals,
  mealPlans,
  routines,
  sessions,
  medicines,
  rules,
  notes,
  today,
  onNavigate,
}: {
  meals: Meal[];
  mealPlans: MealPlan[];
  routines: Routine[];
  sessions: WorkoutSession[];
  medicines: Medicine[];
  rules: HealthRule[];
  notes: HealthNote[];
  today: string;
  onNavigate: (area: string) => void;
}) {
  const todayMeals = useMemo(
    () => meals.filter((m) => dateToDay(m.date) === today),
    [meals, today],
  );
  const activeMeds = useMemo(
    () => medicines.filter((m) => m.active),
    [medicines],
  );
  const takenCount = activeMeds.filter((m) => m.takenToday).length;
  const activeRules = useMemo(() => rules.filter((r) => r.active), [rules]);

  // Plans, routines, and sessions pointing at the timetable, for quick access.
  const linked = useMemo(() => {
    const items: { id: string; label: string; href: string }[] = [];
    for (const p of mealPlans) {
      const href = linkHref(p.linkedModule, p.linkedId);
      if (href) items.push({ id: p.id, label: p.name, href });
    }
    for (const r of routines) {
      const href = linkHref(r.linkedModule, r.linkedId);
      if (href) items.push({ id: r.id, label: r.name, href });
    }
    for (const s of sessions) {
      const href = linkHref(s.linkedModule, s.linkedId);
      if (href) items.push({ id: s.id, label: s.name, href });
    }
    return items.slice(0, 6);
  }, [mealPlans, routines, sessions]);

  const latestNote = notes[0];

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {/* Today's meals */}
      <Panel
        icon={UtensilsCrossed}
        title="Today's meals"
        action={{ label: "Meals", onClick: () => onNavigate("meals") }}
      >
        {todayMeals.length === 0 ? (
          <p className="text-fg-3 text-sm">Nothing logged yet.</p>
        ) : (
          <div className="space-y-1.5">
            {todayMeals.slice(0, 4).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-fg min-w-0 flex-1 truncate text-sm">
                  {m.name}
                </span>
                <span className="text-fg-3 shrink-0 font-mono text-xs tabular-nums">
                  {m.calories != null ? kcal(m.calories) : ""}
                </span>
              </div>
            ))}
            <div className="border-border mt-1 flex items-center justify-between border-t pt-2">
              <span className="text-fg-2 text-xs">Day total</span>
              <span className="text-fg font-mono text-xs tabular-nums">
                {kcal(calorieTotal(todayMeals))}
              </span>
            </div>
          </div>
        )}
      </Panel>

      {/* Medicines checklist */}
      <Panel
        icon={Pill}
        title="Medicines"
        action={{ label: "All", onClick: () => onNavigate("medicines") }}
      >
        {activeMeds.length === 0 ? (
          <p className="text-fg-3 text-sm">None to take.</p>
        ) : (
          <>
            <p className="text-fg-3 font-mono text-xs tabular-nums">
              {takenCount} / {activeMeds.length} taken
            </p>
            <div className="space-y-0.5">
              {activeMeds.slice(0, 5).map((m) => (
                <MedRow key={m.id} medicine={m} today={today} />
              ))}
            </div>
          </>
        )}
      </Panel>

      {/* Standing rules */}
      <Panel
        icon={Ban}
        title="Rules"
        action={{ label: "All", onClick: () => onNavigate("rules") }}
      >
        {activeRules.length === 0 ? (
          <p className="text-fg-3 text-sm">No standing rules.</p>
        ) : (
          <div className="space-y-1.5">
            {activeRules.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-start gap-2">
                <Ban
                  className="text-fg-4 mt-0.5 size-3.5 shrink-0"
                  strokeWidth={1.75}
                />
                <span className="text-fg-2 text-sm">{r.text}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Latest journal note */}
      <Panel
        icon={NotebookPen}
        title="Journal"
        action={{ label: "All", onClick: () => onNavigate("journal") }}
      >
        {latestNote ? (
          <div className="space-y-1">
            <p className="text-fg-3 font-mono text-xs tabular-nums">
              {format(
                new Date(`${dateToDay(latestNote.date)}T00:00:00`),
                "dd MMM yyyy",
              )}
            </p>
            <p className="text-fg-2 line-clamp-4 text-sm whitespace-pre-wrap">
              {latestNote.body}
            </p>
          </div>
        ) : (
          <p className="text-fg-3 text-sm">No notes yet.</p>
        )}
      </Panel>

      {/* Linked to the timetable */}
      {linked.length > 0 ? (
        <Panel icon={Dumbbell} title="On your timetable">
          <div className="flex flex-wrap gap-2">
            {linked.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="bg-surface-2 text-fg-2 hover:text-fg hover:bg-surface-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors"
              >
                {item.label}
                <ArrowUpRight className="size-3" />
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
