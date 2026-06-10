import { getMeals } from "@/actions/health";
import { dateToDay } from "@/lib/money";
import { HealthBoard } from "@/components/modules/health/health-board";

// Daily meal log with a weekly calorie summary.
export default async function HealthPage() {
  const meals = await getMeals();
  return <HealthBoard meals={meals} today={dateToDay(new Date())} />;
}
