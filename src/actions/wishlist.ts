"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  collectionSchema,
  wishlistSchema,
  type CollectionInput,
  type WishlistInput,
} from "@/lib/wishlist";
import { randToCents, dayToDate, dateToDay } from "@/lib/money";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Revalidates the overview, the dashboard hub, and (optionally) a collection.
function revalidateWishlist(collectionId?: string) {
  revalidatePath("/money");
  revalidatePath("/money/wishlist");
  if (collectionId) revalidatePath(`/money/wishlist/${collectionId}`);
}

// Fetches the user's collections with their wishes, newest collection first.
export async function getCollections() {
  const userId = await requireUserId();
  return prisma.wishlistCollection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: { orderBy: { createdAt: "desc" } } },
  });
}

// Fetches one collection with its wishes, or null if it is not the user's.
export async function getCollection(id: string) {
  const userId = await requireUserId();
  return prisma.wishlistCollection.findFirst({
    where: { id, userId },
    include: { items: { orderBy: { createdAt: "desc" } } },
  });
}

// Creates a collection and returns it so the UI can open its (empty) detail.
export async function createCollection(input: CollectionInput) {
  const userId = await requireUserId();
  const data = collectionSchema.parse(input);
  const collection = await prisma.wishlistCollection.create({
    data: { userId, title: data.title.trim(), category: data.category },
  });
  revalidateWishlist(collection.id);
  return collection;
}

// Renames a collection, scoped to the current user.
export async function renameCollection(id: string, title: string) {
  const userId = await requireUserId();
  const clean = title.trim();
  if (!clean) return;
  await prisma.wishlistCollection.updateMany({ where: { id, userId }, data: { title: clean } });
  revalidateWishlist(id);
}

// Deletes a collection and its wishes (cascade), scoped to the current user.
export async function deleteCollection(id: string) {
  const userId = await requireUserId();
  await prisma.wishlistCollection.deleteMany({ where: { id, userId } });
  revalidateWishlist();
}

// Maps validated form input to the fields stored on a WishlistItem.
function toRecord(data: WishlistInput) {
  return {
    name: data.name.trim(),
    price: randToCents(data.price),
    priority: data.priority,
    note: data.note?.trim() || null,
  };
}

// Adds a wish to a collection. The category comes from the collection.
export async function createWish(collectionId: string, input: WishlistInput) {
  const userId = await requireUserId();
  const data = wishlistSchema.parse(input);
  const collection = await prisma.wishlistCollection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!collection) throw new Error("Collection not found");
  await prisma.wishlistItem.create({
    data: { userId, collectionId, ...toRecord(data) },
  });
  revalidateWishlist(collectionId);
}

// Updates a wish, scoped to the current user. When the wish is already bought, its
// logged transaction is kept in step: the amount/description follow the edit, and
// crossing to or from a free (price 0) wish creates or removes the transaction.
export async function updateWish(id: string, input: WishlistInput) {
  const userId = await requireUserId();
  const data = wishlistSchema.parse(input);
  const wish = await prisma.wishlistItem.findFirst({
    where: { id, userId },
    include: { collection: { select: { category: true } } },
  });
  if (!wish) return;
  const record = toRecord(data);
  await prisma.wishlistItem.updateMany({ where: { id, userId }, data: record });

  if (wish.completed) {
    const price = record.price;
    const category = wish.collection.category;
    const description = record.note || record.name;
    if (price > 0 && wish.transactionId) {
      await prisma.transaction.updateMany({
        where: { id: wish.transactionId, userId },
        data: { amount: price, category, description },
      });
    } else if (price > 0 && !wish.transactionId) {
      const txn = await prisma.transaction.create({
        data: {
          userId,
          type: "expense",
          amount: price,
          category,
          description,
          date: dayToDate(dateToDay(new Date())),
        },
      });
      await prisma.wishlistItem.update({ where: { id }, data: { transactionId: txn.id } });
    } else if (price === 0 && wish.transactionId) {
      await prisma.transaction.deleteMany({ where: { id: wish.transactionId, userId } });
      await prisma.wishlistItem.update({ where: { id }, data: { transactionId: null } });
    }
    revalidatePath("/money/transactions");
  }

  revalidateWishlist(wish.collectionId);
}

// Deletes a wish, scoped to the current user. Removes the transaction it logged
// when bought so no orphan is left behind.
export async function deleteWish(id: string) {
  const userId = await requireUserId();
  const wish = await prisma.wishlistItem.findFirst({ where: { id, userId } });
  if (!wish) return;
  if (wish.transactionId) {
    await prisma.transaction.deleteMany({ where: { id: wish.transactionId, userId } });
  }
  await prisma.wishlistItem.deleteMany({ where: { id, userId } });
  revalidateWishlist(wish.collectionId);
  revalidatePath("/money/transactions");
}

// Toggles a wish as bought. Marking it bought logs an expense transaction in the
// list's category (so the spend shows in the transactions log) and greys the
// card; un-marking removes that transaction. A free wish (price 0) just flips the
// flag with nothing to log.
export async function toggleWishComplete(id: string) {
  const userId = await requireUserId();
  const wish = await prisma.wishlistItem.findFirst({
    where: { id, userId },
    include: { collection: { select: { category: true } } },
  });
  if (!wish) return;

  if (!wish.completed) {
    let transactionId: string | null = null;
    if (wish.price > 0) {
      const txn = await prisma.transaction.create({
        data: {
          userId,
          type: "expense",
          amount: wish.price,
          category: wish.collection.category,
          description: wish.note?.trim() || wish.name,
          date: dayToDate(dateToDay(new Date())),
        },
      });
      transactionId = txn.id;
    }
    await prisma.wishlistItem.update({
      where: { id },
      data: { completed: true, transactionId },
    });
  } else {
    if (wish.transactionId) {
      await prisma.transaction.deleteMany({ where: { id: wish.transactionId, userId } });
    }
    await prisma.wishlistItem.update({
      where: { id },
      data: { completed: false, transactionId: null },
    });
  }

  revalidateWishlist(wish.collectionId);
  revalidatePath("/money/transactions");
}

// Turns a wish into a savings goal (target = the wish price), linked by name.
// Skips creation if a goal of that name already exists, so repeat taps are safe.
export async function saveForWish(id: string) {
  const userId = await requireUserId();
  const wish = await prisma.wishlistItem.findFirst({ where: { id, userId } });
  if (!wish) return;
  const existing = await prisma.savingsGoal.findFirst({
    where: { userId, name: wish.name },
  });
  if (!existing) {
    await prisma.savingsGoal.create({
      data: {
        userId,
        name: wish.name,
        targetAmount: wish.price,
        currentAmount: 0,
        monthlyAmount: 0,
      },
    });
  }
  revalidateWishlist(wish.collectionId);
  revalidatePath("/money/goals");
}
