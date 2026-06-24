"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { drawdown, sustainableWithdrawal, formatMoney, formatFull, toTodaysDollars } from "@/lib/super";

type Props = {
  currentBalance: number;
  projectedBalance: number; // balance grown to plannedRetireAge (future dollars)
  currentAge: number;
  plannedRetireAge: number;
  inflation: number;
};

type Mode = "spendToAge" | "ageToSpend";

export default function Drawdown({ currentBalance, projectedBalance, currentAge, plannedRetireAge, inflation }: Props) {
  const [mode, setMode] = useState<Mode>("spendToAge");
  const [annualSpend, setAnnualSpend] = useState(50000);
  const [lastUntil, setLastUntil] = useState(90);
  const [retReturn, setRetReturn] = useState(5);
  const [growWithInflation, setGrowWithInflation] = useState(true);

  // Already retired? Use the actual current balance from now.
  // Still working? Use the projected balance at the planned retirement age.
  const alreadyRetired = currentAge >= plannedRetireAge;
  const retiredInPast = currentAge > plannedRetireAge; // retired before now, mid-drawdown
  const startBalance = alreadyRetired ? currentBalance : projectedBalance;
  const startAge = alreadyRetired ? currentAge : plannedRetireAge;

  const result = useMemo(
    () => drawdown(startBalance, startAge, annualSpend, retReturn, inflation, growWithInflation),
    [startBalance, startAge, annualSpend, retReturn, inflation, growWithInflation]
  );

  const sustainable = useMemo(
    () => sustainableWithdrawal(startBalance, startAge, Math.max(lastUntil, startAge + 1), retReturn, inflation, growWithInflation),
    [startBalance, startAge, lastUntil, retReturn, inflation, growWithInflation]
  );

  const chartData = (mode === "spendToAge" ? result.series : drawdown(startBalance, startAge, sustainable, retReturn, inflation, growWithInflation, lastUntil + 2).series);

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 19, marginBottom: 6 }}>How long will your super last?</h3>
      <p style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 20 }}>
        {retiredInPast ? (
          <>You retired at {plannedRetireAge} and have <strong>{formatFull(startBalance)}</strong> left now ·
          showing how long that lasts from age {startAge}</>
        ) : alreadyRetired ? (
          <>Based on the <strong>{formatFull(startBalance)}</strong> you have now · drawing down from age {startAge}</>
        ) : (
          <>Based on your projected <strong>{formatFull(startBalance)}</strong> at age {startAge} (your balance grown
          with contributions until then) · in future dollars</>
        )}
      </p>

      {/* Mode toggle */}
      <div style={{ display: "inline-flex", border: "1px solid var(--rule-strong)", borderRadius: 8, overflow: "hidden", marginBottom: 22 }}>
        {([["spendToAge", "I'll spend $X / year"], ["ageToSpend", "I want it to last to age X"]] as const).map(([val, lbl], i) => (
          <button key={val} onClick={() => setMode(val)}
            style={{
              padding: "8px 16px", fontSize: 13.5, border: "none",
              borderLeft: i > 0 ? "1px solid var(--rule-strong)" : "none",
              background: mode === val ? "var(--ink)" : "transparent",
              color: mode === val ? "var(--paper)" : "var(--ink-soft)", cursor: "pointer",
            }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="dd-inputs">
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>{alreadyRetired ? "Drawing from age" : "Retiring at age"}</label>
            <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{startAge}</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.4, margin: 0 }}>
            {retiredInPast ? "Your current age (already retired)" : alreadyRetired ? "Your current age" : "Set by \u201cRetire at\u201d above"}
          </p>
        </div>
        {mode === "spendToAge" ? (
          <DDField label="Annual spending" value={annualSpend} onChange={setAnnualSpend} min={10000} max={200000} step={1000} money />
        ) : (
          <DDField label="Make it last until age" value={lastUntil} onChange={setLastUntil} min={startAge + 1} max={105} />
        )}
        <DDField label="Return in retirement" value={retReturn} onChange={setRetReturn} min={2} max={9} step={0.5} suffix="%" />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)", marginTop: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={growWithInflation} onChange={(e) => setGrowWithInflation(e.target.checked)} />
        Increase withdrawals each year with inflation ({inflation}%) to keep the same lifestyle
      </label>

      {!alreadyRetired && (
        <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.5 }}>
          Because your projected balance is in future dollars (it&apos;s {startAge - currentAge} years away),
          the spending figure here is also in future dollars. As a rough guide, {formatMoney(toTodaysDollars(annualSpend, inflation, startAge - currentAge))} in
          today&apos;s money would buy the same lifestyle then.
        </p>
      )}

      {/* Headline result */}
      <div style={{
        padding: "18px 20px", borderRadius: 10, margin: "20px 0 18px",
        background: "var(--paper)", border: "1px solid var(--rule-strong)",
      }}>
        {mode === "spendToAge" ? (
          result.depletes ? (
            <div style={{ fontSize: 22, lineHeight: 1.3 }}>
              Drawing <strong className="mono">{formatMoney(annualSpend)}</strong>/yr, your super lasts until
              about <strong className="mono" style={{ color: "var(--clay)" }}>age {result.ageDepleted}</strong>
              {" "}— that&apos;s <strong>{result.yearsLasted} years</strong>.
            </div>
          ) : (
            <div style={{ fontSize: 22, lineHeight: 1.3, color: "var(--green)" }}>
              At <strong className="mono">{formatMoney(annualSpend)}</strong>/yr, your returns roughly keep pace —
              your balance could last <strong>30+ years</strong> or indefinitely. Sustainable.
            </div>
          )
        ) : (
          <div style={{ fontSize: 22, lineHeight: 1.3 }}>
            To last until <strong className="mono">age {lastUntil}</strong>, you could draw about
            {" "}<strong className="mono" style={{ color: "var(--green)" }}>{formatMoney(sustainable)}</strong>/yr
            {growWithInflation ? " (rising with inflation)" : " (flat)"}.
          </div>
        )}
      </div>

      {/* Depletion chart */}
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--green)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--green)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: "var(--ink-faint)", fontFamily: "monospace" }}
              tickLine={false} axisLine={{ stroke: "var(--rule-strong)" }} />
            <YAxis tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 11, fill: "var(--ink-faint)", fontFamily: "monospace" }}
              tickLine={false} axisLine={false} width={48} />
            <Tooltip formatter={(v: number) => [formatFull(v), "Balance"]} labelFormatter={(l) => `Age ${l}`}
              contentStyle={{ background: "var(--paper-raised)", border: "1px solid var(--rule-strong)", borderRadius: 8, fontFamily: "monospace", fontSize: 13 }} />
            <Area type="monotone" dataKey="balance" stroke="var(--green)" strokeWidth={2.5} fill="url(#ddFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Age Pension note */}
      <div style={{ marginTop: 16, padding: "14px 16px", background: "var(--brass-soft)", borderRadius: 10, border: "1px solid var(--brass)" }}>
        <div className="eyebrow" style={{ color: "var(--brass)", marginBottom: 6 }}>The Age Pension changes this</div>
        <p style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.55, margin: 0 }}>
          This shows your super alone running down. In reality, once your balance falls far enough, most Australians
          become eligible for a part — then full — Age Pension, which supplements your income and means your money
          lasts considerably longer than shown here. Pension eligibility is means-tested on assets and income, so it
          varies by person. This tool deliberately doesn&apos;t estimate it — treat the age above as a conservative
          &quot;super-only&quot; floor, not the whole story.
        </p>
      </div>

      <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 12, lineHeight: 1.5 }}>
        Assumes a steady return every year (real markets vary, and a bad run early in retirement hurts more —
        &quot;sequencing risk&quot;). Withdrawals are before tax; super withdrawals after age 60 are generally tax-free.
        General information only, not financial advice.
      </p>

      <style>{`
        .dd-inputs { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 18px 24px; }
      `}</style>
    </div>
  );
}

function DDField({ label, value, onChange, min, max, step = 1, money = false, suffix = "" }: {
  label: string; value: number; onChange: (n: number) => void;
  min: number; max: number; step?: number; money?: boolean; suffix?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>{label}</label>
        <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
          {money ? "$" + value.toLocaleString("en-AU") : value}{suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
