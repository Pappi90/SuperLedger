"use client";

import { formatMoney } from "@/lib/super";

type Props = {
  curve: { balance: number; fee: number | null }[];
  userTier: number;
};

export default function FeeCurve({ curve, userTier }: Props) {
  const pts = curve.filter((p) => p.fee !== null) as { balance: number; fee: number }[];
  if (pts.length < 2) return null;

  const fees = pts.map((p) => p.fee);
  const maxFee = Math.max(...fees);
  const minFee = Math.min(...fees);
  const range = maxFee - minFee || 1;

  return (
    <div style={{ marginTop: 14, marginBottom: 4, padding: "14px 16px", background: "var(--paper)", borderRadius: 10, border: "1px solid var(--rule)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <span className="eyebrow">How this fund&apos;s fee changes with balance</span>
        <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>most funds get cheaper as you grow</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 64 }}>
        {pts.map((p) => {
          const h = 20 + ((maxFee - p.fee) / range) * 38; // lower fee = taller bar (better)
          const isUser = p.balance === userTier;
          return (
            <div key={p.balance} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: isUser ? "var(--green)" : "var(--ink-soft)" }}>
                {p.fee.toFixed(2)}%
              </span>
              <div style={{
                width: "100%", height: h, borderRadius: 5,
                background: isUser ? "var(--green)" : "var(--rule-strong)",
                opacity: isUser ? 1 : 0.55,
              }} />
              <span style={{ fontSize: 10.5, color: isUser ? "var(--green)" : "var(--ink-faint)", fontWeight: isUser ? 600 : 400 }}>
                {formatMoney(p.balance)}
              </span>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 10, lineHeight: 1.5 }}>
        Highlighted is closest to your balance. Funds with a fixed-dollar admin fee look pricier on small
        balances and cheaper on large ones, so comparing at your own balance is the fair view.
      </p>
    </div>
  );
}
