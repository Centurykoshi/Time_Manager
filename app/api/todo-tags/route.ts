import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dashboard";

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toGoalXp(slug: string, fallback = 10) {
  if (!slug) return fallback;

  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) | 0;
  }

  return 8 + Math.abs(hash % 13);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    const tags = await prisma.todoTag.findMany({
      where: { userId: user.id },
      orderBy: [{ isBuiltin: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ tags });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = (await request.json()) as {
      name?: string;
      goalXp?: number;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Tag name is required." }, { status: 400 });
    }

    const slug = toSlug(name);
    if (!slug) {
      return NextResponse.json({ error: "Tag name is required." }, { status: 400 });
    }

    const explicitGoalXp = Number.isFinite(body.goalXp ?? NaN) ? Math.max(1, Math.round(body.goalXp ?? 10)) : null;
    const computedGoalXp = explicitGoalXp ?? toGoalXp(slug);

    const tag = await prisma.todoTag.upsert({
      where: { userId_slug: { userId: user.id, slug } },
      update: {
        name,
        ...(explicitGoalXp !== null ? { goalXp: explicitGoalXp } : {}),
      },
      create: {
        userId: user.id,
        name,
        slug,
        goalXp: computedGoalXp,
      },
    });

    return NextResponse.json({ tag }, { status: 200 });
  } catch (error) {
    console.error("Failed to save goal tag:", error);
    return NextResponse.json({ error: "Failed to save tag." }, { status: 500 });
  }
}