-- CreateEnum
CREATE TYPE "TodoDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'BOSS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GoalCadence" ADD VALUE 'YEARLY';
ALTER TYPE "GoalCadence" ADD VALUE 'ALL_TIME';

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "goalGroupId" TEXT;

-- AlterTable
ALTER TABLE "timer_settings" ADD COLUMN     "timerDurationSec" INTEGER NOT NULL DEFAULT 1500,
ADD COLUMN     "timerEndsAt" TIMESTAMP(3),
ADD COLUMN     "timerRemainingSec" INTEGER NOT NULL DEFAULT 1500,
ADD COLUMN     "timerStatus" TEXT NOT NULL DEFAULT 'IDLE';

-- AlterTable
ALTER TABLE "todo_items" ADD COLUMN     "difficulty" "TodoDifficulty" NOT NULL DEFAULT 'EASY',
ADD COLUMN     "tagId" TEXT;

-- CreateTable
CREATE TABLE "todo_tags" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "todo_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_groups" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "goal_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "todo_tags_userId_isBuiltin_idx" ON "todo_tags"("userId", "isBuiltin");

-- CreateIndex
CREATE UNIQUE INDEX "todo_tags_userId_slug_key" ON "todo_tags"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "goal_groups_userId_slug_key" ON "goal_groups"("userId", "slug");

-- AddForeignKey
ALTER TABLE "todo_items" ADD CONSTRAINT "todo_items_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "todo_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_tags" ADD CONSTRAINT "todo_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_goalGroupId_fkey" FOREIGN KEY ("goalGroupId") REFERENCES "goal_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_groups" ADD CONSTRAINT "goal_groups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
