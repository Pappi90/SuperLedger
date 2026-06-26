"use client";

/**
 * AuthGate.tsx — SuperLedger Phase 2 (VISUAL/UX SHELL ONLY)
 *
 * ⚠️ THIS IS NOT REAL AUTHENTICATION ⚠️
 * This component decides which VIEW to show — the landing/signup page or the
 * full tool — based on a local in-memory React flag. It can be bypassed by
 * anyone (the "skip" button does exactly that, and dev tools would too), and
 * the tool's data is all public client-side JSON anyway. So this gate:
 *   • does NOT protect any data,
 *   • does NOT collect, store, or transmit anything,
 *   • is NOT a security boundary.
 *
 * It exists so the post-login experience can be previewed and the front-door
 * UX agreed before the real backend is built. Real enforcement (server-side
 * auth + RLS + field encryption from the Privacy Architecture Blueprint) must
 * come first, along with the privacy + AFSL legal reviews. See blueprint
 * section 9 (build order). Until then, ship this behind the preview banner,
 * not as a live signup.
 *
 * The flag is deliberately NOT persisted to localStorage/cookies — refreshing
 * the page returns to the landing view, which keeps it obviously a preview and
 * avoids any impression of a real session.
 */

import { useState, type ReactNode } from "react";
import Landing from "./Landing";
import Tool from "./Tool";

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
  /** The server-rendered hero block, shown above the tool once "entered". */
  hero: ReactNode;
  /** The server-rendered footer block. */
  footer: ReactNode;
}) {
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return <Landing hooks={hooks} onEnter={() => setEntered(true)} />;
  }

  return (
    <main>
      {hero}
      <section className="wrap" style={{ paddingBottom: 80 }}>
        <Tool />
      </section>
      {footer}
    </main>
  );
}
