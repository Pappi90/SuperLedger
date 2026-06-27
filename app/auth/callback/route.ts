/**
 * app/auth/callback/route.ts — handles the redirect after email-link auth.
 *
 * Flow (default Supabase "Confirm signup" email, PKCE / code exchange):
 *   1. User clicks the link in their email.
 *   2. Supabase's /auth/v1/verify endpoint marks their email confirmed
 *      SERVER-SIDE, then redirects here with a one-time ?code=...
 *   3. We exchange that code for a session cookie so they're logged in.
 *
 * Key point: step 2 confirms the email regardless of whether step 3 succeeds.
 * The code exchange only logs them in ON THIS DEVICE/BROWSER. If the link is
 * opened in a different browser from the one used to sign up (very common —
 * e.g. a mail app's in-app browser), the PKCE verifier cookie isn't present and
 * the exchange fails. That is NOT a real failure: the account is confirmed, the
 * user just needs to log in here. So we redirect to a "confirmed, please log in"
 * state rather than showing a scary error.
 *
 * We always redirect to a SIGNALLED homepage state (?welcome / ?confirmed /
 * ?auth_error) so the user gets a clear outcome instead of landing on a bare
 * page that looks like nothing happened. Landing.tsx + AuthGate.tsx read these.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Supabase can redirect here with an error instead of a code — e.g. an
  // expired or already-used link (?error=access_denied&error_description=...).
  const errorDescription = searchParams.get("error_description");
  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(errorDescription)}`
    );
  }

  const code = searchParams.get("code");
  if (!code) {
    // No code and no error — malformed link. Send a generic, honest message.
    return NextResponse.redirect(
      `${origin}/?auth_error=${encodeURIComponent(
        "That confirmation link was incomplete. Please try the link again, or request a new one."
      )}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Email IS confirmed server-side; we just couldn't log them in here
    // (usually: link opened in a different browser/device). Tell them to log in.
    return NextResponse.redirect(`${origin}/?confirmed=1`);
  }

  // Success: session cookie is set, AuthGate will show the tool. Flag a welcome.
  return NextResponse.redirect(`${origin}/?welcome=1`);
}
