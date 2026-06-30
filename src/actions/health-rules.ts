"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { healthRuleSchema, type HealthRuleInput } from "@/lib/health";

// Returns the current user id or throws when there is no session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// Maps validated input to the fields stored on a HealthRule.
function toRecord(data: HealthRuleInput) {
  return {
    text: data.text.trim(),
    category: data.category?.trim() || null,
    active: data.active,
  };
}

// Fetches the user's rules, active first, then by manual order.
export async function getHealthRules() {
  const userId = await requireUserId();
  return prisma.healthRule.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { order: "asc" }, { createdAt: "asc" }],
  });
}

// Creates a rule for the current user.
export async function createHealthRule(input: HealthRuleInput) {
  const userId = await requireUserId();
  const data = healthRuleSchema.parse(input);
  await prisma.healthRule.create({ data: { userId, ...toRecord(data) } });
  revalidatePath("/health");
}

// Updates a rule, scoped to the current user.
export async function updateHealthRule(id: string, input: HealthRuleInput) {
  const userId = await requireUserId();
  const data = healthRuleSchema.parse(input);
  await prisma.healthRule.updateMany({ where: { id, userId }, data: toRecord(data) });
  revalidatePath("/health");
}

// Deletes a rule, scoped to the current user.
export async function deleteHealthRule(id: string) {
  const userId = await requireUserId();
  await prisma.healthRule.deleteMany({ where: { id, userId } });
  revalidatePath("/health");
}
