"use client";

import { useState, useMemo, useEffect } from "react";
import { funds, benchmark, percentileRank, fundFiguresAtAge, feeAtBalance, fundReturns, fundNetReturns, fundFees, formatFull, formatMoney, project, toTodaysDollars } from "@/lib/super";
import PercentileBar from "./PercentileBar";
import Projection from "./Projection";
import BalanceBenchmark from "./BalanceBenchmark";
import OnTrack from "./OnTrack";
import Drawdown from "./Drawdown";
import FeeCurve from "./FeeCurve";
import FundPicker from "./FundPicker";

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
  // Fee at the user's actual balance tier (fairer to both user and fund), with
  // the $50k figure kept for the percentile ranking so all funds compare consistently.
  const feeCurve = ageFigures?.feeCurve ?? null;
  const balanceFee = feeCurve ? feeAtBalance(feeCurve, balance) : null;
  const myFee50k = ageFigures?.totalFee50k ?? selected?.totalFee50k ?? manualFee;
  const myFee = balanceFee?.fee ?? myFee50k;
  const myFeeTier = balanceFee?.tier ?? 50000;
  // All-in net return (after investment AND admin fees). For a manually-entered
  // fund we approximate it as the entered return minus the admin portion of the fee.
  const myNetReturn = ageFigures?.net5yr ?? selected?.net5yr ?? Math.max(0, manualReturn - manualFee);

  const returnPct = useMemo(() => percentileRank(myReturn, fundReturns(), true), [myReturn]);
  const feePct = useMemo(() => percentileRank(myFee50k, fundFees(), false), [myFee50k]);
  const netPct = useMemo(() => percentileRank(myNetReturn, fundNetReturns(), true), [myNetReturn]);

  // Use the true all-in net return (after all fees) for the projection — this is
  // APRA's representative-member figure, consistent with the headline metric above.
  const netForProjection = myNetReturn;

  // lifetime fee drag vs cheapest quartile fund — using the LOST-COMPOUNDING method:
  // model two parallel balances (one paying your fee, one the cheap-quartile fee) and
  // take the gap at retirement. This captures the growth those fees would have earned,
  // not just the fees paid — the honest, larger, and correct measure.
  const cheapFee = benchmark.totalFee50k.p25;
  const feeGapAnnual = Math.max(0, myFee - cheapFee);
  const years = Math.max(1, retireAge - age);
  const lifetimeFeeDrag = useMemo(() => {
    const r = netForProjection / 100;
    const rCheap = (netForProjection + feeGapAnnual) / 100; // cheaper fund keeps the fee gap as return
    const sg = salary * (employerRate / 100);
    let bMine = balance, bCheap = balance;
    for (let y = 0; y < years; y++) {
      bMine = bMine * (1 + r) + sg + extra * 12;
      bCheap = bCheap * (1 + rCheap) + sg + extra * 12;
    }
    return Math.round(bCheap - bMine);
  }, [balance, netForProjection, feeGapAnnual, years, salary, extra, employerRate]);

  // Net-return context: fees only tell half the story. A higher-fee fund can still
  // win if its return after all fees beats the median. Use the all-in net return
  // (which already accounts for this fund's fees) to tell the honest combined story.
  const myNetForCompare = myNetReturn;
  const netVsMedian = myNetForCompare - benchmark.net5yr.median;
  const strongDespiteFees = feeGapAnnual > 0.01 && netVsMedian > 0.1; // above-median net return despite higher fees

  // Projected balance at retirement (using actual employer rate + extra), and its
  // value in today's dollars — needed to compare honestly against the ASFA standard,
  // which is published in today's dollars.
  const projectedAtRetirement = useMemo(() => {
    const series = project(balance, netForProjection, extra, salary * (employerRate / 100), years);
    return series[series.length - 1];
  }, [balance, netForProjection, extra, salary, employerRate, years]);
  const projectedTodaysDollars = toTodaysDollars(projectedAtRetirement, inflation, years);

  return (
    <div>
      {/* Inputs */}
      <div className="grid-inputs">
        <Field label="Your age" value={age} onChange={setAge} min={16} max={85} suffix="" />
        <Field label="Current balance" value={balance} onChange={setBalance} min={0} max={3000000} step={5000} money allowOver />
        <Field label="Annual salary" value={salary} onChange={setSalary} min={0} max={2000000} step={5000} money allowOver
          tooltip="Use your regular before-tax earnings (your base pay plus regular commissions and allowances). Super is legally paid on 'ordinary time earnings', which generally excludes overtime and one-off bonuses. If you're retired or not working, set this to $0." />
        <Field label="Retire at" value={retireAge} onChange={setRetireAge} min={50} max={85} suffix=""
          tooltip="The age you retired or plan to retire. If you've already retired, set this to the age you stopped working — the tool will switch to showing how long your current balance lasts from today." />
        <Field label="Employer contribution" value={employerRate} onChange={setEmployerRate} min={0} max={40} step={0.5} suffix="%" />
        <Field label="Extra contribution / month" value={extra} onChange={setExtra} min={0} max={5000} step={50} money allowOver />
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
        <FundPicker value={fundIdx} onChange={setFundIdx} />
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
            label="Annual fees vs other funds (on $50k)"
            value={myFee50k}
            min={benchmark.totalFee50k.min}
            max={benchmark.totalFee50k.max}
            median={benchmark.totalFee50k.median}
            percentile={feePct}
            higherIsBetter={false}
          />
          <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "-16px 0 18px", lineHeight: 1.5 }}>
            Ranked at $50k so every fund is compared on the same basis. At your actual balance
            (~{formatMoney(myFeeTier)}) this fund charges <strong className="mono">{myFee.toFixed(2)}%</strong>.
          </p>

          {/* Mini fee-vs-balance curve — fair to the fund, since fees fall as balance grows */}
          {feeCurve && feeCurve.some((p) => p.fee !== null) && (
            <FeeCurve curve={feeCurve} userTier={myFeeTier} />
          )}

          {/* The cost of higher fees — the most visceral, shareable insight, kept high on the page */}
          {feeGapAnnual > 0.01 && (
            <div className="fee-drag" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span className="eyebrow" style={{ color: "var(--clay)" }}>What those fees cost you</span>
                <InfoDot tip={`How this is worked out: we compare two versions of your super to retirement — one paying your fund's fee (${myFee.toFixed(2)}%), one paying the cheapest quarter of funds (${cheapFee.toFixed(2)}%). The ${feeGapAnnual.toFixed(2)}% yearly gap compounds: every dollar lost to fees is also a dollar that stops earning returns for the rest of your working life, so the real cost is far bigger than the fees alone. An estimate of scale, not a precise forecast.`} />
              </div>
              <p style={{ fontSize: 20, lineHeight: 1.35 }}>
                Paying {myFee.toFixed(2)}% instead of the {cheapFee.toFixed(2)}% charged by the cheapest quarter of funds
                could leave you about{" "}
                <strong className="mono" style={{ color: "var(--clay)" }}>{formatFull(lifetimeFeeDrag)}</strong>{" "}
                {age >= retireAge ? "worse off over your retirement" : `worse off by age ${retireAge}`} — counting the
                growth those fees would have earned, not just the fees themselves.
              </p>
              {strongDespiteFees ? (
                <p style={{ fontSize: 14, lineHeight: 1.5, marginTop: 12, padding: "12px 14px", background: "var(--green-soft)", borderRadius: 8, color: "var(--green)" }}>
                  <strong>But fees aren&apos;t the whole story.</strong> That {myFee.toFixed(2)}% fee is already taken
                  out of this fund&apos;s net return of {myNetReturn.toFixed(2)}% — which is still
                  <strong> above the median ({benchmark.net5yr.median}%)</strong>. In other words, even after paying
                  more in fees, you&apos;d still be ahead of most funds. Return after fees is the figure that actually
                  decides your outcome, and it&apos;s shown at the top of this section.
                </p>
              ) : (
                <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55, marginTop: 12, padding: "12px 14px", background: "var(--paper)", borderRadius: 8, border: "1px solid var(--rule)" }}>
                  Fees are only half the picture — a fund can justify a higher fee with stronger returns, so always
                  check the net-return-after-fees ranking at the top. But here&apos;s the key thing:{" "}
                  <strong style={{ color: "var(--ink)" }}>fees are one of the few things you actually control.</strong>{" "}
                  You can&apos;t dictate what markets return, but you can choose a fund that doesn&apos;t quietly
                  charge you more for the same — or less.
                </p>
              )}
            </div>
          )}

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
          {age >= retireAge ? (
            <div>
              <p style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 16 }}>
                You&apos;re at or past your retirement age
              </p>
              <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                Since you&apos;ve reached retirement, the accumulation projection doesn&apos;t apply. Head to the
                <strong> &quot;How long will your super last?&quot;</strong> section below — that&apos;s the one built for
                you, showing how far your current balance stretches at the spending level you choose.
              </p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Balance vs age group (ATO data) */}
      <BalanceBenchmark balance={balance} age={age} gender={gender} />

      {/* Are you on track for a comfortable retirement (ASFA) */}
      <OnTrack projectedTodaysDollars={projectedTodaysDollars} retireAge={retireAge} alreadyRetired={age >= retireAge} />

      {/* How long will your super last (drawdown) */}
      <Drawdown
        currentBalance={balance}
        projectedBalance={projectedAtRetirement}
        currentAge={age}
        plannedRetireAge={retireAge}
        inflation={inflation}
      />

      {/* Insurance acknowledgement */}
      <div className="insurance-note">
        <div className="eyebrow" style={{ color: "var(--ink-soft)" }}>One thing these figures don&apos;t include</div>
        <p style={{ fontSize: 15, lineHeight: 1.55, marginTop: 8, color: "var(--ink-soft)" }}>
          Most default super accounts also include insurance — typically life and total &amp; permanent
          disability (TPD) cover, sometimes income protection — with premiums deducted straight from your
          balance, often a few hundred dollars a year. That&apos;s a real cost on top of the fees shown here,
          and it grows as you age. But unlike fees, it buys something: cover for you and your family. The
          projections above don&apos;t subtract premiums, so check your fund&apos;s annual statement to see what
          you&apos;re paying and what you&apos;re covered for.
        </p>
      </div>

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
        .grid-inputs { display: grid; grid-template-columns: repeat(auto-fit, minmax(215px, 1fr)); gap: 26px 32px; align-items: start; }
        .results { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-top: 40px; }
        .card { background: var(--paper-raised); border: 1px solid var(--rule); border-radius: 16px; padding: 28px;
          box-shadow: 0 1px 2px rgba(26,25,22,0.03); }
        .fee-drag { margin-top: 24px; padding: 22px 24px; border: 1px solid var(--rule-strong);
          border-left: 4px solid var(--clay); border-radius: 12px; background: var(--clay-soft); }
        .insurance-note { margin-top: 20px; padding: 20px 24px; border-radius: 16px; background: var(--paper-raised);
          border: 1px solid var(--rule); box-shadow: 0 1px 2px rgba(26,25,22,0.03); }
        @media (max-width: 760px) { .results { grid-template-columns: 1fr; } .card { padding: 24px; } }
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

function InfoDot({ tip }: { tip: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="More information"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      onClick={() => setShow((s) => !s)}
      style={{ position: "relative", display: "inline-flex", cursor: "help" }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: "50%", border: "1px solid var(--clay)",
        color: "var(--clay)", fontSize: 11, fontStyle: "italic", fontWeight: 600,
        display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif",
      }}>i</span>
      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          width: 260, padding: "11px 13px", background: "var(--ink)", color: "var(--paper)",
          borderRadius: 8, fontSize: 12.5, lineHeight: 1.5, fontWeight: 400, zIndex: 10,
          boxShadow: "0 4px 14px rgba(0,0,0,0.22)", textAlign: "left", textTransform: "none", letterSpacing: 0,
        }}>
          {tip}
        </span>
      )}
    </span>
  );
}
