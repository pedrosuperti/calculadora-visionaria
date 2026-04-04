import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

/**
 * Server-side admin authentication.
 *
 * The admin password is stored in ADMIN_PASSWORD env var.
 * Clients must send it as a Bearer token (hashed) or via x-admin-token header.
 *
 * Flow:
 * 1. Client calls /api/admin/auth with password → gets back a token
 * 2. Client stores token in sessionStorage
 * 3. All subsequent API calls include token in Authorization header
 * 4. Server validates token on every request
 */

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export function generateToken(password: string): string {
  // Hash password + a server secret to create a token
  const secret = process.env.SUPABASE_SERVICE_KEY || "fallback-secret";
  return createHash("sha256").update(`${password}:${secret}`).digest("hex");
}

export function validateAdminAuth(request: NextRequest): boolean {
  if (!ADMIN_PASSWORD) {
    // If no password configured, reject all requests (fail closed)
    console.error("ADMIN_PASSWORD not set — all admin requests rejected");
    return false;
  }

  const expectedToken = generateToken(ADMIN_PASSWORD);

  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token === expectedToken) return true;
  }

  // Check x-admin-token header
  const tokenHeader = request.headers.get("x-admin-token") || "";
  if (tokenHeader && tokenHeader === expectedToken) return true;

  return false;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
  );
}
