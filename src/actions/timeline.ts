"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { milestoneSchema, type MilestoneInput } from "@/lib/timeline";
import { dayToDate } from "@/lib/money";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Resolves a track name to a Timeline id for the user, creating the track on
// first use. Returns null for an untracked milestone.
async function resolveTimelineId(userId: string, track: string | null): Promise<string | null> {
  if (!track) return null;
  const timeline = await prisma.timeline.upsert({
    where: { userId_name: { userId, name: track } },
    create: { userId, name: track },
    update: {},
  });
  return timeline.id;
}

// Fetches the user's milestones with their track, soonest target date first.
export async function getMilestones() {
  const userId = await requireUserId();
  return prisma.milestone.findMany({
    where: { userId },
    orderBy: { targetDate: "asc" },
    include: { timeline: true },
  });
}

// Maps validated form input to the stored milestone fields.
function toRecord(data: MilestoneInput) {
  return {
    title: data.title.trim(),
    description: data.description?.trim() || null,
    targetDate: dayToDate(data.targetDate),
    status: data.status,
  };
}

// Creates a milestone for the current user, linking its track if one is set.
export async function createMilestone(input: MilestoneInput) {
  const userId = await requireUserId();
  const data = milestoneSchema.parse(input);
  const timelineId = await resolveTimelineId(userId, data.track);
  await prisma.milestone.create({ data: { userId, timelineId, ...toRecord(data) } });
  revalidatePath("/timeline");
}

// Updates a milestone, scoped to the current user, re-resolving its track.
export async function updateMilestone(id: string, input: MilestoneInput) {
  const userId = await requireUserId();
  const data = milestoneSchema.parse(input);
  const timelineId = await resolveTimelineId(userId, data.track);
  await prisma.milestone.updateMany({
    where: { id, userId },
    data: { timelineId, ...toRecord(data) },
  });
  revalidatePath("/timeline");
}

// Deletes a milestone, scoped to the current user.
export async function deleteMilestone(id: string) {
  const userId = await requireUserId();
  await prisma.milestone.deleteMany({ where: { id, userId } });
  revalidatePath("/timeline");
}
