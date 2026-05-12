import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addLocalDays, getCurrentUser, toLocalDateOnly } from "@/lib/dashboard";
import { getSessionXp, getXpLevel, MAX_DAILY_XP } from "@/lib/xp";
import { isValidTimeZone, TIMEZONE_HEADER, toDateKeyInTimeZone } from "@/lib/timezone";

function getTimeZoneFromHeader(request: Request) {
  const requested = request.headers.get(TIMEZONE_HEADER) ?? "UTC";
  return isValidTimeZone(requested) ? requested : "UTC";
}

function toDateFromKey(dayKey: string) {
  return new Date(`${dayKey}T12:00:00.000Z`);
}

function formatDayLabelInTimeZone(dayKey: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short", timeZone }).format(toDateFromKey(dayKey));
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const timeZone = getTimeZoneFromHeader(request);
  
  // Get all completed todos with their XP rewards
  const completedTodos = await prisma.todoItem.findMany({
    where: {
      userId: user.id,
      isDone: true,
      xpEarned: { not: 0 },
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
    const dayKey = toDateKeyInTimeZone(new Date(todo.completedAt), timeZone);
    const entry = xpByDay.get(dayKey) ?? { taskXp: 0, studyXp: 0, taskCount: 0 };
    entry.taskXp += todo.xpEarned;
    if (todo.xpEarned > 0) {
      entry.taskCount += 1;
    }
    xpByDay.set(dayKey, entry);
  }

  for (const session of studySessions) {
    const sessionXp = getSessionXp(session.durationMinutes);
    if (sessionXp <= 0) continue;

    const dayKey = toDateKeyInTimeZone(new Date(session.startedAt), timeZone);
    const entry = xpByDay.get(dayKey) ?? { taskXp: 0, studyXp: 0, taskCount: 0 };
    entry.studyXp += sessionXp;
    xpByDay.set(dayKey, entry);
  }

  const totalXp = Array.from(xpByDay.values()).reduce(
    (sum, entry) => sum + Math.max(0, Math.min(MAX_DAILY_XP, entry.taskXp + entry.studyXp)),
    0,
  );
  const xpLevel = getXpLevel(totalXp);

  // Build a full daily series so the XP page can switch between 7-day and all-day views.
  const today = toLocalDateOnly(new Date());
  const dayKeys = Array.from(xpByDay.keys()).sort((a, b) => a.localeCompare(b));
  const firstTrackedKey = dayKeys.length > 0 ? dayKeys[0] : toDateKeyInTimeZone(addLocalDays(today, -2), timeZone);
  const lastTrackedKey = toDateKeyInTimeZone(addLocalDays(today, 5), timeZone);

  const keysInRange: string[] = [];
  for (let cursor = toDateFromKey(firstTrackedKey); ; cursor = addLocalDays(cursor, 1)) {
    const key = toDateKeyInTimeZone(cursor, timeZone);
    keysInRange.push(key);
    if (key >= lastTrackedKey) break;
  }

  const dailyXp = keysInRange.map((key) => {
    const entry = xpByDay.get(key);
    const taskXp = entry?.taskXp ?? 0;
    const studyXp = entry?.studyXp ?? 0;
    const totalDaily = Math.max(0, Math.min(MAX_DAILY_XP, taskXp + studyXp));
    return {
      day: key,
      label: formatDayLabelInTimeZone(key, timeZone),
      xp: totalDaily,
      tasksCompleted: entry?.taskCount ?? 0,
    };
  });

  return NextResponse.json({
    summary: {
      totalXp,
      tasksCompleted: completedTodos.filter((todo) => todo.xpEarned > 0).length,
      level: xpLevel.level,
      xpIntoLevel: xpLevel.xpIntoLevel,
      xpToNextLevel: xpLevel.xpToNextLevel,
      progress: xpLevel.progress,
    },
    dailyXp,
    recentTasks: completedTodos.filter((todo) => todo.xpEarned > 0),
  });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
