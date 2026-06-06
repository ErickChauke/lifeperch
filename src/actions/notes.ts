"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { noteSchema, normalizeTags, displayTitle, type NoteInput } from "@/lib/notes";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Maps validated form input to the fields stored on a Note.
function toRecord(data: NoteInput) {
  return {
    title: displayTitle(data.title),
    body: data.body,
    tags: normalizeTags(data.tags),
  };
}

// Fetches the current user's notes, newest first. An optional tag list narrows
// to notes carrying every selected tag.
export async function getNotes(tags?: string[]) {
  const userId = await requireUserId();
  const active = normalizeTags(tags ?? []);
  return prisma.note.findMany({
    where: { userId, ...(active.length ? { tags: { hasEvery: active } } : {}) },
    orderBy: { updatedAt: "desc" },
  });
}

// Creates a new note for the current user.
export async function createNote(input: NoteInput) {
  const userId = await requireUserId();
  const data = noteSchema.parse(input);
  const note = await prisma.note.create({ data: { userId, ...toRecord(data) } });
  revalidatePath("/notes");
  return note;
}

// Updates a note, scoped to the current user so others cannot be touched.
export async function updateNote(id: string, input: NoteInput) {
  const userId = await requireUserId();
  const data = noteSchema.parse(input);
  await prisma.note.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidatePath("/notes");
}

// Deletes a note, scoped to the current user.
export async function deleteNote(id: string) {
  const userId = await requireUserId();
  await prisma.note.deleteMany({ where: { id, userId } });
  revalidatePath("/notes");
}
