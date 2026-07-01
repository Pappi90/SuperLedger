"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { funds } from "@/lib/super";

type Props = {
  value: number; // fund index, or -1 for manual
  onChange: (idx: number) => void;
};

// Common names / abbreviations people search, mapped to text that appears in the
// formal fund name. Lets "REST" find "Retail Employees Superannuation Trust", etc.
const ALIASES: Record<string, string> = {
  rest: "retail employees",
  art: "australian retirement trust",
  unisuper: "unisuper",
  cbus: "cbus",
  hesta: "hesta",
  ad: "australian defence",
  adf: "australian defence",
};

export default function FundPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Label shown in the input when a fund is selected and the box is closed
  const selectedLabel =
    value >= 0 ? `${funds[value].fund} — ${funds[value].product}`
    : value === -2 ? "Self-managed fund (SMSF)"
    : "";

  // Filter funds by query (matches fund name or product, with alias expansion)
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return funds.map((f, i) => ({ f, i }));
    const expanded = ALIASES[q] ? `${q} ${ALIASES[q]}` : q;
    const terms = expanded.split(/\s+/);
    return funds
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => {
        const hay = `${f.fund} ${f.product}`.toLowerCase();
        // match if the raw query is a substring OR any alias term matches
        return hay.includes(q) || (ALIASES[q] && hay.includes(ALIASES[q]));
      });
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => setHighlight(0), [query]);

  function pick(idx: number) {
    onChange(idx);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, matches.length + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight === 0 && query === "") return;
      // rows after the matches are: [matches.length] = manual, [matches.length+1] = SMSF
      if (highlight === matches.length) pick(-1);
      else if (highlight === matches.length + 1) pick(-2);
      else if (matches[highlight]) pick(matches[highlight].i);
    } else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={open ? query : selectedLabel}
        placeholder={value >= 0 ? selectedLabel : "Type your fund name, e.g. \u201cHostplus\u201d"}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        aria-label="Search for your super fund"
        role="combobox"
        aria-expanded={open}
        style={{
          width: "100%", padding: "12px 14px", fontFamily: "inherit", fontSize: 16,
          background: "var(--paper-raised)", border: "1px solid var(--rule-strong)",
          borderRadius: 8, color: "var(--ink)",
        }}
      />

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
            background: "var(--paper-raised)", border: "1px solid var(--rule-strong)",
            borderRadius: 10, boxShadow: "0 6px 20px rgba(26,25,22,0.12)",
            maxHeight: 280, overflowY: "auto",
          }}
        >
          {matches.length === 0 && (
            <div style={{ padding: "12px 14px", fontSize: 14, color: "var(--ink-faint)" }}>
              No fund matches &ldquo;{query}&rdquo;. Try fewer letters, or enter your numbers manually below.
            </div>
          )}
          {matches.map(({ f, i }, rowIdx) => (
            <button
              key={i}
              role="option"
              aria-selected={highlight === rowIdx}
              onMouseEnter={() => setHighlight(rowIdx)}
              onClick={() => pick(i)}
              style={{
                display: "block", width: "100%", textAlign: "left", border: "none",
                padding: "10px 14px", fontSize: 15, cursor: "pointer",
                background: highlight === rowIdx ? "var(--paper)" : "transparent",
                color: "var(--ink)", borderBottom: "1px solid var(--rule)",
              }}
            >
              <span style={{ fontWeight: 500 }}>{f.fund}</span>
              <span style={{ color: "var(--ink-faint)", fontSize: 13 }}> — {f.product}</span>
            </button>
          ))}
          {/* Manual entry option, always last */}
          <button
            role="option"
            aria-selected={highlight === matches.length}
            onMouseEnter={() => setHighlight(matches.length)}
            onClick={() => pick(-1)}
            style={{
              display: "block", width: "100%", textAlign: "left", border: "none",
              padding: "10px 14px", fontSize: 14, cursor: "pointer", fontStyle: "italic",
              background: highlight === matches.length ? "var(--paper)" : "transparent",
              color: "var(--ink-soft)",
            }}
          >
            Not sure / enter my numbers manually
          </button>
          {/* Self-managed (SMSF) option */}
          <button
            role="option"
            aria-selected={highlight === matches.length + 1}
            onMouseEnter={() => setHighlight(matches.length + 1)}
            onClick={() => pick(-2)}
            style={{
              display: "block", width: "100%", textAlign: "left", border: "none",
              borderTop: "1px solid var(--rule)",
              padding: "10px 14px", fontSize: 14, cursor: "pointer",
              background: highlight === matches.length + 1 ? "var(--paper)" : "transparent",
              color: "var(--ink-soft)",
            }}
          >
            <span style={{ fontWeight: 500, color: "var(--ink)" }}>I have a self-managed fund (SMSF)</span>
            <span style={{ color: "var(--ink-faint)", fontSize: 13 }}> — enter your return &amp; costs</span>
          </button>
        </div>
      )}
    </div>
  );
}
