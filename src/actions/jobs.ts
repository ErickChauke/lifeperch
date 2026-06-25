"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  applicationSchema,
  stageNoteSchema,
  APP_STAGES,
  APP_OUTCOMES,
  type ApplicationInput,
  type StageNoteInput,
} from "@/lib/jobs";
import { randToCents, dayToDate } from "@/lib/money";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Maps validated form input to the fields stored on a JobApplication. The outcome
// only holds while in the outcome stage; value is stored in cents.
function toRecord(data: ApplicationInput) {
  const outcome = data.status === "outcome" ? data.outcome : null;
  return {
    organisation: data.organisation.trim(),
    position: data.position.trim(),
    location: data.location?.trim() || null,
    url: data.url?.trim() || null,
    description: data.description?.trim() || null,
    value: data.value == null ? null : randToCents(data.value),
    status: data.status,
    outcome,
    appliedDate: data.appliedDate ? dayToDate(data.appliedDate) : null,
    deadline: data.deadline ? dayToDate(data.deadline) : null,
  };
}

// Fetches the user's applications with their stage notes (newest note first),
// newest application first.
export async function getJobs() {
  const userId = await requireUserId();
  return prisma.jobApplication.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { stages: { orderBy: { createdAt: "desc" } } },
  });
}

// Creates an application for the current user.
export async function createJob(input: ApplicationInput) {
  const userId = await requireUserId();
  const data = applicationSchema.parse(input);
  await prisma.jobApplication.create({ data: { userId, ...toRecord(data) } });
  revalidatePath("/jobs");
}

// Updates an application, scoped to the current user.
export async function updateJob(id: string, input: ApplicationInput) {
  const userId = await requireUserId();
  const data = applicationSchema.parse(input);
  await prisma.jobApplication.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidatePath("/jobs");
}

// Deletes an application and its stage notes (cascade), scoped to the user.
export async function deleteJob(id: string) {
  const userId = await requireUserId();
  await prisma.jobApplication.deleteMany({ where: { id, userId } });
  revalidatePath("/jobs");
}

// Moves an application to a pipeline stage (the drag/segmented control). Leaving
// the outcome stage drops any result.
export async function moveJob(id: string, status: string) {
  const userId = await requireUserId();
  if (!APP_STAGES.includes(status as (typeof APP_STAGES)[number])) return;
  await prisma.jobApplication.updateMany({
    where: { id, userId },
    data: { status, ...(status === "outcome" ? {} : { outcome: null }) },
  });
  revalidatePath("/jobs");
}

// Sets the result on an application in the outcome stage. Pass null to clear it.
export async function setOutcome(id: string, outcome: string | null) {
  const userId = await requireUserId();
  if (outcome != null && !APP_OUTCOMES.includes(outcome as (typeof APP_OUTCOMES)[number])) return;
  await prisma.jobApplication.updateMany({ where: { id, userId }, data: { outcome } });
  revalidatePath("/jobs");
}

// Maps validated stage-note input to its stored fields.
function toStageRecord(data: StageNoteInput) {
  return {
    label: data.label.trim(),
    note: data.note.trim(),
    date: data.date ? dayToDate(data.date) : null,
  };
}

// Appends a stage note to an application, scoped so only the user's applications
// can be annotated.
export async function addStage(applicationId: string, input: StageNoteInput) {
  const userId = await requireUserId();
  const data = stageNoteSchema.parse(input);
  const app = await prisma.jobApplication.findFirst({ where: { id: applicationId, userId } });
  if (!app) throw new Error("Application not found");
  await prisma.appStage.create({ data: { userId, applicationId, ...toStageRecord(data) } });
  revalidatePath("/jobs");
}

// Updates a stage note, scoped to the current user.
export async function updateStage(id: string, input: StageNoteInput) {
  const userId = await requireUserId();
  const data = stageNoteSchema.parse(input);
  await prisma.appStage.updateMany({ where: { id, userId }, data: toStageRecord(data) });
  revalidatePath("/jobs");
}

// Deletes a stage note, scoped to the current user.
export async function deleteStage(id: string) {
  const userId = await requireUserId();
  await prisma.appStage.deleteMany({ where: { id, userId } });
  revalidatePath("/jobs");
}
