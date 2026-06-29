-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "linkedId" TEXT,
ADD COLUMN     "linkedLabel" TEXT,
ADD COLUMN     "linkedModule" TEXT,
ADD COLUMN     "startDate" DATE,
ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "weeklyTarget" INTEGER;
