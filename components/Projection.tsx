"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { project, formatMoney, formatFull, toTodaysDollars, futurePrice, EVERYDAY_ITEMS, INFLATION_ANCHORS } from "@/lib/super";

type Props = {
  balance: number;
  age: number;
  retireAge: number;
  netReturn: number;
  extraMonthly: number;
  salaryAnnual: number;
  employerRate: number;
  inflation: number;
  onInflationChange: (n: number) => void;
};

const SG_RATE = 0.12;

export default function Projection({
  balance, age, retireAge, netReturn, extraMonthly, salaryAnnual, employerRate, inflation, onInflationChange,
}: Props) {
  const years = Math.max(1, retireAge - age);
  const empAnnual = salaryAnnual * (employerRate / 100);
  const sgAnnual = salaryAnnual * SG_RATE;
  const aboveSG = employerRate > 12;

  const { mainLine, sgLine } = useMemo(() => {
    const mainLine = project(balance, netReturn, extraMonthly, empAnnual, years);
    const sgLine = project(balance, netReturn, 0, sgAnnual, years);
    return { mainLine, sgLine };
  }, [balance, netReturn, extraMonthly, empAnnual, sgAnnual, years]);

  const data = mainLine.map((v, i) => ({ age: age + i, main: v, sg: sgLine[i] }));

  const finalMain = mainLine[mainLine.length - 1];
  const finalSG = sgLine[sgLine.length - 1];
  const gain = finalMain - finalSG;

  // Today's-dollars (real) equivalent of the projected balance
  const todaysValue = toTodaysDollars(finalMain, inflation, years);
  const purchasingLoss = Math.round((1 - todaysValue / finalMain) * 100);

  let gainLabel = "";
  if (aboveSG && extraMonthly > 0) gainLabel = `Your ${employerRate}% + extra adds`;
  else if (aboveSG) gainLabel = `Your ${employerRate}% employer adds`;
  else if (extraMonthly > 0) gainLabel = `Extra $${extraMonthly}/mo adds`;

  const anchors = [
    { label: "RBA target", value: INFLATION_ANCHORS.rbaMidpoint },
    { label: "Recent avg", value: INFLATION_ANCHORS.recentAverage },
    { label: "Now", value: INFLATION_ANCHORS.current },
    { label: "Long-term", value: INFLATION_ANCHORS.longTermAverage },
  ];

  return (
    <div>
      {/* Headline: nominal + today's dollars */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Projected at {retireAge}</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 600, color: "var(--green)" }}>
            {formatMoney(finalMain)}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>future dollars</div>
        </div>
        <div style={{ borderLeft: "1px solid var(--rule-strong)", paddingLeft: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Worth in today&apos;s money</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 600, color: "var(--ink)" }}>
            {formatMoney(todaysValue)}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>
            after {inflation}% inflation for {years} yrs
          </div>
        </div>
        {gainLabel && gain > 0 && (
          <div style={{ borderLeft: "1px solid var(--rule-strong)", paddingLeft: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>{gainLabel}</div>
            <div className="mono" style={{ fontSize: 30, fontWeight: 600, color: "var(--brass)" }}>
              +{formatMoney(gain)}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>future dollars</div>
          </div>
        )}
      </div>

      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: "var(--ink-faint)", fontFamily: "monospace" }}
              tickLine={false} axisLine={{ stroke: "var(--rule-strong)" }} />
            <YAxis tickFormatter={(v) => formatMoney(v)} tick={{ fontSize: 11, fill: "var(--ink-faint)", fontFamily: "monospace" }}
              tickLine={false} axisLine={false} width={48} />
            <Tooltip formatter={(v: number, name) => [formatFull(v), name === "main" ? "Your projection" : "12% SG minimum"]}
              labelFormatter={(l) => `Age ${l}`}
              contentStyle={{ background: "var(--paper-raised)", border: "1px solid var(--rule-strong)", borderRadius: 8, fontFamily: "monospace", fontSize: 13 }} />
            <Line type="monotone" dataKey="sg" stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="main" stroke="var(--green)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", gap: 18, fontSize: 12, color: "var(--ink-soft)", marginTop: 4, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 2, background: "var(--green)", display: "inline-block" }} />
          {aboveSG || extraMonthly > 0 ? `Your projection (${employerRate}% employer${extraMonthly > 0 ? " + extra" : ""})` : "Your projection (12% SG)"}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 0, borderTop: "2px dashed var(--ink-faint)", display: "inline-block" }} />
          12% SG minimum
        </span>
      </div>

      {/* Inflation control */}
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--rule)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span className="eyebrow">Inflation assumption</span>
          <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{inflation}% / yr</span>
        </div>
        <input type="range" min={1} max={6} step={0.1} value={inflation}
          onChange={(e) => onInflationChange(Number(e.target.value))} style={{ marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {anchors.map((a) => (
            <button key={a.label} onClick={() => onInflationChange(a.value)}
              style={{
                fontSize: 12, padding: "4px 10px", borderRadius: 20,
                border: `1px solid ${inflation === a.value ? "var(--brass)" : "var(--rule-strong)"}`,
                background: inflation === a.value ? "var(--brass-soft)" : "transparent",
                color: inflation === a.value ? "var(--brass)" : "var(--ink-soft)", cursor: "pointer",
              }}>
              {a.label} {a.value}%
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.5 }}>
          The RBA targets 2–3% over the medium term. Australia&apos;s long-run average since 1901 is ~4.8%;
          recent years have averaged ~2.8%. Higher inflation means your future balance buys less.
        </p>
      </div>

      {/* Tangible items */}
      <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--rule)" }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>What things will cost by {retireAge}</div>
        <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 14, lineHeight: 1.5 }}>
          Why the &quot;today&apos;s money&quot; figure matters — at {inflation}% inflation over {years} years:
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          {EVERYDAY_ITEMS.map((item) => {
            const future = futurePrice(item.price, inflation, years);
            return (
              <div key={item.label} style={{ padding: "12px 14px", background: "var(--paper)", borderRadius: 10, border: "1px solid var(--rule)" }}>
                <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 6 }}>{item.icon} {item.label}</div>
                <div className="mono" style={{ fontSize: 15 }}>
                  <span style={{ color: "var(--ink-faint)" }}>${item.price.toFixed(2)}</span>
                  <span style={{ color: "var(--ink-faint)", margin: "0 6px" }}>→</span>
                  <span style={{ fontWeight: 600, color: "var(--clay)" }}>${future.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
