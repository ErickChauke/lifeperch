"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { eventSchema, typeColor, type EventInput } from "@/lib/timetable";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Maps validated form input to the fields stored on a TimetableEvent.
function toRecord(data: EventInput) {
  return {
    title: data.title,
    type: data.type,
    color: typeColor(data.type),
    startTime: data.startTime,
    endTime: data.endTime,
    isRecurring: data.isRecurring,
    dayOfWeek: data.isRecurring ? data.dayOfWeek : null,
    specificDate:
      !data.isRecurring && data.specificDate ? new Date(data.specificDate) : null,
    location: data.location || null,
    notes: data.notes || null,
  };
}

// Fetches all timetable events for the current user.
export async function getEvents() {
  const userId = await requireUserId();
  return prisma.timetableEvent.findMany({
    where: { userId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

// Creates a new event for the current user.
export async function createEvent(input: EventInput) {
  const userId = await requireUserId();
  const data = eventSchema.parse(input);
  await prisma.timetableEvent.create({
    data: { userId, ...toRecord(data) },
  });
  revalidatePath("/timetable");
}

// Updates an event, scoped to the current user so others cannot be touched.
export async function updateEvent(id: string, input: EventInput) {
  const userId = await requireUserId();
  const data = eventSchema.parse(input);
  await prisma.timetableEvent.updateMany({
    where: { id, userId },
    data: toRecord(data),
  });
  revalidatePath("/timetable");
}

// Deletes an event, scoped to the current user.
export async function deleteEvent(id: string) {
  const userId = await requireUserId();
  await prisma.timetableEvent.deleteMany({ where: { id, userId } });
  revalidatePath("/timetable");
}
