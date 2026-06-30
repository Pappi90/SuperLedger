"use client";

import { useState, useEffect } from "react";
import { netReturnStats, formatFull, type NetReturnPeriod } from "@/lib/super";
import Field from "./Field";

type Props = {
  balance: number; // user's current balance from the main tool (prefill)
  age: number;     // used to resolve lifecycle-fund benchmark stages
};

// Cost presets are DOLLAR running costs (audit + admin + ATO levy), the cleanest
// "operating cost" basis. Sourced from ATO median operating expense (~$4,600),
// lean online-administrator pricing (~$1,500), and full-service/complex (~$9,300).
// All editable — nothing is locked (advice-line standard).
const COST_PRESETS: { key: string; label: string; sub: string; value: number }[] = [
  { key: "lean", label: "Lean", sub: "online admin", value: 1500 },
  { key: "typical", label: "Typical", sub: "ATO median", value: 4600 },
  { key: "full", label: "Full-service", sub: "complex", value: 9300 },
];

const PERIODS: { key: NetReturnPeriod; label: string }[] = [
  { key: "net3yr", label: "3 yr" },
  { key: "net5yr", label: "5 yr" },
  { key: "net7yr", label: "7 yr" },
  { key: "net10yr", label: "10 yr" },
];

const DEFAULTS = { cost: 4600, invest: 0.2, period: "net10yr" as NetReturnPeriod };
const pct1 = (n: number) => `${n.toFixed(1)}%`;

