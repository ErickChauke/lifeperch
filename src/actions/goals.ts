"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { goalSchema, type GoalInput } from "@/lib/goals";
import { toExtraRecord } from "@/lib/extra";
import { randToCents } from "@/lib/money";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function revalidateMoney() {
  revalidatePath("/money");
  revalidatePath("/money/goals");
}

// Maps validated form input to the fields stored on a SavingsGoal. Amounts are
// converted from rand to cents here. Goal columns are BigInt so dream-sized
// targets fit; everything downstream works in plain numbers via getGoals.
function toRecord(data: GoalInput) {
  const extra = toExtraRecord(data);
  return {
    name: data.name.trim(),
    targetAmount: BigInt(randToCents(data.target)),
    currentAmount: BigInt(randToCents(data.current)),
    monthlyAmount: BigInt(randToCents(data.monthly)),
    extraAmount: BigInt(extra.extraAmount),
    extraFrequency: extra.extraFrequency,
    extraDate: extra.extraDate,
  };
}

// Fetches the current user's savings goals, newest first. BigInt amounts are
// mapped to numbers here so components never handle bigint.
export async function getGoals() {
  const userId = await requireUserId();
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return goals.map((g) => ({
    ...g,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    monthlyAmount: Number(g.monthlyAmount),
    extraAmount: Number(g.extraAmount),
  }));
}

// Creates a savings goal for the current user.
export async function createGoal(input: GoalInput) {
  const userId = await requireUserId();
  const data = goalSchema.parse(input);
  await prisma.savingsGoal.create({ data: { userId, ...toRecord(data) } });
  revalidateMoney();
}

// Updates a savings goal, scoped to the current user.
export async function updateGoal(id: string, input: GoalInput) {
  const userId = await requireUserId();
  const data = goalSchema.parse(input);
  await prisma.savingsGoal.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidateMoney();
}

// Deletes a savings goal, scoped to the current user.
export async function deleteGoal(id: string) {
  const userId = await requireUserId();
  await prisma.savingsGoal.deleteMany({ where: { id, userId } });
  revalidateMoney();
}
