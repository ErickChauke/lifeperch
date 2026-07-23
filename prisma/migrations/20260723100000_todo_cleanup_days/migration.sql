-- Retention window, in days, for completed one-off todos. NULL means never
-- clean. Existing rows pick up the 3 day default.
ALTER TABLE "User" ADD COLUMN "todoCleanupDays" INTEGER DEFAULT 3;
