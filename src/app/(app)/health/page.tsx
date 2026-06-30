import { getMeals } from "@/actions/health";
import { getMealPlans } from "@/actions/meal-plans";
import { dateToDay } from "@/lib/money";
import { HealthHub } from "@/components/modules/health/health-hub";

// The Health hub: the dated meal log plus reusable meal plans. today is computed
// once on the server so writes and reads agree on the same day.
export default async function HealthPage() {
  const [meals, mealPlans] = await Promise.all([getMeals(), getMealPlans()]);
  return (
    <HealthHub
      meals={meals}
      mealPlans={mealPlans}
      today={dateToDay(new Date())}
    />
  );
}
