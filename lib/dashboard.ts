import "server-only";

import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma";
import { prisma } from "./prisma";
import { auth } from "./auth";
import { getXpLevel, MAX_DAILY_XP } from "./xp";
import { addDaysToDateKey, dateFromKey, getWeekdayInTimeZone, startOfWeekKeyInTimeZone, toDateKeyInTimeZone } from "./timezone";
import type { DashboardSnapshot } from "./dashboard-types";

const dashboardEmail = process.env.DASHBOARD_USER_EMAIL ?? "dashboard@focus.local";
const dashboardName = process.env.DASHBOARD_USER_NAME ?? "Focus Dashboard";

/**
 * Get the currently authenticated user.
 * Throws when there is no active session so logged-out requests cannot persist data.
 */
export async function getCurrentUser() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (session?.user?.id) {
    return prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
    });
  }

  throw new Error("Unauthorized");
}

/**
 * Fallback for demo/dashboard purposes
 * DO NOT use in production for user-specific data
 */
export async function getDashboardUser() {
  return prisma.user.upsert({
    where: { email: dashboardEmail },
    update: {
      name: dashboardName,
    },
    create: {
      email: dashboardEmail,
      name: dashboardName,
      timezone: "UTC",
    },
  });
}

export function toUtcDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return toUtcDateOnly(next);
}

export function toLocalDateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return toLocalDateOnly(next);
}

export function startOfUtcWeek(date: Date) {
  const day = toUtcDateOnly(date);
  const offset = (day.getUTCDay() + 6) % 7;
  return addUtcDays(day, -offset);
}

export function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
}

function hasActivity(entry?: { studiedMinutes: number; focusSessions: number; todosCompleted?: number }) {
  return Boolean(entry && (entry.studiedMinutes > 0 || entry.focusSessions > 0 || (entry.todosCompleted ?? 0) > 0));
}

function getStreakState(
  seriesByKey: Map<string, { studiedMinutes: number; focusSessions: number; todosCompleted: number }>,
  todayKey: string,
  timeZone: string,
) {
  const referenceKey = hasActivity(seriesByKey.get(todayKey)) ? todayKey : addDaysToDateKey(todayKey, -1, timeZone);
  let streak = 0;
  let lastActiveKey: string | null = null;

  for (let offset = 0; offset < 3650; offset += 1) {
    const key = addDaysToDateKey(referenceKey, -offset, timeZone);
    const entry = seriesByKey.get(key);
    if (!hasActivity(entry)) {
      break;
    }
    streak += 1;
    lastActiveKey = key;
  }

  return {
    streakDays: streak,
    streakBreakAt: lastActiveKey
      ? (() => {
          const breakAt = dateFromKey(addDaysToDateKey(lastActiveKey, 1, timeZone));
          breakAt.setUTCHours(23, 59, 59, 999);
          return breakAt.toISOString();
        })()
      : null,
  };
}

