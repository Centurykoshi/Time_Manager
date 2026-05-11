import { getCurrentUser } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    let settings = await prisma.timerSettings.findUnique({
      where: { userId: user.id },
    });

    if (!settings) {
      settings = await prisma.timerSettings.create({
        data: {
          userId: user.id,
          animationIcon: "Zap",
          soundType: "wind",
          soundUrl: "https://www.youtube.com/watch?v=LjRygr4xR7g&t=1496s",
          timerStatus: "IDLE",
          timerDurationSec: 25 * 60,
          timerRemainingSec: 25 * 60,
        },
      });
    }

    return Response.json(settings);
  } catch (error) {
    console.error("GET /api/timer-settings:", error);
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const { animationIcon, soundType, soundUrl, favoriteMinutes, latestMinutes, timerStatus, timerDurationSec, timerRemainingSec, timerEndsAt } = (await request.json()) as {
      animationIcon?: string;
      soundType?: string;
      soundUrl?: string;
      favoriteMinutes?: number;
      latestMinutes?: number;
      timerStatus?: string;
      timerDurationSec?: number;
      timerRemainingSec?: number;
      timerEndsAt?: string | null;
    };

    const settings = await prisma.timerSettings.upsert({
      where: { userId: user.id },
      update: {
        ...(animationIcon && { animationIcon }),
        ...(soundType && { soundType }),
        ...(soundUrl && { soundUrl }),
        ...(favoriteMinutes !== undefined && { favoriteMinutes }),
        ...(latestMinutes !== undefined && { latestMinutes }),
        ...(timerStatus !== undefined && { timerStatus }),
        ...(timerDurationSec !== undefined && { timerDurationSec: Math.max(1, Math.round(timerDurationSec)) }),
        ...(timerRemainingSec !== undefined && { timerRemainingSec: Math.max(0, Math.round(timerRemainingSec)) }),
        ...(timerEndsAt !== undefined && { timerEndsAt: timerEndsAt ? new Date(timerEndsAt) : null }),
      },
      create: {
        userId: user.id,
        animationIcon: animationIcon || "Zap",
        soundType: soundType || "wind",
        soundUrl: soundUrl || "https://www.youtube.com/watch?v=LjRygr4xR7g&t=1496s",
        favoriteMinutes: favoriteMinutes ?? 25,
        latestMinutes: latestMinutes ?? 25,
        timerStatus: timerStatus || "IDLE",
        timerDurationSec: Math.max(1, Math.round(timerDurationSec ?? 25 * 60)),
        timerRemainingSec: Math.max(0, Math.round(timerRemainingSec ?? 25 * 60)),
        timerEndsAt: timerEndsAt ? new Date(timerEndsAt) : null,
      },
    });

    return Response.json(settings);
  } catch (error) {
    console.error("POST /api/timer-settings:", error);
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    const { favoriteMinutes, latestMinutes, timerStatus, timerDurationSec, timerRemainingSec, timerEndsAt } = (await request.json()) as {
      favoriteMinutes?: number;
      latestMinutes?: number;
      timerStatus?: string;
      timerDurationSec?: number;
      timerRemainingSec?: number;
      timerEndsAt?: string | null;
    };

    if (
      favoriteMinutes === undefined &&
      latestMinutes === undefined &&
      timerStatus === undefined &&
      timerDurationSec === undefined &&
      timerRemainingSec === undefined &&
      timerEndsAt === undefined
    ) {
      return Response.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const settings = await prisma.timerSettings.upsert({
      where: { userId: user.id },
      update: {
        ...(favoriteMinutes !== undefined && { favoriteMinutes }),
        ...(latestMinutes !== undefined && { latestMinutes }),
        ...(timerStatus !== undefined && { timerStatus }),
        ...(timerDurationSec !== undefined && { timerDurationSec: Math.max(1, Math.round(timerDurationSec)) }),
        ...(timerRemainingSec !== undefined && { timerRemainingSec: Math.max(0, Math.round(timerRemainingSec)) }),
        ...(timerEndsAt !== undefined && { timerEndsAt: timerEndsAt ? new Date(timerEndsAt) : null }),
      },
      create: {
        userId: user.id,
        animationIcon: "Zap",
        soundType: "wind",
        soundUrl: "https://www.youtube.com/watch?v=LjRygr4xR7g&t=1496s",
        favoriteMinutes: favoriteMinutes ?? 25,
        latestMinutes: latestMinutes ?? 25,
        timerStatus: timerStatus || "IDLE",
        timerDurationSec: Math.max(1, Math.round(timerDurationSec ?? 25 * 60)),
        timerRemainingSec: Math.max(0, Math.round(timerRemainingSec ?? 25 * 60)),
        timerEndsAt: timerEndsAt ? new Date(timerEndsAt) : null,
      },
    });

    return Response.json(settings);
  } catch (error) {
    console.error("PATCH /api/timer-settings:", error);
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}
