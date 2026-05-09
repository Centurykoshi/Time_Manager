import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addUtcDays, formatDayLabel, getDashboardUser, startOfUtcWeek, toUtcDateOnly } from "@/lib/dashboard";
import { getXpLevel } from "@/lib/xp";

export async function GET() {
  const user = await getDashboardUser();
  
  // Get all completed todos with their XP rewards
  const completedTodos = await prisma.todoItem.findMany({
    where: {
      userId: user.id,
      isDone: true,
      xpEarned: { gt: 0 },
    },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      title: true,
      difficulty: true,
      xpEarned: true,
      completedAt: true,
    },
  });

  const totalXp = completedTodos.reduce((sum, todo) => sum + todo.xpEarned, 0);
  const xpLevel = getXpLevel(totalXp);

  // Calculate daily XP breakdown
  const today = toUtcDateOnly(new Date());
  const weekStart = startOfUtcWeek(today);
  const recentDays = Array.from({ length: 14 }, (_, index) => addUtcDays(weekStart, index - 7));
  const todosByDay = new Map<string, { xp: number; count: number }>();

  for (const todo of completedTodos) {
    if (!todo.completedAt) continue;
    const dayKey = toUtcDateOnly(new Date(todo.completedAt)).toISOString().slice(0, 10);
    const current = todosByDay.get(dayKey) ?? { xp: 0, count: 0 };
    current.xp += todo.xpEarned;
    current.count += 1;
    todosByDay.set(dayKey, current);
  }

  const dailyXp = recentDays.map((day) => {
    const key = day.toISOString().slice(0, 10);
    const entry = todosByDay.get(key);
    return {
      day: key,
      label: formatDayLabel(day),
      xp: entry?.xp ?? 0,
      tasksCompleted: entry?.count ?? 0,
    };
  });

  return NextResponse.json({
    summary: {
      totalXp,
      tasksCompleted: completedTodos.length,
      level: xpLevel.level,
      xpIntoLevel: xpLevel.xpIntoLevel,
      xpToNextLevel: xpLevel.xpToNextLevel,
      progress: xpLevel.progress,
    },
    dailyXp,
    recentTasks: completedTodos.slice(0, 24),
  });
}