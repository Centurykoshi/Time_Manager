import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dashboard";
import { addDaysToDateKey, getTimeZoneFromHeaders, startOfWeekKeyInTimeZone, toDateKeyInTimeZone } from "@/lib/timezone";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const userId = user.id;
    const timeZone = getTimeZoneFromHeaders(req.headers);

    const now = new Date();
    const todayKey = toDateKeyInTimeZone(now, timeZone);
    const yesterdayKey = addDaysToDateKey(todayKey, -1, timeZone);
    const weekStartKey = startOfWeekKeyInTimeZone(now, timeZone);
    const monthStartKey = `${todayKey.slice(0, 8)}01`;
    const yearStartKey = `${todayKey.slice(0, 4)}-01-01`;

    // Fetch todos grouped by time period
    const allTodos = await prisma.todoItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const todos = {
      today: allTodos.filter((t) => {
        const createdKey = toDateKeyInTimeZone(new Date(t.createdAt), timeZone);
        return createdKey === todayKey;
      }),
      yesterday: allTodos.filter((t) => {
        const createdKey = toDateKeyInTimeZone(new Date(t.createdAt), timeZone);
        return createdKey === yesterdayKey;
      }),
      thisWeek: allTodos.filter((t) => {
        const createdKey = toDateKeyInTimeZone(new Date(t.createdAt), timeZone);
        return createdKey >= weekStartKey && createdKey <= todayKey;
      }),
      thisMonth: allTodos.filter((t) => {
        const createdKey = toDateKeyInTimeZone(new Date(t.createdAt), timeZone);
        return createdKey >= monthStartKey && createdKey <= todayKey;
      }),
      thisYear: allTodos.filter((t) => {
        const createdKey = toDateKeyInTimeZone(new Date(t.createdAt), timeZone);
        return createdKey >= yearStartKey && createdKey <= todayKey;
      }),
      allTime: allTodos,
    };

    // Fetch goals
    const goals = await prisma.goal.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      todos,
      goals,
    });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
