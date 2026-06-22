"use client";

import { useState, useMemo, useEffect } from "react";
import { funds, benchmark, percentileRank, fundFiguresAtAge, fundReturns, fundNetReturns, fundFees, formatFull } from "@/lib/super";
import PercentileBar from "./PercentileBar";
import Projection from "./Projection";
import BalanceBenchmark from "./BalanceBenchmark";

const fmt = (n: number) => n.toLocaleString("en-AU");

export default function Tool() {
  const [age, setAge] = useState(35);
  const [balance, setBalance] = useState(85000);
  const [salary, setSalary] = useState(90000);
  const [retireAge, setRetireAge] = useState(67);
  const [extra, setExtra] = useState(0);
  const [employerRate, setEmployerRate] = useState(12);
  const [inflation, setInflation] = useState(2.5);
  const [gender, setGender] = useState<"male" | "female" | "all">("all");
  const [fundIdx, setFundIdx] = useState<number>(-1);
  const [manualReturn, setManualReturn] = useState(7.5);
  const [manualFee, setManualFee] = useState(0.9);

  const selected = fundIdx >= 0 ? funds[fundIdx] : null;
  const ageFigures = selected ? fundFiguresAtAge(selected, age) : null;
  const myReturn = ageFigures?.nir5yr ?? selected?.nir5yr ?? manualReturn;
  const myFee = ageFigures?.totalFee50k ?? selected?.totalFee50k ?? manualFee;
  // All-in net return (after investment AND admin fees). For a manually-entered
  // fund we approximate it as the entered return minus the admin portion of the fee.
  const myNetReturn = ageFigures?.net5yr ?? selected?.net5yr ?? Math.max(0, manualReturn - manualFee);

  const returnPct = useMemo(() => percentileRank(myReturn, fundReturns(), true), [myReturn]);
  const feePct = useMemo(() => percentileRank(myFee, fundFees(), false), [myFee]);
  const netPct = useMemo(() => percentileRank(myNetReturn, fundNetReturns(), true), [myNetReturn]);

  // Use the true all-in net return (after all fees) for the projection — this is
  // APRA's representative-member figure, consistent with the headline metric above.
  const netForProjection = myNetReturn;

  // lifetime fee drag vs cheapest quartile fund
  const cheapFee = benchmark.totalFee50k.p25;
  const feeGapAnnual = Math.max(0, myFee - cheapFee);
  const years = Math.max(1, retireAge - age);
  const lifetimeFeeDrag = useMemo(() => {
    // rough: extra fee % applied to average balance over time
    let b = balance, drag = 0;
    const r = netForProjection / 100;
    const sg = salary * (employerRate / 100);
    for (let y = 0; y < years; y++) {
      drag += b * (feeGapAnnual / 100);
      b = b * (1 + r) + sg + extra * 12;
    }
    return Math.round(drag);
  }, [balance, netForProjection, feeGapAnnual, years, salary, extra, employerRate]);

  return (
    <div>
      {/* Inputs */}
      <div className="grid-inputs">
        <Field label="Your age" value={age} onChange={setAge} min={18} max={75} suffix="" />
        <Field label="Current balance" value={balance} onChange={setBalance} min={0} max={1000000} step={5000} money allowOver />
        <Field label="Annual salary" value={salary} onChange={setSalary} min={30000} max={400000} step={5000} money allowOver
          tooltip="Use your regular before-tax earnings (your base pay plus regular commissions and allowances). Super is legally paid on 'ordinary time earnings', which generally excludes overtime and one-off bonuses." />
        <Field label="Retire at" value={retireAge} onChange={setRetireAge} min={55} max={70} suffix="" />
        <Field label="Employer contribution" value={employerRate} onChange={setEmployerRate} min={12} max={20} step={0.5} suffix="%" />
        <Field label="Extra contribution / month" value={extra} onChange={setExtra} min={0} max={2000} step={50} money allowOver />
      </div>

      {/* Gender selector — for accurate ATO balance benchmarks */}
      <div style={{ marginTop: 24 }}>
        <label className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          Gender
          <span style={{ fontSize: 11, color: "var(--ink-faint)", fontStyle: "italic", textTransform: "none", letterSpacing: 0 }}>
            — for age-group balance comparison only; doesn&apos;t affect fund returns
          </span>
        </label>
        <div style={{ display: "inline-flex", border: "1px solid var(--rule-strong)", borderRadius: 8, overflow: "hidden" }}>
          {([["all", "All Australians"], ["female", "Female"], ["male", "Male"]] as const).map(([val, lbl], i) => (
            <button
              key={val}
              onClick={() => setGender(val)}
              style={{
                padding: "8px 16px", fontSize: 14, border: "none",
                borderLeft: i > 0 ? "1px solid var(--rule-strong)" : "none",
                background: gender === val ? "var(--ink)" : "transparent",
                color: gender === val ? "var(--paper)" : "var(--ink-soft)",
                cursor: "pointer", transition: "background 0.12s",
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Fund selector */}
      <div style={{ marginTop: 28, marginBottom: 8 }}>
        <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>Your fund</label>
        <select
          value={fundIdx}
          onChange={(e) => setFundIdx(Number(e.target.value))}
          style={{
            width: "100%", padding: "12px 14px", fontFamily: "inherit", fontSize: 16,
            background: "var(--paper-raised)", border: "1px solid var(--rule-strong)",
            borderRadius: 8, color: "var(--ink)",
          }}
        >
          <option value={-1}>Not sure / enter manually</option>
          {funds.map((f, i) => (
            <option key={i} value={i}>{f.fund} — {f.product}</option>
          ))}
        </select>
      </div>

      {fundIdx === -1 && (
        <div className="grid-inputs" style={{ marginTop: 16 }}>
          <Field label="Your fund's 5yr return %" value={manualReturn} onChange={setManualReturn} min={3} max={14} step={0.1} suffix="%" />
          <Field label="Your annual fee %" value={manualFee} onChange={setManualFee} min={0.05} max={2} step={0.05} suffix="%" />
        </div>
      )}

      {/* Results */}
      <div className="results">
        <div className="card">
          <h3 style={{ fontSize: 19, marginBottom: 6 }}>How you compare</h3>
          <p style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 22 }}>
            Against all {benchmark.count} MySuper products · APRA data to {benchmark.asAt}
          </p>

          <PercentileBar
            label="Net return after all fees (5yr)"
            value={myNetReturn}
            min={benchmark.net5yr.min}
            max={benchmark.net5yr.max}
            median={benchmark.net5yr.median}
            percentile={netPct}
            higherIsBetter
          />
          <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "-16px 0 24px", lineHeight: 1.5 }}>
            The bottom line: what your fund actually returned after both investment and admin fees —
            APRA&apos;s representative-member figure. This is the number that matters most.
          </p>

          <PercentileBar
            label="Investment return before admin fees (5yr)"
            value={myReturn}
            min={benchmark.nir5yr.min}
            max={benchmark.nir5yr.max}
            median={benchmark.nir5yr.median}
            percentile={returnPct}
            higherIsBetter
          />
          <PercentileBar
            label="Annual fees (on $50k)"
            value={myFee}
            min={benchmark.totalFee50k.min}
            max={benchmark.totalFee50k.max}
            median={benchmark.totalFee50k.median}
            percentile={feePct}
            higherIsBetter={false}
          />

          {selected?.performanceTest && (
            <div style={{
              marginTop: 8, padding: "10px 14px", borderRadius: 8,
              background: selected.performanceTest === "Pass" ? "var(--green-soft)" : "var(--clay-soft)",
              color: selected.performanceTest === "Pass" ? "var(--green)" : "var(--clay)",
              fontSize: 14, fontWeight: 600,
            }}>
              {selected.performanceTest === "Pass" ? "✓" : "✕"} {selected.performanceTest === "Pass" ? "Passed" : "Failed"} APRA's official performance test
            </div>
          )}

          {ageFigures?.isLifecycle && (
            <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.5 }}>
              This is a lifecycle fund — figures shown are for your life stage ({ageFigures.stageLabel}),
              since the fund adjusts its investment mix as you age.
            </p>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 19, marginBottom: 6 }}>Your retirement outlook</h3>
          <p style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 22 }}>
            {employerRate > 12
              ? `Based on your ${employerRate}% employer contributions — dashed line shows the 12% minimum`
              : "Assumes the 12% Super Guarantee on your salary"}
          </p>
          <Projection
            balance={balance}
            age={age}
            retireAge={retireAge}
            netReturn={netForProjection}
            extraMonthly={extra}
            salaryAnnual={salary}
            employerRate={employerRate}
            inflation={inflation}
            onInflationChange={setInflation}
          />
        </div>
      </div>

      {/* Balance vs age group (ATO data) */}
      <BalanceBenchmark balance={balance} age={age} gender={gender} />

      {/* Fee drag callout */}
      {feeGapAnnual > 0.01 && (
        <div className="fee-drag">
          <div className="eyebrow" style={{ color: "var(--clay)" }}>The cost of higher fees</div>
          <p style={{ fontSize: 22, lineHeight: 1.35, marginTop: 8 }}>
            Paying {myFee.toFixed(2)}% instead of the {cheapFee.toFixed(2)}% charged by the cheapest quarter of funds
            could cost you about{" "}
            <strong className="mono" style={{ color: "var(--clay)" }}>{formatFull(lifetimeFeeDrag)}</strong>{" "}
            in fees by age {retireAge}.
          </p>
        </div>
      )}

      <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 28, lineHeight: 1.6 }}>
        General information only, not financial advice. Returns shown are APRA&apos;s published net
        figures (the headline metric is the all-in net return after both investment and admin fees,
        for a representative $50,000 member). Projections use simplified compounding and assume a 12%
        Super Guarantee rate; they don&apos;t account for tax, insurance premiums, or future contribution
        changes. Past performance does not predict future returns. Based on APRA&apos;s Comprehensive
        Product Performance Package (MySuper, 30 June 2025). Consider the fund&apos;s PDS and your own
        circumstances, or speak to a licensed adviser.
      </p>

      <style>{`
        .grid-inputs { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px 28px; }
        .results { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 36px; }
        .card { background: var(--paper-raised); border: 1px solid var(--rule); border-radius: 14px; padding: 26px; }
        .fee-drag { margin-top: 24px; padding: 24px 26px; border: 1px solid var(--clay); border-radius: 14px; background: var(--clay-soft); }
        @media (max-width: 760px) { .results { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function Field({
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 10 }}>
        <label style={{ fontSize: 14, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 6 }}>
          {label}
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
