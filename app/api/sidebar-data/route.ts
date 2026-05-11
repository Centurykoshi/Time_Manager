import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dashboard";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay());

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Fetch todos grouped by time period
    const allTodos = await prisma.todoItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const todos = {
      today: allTodos.filter((t) => {
        const createdDate = new Date(t.createdAt);
        return createdDate >= today && createdDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }),
      yesterday: allTodos.filter((t) => {
        const createdDate = new Date(t.createdAt);
        return createdDate >= yesterday && createdDate < today;
      }),
      thisWeek: allTodos.filter((t) => {
        const createdDate = new Date(t.createdAt);
        return createdDate >= weekStart && createdDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }),
      thisMonth: allTodos.filter((t) => {
        const createdDate = new Date(t.createdAt);
        return createdDate >= monthStart && createdDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }),
      thisYear: allTodos.filter((t) => {
        const createdDate = new Date(t.createdAt);
        return createdDate >= yearStart && createdDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
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
