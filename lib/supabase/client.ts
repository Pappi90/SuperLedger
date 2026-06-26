"use client";

/**
 * lib/supabase/client.ts — browser Supabase client.
 * Uses the PUBLIC anon key (safe to expose; protected by RLS). Never imports
 * the service key or the encryption key — those are server-only.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
