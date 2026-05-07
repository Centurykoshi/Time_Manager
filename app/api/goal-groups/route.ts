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
  const groups = await prisma.goalGroup.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });

  if (groups.length === 0) {
    const created = [];
    for (const group of defaultGroups) {
      created.push(
        await prisma.goalGroup.upsert({
          where: { userId_slug: { userId: user.id, slug: group.slug } },
          update: {},
          create: { userId: user.id, ...group },
        }),
      );
    }
    return NextResponse.json({ groups: created });
  }

  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest) {
  const user = await getDashboardUser();
  const body = (await request.json()) as { name?: string; slug?: string; type?: "WEEKLY" | "MONTHLY" | "YEARLY" | "ALL_TIME" };

  const name = body.name?.trim();
  const slug = body.slug?.trim();
  const type = body.type?.trim();

  if (!name || !slug || !type) {
    return NextResponse.json({ error: "name, slug and type are required" }, { status: 400 });
  }

  const existing = await prisma.goalGroup.findFirst({ where: { userId: user.id, slug } });
  if (existing) return NextResponse.json({ group: existing }, { status: 200 });

  const group = await prisma.goalGroup.create({
    data: {
      userId: user.id,
      name,
      slug,
      type,
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}
