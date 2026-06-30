"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { dayToDate } from "@/lib/money";
import { healthNoteSchema, type HealthNoteInput } from "@/lib/health";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Maps validated input to the fields stored on a HealthNote.
function toRecord(data: HealthNoteInput) {
  return { date: dayToDate(data.date), body: data.body.trim() };
}

// Fetches the user's health-journal notes, newest day first.
export async function getHealthNotes() {
  const userId = await requireUserId();
  return prisma.healthNote.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

// Creates a note for the current user.
export async function createHealthNote(input: HealthNoteInput) {
  const userId = await requireUserId();
  const data = healthNoteSchema.parse(input);
  await prisma.healthNote.create({ data: { userId, ...toRecord(data) } });
  revalidatePath("/health");
}

// Updates a note, scoped to the current user.
export async function updateHealthNote(id: string, input: HealthNoteInput) {
  const userId = await requireUserId();
  const data = healthNoteSchema.parse(input);
  await prisma.healthNote.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidatePath("/health");
}

// Deletes a note, scoped to the current user.
export async function deleteHealthNote(id: string) {
  const userId = await requireUserId();
  await prisma.healthNote.deleteMany({ where: { id, userId } });
  revalidatePath("/health");
}
