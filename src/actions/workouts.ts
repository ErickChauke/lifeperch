"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { dayToDate } from "@/lib/money";
import {
  workoutRoutineSchema,
  workoutSessionSchema,
  type WorkoutRoutineInput,
  type WorkoutSessionInput,
} from "@/lib/health";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Maps validated routine input to the nested exercise create payload, numbering
// exercises by their form order so the saved order is stable.
function toExercisesCreate(userId: string, data: WorkoutRoutineInput) {
  return data.exercises.map((ex, i) => ({
    userId,
    name: ex.name.trim(),
    sets: ex.sets,
    reps: ex.reps,
    weight: ex.weight,
    notes: ex.notes?.trim() || null,
    order: i,
  }));
}

// Fetches the user's routines with their exercises, in saved order. Active first.
export async function getRoutines() {
  const userId = await requireUserId();
  return prisma.workoutRoutine.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: { exercises: { orderBy: { order: "asc" } } },
  });
}

// Creates a routine with its exercises for the current user.
export async function createRoutine(input: WorkoutRoutineInput) {
  const userId = await requireUserId();
  const data = workoutRoutineSchema.parse(input);
  await prisma.workoutRoutine.create({
    data: {
      userId,
      name: data.name.trim(),
      notes: data.notes?.trim() || null,
      active: data.active,
      linkedModule: data.linkedModule,
      linkedId: data.linkedId,
      linkedLabel: data.linkedLabel?.trim() || null,
      exercises: { create: toExercisesCreate(userId, data) },
    },
  });
  revalidatePath("/health");
}

// Updates a routine and rebuilds its exercises from the form. Scoped to the owner.
export async function updateRoutine(id: string, input: WorkoutRoutineInput) {
  const userId = await requireUserId();
  const data = workoutRoutineSchema.parse(input);
  const routine = await prisma.workoutRoutine.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!routine) return;
  await prisma.$transaction([
    prisma.routineExercise.deleteMany({ where: { routineId: id, userId } }),
    prisma.workoutRoutine.update({
      where: { id },
      data: {
        name: data.name.trim(),
        notes: data.notes?.trim() || null,
        active: data.active,
        linkedModule: data.linkedModule,
        linkedId: data.linkedId,
        linkedLabel: data.linkedLabel?.trim() || null,
        exercises: { create: toExercisesCreate(userId, data) },
      },
    }),
  ]);
  revalidatePath("/health");
}

// Deletes a routine (exercises cascade; sessions keep their history with a null
// routine). Scoped to the current user.
export async function deleteRoutine(id: string) {
  const userId = await requireUserId();
  await prisma.workoutRoutine.deleteMany({ where: { id, userId } });
  revalidatePath("/health");
}

// Maps validated session input to its stored fields.
function toSessionRecord(data: WorkoutSessionInput) {
  return {
    date: dayToDate(data.date),
    routineId: data.routineId,
    name: data.name.trim(),
    durationMin: data.durationMin,
    notes: data.notes?.trim() || null,
    linkedModule: data.linkedModule,
    linkedId: data.linkedId,
    linkedLabel: data.linkedLabel?.trim() || null,
  };
}

// Fetches the user's sessions, newest first, with the linked routine's name.
export async function getSessions() {
  const userId = await requireUserId();
  return prisma.workoutSession.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { routine: { select: { id: true, name: true } } },
  });
}

// Creates a session for the current user.
export async function createSession(input: WorkoutSessionInput) {
  const userId = await requireUserId();
  const data = workoutSessionSchema.parse(input);
  await prisma.workoutSession.create({ data: { userId, ...toSessionRecord(data) } });
  revalidatePath("/health");
}

// Updates a session, scoped to the current user.
export async function updateSession(id: string, input: WorkoutSessionInput) {
  const userId = await requireUserId();
  const data = workoutSessionSchema.parse(input);
  await prisma.workoutSession.updateMany({
    where: { id, userId },
    data: toSessionRecord(data),
  });
  revalidatePath("/health");
}

// Deletes a session, scoped to the current user.
export async function deleteSession(id: string) {
  const userId = await requireUserId();
  await prisma.workoutSession.deleteMany({ where: { id, userId } });
  revalidatePath("/health");
}
