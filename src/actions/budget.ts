"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randToCents, dayToDate } from "@/lib/money";
import {
  planSchema,
  budgetItemSchema,
  type PlanInput,
  type BudgetItemInput,
} from "@/lib/budget";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function revalidateBudget(id?: string) {
  revalidatePath("/money/plan");
  if (id) revalidatePath(`/money/plan/${id}`);
}

// --- Plans ---

// Fetches the user's plans, newest period first, with their lines.
export async function getPlans() {
  const userId = await requireUserId();
  return prisma.budgetPlan.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
    include: { items: true },
  });
}

// Fetches one plan with its lines and the actual money in/out for its period,
// summed from transactions by category, so each line can show planned vs actual.
export async function getPlan(id: string) {
  const userId = await requireUserId();
  const plan = await prisma.budgetPlan.findFirst({
    where: { id, userId },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!plan) return null;

  const rows = await prisma.transaction.groupBy({
    by: ["type", "category"],
    where: { userId, date: { gte: plan.startDate, lte: plan.endDate } },
    _sum: { amount: true },
  });

  const actual = { income: {} as Record<string, number>, expense: {} as Record<string, number> };
  for (const r of rows) {
    const bucket = r.type === "income" ? actual.income : actual.expense;
    bucket[r.category] = r._sum.amount ?? 0;
  }

  return { ...plan, actual };
}

// Creates a plan and returns it so the UI can navigate into it.
export async function createPlan(input: PlanInput) {
  const userId = await requireUserId();
  const data = planSchema.parse(input);
  const plan = await prisma.budgetPlan.create({
    data: {
      userId,
      title: data.title.trim(),
      periodType: data.periodType,
      startDate: dayToDate(data.startDate),
      endDate: dayToDate(data.endDate),
    },
  });
  revalidateBudget(plan.id);
  return plan;
}

// Updates a plan's title and period, scoped to the current user.
export async function updatePlan(id: string, input: PlanInput) {
  const userId = await requireUserId();
  const data = planSchema.parse(input);
  await prisma.budgetPlan.updateMany({
    where: { id, userId },
    data: {
      title: data.title.trim(),
      periodType: data.periodType,
      startDate: dayToDate(data.startDate),
      endDate: dayToDate(data.endDate),
    },
  });
  revalidateBudget(id);
}

// Deletes a plan and its lines (cascade), scoped to the current user.
export async function deletePlan(id: string) {
  const userId = await requireUserId();
  await prisma.budgetPlan.deleteMany({ where: { id, userId } });
  revalidateBudget();
}

// --- Lines ---

function toItemRecord(data: BudgetItemInput) {
  return {
    kind: data.kind,
    category: data.category,
    amount: randToCents(data.amount),
  };
}

// Adds a line to a plan the user owns.
export async function addItem(planId: string, input: BudgetItemInput) {
  const userId = await requireUserId();
  const plan = await prisma.budgetPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) throw new Error("Plan not found");
  const data = budgetItemSchema.parse(input);
  await prisma.budgetItem.create({
    data: { userId, planId, ...toItemRecord(data) },
  });
  revalidateBudget(planId);
}

// Updates a line, scoped to the current user.
export async function updateItem(id: string, input: BudgetItemInput) {
  const userId = await requireUserId();
  const data = budgetItemSchema.parse(input);
  const existing = await prisma.budgetItem.findFirst({ where: { id, userId } });
  if (!existing) return;
  await prisma.budgetItem.updateMany({ where: { id, userId }, data: toItemRecord(data) });
  revalidateBudget(existing.planId);
}

// Deletes a line, scoped to the current user.
export async function deleteItem(id: string) {
  const userId = await requireUserId();
  const existing = await prisma.budgetItem.findFirst({ where: { id, userId } });
  if (!existing) return;
  await prisma.budgetItem.deleteMany({ where: { id, userId } });
  revalidateBudget(existing.planId);
}
