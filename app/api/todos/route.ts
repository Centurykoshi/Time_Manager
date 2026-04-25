import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardUser } from "@/lib/dashboard";

export async function GET() {
  const user = await getDashboardUser();
  const todos = await prisma.todoItem.findMany({
    where: { userId: user.id },
    orderBy: [{ isDone: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ todos });
}

export async function POST(request: NextRequest) {
  const user = await getDashboardUser();
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    estimatedMinutes?: number | null;
    priority?: "LOW" | "MEDIUM" | "HIGH";
  };

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const todo = await prisma.todoItem.create({
    data: {
      userId: user.id,
      title,
      description: body.description?.trim() || null,
      estimatedMinutes: body.estimatedMinutes ?? null,
      priority: body.priority ?? "MEDIUM",
    },
  });

  return NextResponse.json({ todo }, { status: 201 });
}
