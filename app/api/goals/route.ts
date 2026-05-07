import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDashboardUser } from "@/lib/dashboard";

const defaultGroups = [
  { name: "Weekly", slug: "weekly", type: "WEEKLY" },
  { name: "Monthly", slug: "monthly", type: "MONTHLY" },
  { name: "Yearly", slug: "yearly", type: "YEARLY" },
  { name: "All Time", slug: "all-time", type: "ALL_TIME" },
] as const;

export async function GET() {
  const user = await getDashboardUser();
  const groups = await Promise.all(
    defaultGroups.map((group) =>
      prisma.goalGroup.upsert({
        where: { userId_slug: { userId: user.id, slug: group.slug } },
        update: { name: group.name, type: group.type },
        create: { userId: user.id, ...group },
      }),
    ),
  );

  const groupByType = new Map(groups.map((group) => [group.type, group] as const));

  await Promise.all(
    defaultGroups.map((group) =>
      prisma.goal.updateMany({
        where: {
          userId: user.id,
          isArchived: false,
          goalGroupId: null,
          cadence: group.type,
        },
        data: {
          goalGroupId: groupByType.get(group.type)?.id,
        },
      }),
    ),
  );

  const goals = await prisma.goal.findMany({
    where: { userId: user.id, isArchived: false },
    include: { goalGroup: true },
    orderBy: [{ cadence: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  const user = await getDashboardUser();
  const body = (await request.json()) as {
    title?: string;
    description?: string | null;
    cadence?: "WEEKLY" | "MONTHLY" | "YEARLY" | "ALL_TIME";
    targetValue?: number;
    currentValue?: number;
    unit?: string;
    goalGroupId?: string | null;
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
      goalGroupId: body.goalGroupId ?? null,
    },
  });

  return NextResponse.json({ goal }, { status: 201 });
}
