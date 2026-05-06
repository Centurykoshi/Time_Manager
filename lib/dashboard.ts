import "server-only";

import { prisma } from "./prisma";

export type DashboardSnapshot = {
  todosSummary: {
    total: number;
    done: number;
    open: number;
  };
  todaySummary: {
    studiedMinutes: number;
    focusSessions: number;
    todosCompleted: number;
    todosPlanned: number;
  };
  weekSummary: {
    studiedMinutes: number;
    focusSessions: number;
    todosCompleted: number;
    todosPlanned: number;
    studyDays: number;
    weekStart: string;
    weekEnd: string;
  };
  streakDays: number;
  streakBreakAt: string | null;
  dailySeries: Array<{
    day: string;
    label: string;
    studiedMinutes: number;
    focusSessions: number;
  }>;
};

const dashboardEmail = process.env.DASHBOARD_USER_EMAIL ?? "dashboard@focus.local";
const dashboardName = process.env.DASHBOARD_USER_NAME ?? "Focus Dashboard";

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

function getStreakState(series: Array<{ day: Date; studiedMinutes: number; focusSessions: number; todosCompleted: number }>, today: Date) {
  const byDay = new Map(series.map((entry) => [entry.day.toISOString().slice(0, 10), entry]));
  const todayKey = today.toISOString().slice(0, 10);
  const referenceDay = hasActivity(byDay.get(todayKey)) ? today : addUtcDays(today, -1);
  let streak = 0;
  let lastActiveDay: Date | null = null;

  for (let offset = 0; offset < 3650; offset += 1) {
    const cursor = addUtcDays(referenceDay, -offset);
    const key = cursor.toISOString().slice(0, 10);
    const entry = byDay.get(key);
    if (!hasActivity(entry)) {
      break;
    }
    streak += 1;
    lastActiveDay = cursor;
  }

  return {
    streakDays: streak,
    streakBreakAt: lastActiveDay
      ? (() => {
          const breakAt = addUtcDays(lastActiveDay, 1);
          breakAt.setUTCHours(23, 59, 59, 999);
          return breakAt.toISOString();
        })()
      : null,
  };
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const user = await getDashboardUser();
  const today = toUtcDateOnly(new Date());
  const weekStart = startOfUtcWeek(today);
  const weekEnd = addUtcDays(weekStart, 6);
  const tomorrow = addUtcDays(today, 1);

  const [todoTotal, todoDone, todosTodayCompleted, todosTodayPlanned, todaySummaryRow, weekSummaryRow, allDailySummaries] = await Promise.all([
    prisma.todoItem.count({ where: { userId: user.id } }),
    prisma.todoItem.count({ where: { userId: user.id, isDone: true } }),
    prisma.todoItem.count({
      where: {
        userId: user.id,
        completedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    }),
    prisma.todoItem.count({
      where: {
        userId: user.id,
        OR: [{ completedAt: null }, { completedAt: { gte: today } }],
      },
    }),
    prisma.dailyStudySummary.findFirst({
      where: { userId: user.id, day: today },
      select: {
        studiedMinutes: true,
        focusSessions: true,
        todosCompleted: true,
        todosPlanned: true,
      },
    }),
    prisma.weeklyStudySummary.findFirst({
      where: { userId: user.id, weekStart },
      select: {
        studiedMinutes: true,
        focusSessions: true,
        todosCompleted: true,
        studyDays: true,
      },
    }),
    prisma.dailyStudySummary.findMany({
      where: { userId: user.id, day: { lte: today } },
      orderBy: { day: "asc" },
      select: {
        day: true,
        studiedMinutes: true,
        focusSessions: true,
        todosCompleted: true,
      },
    }),
  ]);

  const dailyMap = new Map(allDailySummaries.map((entry) => [entry.day.toISOString().slice(0, 10), entry]));
  const dailySeries = Array.from({ length: 7 }, (_, index) => {
    const day = addUtcDays(weekStart, index);
    const key = day.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    return {
      day: key,
      label: formatDayLabel(day),
      studiedMinutes: entry?.studiedMinutes ?? 0,
      focusSessions: entry?.focusSessions ?? 0,
    };
  });

  const streakState = getStreakState(
    allDailySummaries.map((entry) => ({
      day: entry.day,
      studiedMinutes: entry.studiedMinutes,
      focusSessions: entry.focusSessions,
      todosCompleted: entry.todosCompleted,
    })),
    today,
  );

  const todaySummary = todaySummaryRow ?? {
    studiedMinutes: 0,
    focusSessions: 0,
    todosCompleted: todosTodayCompleted,
    todosPlanned: todosTodayPlanned,
  };

  const weekSummary = weekSummaryRow ?? {
    studiedMinutes: 0,
    focusSessions: 0,
    todosCompleted: 0,
    studyDays: 0,
  };

  return {
    todosSummary: {
      total: todoTotal,
      done: todoDone,
      open: Math.max(0, todoTotal - todoDone),
    },
    todaySummary: {
      ...todaySummary,
      todosCompleted: todosTodayCompleted,
      todosPlanned: todosTodayPlanned,
    },
    weekSummary: {
      ...weekSummary,
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      todosPlanned: todoTotal,
    },
    streakDays: streakState.streakDays,
    streakBreakAt: streakState.streakBreakAt,
    dailySeries,
  };
}

export async function recordStudySession(input: {
  durationMinutes: number;
  startedAt?: Date;
  endedAt?: Date;
  subject?: string | null;
  notes?: string | null;
  source?: "TIMER" | "MANUAL" | "IMPORTED";
}) {
  const user = await getDashboardUser();
  const startedAt = input.startedAt ?? new Date();
  const endedAt = input.endedAt ?? new Date();
  const durationMinutes = Math.max(1, Math.round(input.durationMinutes));
  const day = toUtcDateOnly(startedAt);
  const weekStart = startOfUtcWeek(startedAt);
  const weekEnd = addUtcDays(weekStart, 6);

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
