/**
 * app/api/leaderboard/route.ts — read + write the public-by-alias leaderboard.
 *
 * GET  → public rows (RLS already filters to is_public = true), with tiered
 *        k-anonymity SUPPRESSION applied per the privacy consult:
 *          • major retail/industry funds: need >= 5 public users to show a row
 *          • boutique/corporate funds:    need >= 10 (set via BOUTIQUE list)
 *        Rows in under-populated funds are withheld to prevent the "jigsaw"
 *        re-identification the lawyer flagged.
 * POST → upsert the CURRENT user's public row and set is_public. This is the
 *        active-consent opt-in: a row only becomes visible when the user does this.
 *
 * Note: exact dollars are NEVER stored or returned here — only alias, fund,
 * and a banded performance figure.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Tiered suppression thresholds (privacy consult).
const N_MAJOR = 5;
const N_BOUTIQUE = 10;
// Funds treated as boutique/corporate get the higher threshold. Extend as needed.
// (Kept as a simple list now; can be data-driven off member counts later.)
const BOUTIQUE_FUNDS = new Set<string>([
  // e.g. "Goldman Sachs & JBWere Superannuation Fund", ...
]);

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("public_alias")
    .select("alias, fund_name, net_return_band, on_track_bucket")
    .eq("is_public", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  // Count public users per fund, then suppress rows in under-populated funds.
  const counts = new Map<string, number>();
  for (const r of rows) {
    const f = r.fund_name ?? "";
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  const visible = rows.filter((r) => {
    const f = r.fund_name ?? "";
    const threshold = BOUTIQUE_FUNDS.has(f) ? N_BOUTIQUE : N_MAJOR;
    return (counts.get(f) ?? 0) >= threshold;
  });

  return NextResponse.json({ leaderboard: visible });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: {
    alias: string;
    fund_name?: string;
    net_return_band?: string;
    on_track_bucket?: string | null;
    is_public: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!body.alias || typeof body.is_public !== "boolean") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { error } = await supabase.from("public_alias").upsert(
    {
      user_id: user.id,
      alias: body.alias,
      fund_name: body.fund_name ?? null,
      net_return_band: body.net_return_band ?? null,
      on_track_bucket: body.on_track_bucket ?? null,
      is_public: body.is_public,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
