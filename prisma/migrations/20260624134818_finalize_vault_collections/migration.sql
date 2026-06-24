/*
  Warnings:

  - You are about to drop the column `category` on the `Document` table. All the data in the column will be lost.
  - Made the column `collectionId` on table `Document` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "category",
ALTER COLUMN "collectionId" SET NOT NULL;
