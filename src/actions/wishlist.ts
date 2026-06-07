"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { wishlistSchema, type WishlistInput } from "@/lib/wishlist";
import { randToCents } from "@/lib/money";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function revalidateMoney() {
  revalidatePath("/money");
  revalidatePath("/money/wishlist");
}

// Maps validated form input to the fields stored on a WishlistItem.
function toRecord(data: WishlistInput) {
  return {
    name: data.name.trim(),
    price: randToCents(data.price),
    priority: data.priority,
    category: data.category,
    note: data.note?.trim() || null,
  };
}

// Fetches the current user's wishes, newest first (the board sorts by priority).
export async function getWishes() {
  const userId = await requireUserId();
  return prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// Creates a wish for the current user.
export async function createWish(input: WishlistInput) {
  const userId = await requireUserId();
  const data = wishlistSchema.parse(input);
  await prisma.wishlistItem.create({ data: { userId, ...toRecord(data) } });
  revalidateMoney();
}

// Updates a wish, scoped to the current user.
export async function updateWish(id: string, input: WishlistInput) {
  const userId = await requireUserId();
  const data = wishlistSchema.parse(input);
  await prisma.wishlistItem.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidateMoney();
}

// Deletes a wish, scoped to the current user.
export async function deleteWish(id: string) {
  const userId = await requireUserId();
  await prisma.wishlistItem.deleteMany({ where: { id, userId } });
  revalidateMoney();
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
  revalidateMoney();
  revalidatePath("/money/goals");
}
