"use client";

/**
 * Landing.tsx — SuperLedger Phase 2 front door — LIVE SIGNUP / LOGIN
 *
 * Wired to Supabase Auth. Creates a real account (email + password + alias),
 * or logs an existing user in. The alias is stored in the user's auth metadata.
 *
 * The "Security Vault" copy is now backed by the real architecture: sensitive
 * fields are encrypted server-side (lib/crypto.ts) with a key the database
 * never holds, and the profile is private by default (no public leaderboard
 * row until the user opts in inside the tool).
 *
 * ⚠️ BEFORE PROMOTING THIS PUBLICLY: the three legal artifacts (privacy policy,
 * APP-5 collection notice, NDB plan) must be finalised by your privacy lawyer
 * and live on the site. Auth + save are cleared to run; public promotion waits
 * on those documents being published.
 */

import { useState, useEffect } from "react";
import LegalDisclaimer from "./LegalDisclaimer";
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

export default function Landing({ hooks }: { hooks: HookData }) {
  // Lazy, client-only Supabase client (see AuthGate for why — avoids the
  // prerender-time "URL and API key required" error).
  const [supabase] = useState(() => createClient());
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alias, setAlias] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Read the outcome of an email-confirmation link (set by app/auth/callback).
  // ?confirmed=1  → email verified but not logged in on this device → ask to log in
  // ?auth_error=… → expired/invalid link → show the message
  // We strip the query string afterwards so a refresh doesn't re-show the banner.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (params.get("confirmed") === "1") {
      setMode("login");
      setNotice("Your email is confirmed. Log in below to continue.");
    } else if (authError) {
      setError(authError);
    }
    if (params.has("confirmed") || params.has("auth_error") || params.has("welcome")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const cleanAlias = alias.trim().replace(/^@+/, "");
  const canSubmit =
    mode === "login"
      ? email.trim() !== "" && password !== ""
      : email.trim() !== "" && password.length >= 10 && cleanAlias !== "";

  async function handleSubmit() {
    if (!supabase) {
      setError("Sign-in isn't configured yet. Please try again later.");
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { alias: cleanAlias },
            emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
          },
        });
        if (error) throw error;
        // If email confirmation is ON in Supabase, the user must confirm first.
        // If it's OFF, onAuthStateChange in AuthGate will flip straight to the tool.
        setNotice(
          "Account created. If you're asked to confirm your email, check your inbox — otherwise you're in."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // AuthGate's listener will swap to the tool automatically.
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header className="lhero">
        <div className="wrap lhero-grid">
          {/* LEFT: pitch + hooks */}
          <div className="lhero-left">
            <div className="eyebrow">Australian superannuation · official APRA data</div>
            <h1 className="lhero-title">
              Your super is quietly<br />
              <span className="ital">winning or losing</span> you<br />
              hundreds of thousands of dollars.
            </h1>
            <p className="lhero-sub">
              Most Australians never check. Create a free anonymous account to see exactly
              where your fund ranks on net returns and fees — against every MySuper product
              in the country. Secure alias login. No advice. Just the numbers.
            </p>

            <div className="hook-row">
              <div className="lhook">
                <span className="hook-fig mono">{hooks.netGapLabel}</span>
                <span className="hook-text">
                  is the all-in difference a fund&apos;s{" "}
                  <strong style={{ color: "var(--ink)" }}>performance</strong> has made over a
                  working life — top 10% versus bottom 20%, after fees. Returns are the bigger lever.
                  <span className="hook-note">
                    Net-return spread ({hooks.bottom20.toFixed(1)}% to {hooks.top10.toFixed(1)}%)
                    over the last 5 years, compounded over a 37-year career. Past performance
                    doesn&apos;t predict future returns — this shows why the choice matters, not a
                    gain you can count on. Illustrative, not a forecast. Figures are future
                    (nominal) dollars, not discounted to today&apos;s value; the tool below shows
                    today&apos;s-dollar equivalents for your own projection.
                  </span>
                </span>
              </div>

              <div className="lhook hook-fees">
                <span className="hook-fig mono">{hooks.lifetimeGapLabel}</span>
                <span className="hook-text">
                  of that is just <strong style={{ color: "var(--ink)" }}>fees</strong> — about{" "}
                  {hooks.retirementYears} years of a comfortable retirement, between the cheapest
                  and priciest fund. And fees are the part you control.
                  <span className="hook-note">
                    The {hooks.feeGap.toFixed(2)}-point fee gap, compounded over the same career.
                    Counts the growth those fees would have earned too, not just the fees
                    themselves. Illustrative, not a forecast. Future (nominal) dollars; the
                    tool below shows today&apos;s-dollar equivalents.
                  </span>
                </span>
              </div>
            </div>

            <p className="hook-framing">
              Returns are the bigger lever — fees are the one you control.
            </p>

            <div className="trustline mono">
              <span>{hooks.count} MySuper products</span>
              <span>APRA CPPP, June 2025</span>
              <span>ATO Snapshot Tables</span>
              <span>ASFA Retirement Standard</span>
            </div>
          </div>

          {/* RIGHT: signup / login card */}
          <div className="signup">
            <h2 className="signup-head">
              {mode === "signup" ? "Create your free account" : "Welcome back"}
            </h2>
            <p className="signup-sub">
              {mode === "signup"
                ? "Anonymous by design. Takes about a minute."
                : "Log in to see your saved comparison."}
            </p>

            <div className="field">
              <label className="flabel">
                Email <span className="req">*</span>
              </label>
              <input
                className="finput"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {mode === "signup" && (
                <div className="fhint">Used only to log you in. Never shown to other users.</div>
              )}
            </div>

            <div className="field">
              <label className="flabel">
                Password <span className="req">*</span>
              </label>
              <input
                className="finput"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 10 characters" : "Your password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {mode === "signup" && (
              <div className="field">
                <label className="flabel">
                  Choose your anonymous alias <span className="req">*</span>
                </label>
                <div className="alias-wrap">
                  <span className="alias-at mono">@</span>
                  <input
                    className="finput alias-input mono"
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    placeholder="SuperSaver88"
                    autoComplete="off"
                  />
                </div>
                <div className="fhint">This is the only name other users will ever see.</div>
              </div>
            )}

            {error && (
              <div role="alert" style={{ fontSize: 13, color: "var(--clay)", background: "var(--clay-soft)", border: "1px solid #e6c4b8", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                {error}
              </div>
            )}
            {notice && (
              <div style={{ fontSize: 13, color: "var(--green)", background: "var(--green-soft)", border: "1px solid #cfe4d8", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                {notice}
              </div>
            )}

            <button
              className="cta"
              onClick={handleSubmit}
              disabled={!canSubmit || busy}
              title={canSubmit ? "" : mode === "signup" ? "Email, a 10+ character password, and an alias are required" : "Enter your email and password"}
            >
              {busy ? "Please wait…" : mode === "signup" ? "Create account & see my ranking" : "Log in"}
            </button>
            <button
              className="cta-ghost"
              onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(null); setNotice(null); }}
            >
              {mode === "signup" ? "Already have an account? Log in" : "Need an account? Sign up"}
            </button>

            {/* SECURITY VAULT — honest copy, backed by the blueprint architecture.
                Do not soften back to "completely encrypted" without the backend
                that makes it true. */}
            <div className="vault">
              <div className="vault-head">🔒 Your Security Vault</div>
              <p>
                Your <span className="em">balance, salary, and age</span> are encrypted with a key
                our database never stores — so they can&apos;t be read from a database dump, and
                they&apos;re never shown to anyone else.
              </p>
              <p>
                Your <span className="em">email</span> is used only to log you in and is never
                shown to other users.
              </p>
              <p>
                Other users only ever see your{" "}
                <span className="em">anonymous alias, your chosen super fund, and your
                performance band</span>. We never sell individual or identifiable financial
                data — only aggregated, de-identified insights.
              </p>
            </div>

            <p className="fineprint mono">
              General information only · not personal financial advice
            </p>

            <LegalDisclaimer compact />
          </div>
        </div>
      </header>

      <style>{`
        .preview-banner {
          background: #2a2824; color: var(--ink-invert);
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
          text-align: center; padding: 7px 12px;
        }
        .lhero { padding: 36px 0 64px; }
        .lhero-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 52px; align-items: start; }
        .lhero-title { font-size: clamp(32px, 5vw, 52px); margin: 18px 0 22px; letter-spacing: -0.015em; }
        .ital { font-style: italic; color: var(--green); }
        .lhero-sub { font-size: 18px; color: var(--ink-soft); max-width: 34ch; line-height: 1.6; }

        .hook-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 32px; }
        .lhook { display: flex; flex-direction: column; gap: 12px;
          padding: 22px 22px 20px; background: var(--paper-raised); border: 1px solid var(--rule-strong);
          border-left: 4px solid var(--green); border-radius: 12px; }
        .hook-fees { border-left-color: var(--clay); }
        .hook-fig { font-size: clamp(34px, 5vw, 46px); font-weight: 600; color: var(--green);
          line-height: 1; letter-spacing: -0.02em; }
        .hook-fees .hook-fig { color: var(--clay); }
        .hook-text { font-size: 14px; color: var(--ink-soft); line-height: 1.55; }
        .hook-note { display: block; font-size: 11.5px; color: var(--ink-faint); margin-top: 10px;
          padding-top: 10px; border-top: 1px dotted var(--rule); line-height: 1.5; }
        .hook-framing { font-size: 13.5px; color: var(--ink-faint); font-style: italic; margin-top: 14px; }
        @media (max-width: 560px) { .hook-row { grid-template-columns: 1fr; } }

        .trustline { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 26px;
          font-size: 11px; color: var(--ink-faint); letter-spacing: 0.04em; }
        .trustline span::before { content: "› "; color: var(--brass); }

        .signup { background: var(--paper-raised); border: 1px solid var(--rule-strong);
          border-radius: 14px; padding: 30px 28px; position: sticky; top: 20px;
          box-shadow: 0 16px 36px -28px rgba(26,25,22,0.45); }
        .signup-head { font-size: 22px; }
        .signup-sub { font-size: 14px; color: var(--ink-faint); margin: 4px 0 22px; }

        .field { margin-bottom: 15px; }
        .flabel { display: block; font-family: "SFMono-Regular","Menlo",monospace;
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--ink-soft); margin-bottom: 6px; }
        .req { color: var(--clay); }
        .finput { width: 100%; font-family: inherit; font-size: 16px; color: var(--ink);
          background: var(--paper); border: 1px solid var(--rule-strong); border-radius: 8px;
          padding: 11px 13px; outline: none; transition: border-color .15s, box-shadow .15s; }
        .finput:focus { border-color: var(--green); box-shadow: 0 0 0 3px var(--green-soft); }
        .alias-wrap { position: relative; }
        .alias-at { position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
          color: var(--brass); pointer-events: none; }
        .alias-input { padding-left: 28px; }
        .fhint { font-size: 11.5px; color: var(--ink-faint); margin-top: 5px; }

        .cta { width: 100%; font-family: inherit; font-size: 16px; font-weight: 600;
          color: var(--ink-invert); background: var(--green); border: none; border-radius: 8px;
          padding: 13px; margin-top: 6px; transition: background .15s, transform .05s; }
        .cta:hover:not(:disabled) { background: #1a6645; }
        .cta:active:not(:disabled) { transform: translateY(1px); }
        .cta:disabled { opacity: 0.45; cursor: not-allowed; }
        .cta-ghost { width: 100%; font-family: inherit; font-size: 13px; color: var(--ink-faint);
          background: transparent; border: none; padding: 12px 0 2px; text-decoration: underline;
          text-decoration-color: var(--rule-strong); text-underline-offset: 3px; }
        .cta-ghost:hover { color: var(--ink-soft); }

        .vault { margin-top: 18px; background: var(--green-soft); border: 1px solid #cfe4d8;
          border-radius: 10px; padding: 15px 16px; }
        .vault-head { font-size: 13px; font-weight: 600; color: var(--green); margin-bottom: 9px; }
        .vault p { font-size: 11.5px; color: var(--ink-soft); line-height: 1.5; margin-bottom: 8px; }
        .vault p:last-child { margin-bottom: 0; }
        .vault .em { color: var(--ink); font-weight: 600; }

        .fineprint { font-size: 10px; color: var(--ink-faint); letter-spacing: 0.03em;
          text-align: center; margin-top: 16px; }

        @media (max-width: 860px) {
          .lhero-grid { grid-template-columns: 1fr; gap: 36px; }
          .signup { position: static; }
          .lhero-sub { max-width: 62ch; }
        }
      `}</style>
    </main>
  );
}
