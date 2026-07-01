"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  entrySchema,
  attachmentSchema,
  dayToDate,
  type EntryInput,
  type AttachmentInput,
} from "@/lib/journal";
import { sanitizeRichHtml } from "@/lib/rich-html";
import { destroyAsset } from "@/lib/cloudinary";

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
    body: data.bodyFormat === "html" ? sanitizeRichHtml(data.body) : data.body,
    bodyFormat: data.bodyFormat,
    mood: data.mood,
  };
}

// Fetches the current user's entries, newest day first.
export async function getEntries() {
  const userId = await requireUserId();
  return prisma.dailyEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: { attachments: { orderBy: { createdAt: "asc" } } },
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
  const entry = await prisma.dailyEntry.create({
    data: { userId, date: dayToDate(data.date), ...toRecord(data) },
  });
  revalidatePath("/journal");
  return entry;
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

// Deletes the entry for a day and destroys its Cloudinary assets first, then
// lets the cascade remove the attachment rows.
export async function deleteEntry(day: string) {
  const userId = await requireUserId();
  const entry = await prisma.dailyEntry.findFirst({
    where: { userId, date: dayToDate(day) },
    include: { attachments: true },
  });
  if (!entry) return;
  for (const attachment of entry.attachments) {
    await destroyAsset(attachment.publicId);
  }
  await prisma.dailyEntry.deleteMany({ where: { id: entry.id, userId } });
  revalidatePath("/journal");
}

// Attaches an uploaded file to an entry, scoped to the current user.
export async function addJournalAttachment(
  entryId: string,
  input: AttachmentInput,
) {
  const userId = await requireUserId();
  const entry = await prisma.dailyEntry.findFirst({
    where: { id: entryId, userId },
  });
  if (!entry) throw new Error("Entry not found");
  const data = attachmentSchema.parse(input);
  const attachment = await prisma.dailyEntryAttachment.create({
    data: { userId, entryId, ...data },
  });
  revalidatePath("/journal");
  return attachment;
}

// Removes an attachment and destroys its Cloudinary asset.
export async function deleteJournalAttachment(id: string) {
  const userId = await requireUserId();
  const attachment = await prisma.dailyEntryAttachment.findFirst({
    where: { id, userId },
  });
  if (!attachment) return;
  await destroyAsset(attachment.publicId);
  await prisma.dailyEntryAttachment.delete({ where: { id } });
  revalidatePath("/journal");
}
