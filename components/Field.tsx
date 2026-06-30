"use client";

import { useState, useEffect } from "react";

const fmt = (n: number) => n.toLocaleString("en-AU");

/**
 * Field — the shared labelled number input used across the tool.
 * Text box + slider, optional $ money formatting, optional % suffix, optional
 * info tooltip. Typed values may exceed the slider max when `allowOver` is set
 * (e.g. balances over $1M). Extracted from Tool.tsx so other panels (e.g. SMSF)
 * use the identical control and styling.
 */
export default function Field({
  label, value, onChange, min, max, step = 1, money = false, suffix = "", allowOver = false, tooltip = "",
}: {
  label: string; value: number; onChange: (n: number) => void;
  min: number; max: number; step?: number; money?: boolean; suffix?: string; allowOver?: boolean; tooltip?: string;
}) {
  const [showTip, setShowTip] = useState(false);
  const [text, setText] = useState<string>(String(value));

  // keep the text box in sync when the slider (or external state) moves
  useEffect(() => { setText(money ? fmt(value) : String(value)); }, [value, money]);

  const commit = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    let n = parseFloat(cleaned);
    if (isNaN(n)) n = min;
    // typed values may exceed the slider's max when allowOver (e.g. balances over $1M)
    const ceiling = allowOver ? Number.MAX_SAFE_INTEGER : max;
    n = Math.max(min, Math.min(ceiling, n));
    onChange(n);
    setText(money ? fmt(n) : String(n));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 10, minHeight: 38 }}>
        <label style={{ fontSize: 14, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6, lineHeight: 1.3 }}>
          <span>{label}</span>
          {tooltip && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`More info: ${label}`}
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              onFocus={() => setShowTip(true)}
              onBlur={() => setShowTip(false)}
              onClick={() => setShowTip((s) => !s)}
              style={{ position: "relative", display: "inline-flex", cursor: "help" }}
            >
              <span style={{
                width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--rule-strong)",
                color: "var(--ink-faint)", fontSize: 11, fontStyle: "italic", fontWeight: 600,
                display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif",
              }}>i</span>
              {showTip && (
                <span style={{
                  position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                  width: 230, padding: "10px 12px", background: "var(--ink)", color: "var(--paper)",
                  borderRadius: 8, fontSize: 12.5, lineHeight: 1.5, fontWeight: 400, zIndex: 10,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.22)", textAlign: "left",
                }}>
                  {tooltip}
                </span>
              )}
            </span>
          )}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {money && <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-soft)" }}>$</span>}
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            aria-label={label}
            className="mono"
            style={{
              width: money ? 86 : 64, textAlign: "right", fontSize: 15, fontWeight: 600,
              border: "1px solid transparent", borderRadius: 6, padding: "2px 6px",
              background: "transparent", color: "var(--ink)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--rule-strong)")}
            onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "transparent"; }}
          />
          {suffix && <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-soft)" }}>{suffix}</span>}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={Math.min(value, max)}
        onChange={(e) => onChange(Number(e.target.value))} />
      {value > max && (
        <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>
          Typed value above slider range — using {money ? "$" + fmt(value) : value}{suffix}
        </div>
      )}
    </div>
  );
}
