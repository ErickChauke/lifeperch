import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

// Server-only: this module reaches the database, so it must never be imported
// from a client component. The retention options the settings form needs are
// pure and live in `@/lib/todo` instead.

// Deletes finished todos older than the retention window for one user, and
// returns how many went.
//
// Only one-off todos are touched. A recurring todo's done state is scoped to the
// day it was ticked, so deleting one would not clear a stale row, it would
// destroy the recurrence itself. Rows with no completedAt are skipped too, since
// `lt` never matches null.
export async function cleanupCompletedTodos(
  userId: string,
  days: number | null,
): Promise<number> {
  if (days === null) return 0;
  const cutoff = subDays(new Date(), days);
  const { count } = await prisma.todo.deleteMany({
    where: {
      userId,
      isRecurring: false,
      status: "done",
      completedAt: { lt: cutoff },
    },
  });
  return count;
}
