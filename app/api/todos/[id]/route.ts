import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addLocalDays, getDashboardUser, toLocalDateOnly } from "@/lib/dashboard";
import { getSessionXp, getTaskXp, MAX_DAILY_XP } from "@/lib/xp";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getDashboardUser();
  const { id } = await params;
  const body = (await request.json()) as {
    title?: string;
    description?: string | null;
    isDone?: boolean;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    estimatedMinutes?: number | null;
    sortOrder?: number | null;
    difficulty?: "EASY" | "MEDIUM" | "HARD" | "BOSS";
  };

  // Get current todo to check if it's being marked as done
  const currentTodo = await prisma.todoItem.findFirst({ where: { id, userId: user.id } });
  
  // Prepare update data
  const updateData: any = {
    title: body.title?.trim(),
    description: body.description === undefined ? undefined : body.description?.trim() || null,
    priority: body.priority,
    estimatedMinutes: body.estimatedMinutes ?? undefined,
    sortOrder: body.sortOrder ?? undefined,
    difficulty: body.difficulty,
  };
  
  // Handle isDone changes
  if (body.isDone !== undefined) {
    updateData.isDone = body.isDone;
    updateData.completedAt = body.isDone ? new Date() : null;
    
    // If marking as done and wasn't previously done, calculate and award XP
    if (body.isDone === true && currentTodo && !currentTodo.isDone) {
      const difficulty = body.difficulty ?? (currentTodo.difficulty as "EASY" | "MEDIUM" | "HARD" | "BOSS");
      // Count how many tasks of this difficulty are already completed
      const completedCount = await prisma.todoItem.count({
        where: { userId: user.id, difficulty, isDone: true }
      });

      const now = new Date();
      const dayStart = toLocalDateOnly(now);
      const dayEnd = addLocalDays(dayStart, 1);

      const [taskXpToday, sessionsToday] = await Promise.all([
        prisma.todoItem.aggregate({
          where: {
            userId: user.id,
            isDone: true,
            completedAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
          _sum: { xpEarned: true },
        }),
        prisma.studySession.findMany({
          where: {
            userId: user.id,
            startedAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
          select: { durationMinutes: true },
        }),
      ]);

      const sessionXpToday = sessionsToday.reduce((sum, session) => sum + getSessionXp(session.durationMinutes), 0);
      const consumedToday = (taskXpToday._sum.xpEarned ?? 0) + sessionXpToday;
      const remainingToday = Math.max(0, MAX_DAILY_XP - consumedToday);
      const requestedTaskXp = getTaskXp(difficulty, completedCount);
      updateData.xpEarned = Math.min(requestedTaskXp, remainingToday);
    }
    // If marking as not done, remove XP
    else if (body.isDone === false && currentTodo && currentTodo.isDone) {
      updateData.xpEarned = 0;
    }
  }

  const updateResult = await prisma.todoItem.updateMany({
    where: { id, userId: user.id },
    data: updateData,
  });

  if (updateResult.count === 0) {
    return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  }

  const todo = await prisma.todoItem.findFirst({ where: { id, userId: user.id } });
  return NextResponse.json({ todo: todo ?? null });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getDashboardUser();
  const { id } = await params;

  const deleteResult = await prisma.todoItem.deleteMany({ where: { id, userId: user.id } });

  if (deleteResult.count === 0) {
    return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
