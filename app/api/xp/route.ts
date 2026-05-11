import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addLocalDays, formatDayLabel, getCurrentUser, toLocalDateOnly } from "@/lib/dashboard";
import { getSessionXp, getXpLevel, MAX_DAILY_XP } from "@/lib/xp";

function toLocalDateKey(date: Date) {
  const d = toLocalDateOnly(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
  
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

  const studySessions = await prisma.studySession.findMany({
    where: {
      userId: user.id,
      durationMinutes: { gt: 0 },
    },
    orderBy: { startedAt: "desc" },
    select: {
      durationMinutes: true,
      startedAt: true,
    },
  });

  const xpByDay = new Map<string, { taskXp: number; studyXp: number; taskCount: number }>();

  for (const todo of completedTodos) {
    if (!todo.completedAt) continue;
    const dayKey = toLocalDateKey(new Date(todo.completedAt));
    const entry = xpByDay.get(dayKey) ?? { taskXp: 0, studyXp: 0, taskCount: 0 };
    entry.taskXp += todo.xpEarned;
    entry.taskCount += 1;
    xpByDay.set(dayKey, entry);
  }

  for (const session of studySessions) {
    const sessionXp = getSessionXp(session.durationMinutes);
    if (sessionXp <= 0) continue;

    const dayKey = toLocalDateKey(new Date(session.startedAt));
    const entry = xpByDay.get(dayKey) ?? { taskXp: 0, studyXp: 0, taskCount: 0 };
    entry.studyXp += sessionXp;
    xpByDay.set(dayKey, entry);
  }

  const totalXp = Array.from(xpByDay.values()).reduce(
    (sum, entry) => sum + Math.min(MAX_DAILY_XP, entry.taskXp + entry.studyXp),
    0,
  );
  const xpLevel = getXpLevel(totalXp);

  // Build a full daily series so the XP page can switch between 7-day and all-day views.
  const today = toLocalDateOnly(new Date());
  const dayKeys = Array.from(xpByDay.keys()).sort((a, b) => a.localeCompare(b));
  const firstTrackedDay = dayKeys.length > 0 ? new Date(dayKeys[0]) : addLocalDays(today, -2);
  const lastTrackedDay = addLocalDays(today, 5);
  const totalDays = Math.max(1, Math.floor((lastTrackedDay.getTime() - firstTrackedDay.getTime()) / 86400000) + 1);

  const dailyXp = Array.from({ length: totalDays }, (_, index) => addLocalDays(firstTrackedDay, index)).map((day) => {
    const key = toLocalDateKey(day);
    const entry = xpByDay.get(key);
    const taskXp = entry?.taskXp ?? 0;
    const studyXp = entry?.studyXp ?? 0;
    const totalDaily = Math.min(MAX_DAILY_XP, taskXp + studyXp);
    return {
      day: key,
      label: formatDayLabel(day),
      xp: totalDaily,
      tasksCompleted: entry?.taskCount ?? 0,
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
    recentTasks: completedTodos,
  });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}