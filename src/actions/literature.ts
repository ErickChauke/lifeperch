"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { destroyAsset } from "@/lib/cloudinary";
import { literatureSchema, type LiteratureInput } from "@/lib/literature";
import { normalizeTags } from "@/lib/notes";
import { sanitizeRichHtml } from "@/lib/rich-html";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
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

// Fetches the user's literature entries, newest first.
export async function getLit() {
  const userId = await requireUserId();
  return prisma.literature.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// Creates a literature entry.
export async function createLit(input: LiteratureInput) {
  const userId = await requireUserId();
  const data = literatureSchema.parse(input);
  await prisma.literature.create({ data: { userId, ...toRecord(data) } });
  revalidatePath("/literature");
}

// Updates a literature entry, scoped to the current user. When the uploaded PDF
// is replaced or removed, the old Cloudinary asset is cleaned up.
export async function updateLit(id: string, input: LiteratureInput) {
  const userId = await requireUserId();
  const data = literatureSchema.parse(input);
  const existing = await prisma.literature.findFirst({ where: { id, userId } });
  if (!existing) return;
  if (existing.publicId && existing.publicId !== data.publicId) {
    await destroyAsset(existing.publicId);
  }
  await prisma.literature.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidatePath("/literature");
}

// Deletes a literature entry and its uploaded PDF (if any).
export async function deleteLit(id: string) {
  const userId = await requireUserId();
  const lit = await prisma.literature.findFirst({ where: { id, userId } });
  if (!lit) return;
  if (lit.publicId) await destroyAsset(lit.publicId);
  await prisma.literature.deleteMany({ where: { id, userId } });
  revalidatePath("/literature");
}
