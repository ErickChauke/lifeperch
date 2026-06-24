-- AlterTable
ALTER TABLE "DailyEntry" ADD COLUMN     "bodyFormat" TEXT NOT NULL DEFAULT 'markdown';

-- AlterTable
ALTER TABLE "Literature" ADD COLUMN     "notesFormat" TEXT NOT NULL DEFAULT 'markdown';
