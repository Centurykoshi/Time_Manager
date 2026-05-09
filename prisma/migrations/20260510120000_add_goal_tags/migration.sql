-- AlterTable
ALTER TABLE "todo_tags" ADD COLUMN     "goalXp" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "goalTagId" TEXT;

-- CreateIndex
CREATE INDEX "goals_userId_goalTagId_idx" ON "goals"("userId", "goalTagId");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_goalTagId_fkey" FOREIGN KEY ("goalTagId") REFERENCES "todo_tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;
