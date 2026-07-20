-- AlterTable
ALTER TABLE "SavingsGoal" ADD COLUMN "extraAmount" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "extraFrequency" TEXT,
ADD COLUMN "extraDate" DATE;

-- AlterTable
ALTER TABLE "SelfLoan" ADD COLUMN "extraAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "extraFrequency" TEXT,
ADD COLUMN "extraDate" DATE;
