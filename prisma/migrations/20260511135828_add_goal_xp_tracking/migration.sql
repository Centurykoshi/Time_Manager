-- AlterTable
ALTER TABLE "todo_items" ADD COLUMN     "goalId" TEXT;

-- AddForeignKey
ALTER TABLE "todo_items" ADD CONSTRAINT "todo_items_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
