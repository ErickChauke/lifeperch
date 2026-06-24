-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "collectionId" TEXT;

-- CreateTable
CREATE TABLE "TodoCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoCollection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TodoCollection" ADD CONSTRAINT "TodoCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "TodoCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
