"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  noteSchema,
  noteCollectionSchema,
  attachmentSchema,
  normalizeTags,
  displayTitle,
  type NoteInput,
  type NoteCollectionInput,
  type AttachmentInput,
} from "@/lib/notes";
import { sanitizeRichHtml } from "@/lib/rich-html";
import { destroyAsset, signedFileUrl } from "@/lib/cloudinary";

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

// Fetches the user's most recently edited notes across all notebooks, for the
// dashboard.
export async function getRecentNotes(take = 4) {
  const userId = await requireUserId();
  return prisma.note.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      collectionId: true,
      collection: { select: { title: true } },
    },
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
    include: { attachments: { orderBy: { createdAt: "asc" } } },
  });
  return {
    ...collection,
    notes: notes.map((note) => ({
      ...note,
      attachments: note.attachments.map((a) => ({ ...a, url: signedFileUrl(a.url) })),
    })),
  };
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

// Deletes a note, scoped to the current user. Its attachments' Cloudinary assets
// are destroyed first so nothing is orphaned; the rows cascade with the note.
export async function deleteNote(id: string) {
  const userId = await requireUserId();
  const existing = await prisma.note.findFirst({
    where: { id, userId },
    include: { attachments: true },
  });
  if (!existing) return;
  for (const attachment of existing.attachments) {
    await destroyAsset(attachment.publicId);
  }
  await prisma.note.deleteMany({ where: { id, userId } });
  revalidateNotes(existing.collectionId);
}

// --- Attachments ---

// Records a file (already uploaded to Cloudinary) against a note the user owns and
// returns the created row so the UI can append it without a refetch.
export async function addNoteAttachment(noteId: string, input: AttachmentInput) {
  const userId = await requireUserId();
  const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
  if (!note) throw new Error("Note not found");
  const data = attachmentSchema.parse(input);
  const attachment = await prisma.noteAttachment.create({
    data: { userId, noteId, ...data },
  });
  revalidateNotes(note.collectionId);
  return { ...attachment, url: signedFileUrl(attachment.url) };
}

// Deletes an attachment and its Cloudinary asset, scoped to the current user.
export async function deleteNoteAttachment(id: string) {
  const userId = await requireUserId();
  const attachment = await prisma.noteAttachment.findFirst({
    where: { id, userId },
    include: { note: { select: { collectionId: true } } },
  });
  if (!attachment) return;
  await destroyAsset(attachment.publicId);
  await prisma.noteAttachment.delete({ where: { id } });
  revalidateNotes(attachment.note.collectionId);
}
