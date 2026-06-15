"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Sunrise,
  Sun,
  Sunset,
  Cookie,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { MoneyEmpty } from "@/components/modules/money/money-empty";
import { dateToDay } from "@/lib/money";
import {
  MEAL_TYPES,
  MEAL_TYPE_META,
  weekDays,
  calorieTotal,
  type MealType,
} from "@/lib/health";
import { MealModal } from "./meal-modal";
import type { getMeals } from "@/actions/health";

export type Meal = Awaited<ReturnType<typeof getMeals>>[number];

const TYPE_ICONS: Record<MealType, LucideIcon> = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Sunset,
  snack: Cookie,
};

// Groups a thousands-separated kcal figure, or a dash when there is no value.
function kcal(value: number | null): string {
  if (value == null) return "—";
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} kcal`;
}

// Returns the "yyyy-MM-dd" day shifted by delta days, computed in UTC.
function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function HealthBoard({
  meals,
  today,
}: {
  meals: Meal[];
  today: string;
}) {
  const [selected, setSelected] = useState(today);
  const [creating, setCreating] = useState<MealType | null>(null);
  const [editing, setEditing] = useState<Meal | null>(null);

  // Meals on the selected day, sorted by time (untimed last).
  const dayMeals = useMemo(
    () =>
      meals
        .filter((m) => dateToDay(m.date) === selected)
        .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99")),
    [meals, selected],
  );

  // Calorie total per day across the selected week, for the strip.
  const week = useMemo(() => {
    return weekDays(selected).map((day) => {
      const dayTotal = calorieTotal(
        meals.filter((m) => dateToDay(m.date) === day),
      );
      return { day, total: dayTotal };
    });
  }, [meals, selected]);

  const weekMax = Math.max(1, ...week.map((d) => d.total ?? 0));
  const weekTotal = calorieTotal(
    week.filter((d) => d.total != null).map((d) => ({ calories: d.total })),
  );
  const dayTotal = calorieTotal(dayMeals);

  function closeModal() {
    setCreating(null);
    setEditing(null);
  }

  const modalType: MealType =
    creating ?? (editing?.type as MealType) ?? "breakfast";

  if (meals.length === 0) {
    return (
      <PageShell>
        <PageBody className="pt-6 md:pt-10">
          <MoneyEmpty
            eyebrow="Records · Health"
            message="No meals logged yet. Jot what you eat — breakfast, a snack, dinner — with a time and calories if you want them, and your week takes shape above."
            action={
              <Button onClick={() => setCreating("breakfast")}>
                <Plus /> Add meal
              </Button>
            }
          />
          <MealModal
            open={creating !== null}
            onOpenChange={(o) => !o && closeModal()}
            meal={null}
            date={selected}
            defaultType={modalType}
          />
        </PageBody>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Controls */}
      <PageHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelected(shiftDay(selected, -1))}
            >
              <ChevronLeft />
            </Button>
            <div className="flex flex-col items-center">
              <span className="text-fg font-mono text-base tabular-nums">
                {format(new Date(`${selected}T00:00:00`), "dd MMM yyyy")}
              </span>
              <span className="text-fg-3 text-xs">
                {format(new Date(`${selected}T00:00:00`), "EEEE")}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelected(shiftDay(selected, 1))}
            >
              <ChevronRight />
            </Button>
            {selected !== today ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(today)}
              >
                Today
              </Button>
            ) : null}
          </div>
          <Button onClick={() => setCreating("breakfast")}>
            <Plus /> Add meal
          </Button>
        </div>
      </PageHeader>

      <PageBody className="space-y-6">
        {/* Weekly summary */}
        <div className="bg-surface rounded-[var(--r)] border p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <span className="text-fg-2 text-sm font-medium">This week</span>
            <span className="text-fg-3 font-mono text-xs tabular-nums">
              {kcal(weekTotal)}
            </span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-2">
            {week.map((d) => {
              const isSelected = d.day === selected;
              const hasData = d.total != null;
              const height = hasData
                ? Math.max(6, (d.total! / weekMax) * 72)
                : 4;
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setSelected(d.day)}
                  className="flex flex-1 flex-col items-center gap-2"
                  title={kcal(d.total)}
                >
                  <div className="flex h-[72px] w-full items-end justify-center">
                    <div
                      className={cn(
                        "w-2 rounded-full",
                        !hasData && "bg-surface-3",
                      )}
                      style={{
                        height: `${height}px`,
                        ...(hasData
                          ? {
                              background: "var(--chart-1)",
                              opacity: isSelected ? 1 : 0.55,
                            }
                          : {}),
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      isSelected ? "text-fg-2" : "text-fg-4",
                    )}
                  >
                    {format(new Date(`${d.day}T00:00:00`), "EEEEE")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day log */}
        <div className="space-y-5">
          {MEAL_TYPES.map((type) => {
            const rows = dayMeals.filter((m) => m.type === type);
            const Icon = TYPE_ICONS[type];
            const subtotal = calorieTotal(rows);
            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-fg-2 flex items-center gap-2 text-sm font-medium">
                    <Icon className="text-fg-3 size-4" strokeWidth={1.75} />
                    {MEAL_TYPE_META[type].label}
                  </span>
                  <span className="text-fg-3 font-mono text-xs tabular-nums">
                    {kcal(subtotal)}
                  </span>
                </div>

                {rows.length === 0 ? (
                  <div className="bg-surface flex items-center justify-between rounded-[var(--r)] border px-4 py-3">
                    <span className="text-fg-3 text-sm">Nothing logged</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCreating(type)}
                    >
                      <Plus /> Add
                    </Button>
                  </div>
                ) : (
                  <div className="bg-surface divide-border overflow-hidden rounded-[var(--r)] border [&>*]:border-t [&>*:first-child]:border-t-0">
                    {rows.map((meal) => (
                      <button
                        key={meal.id}
                        type="button"
                        onClick={() => setEditing(meal)}
                        className="hover:bg-surface-2 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                      >
                        <span className="text-fg-3 w-[38px] shrink-0 font-mono text-xs tabular-nums">
                          {meal.time ?? <span className="text-fg-4">—</span>}
                        </span>
                        <span className="text-fg min-w-0 flex-1 truncate text-[15px]">
                          {meal.name}
                        </span>
                        <span className="shrink-0 font-mono text-sm tabular-nums">
                          {meal.calories == null ? (
                            <span className="text-fg-4">—</span>
                          ) : (
                            <span className="text-fg-2">
                              {String(meal.calories).replace(
                                /\B(?=(\d{3})+(?!\d))/g,
                                " ",
                              )}
                              <span className="text-fg-4"> kcal</span>
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-fg-2 text-sm font-medium">Day total</span>
            <span className="text-fg font-mono text-base tabular-nums">
              {kcal(dayTotal)}
            </span>
          </div>
        </div>

        <MealModal
          open={creating !== null || editing !== null}
          onOpenChange={(o) => !o && closeModal()}
          meal={editing}
          date={selected}
          defaultType={modalType}
        />
      </PageBody>
    </PageShell>
  );
}
