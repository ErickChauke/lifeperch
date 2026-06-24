"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  noteSchema,
  noteCollectionSchema,
  normalizeTags,
  displayTitle,
  type NoteInput,
  type NoteCollectionInput,
} from "@/lib/notes";
import { sanitizeRichHtml } from "@/lib/rich-html";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function revalidateNotes(id?: string) {
  revalidatePath("/notes");
  if (id) revalidatePath(`/notes/${id}`);
}

// Maps validated form input to the fields stored on a Note. Rich html bodies are
// sanitized here so unsafe markup never reaches the database.
function toRecord(data: NoteInput) {
  return {
    title: displayTitle(data.title),
    body: data.bodyFormat === "html" ? sanitizeRichHtml(data.body) : data.body,
    bodyFormat: data.bodyFormat,
    tags: normalizeTags(data.tags),
  };
}

// --- Notebooks (collections) ---

// Fetches the user's notebooks, newest first, with their note counts.
export async function getCollections() {
  const userId = await requireUserId();
  return prisma.noteCollection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { notes: true } } },
  });
}

// Fetches one notebook and its notes (most recently edited first), scoped.
export async function getCollection(id: string) {
  const userId = await requireUserId();
  const collection = await prisma.noteCollection.findFirst({
    where: { id, userId },
  });
  if (!collection) return null;
  const notes = await prisma.note.findMany({
    where: { userId, collectionId: id },
    orderBy: { updatedAt: "desc" },
  });
  return { ...collection, notes };
}

// Creates a notebook and returns it so the UI can navigate into it.
export async function createCollection(input: NoteCollectionInput) {
  const userId = await requireUserId();
  const data = noteCollectionSchema.parse(input);
  const collection = await prisma.noteCollection.create({
    data: {
      userId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
    },
  });
  revalidateNotes(collection.id);
  return collection;
}

// Renames a notebook.
export async function renameCollection(id: string, title: string) {
  const userId = await requireUserId();
  const clean = title.trim();
  if (!clean) return;
  await prisma.noteCollection.updateMany({
    where: { id, userId },
    data: { title: clean },
  });
  revalidateNotes(id);
}

// Updates a notebook's description (empty clears it).
export async function updateCollectionDescription(id: string, description: string) {
  const userId = await requireUserId();
  await prisma.noteCollection.updateMany({
    where: { id, userId },
    data: { description: description.trim() || null },
  });
  revalidateNotes(id);
}

// Deletes a notebook and its notes.
export async function deleteCollection(id: string) {
  const userId = await requireUserId();
  await prisma.noteCollection.deleteMany({ where: { id, userId } });
  revalidateNotes();
}

// --- Notes ---

// Creates a new note inside a notebook the user owns.
export async function createNote(collectionId: string, input: NoteInput) {
  const userId = await requireUserId();
  const collection = await prisma.noteCollection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!collection) throw new Error("Notebook not found");
  const data = noteSchema.parse(input);
  const note = await prisma.note.create({
    data: { userId, collectionId, ...toRecord(data) },
  });
  revalidateNotes(collectionId);
  return note;
}

// Updates a note, scoped to the current user so others cannot be touched.
export async function updateNote(id: string, input: NoteInput) {
  const userId = await requireUserId();
  const data = noteSchema.parse(input);
  const existing = await prisma.note.findFirst({ where: { id, userId } });
  if (!existing) return;
  await prisma.note.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidateNotes(existing.collectionId);
}

// Deletes a note, scoped to the current user.
export async function deleteNote(id: string) {
  const userId = await requireUserId();
  const existing = await prisma.note.findFirst({ where: { id, userId } });
  if (!existing) return;
  await prisma.note.deleteMany({ where: { id, userId } });
  revalidateNotes(existing.collectionId);
}
