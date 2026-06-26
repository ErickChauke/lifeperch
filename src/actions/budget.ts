"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randToCents, dayToDate, dateToDay } from "@/lib/money";
import { syncLinkedStatus, clearInboundLinks } from "@/lib/money-links";
import {
  planSchema,
  budgetItemSchema,
  nextPeriod,
  defaultTitle,
  type PlanInput,
  type BudgetItemInput,
  type PeriodType,
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

// Templates a plan into the next period: copies its lines into a fresh plan for
// the following month/week/range. Returns the new plan to navigate into.
export async function duplicatePlan(id: string) {
  const userId = await requireUserId();
  const plan = await prisma.budgetPlan.findFirst({
    where: { id, userId },
    include: { items: true },
  });
  if (!plan) throw new Error("Plan not found");
  const type = plan.periodType as PeriodType;
  const range = nextPeriod(type, plan.startDate, plan.endDate);
  const created = await prisma.budgetPlan.create({
    data: {
      userId,
      title: defaultTitle(type, range.start, range.end),
      periodType: plan.periodType,
      startDate: dayToDate(range.start),
      endDate: dayToDate(range.end),
      items: {
        create: plan.items.map((i) => ({
          userId,
          kind: i.kind,
          category: i.category,
          title: i.title,
          amount: i.amount,
          goalId: i.goalId,
        })),
      },
    },
  });
  revalidateBudget(created.id);
  return created;
}

// --- Lines ---

function toItemRecord(data: BudgetItemInput) {
  return {
    kind: data.kind,
    category: data.category,
    title: data.title?.trim() || null,
    amount: randToCents(data.amount),
    note: data.note?.trim() || null,
    // Only an expense line can fund a goal.
    goalId: data.kind === "expense" ? (data.goalId ?? null) : null,
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

// Updates a line, scoped to the current user. When the line is already marked
// done, its logged transaction is kept in step with the new amount/category/note.
export async function updateItem(id: string, input: BudgetItemInput) {
  const userId = await requireUserId();
  const data = budgetItemSchema.parse(input);
  const existing = await prisma.budgetItem.findFirst({ where: { id, userId } });
  if (!existing) return;
  const record = toItemRecord(data);
  await prisma.budgetItem.updateMany({ where: { id, userId }, data: record });
  if (existing.completed && existing.transactionId) {
    await prisma.transaction.updateMany({
      where: { id: existing.transactionId, userId },
      data: {
        type: record.kind,
        amount: record.amount,
        category: record.category,
        description: record.title || record.note || null,
      },
    });
    revalidatePath("/money/transactions");
  }
  revalidateBudget(existing.planId);
}

// Deletes a line, scoped to the current user. Removes the transaction it logged
// when completed so no orphan is left behind.
export async function deleteItem(id: string) {
  const userId = await requireUserId();
  const existing = await prisma.budgetItem.findFirst({ where: { id, userId } });
  if (!existing) return;
  if (existing.transactionId) {
    await prisma.transaction.deleteMany({ where: { id: existing.transactionId, userId } });
  }
  await prisma.budgetItem.deleteMany({ where: { id, userId } });
  await clearInboundLinks(userId, id);
  revalidateBudget(existing.planId);
  revalidatePath("/money/transactions");
}

// Toggles a line done. Marking it done logs a matching transaction in the plan's
// period (so it shows in the actual spend and the transactions log) and greys the
// line; un-marking removes that transaction. The transaction is dated today,
// clamped into the plan's period so it always lands in the matched range.
export async function toggleItemComplete(id: string) {
  const userId = await requireUserId();
  const item = await prisma.budgetItem.findFirst({
    where: { id, userId },
    include: { plan: { select: { startDate: true, endDate: true } } },
  });
  if (!item) return;

  if (!item.completed) {
    const start = dateToDay(item.plan.startDate);
    const end = dateToDay(item.plan.endDate);
    const today = dateToDay(new Date());
    const day = today < start ? start : today > end ? end : today;
    const txn = await prisma.transaction.create({
      data: {
        userId,
        type: item.kind,
        amount: item.amount,
        category: item.category,
        description: item.title?.trim() || item.note?.trim() || null,
        date: dayToDate(day),
      },
    });
    await prisma.budgetItem.update({
      where: { id },
      data: { completed: true, transactionId: txn.id },
    });
  } else {
    if (item.transactionId) {
      await prisma.transaction.deleteMany({ where: { id: item.transactionId, userId } });
    }
    await prisma.budgetItem.update({
      where: { id },
      data: { completed: false, transactionId: null },
    });
  }

  await syncLinkedStatus(userId, "plan", id, !item.completed);
  revalidateBudget(item.planId);
  revalidatePath("/money/transactions");
  revalidatePath("/money");
}
