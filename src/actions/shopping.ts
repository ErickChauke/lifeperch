"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { shoppingSchema, type ShoppingInput } from "@/lib/shopping";
import { randToCents, dayToDate, dateToDay } from "@/lib/money";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function revalidateMoney() {
  revalidatePath("/money");
  revalidatePath("/money/shopping");
}

// Fetches the current user's shopping items, oldest first (append order).
export async function getShoppingItems() {
  const userId = await requireUserId();
  return prisma.shoppingItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

// Adds an item to the to-buy list. Price is converted from rand to cents.
export async function createShoppingItem(input: ShoppingInput) {
  const userId = await requireUserId();
  const data = shoppingSchema.parse(input);
  await prisma.shoppingItem.create({
    data: {
      userId,
      name: data.name.trim(),
      price: randToCents(data.price),
      category: data.category,
      quantity: data.quantity,
    },
  });
  revalidateMoney();
}

// Moves an item between to-buy and the basket.
export async function toggleBought(id: string) {
  const userId = await requireUserId();
  const item = await prisma.shoppingItem.findFirst({ where: { id, userId } });
  if (!item) return;
  await prisma.shoppingItem.updateMany({
    where: { id, userId },
    data: { bought: !item.bought },
  });
  revalidateMoney();
}

// Sets an item's quantity, floored at 1.
export async function setQuantity(id: string, quantity: number) {
  const userId = await requireUserId();
  await prisma.shoppingItem.updateMany({
    where: { id, userId },
    data: { quantity: Math.max(1, Math.trunc(quantity)) },
  });
  revalidateMoney();
}

// Removes an item from the list.
export async function deleteShoppingItem(id: string) {
  const userId = await requireUserId();
  await prisma.shoppingItem.deleteMany({ where: { id, userId } });
  revalidateMoney();
}

// Logs the basket (bought items) to the transaction log as one expense per
// category, dated today, then clears those items from the list. Keeps the log
// and the spending charts category-honest.
export async function logBasketAsExpense() {
  const userId = await requireUserId();
  const basket = await prisma.shoppingItem.findMany({
    where: { userId, bought: true },
  });
  if (basket.length === 0) return;

  const groups = new Map<string, { total: number; count: number }>();
  for (const item of basket) {
    const g = groups.get(item.category) ?? { total: 0, count: 0 };
    g.total += item.price * item.quantity;
    g.count += 1;
    groups.set(item.category, g);
  }

  const date = dayToDate(dateToDay(new Date()));
  await prisma.transaction.createMany({
    data: Array.from(groups, ([category, g]) => ({
      userId,
      type: "expense",
      amount: g.total,
      category,
      description: `${category} shop · ${g.count} ${g.count === 1 ? "item" : "items"}`,
      date,
    })),
  });
  await prisma.shoppingItem.deleteMany({ where: { userId, bought: true } });

  revalidateMoney();
  revalidatePath("/money/transactions");
}
