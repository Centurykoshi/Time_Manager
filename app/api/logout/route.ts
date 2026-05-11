import { auth } from "@/lib/auth";
import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const response = await auth.api.signOut({
      headers: request.headers,
    });
    
    if (response instanceof Response || response instanceof NextResponse) {
      return response;
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
