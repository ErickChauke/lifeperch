-- AlterTable
ALTER TABLE "WishlistCollection" ADD COLUMN     "description" TEXT,
ALTER COLUMN "category" DROP NOT NULL;
