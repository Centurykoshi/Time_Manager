import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/dashboard";
import { getTimeZoneFromHeaders } from "@/lib/timezone";

export async function GET(request: Request) {
  try {
    const timeZone = getTimeZoneFromHeaders(request.headers);
    const snapshot = await getDashboardSnapshot(timeZone);
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