export async function getDashboardSnapshot(timeZone = "UTC"): Promise<DashboardSnapshot> {
  const user = await getCurrentUser();
  const now = new Date();
  const todayKey = toDateKeyInTimeZone(now, timeZone);
  const weekStartKey = startOfWeekKeyInTimeZone(now, timeZone);
  const weekEndKey = addDaysToDateKey(weekStartKey, 6, timeZone);
  const lookbackStart = addLocalDays(toLocalDateOnly(now), -35);
  const lookaheadEnd = addLocalDays(toLocalDateOnly(now), 2);

  const [
    todoTotal,
    todoDone,
    allTodos,
    studySessionTotals,
    allDailySummaries,
    goalTotal,
    xpRows,
  ] = await Promise.all([
    prisma.todoItem.count({ where: { userId: user.id } }),
    prisma.todoItem.count({ where: { userId: user.id, isDone: true } }),
    prisma.todoItem.findMany({
      where: { userId: user.id },
      select: {
        createdAt: true,
        isDone: true,
        difficulty: true,
      },
    }),
    prisma.studySession.aggregate({
      where: { userId: user.id, durationMinutes: { gt: 0 } },
      _sum: { durationMinutes: true },
      _count: { _all: true },
    }),
    prisma.dailyStudySummary.findMany({
      where: { userId: user.id, day: { gte: lookbackStart, lt: lookaheadEnd } },
      orderBy: { day: "asc" },
      select: {
        day: true,
        studiedMinutes: true,
        focusSessions: true,
        todosCompleted: true,
      },
    }),
    prisma.goal.count({ where: { userId: user.id, isArchived: false } }),
    prisma.$queryRaw<Array<{ total_xp: bigint | number | null }>>(Prisma.sql`
      WITH task_xp AS (
        SELECT DATE_TRUNC('day', "completedAt")::date AS day, SUM("xpEarned")::int AS xp
        FROM "todo_items"
        WHERE "userId" = ${user.id}
          AND "isDone" = true
          AND "xpEarned" > 0
          AND "completedAt" IS NOT NULL
        GROUP BY 1
      ),
      session_xp AS (
        SELECT DATE_TRUNC('day', "startedAt")::date AS day, SUM(FLOOR("durationMinutes" / 10.0))::int AS xp
        FROM "study_sessions"
        WHERE "userId" = ${user.id}
          AND "durationMinutes" > 0
        GROUP BY 1
      ),
      merged AS (
        SELECT day, SUM(xp)::int AS day_xp
        FROM (
          SELECT day, xp FROM task_xp
          UNION ALL
          SELECT day, xp FROM session_xp
        ) daily
        GROUP BY day
      )
      SELECT COALESCE(SUM(LEAST(${MAX_DAILY_XP}, GREATEST(0, day_xp))), 0) AS total_xp
      FROM merged
    `),
  ]);


  


  const summaryByDay = new Map<string, { studiedMinutes: number; focusSessions: number; todosCompleted: number }>();
  for (const entry of allDailySummaries) {
    const key = toDateKeyInTimeZone(new Date(entry.day), timeZone);
    const current = summaryByDay.get(key) ?? { studiedMinutes: 0, focusSessions: 0, todosCompleted: 0 };
    current.studiedMinutes += entry.studiedMinutes;
    current.focusSessions += entry.focusSessions;
    current.todosCompleted += entry.todosCompleted;
    summaryByDay.set(key, current);
  }

  const todosTodayTotal = allTodos.filter((todo) => toDateKeyInTimeZone(new Date(todo.createdAt), timeZone) === todayKey).length;
  const todosTodayDone = allTodos.filter((todo) => todo.isDone && toDateKeyInTimeZone(new Date(todo.createdAt), timeZone) === todayKey).length;

  const dailySeries = Array.from({ length: 7 }, (_, index) => {
    const key = addDaysToDateKey(weekStartKey, index, timeZone);
    const entry = summaryByDay.get(key);
    return {
      day: key,
      label: getWeekdayInTimeZone(dateFromKey(key), timeZone),
      studiedMinutes: entry?.studiedMinutes ?? 0,
      focusSessions: entry?.focusSessions ?? 0,
    };
  });

  const streakState = getStreakState(summaryByDay, todayKey, timeZone);

  const todaySummaryRow = summaryByDay.get(todayKey);
  const todaySummary = {
    studiedMinutes: todaySummaryRow?.studiedMinutes ?? 0,
    focusSessions: todaySummaryRow?.focusSessions ?? 0,
    todosCompleted: todosTodayDone,
    todosPlanned: todosTodayTotal,
  };

  const weekKeys = Array.from({ length: 7 }, (_, index) => addDaysToDateKey(weekStartKey, index, timeZone));
  const weekSummary = weekKeys.reduce(
    (acc, key) => {
      const row = summaryByDay.get(key);
      if (!row) return acc;
      acc.studiedMinutes += row.studiedMinutes;
      acc.focusSessions += row.focusSessions;
      acc.todosCompleted += row.todosCompleted;
      if (row.studiedMinutes > 0 || row.focusSessions > 0) acc.studyDays += 1;
      return acc;
    },
    { studiedMinutes: 0, focusSessions: 0, todosCompleted: 0, studyDays: 0 },
  );

  const allTimeSummary = {
    studiedMinutes: studySessionTotals._sum.durationMinutes ?? 0,
    focusSessions: studySessionTotals._count._all ?? 0,
    todosCompleted: todoDone,
    todosPlanned: todoTotal,
  };

  const totalXpRaw = xpRows[0]?.total_xp ?? 0;
  const totalXp = Number(totalXpRaw);
  const xpLevel = getXpLevel(totalXp);
  const difficultyOrder = ["EASY", "MEDIUM", "HARD", "BOSS"] as const;
  const difficultyCounts = difficultyOrder.map((level) => {
    const levelTodos = allTodos.filter((todo) => todo.difficulty === level);
    const total = levelTodos.length;
    const completed = levelTodos.filter((todo) => todo.isDone).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const percentOfTotal = todoTotal > 0 ? Math.round((total / todoTotal) * 100) : 0;
    return { level, total, completed, completionRate, percentOfTotal };
  });

  const heatmapDays = Array.from({ length: 42 }, (_, index) => addDaysToDateKey(todayKey, index - 41, timeZone));
  const maxHeatMinutes = Math.max(
    1,
    ...heatmapDays.map((key) => summaryByDay.get(key)?.studiedMinutes ?? 0),
  );
  const studyHeatmap = heatmapDays.map((dayKey) => {
    const studiedMinutes = summaryByDay.get(dayKey)?.studiedMinutes ?? 0;
    return {
      day: dayKey,
      label: getWeekdayInTimeZone(dateFromKey(dayKey), timeZone),
      studiedMinutes,
      intensity: Math.min(4, Math.floor((studiedMinutes / maxHeatMinutes) * 4)),
    };
  });

  const last14DayKeys = Array.from({ length: 14 }, (_, index) => addDaysToDateKey(todayKey, index - 13, timeZone));
  const totalLast14 = last14DayKeys.reduce((sum, key) => sum + (summaryByDay.get(key)?.studiedMinutes ?? 0), 0);
  const averageDailyMinutesLast14Days = Math.round(totalLast14 / 14);
  const averageSessionMinutes = allTimeSummary.focusSessions > 0
    ? Math.round(allTimeSummary.studiedMinutes / allTimeSummary.focusSessions)
    : 0;

  const bestDay = [...summaryByDay.entries()].reduce<{ key: string; minutes: number } | null>((best, [key, value]) => {
    if (!best || value.studiedMinutes > best.minutes) {
      return { key, minutes: value.studiedMinutes };
    }
    return best;
  }, null);
  const mostFocusedDayLabel = bestDay
    ? `${getWeekdayInTimeZone(dateFromKey(bestDay.key), timeZone)} (${bestDay.minutes}m)`
    : "No sessions yet";

  return {
    todosSummary: {
      total: todoTotal,
      done: todoDone,
      open: Math.max(0, todoTotal - todoDone),
    },
    goalsSummary: {
      total: goalTotal,
    },
    xpSummary: {
      totalXp,
      level: xpLevel.level,
    },
    todaySummary: {
      ...todaySummary,
      todosCompleted: todosTodayDone,
      todosPlanned: todosTodayTotal,
    },
    weekSummary: {
      ...weekSummary,
      weekStart: weekStartKey,
      weekEnd: weekEndKey,
      todosPlanned: todoTotal,
    },
    allTimeSummary,
    streakDays: streakState.streakDays,
    streakBreakAt: streakState.streakBreakAt,
    dailySeries,
    studyHeatmap,
    taskDifficulty: {
      total: todoTotal,
      completed: todoDone,
      completionRate: todoTotal > 0 ? Math.round((todoDone / todoTotal) * 100) : 0,
      byDifficulty: difficultyCounts.map((entry) => ({ ...entry })),
    },
    productivity: {
      averageSessionMinutes,
      averageDailyMinutesLast14Days,
      mostFocusedDayLabel,
    },
  };
}

