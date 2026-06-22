"use client";

import { balanceStanding, atoBalances, formatFull } from "@/lib/super";

export default function BalanceBenchmark({ balance, age }: { balance: number; age: number }) {
  const { band, median, ratio, verified } = balanceStanding(balance, age);

  const ahead = balance >= median;
  const diff = Math.abs(balance - median);
  const pctOfMedian = Math.round(ratio * 100);

  // bar: median sits at 50% of the track; user's marker scales relative to it, capped
  const markerPos = Math.max(4, Math.min(96, (ratio / 2) * 100));

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 19, marginBottom: 6 }}>Your balance vs your age group</h3>
      <p style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 22 }}>
        Ages {band.band} · ATO median balance · data to {atoBalances.asAt}
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>You</div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 600 }}>{formatFull(balance)}</div>
        </div>
        <div style={{ borderLeft: "1px solid var(--rule-strong)", paddingLeft: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Typical for {band.band}</div>
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
          <>You&apos;re <strong>{formatFull(diff)} ahead</strong> of the typical {band.band} balance —
            about {pctOfMedian}% of the median.</>
        ) : (
          <>You&apos;re <strong>{formatFull(diff)} behind</strong> the typical {band.band} balance —
            about {pctOfMedian}% of the median. A gap at this age is common and closeable.</>
        )}
      </div>

      {!verified && (
        <p style={{ fontSize: 11, color: "var(--brass)", marginTop: 12, lineHeight: 1.5 }}>
          ⚠ Provisional age figures. National medians are confirmed from ATO data; the per-age
          numbers are placeholders pending the ATO Snapshot table 5 figures.
        </p>
      )}
    </div>
  );
}
