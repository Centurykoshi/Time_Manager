import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/dashboard";

export async function GET() {
  try {
    const snapshot = await getDashboardSnapshot();
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
