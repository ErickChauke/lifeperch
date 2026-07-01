"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { destroyAsset } from "@/lib/cloudinary";
import {
  literatureSchema,
  litCollectionSchema,
  type LiteratureInput,
  type LitCollectionInput,
} from "@/lib/literature";
import { normalizeTags } from "@/lib/notes";
import { sanitizeRichHtml } from "@/lib/rich-html";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

function revalidateLit(id?: string) {
  revalidatePath("/literature");
  if (id) revalidatePath(`/literature/${id}`);
}

// Maps validated input to the fields stored on a Literature row.
function toRecord(data: LiteratureInput) {
  return {
    title: data.title.trim(),
    authors: data.authors.trim(),
    year: data.year,
    status: data.status,
    url: data.url?.trim() || null,
    fileUrl: data.fileUrl || null,
    publicId: data.publicId || null,
    notes: data.notesFormat === "html" ? sanitizeRichHtml(data.notes) : data.notes,
    notesFormat: data.notesFormat,
    tags: normalizeTags(data.tags),
  };
}

// --- Topics (collections) ---

// Fetches the user's topics, newest first, with their paper counts.
export async function getCollections() {
  const userId = await requireUserId();
  return prisma.literatureCollection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { papers: true } } },
  });
}

// Fetches the papers the user is currently reading, most recently touched first,
// for the dashboard.
export async function getReading(take = 5) {
  const userId = await requireUserId();
  return prisma.literature.findMany({
    where: { userId, status: "reading" },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      authors: true,
      collectionId: true,
    },
  });
}

// Fetches one topic and its papers (newest first), scoped to the user.
export async function getCollection(id: string) {
  const userId = await requireUserId();
  const collection = await prisma.literatureCollection.findFirst({
    where: { id, userId },
  });
  if (!collection) return null;
  const papers = await prisma.literature.findMany({
    where: { userId, collectionId: id },
    orderBy: { createdAt: "desc" },
  });
  return { ...collection, papers };
}

// Creates a topic and returns it so the UI can navigate into it.
export async function createCollection(input: LitCollectionInput) {
  const userId = await requireUserId();
  const data = litCollectionSchema.parse(input);
  const collection = await prisma.literatureCollection.create({
    data: {
      userId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
    },
  });
  revalidateLit(collection.id);
  return collection;
}

// Renames a topic.
export async function renameCollection(id: string, title: string) {
  const userId = await requireUserId();
  const clean = title.trim();
  if (!clean) return;
  await prisma.literatureCollection.updateMany({
    where: { id, userId },
    data: { title: clean },
  });
  revalidateLit(id);
}

// Updates a topic's description (empty clears it).
export async function updateCollectionDescription(id: string, description: string) {
  const userId = await requireUserId();
  await prisma.literatureCollection.updateMany({
    where: { id, userId },
    data: { description: description.trim() || null },
  });
  revalidateLit(id);
}

// Deletes a topic, its papers, and their uploaded PDFs.
export async function deleteCollection(id: string) {
  const userId = await requireUserId();
  const collection = await prisma.literatureCollection.findFirst({
    where: { id, userId },
  });
  if (!collection) return;
  const papers = await prisma.literature.findMany({
    where: { userId, collectionId: id },
  });
  for (const paper of papers) {
    if (paper.publicId) await destroyAsset(paper.publicId);
  }
  await prisma.literatureCollection.deleteMany({ where: { id, userId } });
  revalidateLit();
}

// --- Papers ---

// Creates a paper inside a topic the user owns.
export async function createLit(collectionId: string, input: LiteratureInput) {
  const userId = await requireUserId();
  const collection = await prisma.literatureCollection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!collection) throw new Error("Topic not found");
  const data = literatureSchema.parse(input);
  await prisma.literature.create({
    data: { userId, collectionId, ...toRecord(data) },
  });
  revalidateLit(collectionId);
}

// Updates a paper, scoped to the current user. When the uploaded PDF is replaced
// or removed, the old Cloudinary asset is cleaned up.
export async function updateLit(id: string, input: LiteratureInput) {
  const userId = await requireUserId();
  const data = literatureSchema.parse(input);
  const existing = await prisma.literature.findFirst({ where: { id, userId } });
  if (!existing) return;
  if (existing.publicId && existing.publicId !== data.publicId) {
    await destroyAsset(existing.publicId);
  }
  await prisma.literature.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidateLit(existing.collectionId);
}

// Deletes a paper and its uploaded PDF (if any).
export async function deleteLit(id: string) {
  const userId = await requireUserId();
  const lit = await prisma.literature.findFirst({ where: { id, userId } });
  if (!lit) return;
  if (lit.publicId) await destroyAsset(lit.publicId);
  await prisma.literature.deleteMany({ where: { id, userId } });
  revalidateLit(lit.collectionId);
}
