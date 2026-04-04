import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateAdminAuth, unauthorizedResponse } from "@/lib/admin-auth";

// Creates the formsapp_unmatched table if it doesn't exist
export async function POST(request: NextRequest) {
  if (!validateAdminAuth(request)) return unauthorizedResponse();
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // Use RPC to create table (requires service key with DDL permissions)
    const { error } = await supabase.rpc("exec_sql", {
      query: `
        CREATE TABLE IF NOT EXISTS formsapp_unmatched (
          id SERIAL PRIMARY KEY,
          payload JSONB NOT NULL,
          phone_digits TEXT,
          name_candidates TEXT[],
          matched BOOLEAN DEFAULT FALSE,
          matched_lead_id INTEGER,
          matched_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_formsapp_unmatched_matched ON formsapp_unmatched(matched);
      `,
    });

    if (error) {
      // Fallback: try direct insert to see if table already exists
      const { error: testError } = await supabase
        .from("formsapp_unmatched")
        .select("id")
        .limit(1);

      if (testError && testError.message.includes("does not exist")) {
        return NextResponse.json({
          error: "Table does not exist. Please create it manually in Supabase SQL editor",
          sql: `CREATE TABLE formsapp_unmatched (
  id SERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  phone_digits TEXT,
  name_candidates TEXT[],
  matched BOOLEAN DEFAULT FALSE,
  matched_lead_id INTEGER,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_formsapp_unmatched_matched ON formsapp_unmatched(matched);`,
        }, { status: 500 });
      }

      return NextResponse.json({ status: "ok", message: "Table already exists" });
    }

    return NextResponse.json({ status: "ok", message: "Table created" });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
