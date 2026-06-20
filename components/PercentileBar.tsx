"use client";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  median: number;
  unit?: string;
  higherIsBetter?: boolean;
  percentile: number;
};

export default function PercentileBar({
  label, value, min, max, median, unit = "%", higherIsBetter = true, percentile,
}: Props) {
  const span = max - min || 1;
  const pos = Math.max(0, Math.min(100, ((value - min) / span) * 100));
  const medPos = Math.max(0, Math.min(100, ((median - min) / span) * 100));

  const good = higherIsBetter ? percentile >= 50 : percentile >= 50;
  const markColor = good ? "var(--green)" : "var(--clay)";

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontSize: 15, color: "var(--ink-soft)" }}>{label}</span>
        <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
          {value.toFixed(unit === "%" ? 2 : 0)}{unit}
        </span>
      </div>

      <div style={{ position: "relative", height: 8, background: "var(--rule)", borderRadius: 4 }}>
        {/* range fill from min to value */}
        <div
          style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            width: `${pos}%`, background: markColor, opacity: 0.18, borderRadius: 4,
          }}
        />
        {/* median tick */}
        <div
          title={`Median: ${median}${unit}`}
          style={{
            position: "absolute", left: `${medPos}%`, top: -4, height: 16, width: 2,
            background: "var(--ink-faint)", transform: "translateX(-1px)",
          }}
        />
        {/* value marker */}
        <div
          style={{
            position: "absolute", left: `${pos}%`, top: "50%",
            width: 16, height: 16, borderRadius: "50%", background: markColor,
            border: "3px solid var(--paper-raised)", transform: "translate(-50%, -50%)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{min}{unit}</span>
        <span style={{ fontSize: 12, color: markColor, fontWeight: 600 }}>
          {higherIsBetter
            ? `Ahead of ${percentile}% of funds`
            : `Cheaper than ${percentile}% of funds`}
        </span>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{max}{unit}</span>
      </div>
    </div>
  );
}
