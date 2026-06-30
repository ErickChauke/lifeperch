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
import { syncLinkedStatus, clearInboundLinks } from "@/lib/money-links";

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

// Marks an item bought or back to-buy. Marking it bought logs an expense in the
// list's category (so the spend shows in the transactions log) and greys it;
// un-marking removes that transaction. A free item (price 0) just flips the flag.
export async function toggleBought(id: string) {
  const userId = await requireUserId();
  const item = await prisma.shoppingItem.findFirst({
    where: { id, userId },
    include: { list: { select: { category: true } } },
  });
  if (!item) return;

  if (!item.bought) {
    let transactionId: string | null = null;
    if (item.price > 0) {
      const txn = await prisma.transaction.create({
        data: {
          userId,
          type: "expense",
          amount: item.price * item.quantity,
          category: item.list.category || "Other",
          description: item.name,
          date: dayToDate(dateToDay(new Date())),
        },
      });
      transactionId = txn.id;
    }
    await prisma.shoppingItem.update({
      where: { id },
      data: { bought: true, transactionId },
    });
  } else {
    if (item.transactionId) {
      await prisma.transaction.deleteMany({ where: { id: item.transactionId, userId } });
    }
    await prisma.shoppingItem.update({
      where: { id },
      data: { bought: false, transactionId: null },
    });
  }

  await syncLinkedStatus(userId, "shopping", id, !item.bought);
  revalidateShopping(item.listId);
  revalidatePath("/money/transactions");
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
  await clearInboundLinks(userId, id);
  revalidateShopping(item.listId);
}

// Imports wishes and plan expense lines into this list as linked shopping items.
// Each new item keeps an origin pointer so its bought status mirrors the source.
// Sources already linked into this list are skipped. Returns how many were added.
export async function importToShoppingList(
  listId: string,
  sources: { type: "wish" | "plan"; id: string }[],
) {
  const userId = await requireUserId();
  const list = await prisma.shoppingList.findFirst({ where: { id: listId, userId } });
  if (!list) throw new Error("List not found");

  const wishIds = sources.filter((s) => s.type === "wish").map((s) => s.id);
  const planIds = sources.filter((s) => s.type === "plan").map((s) => s.id);
  const [wishes, lines, existing] = await Promise.all([
    wishIds.length
      ? prisma.wishlistItem.findMany({ where: { userId, id: { in: wishIds } } })
      : Promise.resolve([]),
    planIds.length
      ? prisma.budgetItem.findMany({ where: { userId, id: { in: planIds }, kind: "expense" } })
      : Promise.resolve([]),
    prisma.shoppingItem.findMany({
      where: { userId, listId, originId: { in: sources.map((s) => s.id) } },
      select: { originId: true },
    }),
  ]);

  const taken = new Set(existing.map((e) => e.originId));
  const rows: {
    userId: string;
    listId: string;
    name: string;
    price: number;
    quantity: number;
    originType: string;
    originId: string;
  }[] = [];
  for (const w of wishes) {
    if (taken.has(w.id)) continue;
    rows.push({ userId, listId, name: w.name, price: w.price, quantity: 1, originType: "wish", originId: w.id });
  }
  for (const p of lines) {
    if (taken.has(p.id)) continue;
    rows.push({ userId, listId, name: p.title ?? p.category, price: p.amount, quantity: 1, originType: "plan", originId: p.id });
  }
  if (rows.length) await prisma.shoppingItem.createMany({ data: rows });

  revalidateShopping(listId);
  revalidatePath("/money");
  return rows.length;
}
