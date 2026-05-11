import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dashboard";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const todos = await prisma.todoItem.findMany({
      where: { userId: user.id },
      orderBy: [{ isDone: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ todos });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      estimatedMinutes?: number | null;
      priority?: "LOW" | "MEDIUM" | "HIGH";
      difficulty?: "EASY" | "MEDIUM" | "HARD" | "BOSS";
      createdAt?: string;
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const createdAt = body.createdAt ? new Date(body.createdAt) : null;
    const todo = await prisma.todoItem.create({
      data: {
        userId: user.id,
        title,
        description: body.description?.trim() || null,
        estimatedMinutes: body.estimatedMinutes ?? null,
        priority: body.priority ?? "MEDIUM",
        difficulty: body.difficulty ?? "EASY",
        ...(createdAt && !Number.isNaN(createdAt.getTime()) ? { createdAt } : {}),
      },
    });

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
