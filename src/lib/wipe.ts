import { prisma } from "@/lib/prisma";
import { destroyAsset } from "@/lib/cloudinary";

// Wipes every record one account owns, across all modules.
//
// Account and Session are deliberately left alone: they carry no life data, and
// removing them would sign the user out and break the Google link. The User row
// itself stays too, so preferences survive and the app still opens.
//
// Order is children before parents so no foreign key dangles part way through.
// It is not one transaction on purpose: 39 deletes against serverless Postgres
// would sit well past the interactive transaction timeout. A failed run is
// therefore partial, and safe to run again.
export async function wipeUserData(userId: string): Promise<number> {
  const where = { userId };

  // Read the uploaded asset ids before the rows holding them go.
  const [documents, noteFiles, journalFiles] = await Promise.all([
    prisma.document.findMany({ where, select: { publicId: true } }),
    prisma.noteAttachment.findMany({ where, select: { publicId: true } }),
    prisma.dailyEntryAttachment.findMany({ where, select: { publicId: true } }),
  ]);
  const publicIds = [...documents, ...noteFiles, ...journalFiles].map(
    (row) => row.publicId,
  );

  const steps: (() => Promise<{ count: number }>)[] = [
    // Leaves first.
    () => prisma.noteAttachment.deleteMany({ where }),
    () => prisma.dailyEntryAttachment.deleteMany({ where }),
    () => prisma.mealPlanOption.deleteMany({ where }),
    () => prisma.habitLog.deleteMany({ where }),
    () => prisma.routineExercise.deleteMany({ where }),
    () => prisma.workoutSession.deleteMany({ where }),
    () => prisma.medicineLog.deleteMany({ where }),
    () => prisma.appStage.deleteMany({ where }),
    () => prisma.milestone.deleteMany({ where }),
    () => prisma.todo.deleteMany({ where }),
    () => prisma.shoppingItem.deleteMany({ where }),
    () => prisma.wishlistItem.deleteMany({ where }),
    () => prisma.document.deleteMany({ where }),
    () => prisma.literature.deleteMany({ where }),
    // Budget lines point at plans, goals and loans, so they go before all three.
    () => prisma.budgetItem.deleteMany({ where }),
    () => prisma.note.deleteMany({ where }),
    () => prisma.mealPlanSlot.deleteMany({ where }),
    // Loans point at the goal they were borrowed from.
    () => prisma.selfLoan.deleteMany({ where }),
    // Parents.
    () => prisma.noteCollection.deleteMany({ where }),
    () => prisma.dailyEntry.deleteMany({ where }),
    () => prisma.shoppingList.deleteMany({ where }),
    () => prisma.wishlistCollection.deleteMany({ where }),
    () => prisma.vaultCollection.deleteMany({ where }),
    () => prisma.literatureCollection.deleteMany({ where }),
    () => prisma.habit.deleteMany({ where }),
    () => prisma.mealPlan.deleteMany({ where }),
    () => prisma.workoutRoutine.deleteMany({ where }),
    () => prisma.medicine.deleteMany({ where }),
    () => prisma.jobApplication.deleteMany({ where }),
    () => prisma.timeline.deleteMany({ where }),
    () => prisma.todoCollection.deleteMany({ where }),
    () => prisma.budgetPlan.deleteMany({ where }),
    () => prisma.savingsGoal.deleteMany({ where }),
    // Standalone.
    () => prisma.timetableEvent.deleteMany({ where }),
    () => prisma.transaction.deleteMany({ where }),
    () => prisma.fixedItem.deleteMany({ where }),
    () => prisma.healthRule.deleteMany({ where }),
    () => prisma.healthNote.deleteMany({ where }),
    () => prisma.meal.deleteMany({ where }),
  ];

  let removed = 0;
  for (const step of steps) removed += (await step()).count;

  // Best effort, and last: a Cloudinary outage should not leave the database
  // half wiped with no way to finish.
  for (const publicId of publicIds) {
    try {
      await destroyAsset(publicId);
    } catch {
      // the row is already gone; nothing left to reconcile
    }
  }

  return removed;
}
