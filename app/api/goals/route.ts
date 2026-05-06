import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardUser } from "@/lib/dashboard";

export async function GET() {
  const user = await getDashboardUser();
  const goals = await prisma.goal.findMany({
    where: { userId: user.id, isArchived: false },
    orderBy: [{ cadence: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  const user = await getDashboardUser();
  const body = (await request.json()) as {
    title?: string;
    description?: string | null;
    cadence?: "WEEKLY" | "MONTHLY";
    targetValue?: number;
    currentValue?: number;
    unit?: string;
  };

  const title = body.title?.trim();
  const targetValue = Number(body.targetValue ?? 0);

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!Number.isFinite(targetValue) || targetValue <= 0) {
    return NextResponse.json({ error: "targetValue must be greater than 0." }, { status: 400 });
  }

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      title,
      description: body.description?.trim() || null,
      cadence: body.cadence ?? "WEEKLY",
      targetValue: Math.round(targetValue),
      currentValue: Math.max(0, Math.round(body.currentValue ?? 0)),
      unit: body.unit?.trim() || "sessions",
    },
  });

  return NextResponse.json({ goal }, { status: 201 });
}
