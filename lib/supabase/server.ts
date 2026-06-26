/**
 * lib/supabase/server.ts — server Supabase client (App Router).
 * Reads the user's session from cookies. Uses the anon key + the logged-in
 * user's session, so RLS still applies (this is NOT the service-role client).
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component without write access — safe to ignore
            // when middleware refreshes sessions.
          }
        },
      },
    }
  );
}
