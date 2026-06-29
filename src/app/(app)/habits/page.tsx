import { getHabits } from "@/actions/habits";
import { getTodos } from "@/actions/todo";
import { dateToDay } from "@/lib/money";
import { HabitsBoard } from "@/components/modules/habits/habits-board";

// Habit check-in board. today is computed once on the server so the check-in
// writes and the streak read agree on the same day. Todos are passed so a habit
// can be linked to one.
export default async function HabitsPage() {
  const [habits, todos] = await Promise.all([getHabits(), getTodos()]);
  return (
    <HabitsBoard habits={habits} todos={todos} today={dateToDay(new Date())} />
  );
}
