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

function countStreak(series: Array<{ day: Date; studiedMinutes: number; focusSessions: number }>, today: Date) {
  const byDay = new Map(series.map((entry) => [entry.day.toISOString().slice(0, 10), entry]));
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const cursor = addUtcDays(today, -offset);
    const key = cursor.toISOString().slice(0, 10);
    const entry = byDay.get(key);
    if (!entry || (entry.studiedMinutes <= 0 && entry.focusSessions <= 0)) {
      break;
    }
    streak += 1;
  }

  return streak;
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const user = await getDashboardUser();
  const today = toUtcDateOnly(new Date());
  const weekStart = startOfUtcWeek(today);
  const weekEnd = addUtcDays(weekStart, 6);
  const recentStart = addUtcDays(today, -27);

  const [todoTotal, todoDone, todaySummaryRow, weekSummaryRow, recentDailySummaries] = await Promise.all([
    prisma.todoItem.count({ where: { userId: user.id } }),
    prisma.todoItem.count({ where: { userId: user.id, isDone: true } }),
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
      where: { userId: user.id, day: { gte: recentStart, lte: today } },
      orderBy: { day: "asc" },
      select: {
        day: true,
        studiedMinutes: true,
        focusSessions: true,
      },
    }),
  ]);

  const dailyMap = new Map(recentDailySummaries.map((entry) => [entry.day.toISOString().slice(0, 10), entry]));
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

  const streakDays = countStreak(
    recentDailySummaries.map((entry) => ({
      day: entry.day,
      studiedMinutes: entry.studiedMinutes,
      focusSessions: entry.focusSessions,
    })),
    today,
  );

  const todaySummary = todaySummaryRow ?? {
    studiedMinutes: 0,
    focusSessions: 0,
    todosCompleted: 0,
    todosPlanned: 0,
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
    todaySummary,
    weekSummary: {
      ...weekSummary,
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      todosPlanned: todoTotal,
    },
    streakDays,
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
