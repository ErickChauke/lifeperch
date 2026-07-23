"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isCleanupDays } from "@/lib/todo";
import { cleanupCompletedTodos } from "@/lib/todo-cleanup";
import { wipeUserData } from "@/lib/wipe";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

const digestSchema = z.boolean();

// null is the "Never" option; any other value must be one the form offers.
const cleanupSchema = z
  .number()
  .int()
  .refine(isCleanupDays, "Unsupported retention window")
  .nullable();

// Revalidates every surface a cleanup changes the contents of.
function revalidateTodoSurfaces() {
  revalidatePath("/todo");
  revalidatePath("/dashboard");
  revalidatePath("/timetable");
}

// Returns the signed-in user's profile and preferences for the settings page.
export async function getSettings() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      image: true,
      createdAt: true,
      dailyDigest: true,
      todoCleanupDays: true,
    },
  });
  if (!user) throw new Error("User not found");
  return user;
}

// Turns the morning digest on or off. The cron reads this field, so switching it
// off stops tomorrow's send.
export async function setDailyDigest(enabled: boolean) {
  const userId = await requireUserId();
  const dailyDigest = digestSchema.parse(enabled);
  await prisma.user.update({ where: { id: userId }, data: { dailyDigest } });
  revalidatePath("/settings");
}

// Sets how long finished todos are kept, then applies it straight away so the
// change is visible without waiting for the nightly pass. Returns how many were
// removed so the UI can say.
export async function setTodoCleanupDays(days: number | null) {
  const userId = await requireUserId();
  const todoCleanupDays = cleanupSchema.parse(days);
  await prisma.user.update({ where: { id: userId }, data: { todoCleanupDays } });
  const removed = await cleanupCompletedTodos(userId, todoCleanupDays);
  revalidatePath("/settings");
  if (removed > 0) revalidateTodoSurfaces();
  return removed;
}

// Runs the retention pass on demand, for the "Clean up now" button.
export async function runTodoCleanup() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { todoCleanupDays: true },
  });
  const removed = await cleanupCompletedTodos(userId, user?.todoCleanupDays ?? null);
  if (removed > 0) revalidateTodoSurfaces();
  return removed;
}

// The word the danger zone asks to be typed out. Checked here as well as in the
// form, so the confirmation cannot be skipped by calling the action directly.
const CONFIRM_WORD = "DELETE";
const confirmSchema = z.literal(CONFIRM_WORD, "Type DELETE to confirm");

// Deletes every record across every module for this account. Irreversible: there
// is no soft delete and no backup. The account itself and these settings stay,
// so the app still opens, empty.
export async function wipeAllData(confirmation: string) {
  const userId = await requireUserId();
  confirmSchema.parse(confirmation);
  const removed = await wipeUserData(userId);
  // Every module page is now stale.
  revalidatePath("/", "layout");
  return removed;
}
