-- AlterTable
ALTER TABLE "BudgetItem" ADD COLUMN "loanId" TEXT;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "SelfLoan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