export default function SMSF({ balance, age }: Props) {
  // Seed the SMSF balance from the user's saved balance, but let them model a
  // different figure. `touched` keeps it synced to the saved balance until the
  // user edits it here (or until they reset).
  const [smsfBalance, setSmsfBalance] = useState(balance > 0 ? balance : 250000);
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (!touched && balance > 0) setSmsfBalance(balance); }, [balance, touched]);

  const [annualCost, setAnnualCost] = useState(DEFAULTS.cost);
  const [investCost, setInvestCost] = useState(DEFAULTS.invest);
  const [period, setPeriod] = useState<NetReturnPeriod>(DEFAULTS.period);

  const stats = netReturnStats(period, age);
  const medianNet = stats.median;   // percent, e.g. 6.83
  const topNet = stats.p90;         // percent, e.g. 7.70

  const costPct = smsfBalance > 0 ? (annualCost / smsfBalance) * 100 : 0;
  const drag = costPct + investCost; // total cost drag in percentage points

  const requiredMedian = medianNet + drag;
  const requiredTop = topNet + drag;

  // A long-run gross return much above ~11–12% p.a. is an exceptionally high bar.
  const medianTough = requiredMedian > 11;

  const setCost = (n: number) => setAnnualCost(n);
  const activePreset = COST_PRESETS.find((p) => p.value === annualCost)?.key ?? null;

  const reset = () => {
    setAnnualCost(DEFAULTS.cost);
    setInvestCost(DEFAULTS.invest);
    setPeriod(DEFAULTS.period);
    setTouched(false);
  };

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "10 yr";

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 19, marginBottom: 6 }}>Thinking about a self-managed fund (SMSF)?</h3>
      <p style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 20 }}>
        The return your own investments must earn to beat a typical and a top fund, after SMSF running costs ·
        APRA net returns ({periodLabel}, representative member) · {stats.count} products
      </p>

      {/* Benchmark period */}
      <div style={{ marginBottom: 22 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Compare against returns over</div>
        <div style={{ display: "inline-flex", border: "1px solid var(--rule-strong)", borderRadius: 8, overflow: "hidden" }}>
          {PERIODS.map((p, i) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              style={{
                padding: "8px 16px", fontSize: 14, border: "none",
                borderLeft: i > 0 ? "1px solid var(--rule-strong)" : "none",
                background: period === p.key ? "var(--ink)" : "transparent",
                color: period === p.key ? "var(--paper)" : "var(--ink-soft)", cursor: "pointer",
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cost presets */}
      <div style={{ marginBottom: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Annual SMSF running cost</div>
        <div style={{ display: "inline-flex", border: "1px solid var(--rule-strong)", borderRadius: 8, overflow: "hidden" }}>
          {COST_PRESETS.map((p, i) => (
            <button key={p.key} onClick={() => setCost(p.value)}
              style={{
                padding: "6px 14px", fontSize: 14, border: "none", lineHeight: 1.2,
                borderLeft: i > 0 ? "1px solid var(--rule-strong)" : "none",
                background: activePreset === p.key ? "var(--ink)" : "transparent",
                color: activePreset === p.key ? "var(--paper)" : "var(--ink-soft)", cursor: "pointer",
                textAlign: "center",
              }}>
              {p.label}
              <span style={{ display: "block", fontSize: 11, opacity: 0.75 }}>${p.value.toLocaleString("en-AU")} · {p.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editable inputs */}
      <div className="grid-inputs" style={{ marginBottom: 24 }}>
        <Field label="SMSF balance" value={smsfBalance} onChange={(n) => { setTouched(true); setSmsfBalance(n); }}
          min={10000} max={3000000} step={5000} money allowOver
          tooltip="Prefilled from your saved balance. Edit to model a different amount — SMSF costs are mostly fixed dollars, so a larger balance dramatically lowers the return you need." />
        <Field label="Annual running cost" value={annualCost} onChange={setCost}
          min={500} max={15000} step={100} money allowOver
          tooltip="Audit, administration and the ATO supervisory levy. The presets above are based on ATO median operating expenses and current administrator pricing. Excludes investment costs (set those separately)." />
        <Field label="Investment cost" value={investCost} onChange={setInvestCost}
          min={0} max={2} step={0.05} suffix="%"
          tooltip="Brokerage and ETF/managed-fund MERs as a % of your balance. Index ETFs are typically around 0.1–0.2%. This is added on top of the fixed running cost." />
      </div>

      {/* Cost drag readout */}
      <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 18, lineHeight: 1.55 }}>
        At <strong className="mono">{formatFull(smsfBalance)}</strong>, your <strong className="mono">{formatFull(annualCost)}</strong> running
        cost is <strong className="mono">{pct1(costPct)}</strong> of your balance. With <strong className="mono">{pct1(investCost)}</strong> investment
        costs, your total drag is <strong className="mono">{pct1(drag)}</strong> a year — that&apos;s the head start a comparable fund has on you.
      </div>

      {/* The two hurdles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 18 }}>
        <div style={{ padding: "18px 20px", borderRadius: 10, background: "var(--green-soft)", border: "1px solid var(--green)" }}>
          <div className="eyebrow" style={{ color: "var(--green)", marginBottom: 6 }}>To beat the median fund</div>
          <div style={{ fontSize: 30, lineHeight: 1.1, color: "var(--ink)", marginBottom: 6 }}>
            <strong className="mono">{pct1(requiredMedian)}</strong>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            Median net return <span className="mono">{pct1(medianNet)}</span> + your <span className="mono">{pct1(drag)}</span> cost drag
          </div>
        </div>
        <div style={{ padding: "18px 20px", borderRadius: 10, background: "var(--brass-soft)", border: "1px solid var(--brass)" }}>
          <div className="eyebrow" style={{ color: "var(--brass)", marginBottom: 6 }}>To beat the top 10% of funds</div>
          <div style={{ fontSize: 30, lineHeight: 1.1, color: "var(--ink)", marginBottom: 6 }}>
            <strong className="mono">{pct1(requiredTop)}</strong>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            Top-10% net return <span className="mono">{pct1(topNet)}</span> + your <span className="mono">{pct1(drag)}</span> cost drag
          </div>
        </div>
      </div>

      {/* Plain-language read */}
      <p style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.6, marginBottom: 6 }}>
        At <strong className="mono">{formatFull(smsfBalance)}</strong> with these costs, your own investments would need to
        return about <strong className="mono">{pct1(requiredMedian)}</strong> a year just to match the typical fund after costs,
        or <strong className="mono">{pct1(requiredTop)}</strong> to match a top-10% fund — every year, over the long run.
        {medianTough && (
          <> That&apos;s an unusually high bar; consistently clearing it is hard, which is why small-balance SMSFs are widely
            considered uncompetitive on cost alone.</>
        )}
      </p>

      {/* Caveats */}
      <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 14, lineHeight: 1.55 }}>
        This is a cost hurdle, not a prediction — past APRA net returns don&apos;t guarantee future ones. Compare against a
        fund with <strong>similar risk</strong> to how you&apos;d actually invest: a high-growth SMSF naturally expects higher
        returns <em>and</em> bigger swings than a balanced default. Benchmarks are APRA net returns for a representative
        member, computed live from the same {stats.count}-product dataset used elsewhere in this tool; at large balances the
        comparison is slightly conservative, because APRA admin fees fall per-dollar as balances rise. All assumptions are
        yours to edit. General information, not personal advice.
      </p>

      <button onClick={reset}
        style={{
          marginTop: 14, fontSize: 13, color: "var(--ink-soft)", background: "transparent",
          border: "1px solid var(--rule-strong)", borderRadius: 8, padding: "6px 14px", cursor: "pointer",
        }}>
        Reset to defaults
      </button>
    </div>
  );
}
