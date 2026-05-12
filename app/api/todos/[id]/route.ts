import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { addLocalDays, getCurrentUser, toLocalDateOnly } from "@/lib/dashboard";
import { getTaskXp, MAX_DAILY_XP } from "@/lib/xp";

type Params = {
  params: Promise<{ id: string }>;
};

type TodoUpdateData = {
  title?: string;
  description?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  estimatedMinutes?: number;
  sortOrder?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "BOSS";
  isDone?: boolean;
  completedAt?: Date | null;
  xpEarned?: number;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
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
  const updateData: TodoUpdateData = {
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

      const now = new Date();
      const dayStart = toLocalDateOnly(now);
      const dayEnd = addLocalDays(dayStart, 1);

      // Count and sum today's completed todos in one grouped query.
      const [todoStats, sessionXpTodayRows] = await Promise.all([
        prisma.todoItem.groupBy({
          by: ["difficulty"],
          where: {
            userId: user.id,
            isDone: true,
            completedAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
          _count: {
            _all: true,
          },
          _sum: {
            xpEarned: true,
          },
        }),
        prisma.$queryRaw<Array<{ session_xp: bigint | number | null }>>(Prisma.sql`
          SELECT COALESCE(SUM(FLOOR("durationMinutes" / 10.0)), 0) AS session_xp
          FROM "study_sessions"
          WHERE "userId" = ${user.id}
            AND "startedAt" >= ${dayStart}
            AND "startedAt" < ${dayEnd}
            AND "durationMinutes" > 0
        `),
      ]);

      const completedCount = todoStats.find((entry) => entry.difficulty === difficulty)?._count._all ?? 0;
      const taskXpToday = todoStats.reduce((sum, entry) => sum + (entry._sum.xpEarned ?? 0), 0);

      const sessionXpToday = Number(sessionXpTodayRows[0]?.session_xp ?? 0);
      const consumedToday = taskXpToday + sessionXpToday;
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
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
  const { id } = await params;

  const deleteResult = await prisma.todoItem.deleteMany({ where: { id, userId: user.id } });

  if (deleteResult.count === 0) {
    return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
