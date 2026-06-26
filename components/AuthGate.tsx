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
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "in" | "out">("loading");
  const [alias, setAlias] = useState<string | null>(null);

  useEffect(() => {
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
      <div className="wrap" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, paddingTop: 16 }}>
        {alias && <span className="mono" style={{ fontSize: 13, color: "var(--ink-faint)" }}>@{alias}</span>}
        <button
          onClick={async () => { await supabase.auth.signOut(); }}
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
