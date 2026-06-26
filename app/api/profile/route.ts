/**
 * app/api/profile/route.ts — save/load the user's profile.
 *
 * Runs SERVER-SIDE only, so it can use the encryption key safely. The browser
 * never sees the key or the ciphertext — it sends/receives plain numbers over
 * HTTPS, and this route encrypts before storing / decrypts after loading.
 *
 * GET  → return the logged-in user's saved profile (decrypted).
 * POST → save the logged-in user's profile (sensitive fields encrypted).
 *
 * RLS is still in force (we use the session client, not the service role), so
 * a user can only ever read/write their own row — defence in depth behind the
 * encryption.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptValue, decryptValue, hashEmail } from "@/lib/crypto";

export const runtime = "nodejs"; // ensure Node crypto is available (not edge)

type Prefs = {
  retireAge?: number;
  extra?: number;
  employerRate?: number;
  inflation?: number;
  gender?: "male" | "female" | "all";
  fundIdx?: number;
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("private_profile")
    .select("enc_balance, enc_salary, enc_age, prefs")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ profile: null });

  return NextResponse.json({
    profile: {
      balance: decryptValue(data.enc_balance),
      salary: decryptValue(data.enc_salary),
      age: decryptValue(data.enc_age),
      prefs: (data.prefs ?? {}) as Prefs,
    },
  });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  let body: { balance?: number; salary?: number; age?: number; prefs?: Prefs };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const row = {
    user_id: user.id,
    email_hash: user.email ? hashEmail(user.email) : null,
    enc_balance: encryptValue(body.balance ?? null),
    enc_salary: encryptValue(body.salary ?? null),
    enc_age: encryptValue(body.age ?? null),
    prefs: body.prefs ?? {},
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("private_profile")
    .upsert(row, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
