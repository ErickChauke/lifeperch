-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "collectionId" TEXT;

-- CreateTable
CREATE TABLE "VaultCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultCollection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VaultCollection" ADD CONSTRAINT "VaultCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "VaultCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
