import { getMeals } from "@/actions/health";
import { getMealPlans } from "@/actions/meal-plans";
import { getRoutines, getSessions } from "@/actions/workouts";
import { getMedicines } from "@/actions/medicines";
import { dateToDay } from "@/lib/money";
import { HealthHub } from "@/components/modules/health/health-hub";

// The Health hub: the dated meal log, reusable meal plans, workouts, and
// medicines. today is computed once on the server so writes and reads agree on
// the same day.
export default async function HealthPage() {
  const [meals, mealPlans, routines, sessions, medicines] = await Promise.all([
    getMeals(),
    getMealPlans(),
    getRoutines(),
    getSessions(),
    getMedicines(),
  ]);
  return (
    <HealthHub
      meals={meals}
      mealPlans={mealPlans}
      routines={routines}
      sessions={sessions}
      medicines={medicines}
      today={dateToDay(new Date())}
    />
  );
}
