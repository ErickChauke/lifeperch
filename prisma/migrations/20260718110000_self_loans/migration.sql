-- CreateTable
CREATE TABLE "SelfLoan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "title" TEXT NOT NULL,
    "principal" INTEGER NOT NULL DEFAULT 0,
    "repaid" INTEGER NOT NULL DEFAULT 0,
    "monthlyAmount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelfLoan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SelfLoan" ADD CONSTRAINT "SelfLoan_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "SavingsGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfLoan" ADD CONSTRAINT "SelfLoan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
