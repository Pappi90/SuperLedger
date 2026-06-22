"use client";

import { useState, useMemo } from "react";
import { funds, benchmark, percentileRank, fundReturns, fundFees, formatFull } from "@/lib/super";
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
  const [fundIdx, setFundIdx] = useState<number>(-1);
  const [manualReturn, setManualReturn] = useState(7.5);
  const [manualFee, setManualFee] = useState(0.9);

  const selected = fundIdx >= 0 ? funds[fundIdx] : null;
  const myReturn = selected?.nir5yr ?? manualReturn;
  const myFee = selected?.totalFee50k ?? manualFee;

  const returnPct = useMemo(() => percentileRank(myReturn, fundReturns(), true), [myReturn]);
  const feePct = useMemo(() => percentileRank(myFee, fundFees(), false), [myFee]);

  // net return used for projection = gross net investment return minus admin portion already in fee figure.
  // NIR is net of investment fees; we subtract the total fee to be conservative for projection.
  const netForProjection = Math.max(0, myReturn - Math.max(0, myFee - 0.3));

  // lifetime fee drag vs cheapest quartile fund
  const cheapFee = benchmark.totalFee50k.p25;
  const feeGapAnnual = Math.max(0, myFee - cheapFee);
  const years = Math.max(1, retireAge - age);
  const lifetimeFeeDrag = useMemo(() => {
    // rough: extra fee % applied to average balance over time
    let b = balance, drag = 0;
    const r = netForProjection / 100;
    const sg = salary * 0.12;
    for (let y = 0; y < years; y++) {
      drag += b * (feeGapAnnual / 100);
      b = b * (1 + r) + sg + extra * 12;
    }
    return Math.round(drag);
  }, [balance, netForProjection, feeGapAnnual, years, salary, extra]);

  return (
    <div>
      {/* Inputs */}
      <div className="grid-inputs">
        <Field label="Your age" value={age} onChange={setAge} min={18} max={67} suffix="" />
        <Field label="Current balance" value={balance} onChange={setBalance} min={0} max={1000000} step={5000} money />
        <Field label="Annual salary" value={salary} onChange={setSalary} min={30000} max={400000} step={5000} money />
        <Field label="Retire at" value={retireAge} onChange={setRetireAge} min={55} max={70} suffix="" />
        <Field label="Extra contribution / month" value={extra} onChange={setExtra} min={0} max={2000} step={50} money />
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
            label="5-year net return"
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
        </div>

        <div className="card">
          <h3 style={{ fontSize: 19, marginBottom: 6 }}>Your retirement outlook</h3>
          <p style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 22 }}>
            Assumes 12% employer contributions on your salary
          </p>
          <Projection
            balance={balance}
            age={age}
            retireAge={retireAge}
            netReturn={netForProjection}
            extraMonthly={extra}
            salaryAnnual={salary}
          />
        </div>
      </div>

      {/* Balance vs age group (ATO data) */}
      <BalanceBenchmark balance={balance} age={age} />

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
        General information only, not financial advice. Figures are estimates based on APRA's
        Comprehensive Product Performance Package (MySuper, 30 June 2025) and simplified compounding
        assumptions. Past performance does not predict future returns. Net return used for projections
        is approximate. Consider the fund&apos;s PDS and your own circumstances, or speak to a licensed adviser.
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
  label, value, onChange, min, max, step = 1, money = false, suffix = "",
}: {
  label: string; value: number; onChange: (n: number) => void;
  min: number; max: number; step?: number; money?: boolean; suffix?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <label style={{ fontSize: 14, color: "var(--ink-soft)" }}>{label}</label>
        <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
          {money ? "$" + fmt(value) : value}{suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
