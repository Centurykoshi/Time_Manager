import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addLocalDays, getCurrentUser, toLocalDateOnly } from "@/lib/dashboard";
import { getTaskXp, MAX_DAILY_XP } from "@/lib/xp";
import { isValidTimeZone, TIMEZONE_HEADER, toDateKeyInTimeZone } from "@/lib/timezone";

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
  const requestedTimeZone = request.headers.get(TIMEZONE_HEADER) ?? "UTC";
  const timeZone = isValidTimeZone(requestedTimeZone) ? requestedTimeZone : "UTC";
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
      const todayKey = toDateKeyInTimeZone(now, timeZone);
      const lookbackStart = addLocalDays(toLocalDateOnly(now), -2);
      const lookaheadEnd = addLocalDays(toLocalDateOnly(now), 2);

      // Pull a narrow window, then bucket by the user's timezone day key.
      const [recentCompletedTodos, recentStudySessions] = await Promise.all([
        prisma.todoItem.findMany({
          where: {
            userId: user.id,
            isDone: true,
            completedAt: {
              gte: lookbackStart,
              lt: lookaheadEnd,
            },
          },
          select: {
            difficulty: true,
            xpEarned: true,
            completedAt: true,
          },
        }),
        prisma.studySession.findMany({
          where: {
            userId: user.id,
            startedAt: {
              gte: lookbackStart,
              lt: lookaheadEnd,
            },
            durationMinutes: { gt: 0 },
          },
          select: {
            startedAt: true,
            durationMinutes: true,
          },
        }),
      ]);

      const todosToday = recentCompletedTodos.filter(
        (entry) => entry.completedAt && toDateKeyInTimeZone(new Date(entry.completedAt), timeZone) === todayKey,
      );
      const completedCount = todosToday.filter((entry) => entry.difficulty === difficulty).length;
      const taskXpToday = todosToday.reduce((sum, entry) => sum + (entry.xpEarned ?? 0), 0);
      const sessionXpToday = recentStudySessions
        .filter((entry) => toDateKeyInTimeZone(new Date(entry.startedAt), timeZone) === todayKey)
        .reduce((sum, entry) => sum + Math.floor(entry.durationMinutes / 10), 0);
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
