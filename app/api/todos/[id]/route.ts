import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardUser } from "@/lib/dashboard";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getDashboardUser();
  const { id } = await params;
  const body = (await request.json()) as {
    title?: string;
    description?: string | null;
    done?: boolean;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    estimatedMinutes?: number | null;
    sortOrder?: number | null;
  };

  const updateResult = await prisma.todoItem.updateMany({
    where: { id, userId: user.id },
    data: {
      title: body.title?.trim(),
      description: body.description === undefined ? undefined : body.description?.trim() || null,
      isDone: body.done,
      priority: body.priority,
      estimatedMinutes: body.estimatedMinutes ?? undefined,
      sortOrder: body.sortOrder ?? undefined,
      completedAt: body.done === undefined ? undefined : body.done ? new Date() : null,
    },
  });

  if (updateResult.count === 0) {
    return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  }

  const todo = await prisma.todoItem.findFirst({ where: { id, userId: user.id } });
  return NextResponse.json({ todo });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getDashboardUser();
  const { id } = await params;

  const deleteResult = await prisma.todoItem.deleteMany({ where: { id, userId: user.id } });

  if (deleteResult.count === 0) {
    return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
