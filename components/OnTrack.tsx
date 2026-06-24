"use client";

import { useState } from "react";
import { asfaStandard, asfaLumpSum, asfaAnnualSpend, formatFull, formatMoney, type Household, type LifestyleTier } from "@/lib/super";

type Props = {
  projectedTodaysDollars: number; // user's projected balance at retirement, in TODAY's dollars
  retireAge: number;
  alreadyRetired?: boolean;
};

const TIERS: { key: LifestyleTier; label: string; sub: string }[] = [
  { key: "comfortable", label: "Comfortable", sub: "own home" },
  { key: "modest", label: "Modest", sub: "own home" },
  { key: "modestRenting", label: "Modest", sub: "renting" },
];

export default function OnTrack({ projectedTodaysDollars, retireAge, alreadyRetired = false }: Props) {
  const [household, setHousehold] = useState<Household>("single");
  const [tier, setTier] = useState<LifestyleTier>("comfortable");

  const target = asfaLumpSum(tier, household);
  const onTrack = projectedTodaysDollars >= target;
  const gap = Math.abs(projectedTodaysDollars - target);
  const pctOfTarget = Math.round((projectedTodaysDollars / target) * 100);
  const annualSpend = asfaAnnualSpend(tier, household);
  const isRenting = tier === "modestRenting";
  const tierWord = isRenting ? "modest (renting)" : tier;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 19, marginBottom: 6 }}>Are you on track for the retirement you want?</h3>
      <p style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 20 }}>
        Against the ASFA Retirement Standard · {asfaStandard.asAt} · in today&apos;s dollars
      </p>

      {/* Selectors */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Household</div>
          <div style={{ display: "inline-flex", border: "1px solid var(--rule-strong)", borderRadius: 8, overflow: "hidden" }}>
            {([["single", "Single"], ["couple", "Couple"]] as const).map(([val, lbl], i) => (
              <button key={val} onClick={() => setHousehold(val)}
                style={{
                  padding: "8px 16px", fontSize: 14, border: "none",
                  borderLeft: i > 0 ? "1px solid var(--rule-strong)" : "none",
                  background: household === val ? "var(--ink)" : "transparent",
                  color: household === val ? "var(--paper)" : "var(--ink-soft)", cursor: "pointer",
                }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Lifestyle &amp; housing</div>
          <div style={{ display: "inline-flex", border: "1px solid var(--rule-strong)", borderRadius: 8, overflow: "hidden" }}>
            {TIERS.map((t, i) => (
              <button key={t.key} onClick={() => setTier(t.key)}
                style={{
                  padding: "6px 14px", fontSize: 14, border: "none", lineHeight: 1.2,
                  borderLeft: i > 0 ? "1px solid var(--rule-strong)" : "none",
                  background: tier === t.key ? "var(--ink)" : "transparent",
                  color: tier === t.key ? "var(--paper)" : "var(--ink-soft)", cursor: "pointer",
                  textAlign: "center",
                }}>
                {t.label}
                <span style={{ display: "block", fontSize: 11, opacity: 0.75 }}>{t.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Verdict */}
      <div style={{
        padding: "18px 20px", borderRadius: 10, marginBottom: 18,
        background: onTrack ? "var(--green-soft)" : "var(--brass-soft)",
        border: `1px solid ${onTrack ? "var(--green)" : "var(--brass)"}`,
      }}>
        <div className="eyebrow" style={{ color: onTrack ? "var(--green)" : "var(--brass)", marginBottom: 6 }}>
          {onTrack ? "On track" : "Not quite there yet"}
        </div>
        <div style={{ fontSize: 22, lineHeight: 1.3, color: "var(--ink)" }}>
          {onTrack ? (
            <>Your {alreadyRetired ? "balance" : "projected"} <strong className="mono">{formatMoney(projectedTodaysDollars)}</strong> meets the
              ASFA {tierWord} {household} target of <strong className="mono">{formatMoney(target)}</strong>.</>
          ) : (
            <>{alreadyRetired ? "Your" : "You're tracking to"} <strong className="mono">{formatMoney(projectedTodaysDollars)}</strong>{alreadyRetired ? " is" : ""} —
              about <strong className="mono">{formatMoney(gap)}</strong> short of the ASFA {tierWord} {household}{" "}
              target of <strong className="mono">{formatMoney(target)}</strong> ({pctOfTarget}% of the way).</>
          )}
        </div>
      </div>

      {/* Target vs you bar */}
      <div style={{ position: "relative", height: 8, background: "var(--rule)", borderRadius: 4, marginBottom: 8 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${Math.min(100, pctOfTarget)}%`, background: onTrack ? "var(--green)" : "var(--brass)",
          borderRadius: 4,
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 18 }}>
        <span>You: {formatFull(projectedTodaysDollars)}</span>
        <span>Target: {formatFull(target)}</span>
      </div>

      <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.55 }}>
        A {tierWord} retirement is estimated to need about <strong>{formatFull(annualSpend)}</strong> a year to spend
        as a {household}. The ASFA target assumes you also receive a part Age Pension and draw down your balance
        over retirement — so it&apos;s a guide to a lifestyle, not just a savings number.
      </p>

      <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 12, lineHeight: 1.5 }}>
        {isRenting ? (
          <>The renting target assumes you don&apos;t own your home at retirement and pay rent from your super and
            Age Pension (including Rent Assistance). ASFA publishes the renting standard at the modest level only.</>
        ) : (
          <>The comfortable and modest targets <strong>assume you own your home outright</strong> at retirement, with
            no rent or mortgage. If you expect to be renting, use the &quot;Modest · renting&quot; option instead.</>
        )}
        {" "}All ASFA figures are in today&apos;s dollars; your projection is shown in today&apos;s dollars to match.
        General information, not advice.
      </p>
    </div>
  );
}
