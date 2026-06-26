"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  shoppingListSchema,
  shoppingItemSchema,
  type ShoppingListInput,
  type ShoppingItemInput,
} from "@/lib/shopping";
import { randToCents, dayToDate, dateToDay } from "@/lib/money";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Revalidates the overview, the dashboard hub, and (optionally) a list detail.
function revalidateShopping(listId?: string) {
  revalidatePath("/money");
  revalidatePath("/money/shopping");
  if (listId) revalidatePath(`/money/shopping/${listId}`);
}

// Fetches the user's shopping lists with their items, newest list first.
export async function getShoppingLists() {
  const userId = await requireUserId();
  return prisma.shoppingList.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
}

// Fetches one shopping list with its items, or null if it is not the user's.
export async function getShoppingList(id: string) {
  const userId = await requireUserId();
  return prisma.shoppingList.findFirst({
    where: { id, userId },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
}

// Creates a list and returns it so the UI can open its (empty) detail.
export async function createShoppingList(input: ShoppingListInput) {
  const userId = await requireUserId();
  const data = shoppingListSchema.parse(input);
  const list = await prisma.shoppingList.create({
    data: { userId, title: data.title.trim(), category: data.category },
  });
  revalidateShopping(list.id);
  return list;
}

// Renames a list, scoped to the current user.
export async function renameShoppingList(id: string, title: string) {
  const userId = await requireUserId();
  const clean = title.trim();
  if (!clean) return;
  await prisma.shoppingList.updateMany({ where: { id, userId }, data: { title: clean } });
  revalidateShopping(id);
}

// Deletes a list and its items (cascade), scoped to the current user.
export async function deleteShoppingList(id: string) {
  const userId = await requireUserId();
  await prisma.shoppingList.deleteMany({ where: { id, userId } });
  revalidateShopping();
}

// Adds an item to a list. The category comes from the list, not the item.
export async function createShoppingItem(listId: string, input: ShoppingItemInput) {
  const userId = await requireUserId();
  const data = shoppingItemSchema.parse(input);
  const list = await prisma.shoppingList.findFirst({ where: { id: listId, userId } });
  if (!list) throw new Error("List not found");
  await prisma.shoppingItem.create({
    data: {
      userId,
      listId,
      name: data.name.trim(),
      price: randToCents(data.price),
      quantity: data.quantity,
    },
  });
  revalidateShopping(listId);
}

// Edits an item's name, price (rand to cents), and quantity, scoped to the user.
export async function updateShoppingItem(id: string, input: ShoppingItemInput) {
  const userId = await requireUserId();
  const data = shoppingItemSchema.parse(input);
  const item = await prisma.shoppingItem.findFirst({ where: { id, userId } });
  if (!item) return;
  await prisma.shoppingItem.updateMany({
    where: { id, userId },
    data: {
      name: data.name.trim(),
      price: randToCents(data.price),
      quantity: data.quantity,
    },
  });
  revalidateShopping(item.listId);
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
  revalidateShopping(item.listId);
}

// Sets an item's quantity, floored at 1.
export async function setQuantity(id: string, quantity: number) {
  const userId = await requireUserId();
  const item = await prisma.shoppingItem.findFirst({ where: { id, userId } });
  if (!item) return;
  await prisma.shoppingItem.updateMany({
    where: { id, userId },
    data: { quantity: Math.max(1, Math.trunc(quantity)) },
  });
  revalidateShopping(item.listId);
}

// Removes an item from a list.
export async function deleteShoppingItem(id: string) {
  const userId = await requireUserId();
  const item = await prisma.shoppingItem.findFirst({ where: { id, userId } });
  if (!item) return;
  await prisma.shoppingItem.deleteMany({ where: { id, userId } });
  revalidateShopping(item.listId);
}

// Logs a list's basket (bought items) as one expense in the list's category,
// dated today and described with the list title, then clears those items. A list
// is single-category, so it is always one clean transaction.
export async function logListAsExpense(listId: string) {
  const userId = await requireUserId();
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, userId },
    include: { items: { where: { bought: true } } },
  });
  if (!list || list.items.length === 0) return;

  const total = list.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = list.items.length;
  const date = dayToDate(dateToDay(new Date()));

  await prisma.transaction.create({
    data: {
      userId,
      type: "expense",
      amount: total,
      category: list.category,
      description: `${list.title} · ${count} ${count === 1 ? "item" : "items"}`,
      date,
    },
  });
  await prisma.shoppingItem.deleteMany({ where: { userId, listId, bought: true } });

  revalidateShopping(listId);
  revalidatePath("/money/transactions");
}
