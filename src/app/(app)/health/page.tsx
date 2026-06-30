import { getMeals } from "@/actions/health";
import { getMealPlans } from "@/actions/meal-plans";
import { getRoutines, getSessions } from "@/actions/workouts";
import { getMedicines } from "@/actions/medicines";
import { getHealthRules } from "@/actions/health-rules";
import { getHealthNotes } from "@/actions/health-notes";
import { dateToDay } from "@/lib/money";
import { HealthHub } from "@/components/modules/health/health-hub";

// The Health hub: the dated meal log, reusable meal plans, workouts, medicines,
// standing rules, and a health journal. today is computed once on the server so
// writes and reads agree on the same day.
export default async function HealthPage() {
  const [meals, mealPlans, routines, sessions, medicines, rules, notes] =
    await Promise.all([
      getMeals(),
      getMealPlans(),
      getRoutines(),
      getSessions(),
      getMedicines(),
      getHealthRules(),
      getHealthNotes(),
    ]);
  return (
    <HealthHub
      meals={meals}
      mealPlans={mealPlans}
      routines={routines}
      sessions={sessions}
      medicines={medicines}
      rules={rules}
      notes={notes}
      today={dateToDay(new Date())}
    />
  );
}
