"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { project, formatMoney, formatFull } from "@/lib/super";

type Props = {
  balance: number;
  age: number;
  retireAge: number;
  netReturn: number;
  extraMonthly: number;
  salaryAnnual: number;
};

const SG_RATE = 0.12; // Super Guarantee 12% from 1 July 2025

export default function Projection({ balance, age, retireAge, netReturn, extraMonthly, salaryAnnual }: Props) {
  const years = Math.max(1, retireAge - age);
  const sgAnnual = salaryAnnual * SG_RATE;

  const { withExtra, without } = useMemo(() => {
    const withExtra = project(balance, netReturn, extraMonthly, sgAnnual, years);
    const without = project(balance, netReturn, 0, sgAnnual, years);
    return { withExtra, without };
  }, [balance, netReturn, extraMonthly, sgAnnual, years]);

  const data = withExtra.map((v, i) => ({
    age: age + i,
    "With extra": v,
    "Just employer": without[i],
  }));

  const finalWith = withExtra[withExtra.length - 1];
  const finalWithout = without[without.length - 1];
  const extraGain = finalWith - finalWithout;

  return (
    <div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Projected at {retireAge}</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 600, color: "var(--green)" }}>
            {formatMoney(finalWith)}
          </div>
        </div>
        {extraMonthly > 0 && (
          <div style={{ borderLeft: "1px solid var(--rule-strong)", paddingLeft: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Extra ${extraMonthly}/mo adds</div>
            <div className="mono" style={{ fontSize: 30, fontWeight: 600, color: "var(--brass)" }}>
              +{formatMoney(extraGain)}
            </div>
          </div>
        )}
      </div>

      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <XAxis
              dataKey="age"
              tick={{ fontSize: 11, fill: "var(--ink-faint)", fontFamily: "monospace" }}
              tickLine={false}
              axisLine={{ stroke: "var(--rule-strong)" }}
            />
            <YAxis
              tickFormatter={(v) => formatMoney(v)}
              tick={{ fontSize: 11, fill: "var(--ink-faint)", fontFamily: "monospace" }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              formatter={(v: number) => formatFull(v)}
              labelFormatter={(l) => `Age ${l}`}
              contentStyle={{
                background: "var(--paper-raised)", border: "1px solid var(--rule-strong)",
                borderRadius: 8, fontFamily: "monospace", fontSize: 13,
              }}
            />
            <Line type="monotone" dataKey="Just employer" stroke="var(--ink-faint)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="With extra" stroke="var(--green)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", gap: 18, fontSize: 12, color: "var(--ink-soft)", marginTop: 4, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 2, background: "var(--green)", display: "inline-block" }} /> With extra contributions
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 0, borderTop: "2px dashed var(--ink-faint)", display: "inline-block" }} /> Employer only (12% SG)
        </span>
      </div>
    </div>
  );
}
