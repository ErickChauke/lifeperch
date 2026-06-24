-- AlterTable
ALTER TABLE "VaultCollection" ADD COLUMN     "resetExpiry" TIMESTAMP(3),
ADD COLUMN     "resetToken" TEXT;
