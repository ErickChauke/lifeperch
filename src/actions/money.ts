"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  transactionSchema,
  randToCents,
  dayToDate,
  type TransactionInput,
} from "@/lib/money";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Revalidates the dashboard (which aggregates transactions) and the log.
function revalidateMoney() {
  revalidatePath("/money");
  revalidatePath("/money/transactions");
}

// Maps validated form input to the fields stored on a Transaction. The amount
// is converted from rand to cents here, at the action boundary.
function toRecord(data: TransactionInput) {
  return {
    type: data.type,
    amount: randToCents(data.amount),
    category: data.category,
    description: data.description?.trim() || null,
    date: dayToDate(data.date),
  };
}

// Fetches the current user's transactions, newest day first.
export async function getTransactions() {
  const userId = await requireUserId();
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

// Creates a transaction for the current user.
export async function createTransaction(input: TransactionInput) {
  const userId = await requireUserId();
  const data = transactionSchema.parse(input);
  await prisma.transaction.create({ data: { userId, ...toRecord(data) } });
  revalidateMoney();
}

// Updates a transaction, scoped to the current user.
export async function updateTransaction(id: string, input: TransactionInput) {
  const userId = await requireUserId();
  const data = transactionSchema.parse(input);
  await prisma.transaction.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidateMoney();
}

// Deletes a transaction, scoped to the current user.
export async function deleteTransaction(id: string) {
  const userId = await requireUserId();
  await prisma.transaction.deleteMany({ where: { id, userId } });
  revalidateMoney();
}
