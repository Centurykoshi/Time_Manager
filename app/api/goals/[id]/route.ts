import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dashboard";
import { getGoalCheckInXp } from "@/lib/xp";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const existing = await prisma.goal.findFirst({ where: { id, userId: user.id } });
    const body = (await request.json()) as {
      title?: string;
      description?: string | null;
      cadence?: "WEEKLY" | "MONTHLY" | "YEARLY" | "ALL_TIME";
      targetValue?: number;
      currentValue?: number;
      unit?: string;
      isArchived?: boolean;
      goalGroupId?: string | null;
      goalTagId?: string | null;
    };

    if (body.goalTagId) {
      const tag = await prisma.todoTag.findFirst({ where: { id: body.goalTagId, userId: user.id } });
      if (!tag) {
        return NextResponse.json({ error: "Goal tag not found." }, { status: 404 });
      }
    }

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
        goalGroupId: body.goalGroupId === undefined ? undefined : body.goalGroupId,
        goalTagId: body.goalTagId === undefined ? undefined : body.goalTagId,
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    }

    const goal = await prisma.goal.findFirst({ where: { id, userId: user.id }, include: { goalTag: true } });

    // If goal progress increased, create a completed TodoItem to represent the progress
    try {
      if (existing && goal && body.currentValue !== undefined) {
        const prev = existing.currentValue ?? 0;
        const next = goal.currentValue ?? 0;
        const delta = Math.max(0, next - prev);
        if (delta > 0) {
          const xpPerUnit = getGoalCheckInXp(goal.targetValue, goal.cadence, goal.goalTag?.goalXp);
          const totalXp = xpPerUnit * delta;

          await prisma.todoItem.create({
            data: {
              title: `Goal check-in: ${goal.title}`,
              description: `Logged ${delta} ${goal.unit} for ${goal.title}. This turns the goal into XP and a completed todo feed item.`,
              isDone: true,
              difficulty: "MEDIUM",
              xpEarned: totalXp,
              completedAt: new Date(),
              userId: user.id,
            },
          });
        }
      }
    } catch (err) {
      // don't fail the request if XP bookkeeping fails
      console.error("Failed to record goal progress XP:", err);
    }

    return NextResponse.json({ goal });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const deleteResult = await prisma.goal.deleteMany({ where: { id, userId: user.id } });

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

  return NextResponse.json({ ok: true });
}
