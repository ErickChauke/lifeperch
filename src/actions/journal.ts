"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { entrySchema, dayToDate, type EntryInput } from "@/lib/journal";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Maps validated input to the fields stored on a DailyEntry (date excluded:
// it is the key and is set when locating the row).
function toRecord(data: EntryInput) {
  return {
    title: data.title?.trim() || null,
    body: data.body,
    mood: data.mood,
  };
}

// Fetches the current user's entries, newest day first.
export async function getEntries() {
  const userId = await requireUserId();
  return prisma.dailyEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
}

// Fetches the single entry for a given "yyyy-MM-dd" day, or null if unwritten.
export async function getEntryByDate(day: string) {
  const userId = await requireUserId();
  return prisma.dailyEntry.findUnique({
    where: { userId_date: { userId, date: dayToDate(day) } },
  });
}

// Creates the entry for a day. There is one entry per day, enforced by the
// unique (userId, date) index.
export async function createEntry(input: EntryInput) {
  const userId = await requireUserId();
  const data = entrySchema.parse(input);
  await prisma.dailyEntry.create({
    data: { userId, date: dayToDate(data.date), ...toRecord(data) },
  });
  revalidatePath("/journal");
}

// Updates the existing entry for a day, scoped to the current user.
export async function updateEntry(input: EntryInput) {
  const userId = await requireUserId();
  const data = entrySchema.parse(input);
  await prisma.dailyEntry.updateMany({
    where: { userId, date: dayToDate(data.date) },
    data: toRecord(data),
  });
  revalidatePath("/journal");
}
