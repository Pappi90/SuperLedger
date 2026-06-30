"use client";

import { useState, useEffect, useRef } from "react";
import { computeSuperHealth, type SuperHealthInput, type RingKey } from "@/lib/health";

// Ring colours tuned to the "ink & ledger" palette: the house green for fees,
// the brass accent for readiness, and one muted steel-blue added so the three
// rings stay visually distinct without importing a brighter palette.
const RING_STYLE: Record<RingKey, { stroke: string; soft: string }> = {
  fees: { stroke: "#1f7a52", soft: "#e3efe6" },
  performance: { stroke: "#2f6f8f", soft: "#e2edf1" },
  readiness: { stroke: "#a8842c", soft: "#f0e7cf" },
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

// Animate a value from 0 to target on mount (eased). Instant if motion reduced.
function useCountUp(target: number, animate: boolean, duration = 1200) {
  const [val, setVal] = useState(animate ? 0 : target);
  const raf = useRef<number>();
  useEffect(() => {
    if (!animate) { setVal(target); return; }
    let start: number | null = null;
    const tick = (t: number) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, animate, duration]);
  return val;
}

function Ring({ score, stroke, animate, aria }: { score: number; stroke: string; animate: boolean; aria: string }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const display = useCountUp(score, animate);
  const offset = C * (1 - display / 100);
  return (
    <div style={{ position: "relative", width: 132, height: 132 }} role="img" aria-label={aria}>
      <svg viewBox="0 0 120 120" width="132" height="132" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--rule)" strokeWidth="11" />
        <circle cx="60" cy="60" r={R} fill="none" stroke={stroke} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={offset} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span className="mono" style={{ fontSize: 32, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>
          {Math.round(display)}
        </span>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  );
}

export default function SuperHealthRings(input: SuperHealthInput) {
  const reduced = usePrefersReducedMotion();
  const animate = !reduced;
  const data = computeSuperHealth(input);
  const scoreVal = useCountUp(data.score, animate, 1300);
  const weakStyle = RING_STYLE[data.weakest.key];

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 19, marginBottom: 6 }}>Your super health, at a glance</h3>
      <p style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 24 }}>
        Three rings — what you pay, how your returns stack up after fees, and where you&apos;re heading
      </p>

      {/* Rings */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 28 }}>
        {data.rings.map((ring) => {
          const s = RING_STYLE[ring.key];
          return (
            <div key={ring.key} style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.stroke, display: "inline-block" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{ring.title}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <Ring score={ring.score} stroke={s.stroke} animate={animate} aria={ring.aria} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 5, lineHeight: 1.35 }}>{ring.primary}</p>
              <p style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55, marginBottom: 8 }}>{ring.compare}</p>
              <p style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5, fontStyle: "italic" }}>{ring.note}</p>
            </div>
          );
        })}
      </div>

      {/* Score + biggest opportunity */}
      <div style={{ borderTop: "1px solid var(--rule)", marginTop: 26, paddingTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24, alignItems: "center" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Super Health Score</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <span className="mono" style={{ fontSize: 54, fontWeight: 600, color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {Math.round(scoreVal)}
            </span>
            <span className="mono" style={{ fontSize: 20, color: "var(--ink-faint)", marginBottom: 5 }}>/ 100</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", border: "1px solid var(--rule-strong)", borderRadius: 999, padding: "3px 11px", marginBottom: 9 }}>
              {data.band}
            </span>
          </div>
          {/* Composite bar, segmented in the three ring colours */}
          <div style={{ display: "flex", gap: 3, marginTop: 16, height: 8 }}>
            {data.rings.map((ring) => (
              <div key={ring.key} style={{ flex: 1, background: "var(--paper)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${animate ? scoreVal >= 1 ? ring.score : 0 : ring.score}%`,
                  background: RING_STYLE[ring.key].stroke, borderRadius: 4, transition: "width 0.05s linear",
                }} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 12, lineHeight: 1.55 }}>
            A combined view across fees, returns after fees, and retirement readiness.
          </p>
        </div>

        <div style={{ background: weakStyle.soft, borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: weakStyle.stroke, display: "inline-block" }} />
            <span className="eyebrow" style={{ color: "var(--ink-soft)" }}>Biggest opportunity to understand</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6, lineHeight: 1.35 }}>
            {data.weakest.title} is your lowest ring ({data.weakest.score}).
          </p>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
            {data.weakest.compare} Shown to help you understand your position — general information, not a recommendation.
          </p>
        </div>
      </div>
    </div>
  );
}