export async function recordStudySession(input: {
  durationMinutes: number;
  startedAt?: Date;
  endedAt?: Date;
  subject?: string | null;
  notes?: string | null;
  source?: "TIMER" | "MANUAL" | "IMPORTED";
  timeZone?: string;
}) {
  const user = await getCurrentUser();
  const startedAt = input.startedAt ?? new Date();
  const endedAt = input.endedAt ?? new Date();
  const durationMinutes = Math.max(1, Math.round(input.durationMinutes));
  const timeZone = input.timeZone ?? "UTC";
  const dayKey = toDateKeyInTimeZone(startedAt, timeZone);
  const weekStartKey = startOfWeekKeyInTimeZone(startedAt, timeZone);
  const weekEndKey = addDaysToDateKey(weekStartKey, 6, timeZone);
  const day = dateFromKey(dayKey);
  const weekStart = dateFromKey(weekStartKey);
  const weekEnd = dateFromKey(weekEndKey);

  const [session, todoTotals] = await Promise.all([
    prisma.studySession.create({
      data: {
        userId: user.id,
        startedAt,
        endedAt,
        durationMinutes,
        subject: input.subject ?? null,
        notes: input.notes ?? null,
        source: input.source ?? "TIMER",
      },
    }),
    prisma.todoItem.aggregate({
      where: { userId: user.id },
      _count: { _all: true },
    }),
  ]);

  const todosPlanned = todoTotals._count._all ?? 0;
  const todosCompleted = await prisma.todoItem.count({
    where: { userId: user.id, isDone: true },
  });

  await prisma.dailyStudySummary.upsert({
    where: { userId_day: { userId: user.id, day } },
    create: {
      userId: user.id,
      day,
      studiedMinutes: durationMinutes,
      focusSessions: 1,
      todosCompleted,
      todosPlanned,
    },
    update: {
      studiedMinutes: { increment: durationMinutes },
      focusSessions: { increment: 1 },
      todosCompleted,
      todosPlanned,
    },
  });

  const existingWeek = await prisma.weeklyStudySummary.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart } },
    select: { studyDays: true },
  });

  const dayHasStudy = (await prisma.dailyStudySummary.findUnique({
    where: { userId_day: { userId: user.id, day } },
    select: { studiedMinutes: true, focusSessions: true },
  })) ?? { studiedMinutes: 0, focusSessions: 0 };

  await prisma.weeklyStudySummary.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart } },
    create: {
      userId: user.id,
      weekStart,
      weekEnd,
      studiedMinutes: durationMinutes,
      focusSessions: 1,
      todosCompleted,
      studyDays: dayHasStudy.studiedMinutes > 0 || dayHasStudy.focusSessions > 0 ? 1 : 0,
    },
    update: {
      weekEnd,
      studiedMinutes: { increment: durationMinutes },
      focusSessions: { increment: 1 },
      todosCompleted,
      studyDays: existingWeek && existingWeek.studyDays > 0 ? existingWeek.studyDays : 1,
    },
  });

  return session;
}
