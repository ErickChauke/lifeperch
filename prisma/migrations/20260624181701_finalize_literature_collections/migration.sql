/*
  Warnings:

  - Made the column `collectionId` on table `Literature` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Literature" ALTER COLUMN "collectionId" SET NOT NULL;
