-- AlterTable
ALTER TABLE "BudgetItem" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transactionId" TEXT;
