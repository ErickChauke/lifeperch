import { getMeals } from "@/actions/health";
import { getMealPlans } from "@/actions/meal-plans";
import { getRoutines, getSessions } from "@/actions/workouts";
import { dateToDay } from "@/lib/money";
import { HealthHub } from "@/components/modules/health/health-hub";

// The Health hub: the dated meal log, reusable meal plans, and workouts. today is
// computed once on the server so writes and reads agree on the same day.
export default async function HealthPage() {
  const [meals, mealPlans, routines, sessions] = await Promise.all([
    getMeals(),
    getMealPlans(),
    getRoutines(),
    getSessions(),
  ]);
  return (
    <HealthHub
      meals={meals}
      mealPlans={mealPlans}
      routines={routines}
      sessions={sessions}
      today={dateToDay(new Date())}
    />
  );
}
