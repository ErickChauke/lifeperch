-- AlterTable
ALTER TABLE "WishlistItem" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transactionId" TEXT;
