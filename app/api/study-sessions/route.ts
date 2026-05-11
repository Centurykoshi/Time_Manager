import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, recordStudySession } from "@/lib/dashboard";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const sessions = await prisma.studySession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 12,
    });
    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      durationMinutes?: number;
      startedAt?: string;
      endedAt?: string;
      subject?: string | null;
      notes?: string | null;
      source?: "TIMER" | "MANUAL" | "IMPORTED";
    };

    if (!body.durationMinutes || body.durationMinutes <= 0) {
      return NextResponse.json({ error: "durationMinutes is required." }, { status: 400 });
    }

    const session = await recordStudySession({
      durationMinutes: body.durationMinutes,
      startedAt: body.startedAt ? new Date(body.startedAt) : undefined,
      endedAt: body.endedAt ? new Date(body.endedAt) : undefined,
      subject: body.subject ?? null,
      notes: body.notes ?? null,
      source: body.source ?? "TIMER",
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
