-- AlterTable
ALTER TABLE "timer_settings" ADD COLUMN     "favoriteMinutes" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "latestMinutes" INTEGER NOT NULL DEFAULT 25;
