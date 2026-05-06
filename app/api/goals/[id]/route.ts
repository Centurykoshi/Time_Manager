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
    cadence?: "WEEKLY" | "MONTHLY";
    targetValue?: number;
    currentValue?: number;
    unit?: string;
    isArchived?: boolean;
  };

  const updateResult = await prisma.goal.updateMany({
    where: { id, userId: user.id },
    data: {
      title: body.title?.trim(),
      description: body.description === undefined ? undefined : body.description?.trim() || null,
      cadence: body.cadence,
      targetValue: body.targetValue === undefined ? undefined : Math.max(1, Math.round(body.targetValue)),
      currentValue: body.currentValue === undefined ? undefined : Math.max(0, Math.round(body.currentValue)),
      unit: body.unit === undefined ? undefined : body.unit.trim() || "sessions",
      isArchived: body.isArchived,
    },
  });

  if (updateResult.count === 0) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }

  const goal = await prisma.goal.findFirst({ where: { id, userId: user.id } });
  return NextResponse.json({ goal });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getDashboardUser();
  const { id } = await params;

  const deleteResult = await prisma.goal.deleteMany({ where: { id, userId: user.id } });

  if (deleteResult.count === 0) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
