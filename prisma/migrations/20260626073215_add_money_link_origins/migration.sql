-- AlterTable
ALTER TABLE "BudgetItem" ADD COLUMN     "originId" TEXT,
ADD COLUMN     "originType" TEXT;

-- AlterTable
ALTER TABLE "ShoppingItem" ADD COLUMN     "originId" TEXT,
ADD COLUMN     "originType" TEXT;

-- AlterTable
ALTER TABLE "WishlistItem" ADD COLUMN     "originId" TEXT,
ADD COLUMN     "originType" TEXT;
