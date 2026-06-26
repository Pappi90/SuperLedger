"use client";

/**
 * lib/supabase/client.ts — browser Supabase client.
 * Uses the PUBLIC anon key (safe to expose; protected by RLS). Never imports
 * the service key or the encryption key — those are server-only.
 */

import { createBrowserClient } from "@supabase/ssr";

/**
 * Returns a Supabase browser client, or null if the public env vars aren't
 * available. Returning null (instead of throwing) lets the UI show a clear
 * message rather than crashing the page. If you ever see the "not configured"
 * state in the live app, the NEXT_PUBLIC_ vars aren't reaching this Vercel
 * project — check Project → Settings → Environment Variables (and that they're
 * applied to Production, not only Preview, and not only a different scope).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
