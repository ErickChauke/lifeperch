"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  habitSchema,
  habitMet,
  computeStreak,
  lastNDays,
  type HabitInput,
} from "@/lib/habits";
import { dayToDate, dateToDay } from "@/lib/money";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Maps validated form input to the fields stored on a Habit. Boolean habits keep
// a target of 1 and drop any unit so the stored shape matches the kind.
function toRecord(data: HabitInput) {
  const count = data.kind === "count";
  return {
    name: data.name.trim(),
    description: data.description?.trim() || null,
    kind: data.kind,
    target: count ? Math.max(1, data.target) : 1,
    unit: count ? data.unit?.trim() || null : null,
    icon: data.icon?.trim() || null,
  };
}

// Fetches the user's active habits, each carrying today's logged value and its
// current streak so the board can render the check-in foot without more queries.
export async function getHabits() {
  const userId = await requireUserId();
  const habits = await prisma.habit.findMany({
    where: { userId, archived: false },
    orderBy: { createdAt: "asc" },
    include: { logs: true },
  });
  const today = dateToDay(new Date());
  const week = lastNDays(today, 7);
  return habits.map(({ logs, ...habit }) => {
    const todayValue = logs.find((l) => dateToDay(l.date) === today)?.value ?? 0;
    const metDays = new Set(
      logs.filter((l) => habitMet(l.value, habit.kind, habit.target)).map((l) => dateToDay(l.date)),
    );
    return {
      ...habit,
      todayValue,
      streak: computeStreak(metDays, today),
      last7: week.map((day) => ({ day, met: metDays.has(day) })),
    };
  });
}

// Creates a new habit for the current user.
export async function createHabit(input: HabitInput) {
  const userId = await requireUserId();
  const data = habitSchema.parse(input);
  await prisma.habit.create({ data: { userId, ...toRecord(data) } });
  revalidatePath("/habits");
}

// Updates a habit, scoped to the current user.
export async function updateHabit(id: string, input: HabitInput) {
  const userId = await requireUserId();
  const data = habitSchema.parse(input);
  await prisma.habit.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidatePath("/habits");
}

// Archives a habit: it leaves the grid but its history is kept (no hard delete).
export async function archiveHabit(id: string) {
  const userId = await requireUserId();
  await prisma.habit.updateMany({ where: { id, userId }, data: { archived: true } });
  revalidatePath("/habits");
}

// Sets the logged value for a habit on a day (the daily check-in). value is the
// count reached, or 0/1 for a boolean. Upserts the one row per habit per day.
export async function setHabitLog(habitId: string, day: string, value: number) {
  const userId = await requireUserId();
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) return;
  const date = dayToDate(day);
  const v = Math.max(0, Math.trunc(value));
  await prisma.habitLog.upsert({
    where: { habitId_date: { habitId, date } },
    create: { userId, habitId, date, value: v },
    update: { value: v },
  });
  revalidatePath("/habits");
}
