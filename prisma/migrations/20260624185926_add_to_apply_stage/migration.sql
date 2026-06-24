-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "deadline" DATE,
ADD COLUMN     "url" TEXT,
ALTER COLUMN "status" SET DEFAULT 'to-apply';
