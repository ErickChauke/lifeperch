"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { mealPlanSchema, type MealPlanInput } from "@/lib/health";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Maps validated plan input to the nested slot/option create payload, numbering
// slots and options by their form order so the saved order is stable.
function toSlotsCreate(userId: string, data: MealPlanInput) {
  return data.slots.map((slot, i) => ({
    userId,
    label: slot.label.trim(),
    order: i,
    options: {
      create: slot.options.map((opt, j) => ({
        userId,
        name: opt.name.trim(),
        calories: opt.calories,
        notes: opt.notes?.trim() || null,
        order: j,
      })),
    },
  }));
}

// Fetches the user's meal plans with their slots and options, all in saved order.
// Active plans come first.
export async function getMealPlans() {
  const userId = await requireUserId();
  return prisma.mealPlan.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: {
      slots: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });
}

// Creates a meal plan with its slots and options for the current user.
export async function createMealPlan(input: MealPlanInput) {
  const userId = await requireUserId();
  const data = mealPlanSchema.parse(input);
  await prisma.mealPlan.create({
    data: {
      userId,
      name: data.name.trim(),
      notes: data.notes?.trim() || null,
      active: data.active,
      linkedModule: data.linkedModule,
      linkedId: data.linkedId,
      linkedLabel: data.linkedLabel?.trim() || null,
      slots: { create: toSlotsCreate(userId, data) },
    },
  });
  revalidatePath("/health");
}

// Updates a plan and rebuilds its slots/options from the form so removed rows are
// dropped and the order matches the editor. Scoped to the owner.
export async function updateMealPlan(id: string, input: MealPlanInput) {
  const userId = await requireUserId();
  const data = mealPlanSchema.parse(input);
  const plan = await prisma.mealPlan.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!plan) return;
  await prisma.$transaction([
    prisma.mealPlanSlot.deleteMany({ where: { planId: id, userId } }),
    prisma.mealPlan.update({
      where: { id },
      data: {
        name: data.name.trim(),
        notes: data.notes?.trim() || null,
        active: data.active,
        linkedModule: data.linkedModule,
        linkedId: data.linkedId,
        linkedLabel: data.linkedLabel?.trim() || null,
        slots: { create: toSlotsCreate(userId, data) },
      },
    }),
  ]);
  revalidatePath("/health");
}

// Deletes a plan (slots and options cascade), scoped to the current user.
export async function deleteMealPlan(id: string) {
  const userId = await requireUserId();
  await prisma.mealPlan.deleteMany({ where: { id, userId } });
  revalidatePath("/health");
}
