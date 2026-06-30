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
import { MedicinesSection, type Medicine } from "./medicines-section";
import { RulesSection, type HealthRule } from "./rules-section";
import { JournalSection, type HealthNote } from "./journal-section";
import { OverviewSection } from "./overview-section";

// The areas the hub switches between. Overview is the landing snapshot; the
// switcher scrolls horizontally on narrow screens.
const AREAS = [
  { value: "overview", label: "Overview" },
  { value: "meals", label: "Meals" },
  { value: "plans", label: "Plans" },
  { value: "workouts", label: "Workouts" },
  { value: "medicines", label: "Medicines" },
  { value: "rules", label: "Rules" },
  { value: "journal", label: "Journal" },
] as const;

type Area = (typeof AREAS)[number]["value"];

// The Health hub: a single page that switches between health areas. Owns the page
// chrome; each area renders its own controls in the body.
export function HealthHub({
  meals,
  mealPlans,
  routines,
  sessions,
  medicines,
  rules,
  notes,
  today,
}: {
  meals: Meal[];
  mealPlans: MealPlan[];
  routines: Routine[];
  sessions: WorkoutSession[];
  medicines: Medicine[];
  rules: HealthRule[];
  notes: HealthNote[];
  today: string;
}) {
  const [area, setArea] = useState<Area>("overview");

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
        {area === "overview" ? (
          <OverviewSection
            meals={meals}
            mealPlans={mealPlans}
            routines={routines}
            sessions={sessions}
            medicines={medicines}
            rules={rules}
            notes={notes}
            today={today}
            onNavigate={(a) => setArea(a as Area)}
          />
        ) : area === "meals" ? (
          <MealsLog meals={meals} today={today} />
        ) : area === "plans" ? (
          <MealPlansSection mealPlans={mealPlans} />
        ) : area === "workouts" ? (
          <WorkoutsSection
            routines={routines}
            sessions={sessions}
            today={today}
          />
        ) : area === "medicines" ? (
          <MedicinesSection medicines={medicines} today={today} />
        ) : area === "rules" ? (
          <RulesSection rules={rules} />
        ) : (
          <JournalSection notes={notes} today={today} />
        )}
      </PageBody>
    </PageShell>
  );
}
