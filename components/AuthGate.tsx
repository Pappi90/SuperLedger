"use client";

/**
 * AuthGate.tsx — SuperLedger Phase 2 — REAL AUTHENTICATION
 *
 * Now backed by Supabase Auth. Checks for a live session:
 *   • no session  → show the Landing/signup view
 *   • session     → show the hero + full Tool + footer, with a sign-out control
 *
 * This is a genuine boundary: the tool is gated on a real authenticated session,
 * and the user's saved data is protected server-side by RLS + field encryption.
 *
 * NOTE on what "gating" means here: the calculator's reference DATA (APRA funds
 * etc.) is public JSON either way — gating it is a product choice, not secrecy.
 * What's actually protected is the user's SAVED profile (balance/salary/age),
 * which lives encrypted server-side and is never in the client bundle.
 */

import { useState, useEffect, type ReactNode } from "react";
import Landing from "./Landing";
import Tool from "./Tool";
import { createClient } from "@/lib/supabase/client";

type HookData = {
  netGapLabel: string;
  lifetimeGapLabel: string;
  retirementYears: string;
  feeGap: number;
  bottom20: number;
  top10: number;
  count: number;
};

export default function AuthGate({
  hooks,
  hero,
  footer,
}: {
  hooks: HookData;
  hero: ReactNode;
  footer: ReactNode;
}) {
  // Create the Supabase browser client lazily, once, on the client only.
  // Using a useState initializer (rather than calling createClient() directly in
  // the render body) guarantees it never runs during a server/prerender pass —
  // which is where the "URL and API key required" build error came from.
  const [supabase] = useState(() => createClient());
  const [status, setStatus] = useState<"loading" | "in" | "out">("loading");
  const [alias, setAlias] = useState<string | null>(null);
  const [welcome, setWelcome] = useState(false);

  // If we arrived here straight from a successful email-confirmation link
  // (app/auth/callback redirects to /?welcome=1), show a one-time confirmation
  // banner, then strip the param so a refresh doesn't repeat it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      setWelcome(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setStatus("out"); return; }
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setStatus(data.user ? "in" : "out");
      setAlias((data.user?.user_metadata?.alias as string) ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setStatus(session?.user ? "in" : "out");
      setAlias((session?.user?.user_metadata?.alias as string) ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (!supabase) {
    return (
      <main className="wrap" style={{ padding: "80px 28px", color: "var(--clay)", lineHeight: 1.6 }}>
        Sign-in isn&apos;t configured yet. (The app&apos;s connection keys aren&apos;t loaded.)
        If you&apos;re the site owner, check the Supabase environment variables are set for this
        project in Vercel.
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className="wrap" style={{ padding: "80px 28px", color: "var(--ink-faint)" }}>
        Loading…
      </main>
    );
  }

  if (status === "out") {
    return <Landing hooks={hooks} />;
  }

  return (
    <main>
      {welcome && (
        <div className="wrap" style={{ paddingTop: 16 }}>
          <div role="status" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 14, color: "var(--green)", background: "var(--green-soft)", border: "1px solid #cfe4d8", borderRadius: 10, padding: "12px 14px" }}>
            <span>Your email is confirmed — you&apos;re all set and logged in.</span>
            <button
              onClick={() => setWelcome(false)}
              aria-label="Dismiss"
              style={{ flex: "0 0 auto", fontSize: 13, color: "var(--ink-soft)", background: "transparent", border: "1px solid var(--rule-strong)", borderRadius: 8, padding: "4px 10px" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
      <div className="wrap" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, paddingTop: 16 }}>
        {alias && <span className="mono" style={{ fontSize: 13, color: "var(--ink-faint)" }}>@{alias}</span>}
        <button
          onClick={async () => { if (supabase) await supabase.auth.signOut(); }}
          style={{ fontSize: 13, color: "var(--ink-soft)", background: "transparent", border: "1px solid var(--rule-strong)", borderRadius: 8, padding: "6px 12px" }}>
          Sign out
        </button>
      </div>
      {hero}
      <section className="wrap" style={{ paddingBottom: 80 }}>
        <Tool />
      </section>
      {footer}
    </main>
  );
}
