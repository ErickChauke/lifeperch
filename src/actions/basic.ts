"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randToCents } from "@/lib/money";
import { clearInboundLinks } from "@/lib/money-links";
import { fixedItemSchema, type FixedItemInput } from "@/lib/basic";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Fetches the user's fixed items, oldest first so the list order is stable.
export async function getFixedItems() {
  const userId = await requireUserId();
  return prisma.fixedItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

function toRecord(data: FixedItemInput) {
  return {
    kind: data.kind,
    category: data.category,
    title: data.title.trim(),
    amount: randToCents(data.amount),
    frequency: data.frequency,
    note: data.note?.trim() || null,
  };
}

// Adds a fixed item for the current user.
export async function createFixedItem(input: FixedItemInput) {
  const userId = await requireUserId();
  const data = fixedItemSchema.parse(input);
  await prisma.fixedItem.create({ data: { userId, ...toRecord(data) } });
  revalidatePath("/money/basic");
}

// Updates a fixed item, scoped to the current user.
export async function updateFixedItem(id: string, input: FixedItemInput) {
  const userId = await requireUserId();
  const data = fixedItemSchema.parse(input);
  await prisma.fixedItem.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidatePath("/money/basic");
}

// Deletes a fixed item, scoped to the current user. Any plan lines imported from
// it keep their own state; only the origin link is severed so nothing dangles.
export async function deleteFixedItem(id: string) {
  const userId = await requireUserId();
  await prisma.fixedItem.deleteMany({ where: { id, userId } });
  await clearInboundLinks(userId, id);
  revalidatePath("/money/basic");
  revalidatePath("/money/plan");
}
