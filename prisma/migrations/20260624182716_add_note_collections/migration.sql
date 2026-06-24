-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "collectionId" TEXT;

-- CreateTable
CREATE TABLE "NoteCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteCollection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NoteCollection" ADD CONSTRAINT "NoteCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "NoteCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
