import { NextRequest, NextResponse } from "next/server";
import { generateToken } from "@/lib/admin-auth";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Admin not configured" },
        { status: 503 }
      );
    }

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const token = generateToken(password);

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
