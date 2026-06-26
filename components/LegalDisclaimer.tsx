/**
 * LegalDisclaimer.tsx
 *
 * The mandatory disclaimer required by the AFSL/financial-services consult
 * (ASIC Instrument 2026/41 generic-calculator relief + ASIC Act misleading-
 * conduct protection). The wording below is the lawyer's REQUIRED VERBATIM
 * text and must appear in a highly visible container BOTH on the signup page
 * and at the bottom of the calculator workspace.
 *
 * ⚠️ Do not edit the wording of `DISCLAIMER_BODY` without re-clearing it with
 * the financial-services lawyer — it is a compliance artifact, not copy.
 */

export const DISCLAIMER_BODY = `DISCLAIMER: This tool provides factual information and generic mathematical illustrations based on historical data from APRA, the ATO, and the ASFA Retirement Standard. It does not constitute financial product advice, nor does it take into account your personal objectives, financial situation, or needs.

All projections are illustrative estimations only and should not be relied upon to make investment decisions or product switches. Actual performance and fees depend on market conditions and individual account factors. Before making any financial decisions, you should consider your own circumstances and read the relevant Product Disclosure Statement (PDS), or seek independent advice from a licensed financial adviser.

SuperLedger is an independent educational platform. We do not issue financial products or recommend specific superannuation funds.`;

export default function LegalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="note"
      aria-label="Important legal notice"
      style={{
        marginTop: compact ? 16 : 28,
        padding: compact ? "14px 16px" : "18px 20px",
        border: "1px solid var(--rule-strong)",
        borderLeft: "4px solid var(--brass)",
        borderRadius: 10,
        background: "var(--brass-soft)",
      }}
    >
      <div
        className="eyebrow"
        style={{ color: "var(--ink-soft)", marginBottom: 8, letterSpacing: "0.12em" }}
      >
        ⚠️ Important notice
      </div>
      {DISCLAIMER_BODY.split("\n\n").map((para, i) => (
        <p
          key={i}
          style={{
            fontSize: compact ? 11.5 : 12.5,
            color: "var(--ink-soft)",
            lineHeight: 1.6,
            marginTop: i === 0 ? 0 : 8,
          }}
        >
          {para}
        </p>
      ))}
    </div>
  );
}
