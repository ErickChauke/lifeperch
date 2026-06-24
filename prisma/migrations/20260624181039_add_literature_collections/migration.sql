-- AlterTable
ALTER TABLE "Literature" ADD COLUMN     "collectionId" TEXT;

-- CreateTable
CREATE TABLE "LiteratureCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiteratureCollection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LiteratureCollection" ADD CONSTRAINT "LiteratureCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Literature" ADD CONSTRAINT "Literature_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "LiteratureCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
