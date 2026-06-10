import { getHabits } from "@/actions/habits";
import { dateToDay } from "@/lib/money";
import { HabitsBoard } from "@/components/modules/habits/habits-board";

// Habit check-in board. today is computed once on the server so the check-in
// writes and the streak read agree on the same day.
export default async function HabitsPage() {
  const habits = await getHabits();
  return <HabitsBoard habits={habits} today={dateToDay(new Date())} />;
}
