"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { dayToDate, dateToDay } from "@/lib/money";
import { medicineSchema, type MedicineInput } from "@/lib/health";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Maps validated input to the fields stored on a Medicine.
function toRecord(data: MedicineInput) {
  return {
    name: data.name.trim(),
    dose: data.dose?.trim() || null,
    schedule: data.schedule?.trim() || null,
    active: data.active,
    linkedModule: data.linkedModule,
    linkedId: data.linkedId,
    linkedLabel: data.linkedLabel?.trim() || null,
  };
}

// Fetches the user's medicines with a takenToday flag from today's log. Active
// first, then by manual order.
export async function getMedicines() {
  const userId = await requireUserId();
  const today = dayToDate(dateToDay(new Date()));
  const medicines = await prisma.medicine.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { order: "asc" }, { createdAt: "asc" }],
    include: { logs: { where: { date: today }, select: { id: true } } },
  });
  return medicines.map(({ logs, ...rest }) => ({
    ...rest,
    takenToday: logs.length > 0,
  }));
}

// Creates a medicine for the current user.
export async function createMedicine(input: MedicineInput) {
  const userId = await requireUserId();
  const data = medicineSchema.parse(input);
  await prisma.medicine.create({ data: { userId, ...toRecord(data) } });
  revalidatePath("/health");
}

// Updates a medicine, scoped to the current user.
export async function updateMedicine(id: string, input: MedicineInput) {
  const userId = await requireUserId();
  const data = medicineSchema.parse(input);
  await prisma.medicine.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidatePath("/health");
}

// Deletes a medicine (its logs cascade), scoped to the current user.
export async function deleteMedicine(id: string) {
  const userId = await requireUserId();
  await prisma.medicine.deleteMany({ where: { id, userId } });
  revalidatePath("/health");
}

// Marks a medicine taken (or not) for a day. The log row's presence is the mark,
// so taken upserts one row and not-taken removes it. Scoped to the owner.
export async function setMedicineTaken(
  medicineId: string,
  day: string,
  taken: boolean,
) {
  const userId = await requireUserId();
  const med = await prisma.medicine.findFirst({
    where: { id: medicineId, userId },
    select: { id: true },
  });
  if (!med) return;
  const date = dayToDate(day);
  if (taken) {
    await prisma.medicineLog.upsert({
      where: { medicineId_date: { medicineId, date } },
      create: { userId, medicineId, date },
      update: {},
    });
  } else {
    await prisma.medicineLog.deleteMany({ where: { medicineId, date, userId } });
  }
  revalidatePath("/health");
}
