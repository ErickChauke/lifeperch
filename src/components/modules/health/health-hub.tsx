"use client";

import { useState } from "react";
import {
  PageShell,
  PageHeader,
  PageBody,
} from "@/components/layout/page-shell";
import { Segmented } from "@/components/modules/money/segmented";
import { MealsLog, type Meal } from "./meals-log";
import { MealPlansSection, type MealPlan } from "./meal-plans-section";
import {
  WorkoutsSection,
  type Routine,
  type WorkoutSession,
} from "./workouts-section";

// The areas the hub switches between. The list grows as each feature lands; the
// switcher scrolls horizontally on narrow screens.
const AREAS = [
  { value: "meals", label: "Meals" },
  { value: "plans", label: "Plans" },
  { value: "workouts", label: "Workouts" },
] as const;

type Area = (typeof AREAS)[number]["value"];

// The Health hub: a single page that switches between health areas. Owns the page
// chrome; each area renders its own controls in the body.
export function HealthHub({
  meals,
  mealPlans,
  routines,
  sessions,
  today,
}: {
  meals: Meal[];
  mealPlans: MealPlan[];
  routines: Routine[];
  sessions: WorkoutSession[];
  today: string;
}) {
  const [area, setArea] = useState<Area>("meals");

  return (
    <PageShell>
      <PageHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Health</h1>
          <div className="scrollbar-hide -mx-1 max-w-full overflow-x-auto px-1">
            <Segmented options={AREAS} value={area} onChange={setArea} />
          </div>
        </div>
      </PageHeader>

      <PageBody className="space-y-6">
        {area === "meals" ? (
          <MealsLog meals={meals} today={today} />
        ) : area === "plans" ? (
          <MealPlansSection mealPlans={mealPlans} />
        ) : (
          <WorkoutsSection
            routines={routines}
            sessions={sessions}
            today={today}
          />
        )}
      </PageBody>
    </PageShell>
  );
}
