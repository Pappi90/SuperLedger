"use client";

import { balanceStanding, atoBalances, balancePercentile, formatFull, type Gender } from "@/lib/super";

export default function BalanceBenchmark({ balance, age, gender = "all" }: { balance: number; age: number; gender?: Gender }) {
  const { band, median, ratio, verified, genderUsed } = balanceStanding(balance, age, gender);

  const ahead = balance >= median;
  const diff = Math.abs(balance - median);
  const pctOfMedian = Math.round(ratio * 100);

  // Real percentile from ATO Table 22 distribution (combined-sex only — see note)
  const { percentile, topPct, ageLabel } = balancePercentile(balance, age);
  const topHalf = percentile >= 50;

  // Wording helpers for the gender-specific median comparison
  const peerWord = genderUsed === "male" ? "men" : genderUsed === "female" ? "women" : "Australians";
  const typicalLabel = genderUsed === "male" ? `men aged ${band.band}`
    : genderUsed === "female" ? `women aged ${band.band}`
    : `ages ${band.band}`;

  // bar: median sits at 50% of the track; user's marker scales relative to it, capped
  const markerPos = Math.max(4, Math.min(96, (ratio / 2) * 100));

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 19, marginBottom: 6 }}>Your balance vs your age group</h3>
      <p style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 20 }}>
        {genderUsed === "all" ? `Ages ${band.band}` : `${peerWord.charAt(0).toUpperCase() + peerWord.slice(1)} aged ${band.band}`}
        {" "}· ATO median balance · data to {atoBalances.asAt}
      </p>

      {/* Percentile headline — note: distribution data is combined-sex only */}
      <div style={{
        padding: "16px 18px", borderRadius: 10, marginBottom: 22,
        background: topHalf ? "var(--green-soft)" : "var(--brass-soft)",
        border: `1px solid ${topHalf ? "var(--green)" : "var(--brass)"}`,
      }}>
        <div className="eyebrow" style={{ color: topHalf ? "var(--green)" : "var(--brass)", marginBottom: 6 }}>
          Where you rank
        </div>
        <div style={{ fontSize: 22, lineHeight: 1.3, color: "var(--ink)" }}>
          {topHalf ? (
            <>You&apos;re in the <strong className="mono" style={{ color: "var(--green)" }}>top {topPct}%</strong> of
              Australians aged {ageLabel} by super balance.</>
          ) : (
            <>You&apos;re ahead of <strong className="mono" style={{ color: "var(--brass)" }}>{percentile}%</strong> of
              Australians aged {ageLabel} — there&apos;s room to climb, and time to do it.</>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>You</div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 600 }}>{formatFull(balance)}</div>
        </div>
        <div style={{ borderLeft: "1px solid var(--rule-strong)", paddingLeft: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Typical for {typicalLabel}</div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 600, color: "var(--ink-soft)" }}>
            {formatFull(median)}
          </div>
        </div>
      </div>

      {/* comparison bar */}
      <div style={{ position: "relative", height: 8, background: "var(--rule)", borderRadius: 4, marginBottom: 10 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${markerPos}%`, background: ahead ? "var(--green)" : "var(--clay)",
          opacity: 0.18, borderRadius: 4,
        }} />
        {/* median line at 50% */}
        <div style={{ position: "absolute", left: "50%", top: -5, height: 18, width: 2, background: "var(--ink-faint)" }} />
        {/* user marker */}
        <div style={{
          position: "absolute", left: `${markerPos}%`, top: "50%",
          width: 16, height: 16, borderRadius: "50%", background: ahead ? "var(--green)" : "var(--clay)",
          border: "3px solid var(--paper-raised)", transform: "translate(-50%, -50%)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-faint)", marginBottom: 18 }}>
        <span>Behind</span><span className="mono">median ({formatFull(median)})</span><span>Ahead</span>
      </div>

      <div style={{
        padding: "12px 16px", borderRadius: 8,
        background: ahead ? "var(--green-soft)" : "var(--clay-soft)",
        color: ahead ? "var(--green)" : "var(--clay)", fontSize: 15, lineHeight: 1.5,
      }}>
        {ahead ? (
          <>You&apos;re <strong>{formatFull(diff)} ahead</strong> of the typical {typicalLabel} balance —
            about {pctOfMedian}% of the median.</>
        ) : (
          <>You&apos;re <strong>{formatFull(diff)} behind</strong> the typical {typicalLabel} balance —
            about {pctOfMedian}% of the median. A gap at this age is common and closeable.</>
        )}
      </div>

      {genderUsed !== "all" && (
        <p style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 12, lineHeight: 1.5 }}>
          The median above is for {peerWord} aged {band.band}. The &quot;top X%&quot; ranking uses ATO&apos;s
          combined-sex distribution (the only breakdown ATO publishes for that figure), so it&apos;s across
          all Australians your age.
        </p>
      )}

      {!verified && (
        <p style={{ fontSize: 11, color: "var(--brass)", marginTop: 12, lineHeight: 1.5 }}>
          ⚠ Provisional age figures. National medians are confirmed from ATO data; the per-age
          numbers are placeholders pending the ATO Snapshot table 5 figures.
        </p>
      )}
    </div>
  );
}
