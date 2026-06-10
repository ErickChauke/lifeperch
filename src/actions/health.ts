"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { mealSchema, type MealInput } from "@/lib/health";
import { dayToDate } from "@/lib/money";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Maps validated form input to the fields stored on a Meal.
function toRecord(data: MealInput) {
  return {
    date: dayToDate(data.date),
    type: data.type,
    name: data.name.trim(),
    time: data.time?.trim() || null,
    calories: data.calories,
  };
}

// Fetches all the user's meals, newest day first. The board groups by day and
// meal type and computes the weekly strip in memory (same as the money log).
export async function getMeals() {
  const userId = await requireUserId();
  return prisma.meal.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { time: "asc" }],
  });
}

// Creates a meal for the current user.
export async function createMeal(input: MealInput) {
  const userId = await requireUserId();
  const data = mealSchema.parse(input);
  await prisma.meal.create({ data: { userId, ...toRecord(data) } });
  revalidatePath("/health");
}

// Updates a meal, scoped to the current user.
export async function updateMeal(id: string, input: MealInput) {
  const userId = await requireUserId();
  const data = mealSchema.parse(input);
  await prisma.meal.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidatePath("/health");
}

// Deletes a meal, scoped to the current user.
export async function deleteMeal(id: string) {
  const userId = await requireUserId();
  await prisma.meal.deleteMany({ where: { id, userId } });
  revalidatePath("/health");
}
