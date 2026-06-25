import Tool from "@/components/Tool";
import { benchmark, funds } from "@/lib/super";

export default function Home() {
  const best = [...funds].sort((a, b) => (b.nir5yr ?? 0) - (a.nir5yr ?? 0))[0];

  // Real lifetime cost of the fee gap between the cheapest and most expensive
  // MySuper fund. We use the LOST-COMPOUNDING method: every dollar paid in fees
  // is also a dollar that would have kept earning returns for decades, so the true
  // cost is the gap between two parallel balances — one paying the high fee, one
  // the low fee — over a full career. This is more honest than counting fees alone.
  const feeGap = benchmark.totalFee50k.max - benchmark.totalFee50k.min;
  const lifetimeGap = (() => {
    const grossReturn = 8; // ~net median + typical fee, so net = gross − fee
    const highFee = benchmark.totalFee50k.max;
    const lowFee = benchmark.totalFee50k.min;
    const salary = 90000, sg = salary * 0.12, years = 37; // age 30 → 67
    let balHigh = 30000, balLow = 30000;
    for (let y = 0; y < years; y++) {
      balHigh = balHigh * (1 + (grossReturn - highFee) / 100) + sg;
      balLow = balLow * (1 + (grossReturn - lowFee) / 100) + sg;
    }
    return Math.round(balLow - balHigh);
  })();
  const lifetimeGapLabel = "$" + Math.round(lifetimeGap / 1000) + "k";
  // Relatable anchor: years of a comfortable single retirement (ASFA annual spend)
  const retirementYears = (lifetimeGap / 55923).toFixed(1);

  return (
    <main>
      {/* Hero */}
      <header className="hero">
        <div className="wrap">
          <div className="eyebrow">Australian superannuation · official APRA data</div>
          <h1 className="hero-title">
            Your super is quietly<br />
            <span className="ital">winning or losing</span> you<br />
            hundreds of thousands of dollars.
          </h1>
          <p className="hero-sub">
            Most Australians never check. Enter your details below and see exactly where your
            fund ranks on net returns and fees — against every MySuper product in the country.
            No sign-up. No advice. Just the numbers.
          </p>

          <div className="hero-hook">
            <span className="hook-fig mono">{lifetimeGapLabel}</span>
            <span className="hook-text">
              is the gap between Australia&apos;s cheapest and most expensive MySuper fund over a working life —
              about <strong style={{ color: "var(--ink)" }}>{retirementYears} years of a comfortable retirement</strong>,
              lost to fees. Most people have no idea which side they&apos;re on.
              <span className="hook-note">
                The {feeGap.toFixed(2)}-point fee gap, compounded over a 37-year career ($30k starting balance,
                $90k salary, 12% super, 8% gross return). Counts the growth those fees would have earned too —
                not just the fees themselves. Illustrative, not a forecast.
              </span>
            </span>
          </div>

          <div className="hero-stats">
            <Stat value={`${benchmark.count}`} label="MySuper products compared" />
            <Stat value={`${benchmark.nir5yr.min}–${benchmark.nir5yr.max}%`} label="5yr return spread" />
            <Stat value={`${benchmark.totalFee50k.min}–${benchmark.totalFee50k.max}%`} label="annual fee spread" />
          </div>
        </div>
      </header>

      {/* Tool */}
      <section className="wrap" style={{ paddingBottom: 80 }}>
        <Tool />
      </section>

      {/* Footer */}
      <footer className="foot">
        <div className="wrap">
          <p style={{ fontSize: 13, color: "var(--ink-faint)", lineHeight: 1.7 }}>
            Data source: APRA Comprehensive Product Performance Package (MySuper Products), as at 30 June 2025,
            licensed under CC BY 4.0. SuperLedger is an independent information tool and is not affiliated with APRA.
            This is general information only and does not constitute financial product advice.
          </p>
        </div>
      </footer>

      <style>{`
        .hero { padding: 80px 0 56px; border-bottom: 1px solid var(--rule); }
        .hero-title { font-size: clamp(34px, 6vw, 58px); margin: 20px 0 24px; max-width: 18ch; letter-spacing: -0.015em; }
        .ital { font-style: italic; color: var(--green); }
        .hero-sub { font-size: 19px; color: var(--ink-soft); max-width: 62ch; line-height: 1.62; }
        .hero-hook { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 24px;
          margin-top: 40px; padding: 26px 28px; max-width: 62ch;
          background: var(--paper-raised); border: 1px solid var(--rule-strong);
          border-left: 4px solid var(--clay); border-radius: 12px; }
        .hook-fig { font-size: clamp(40px, 6vw, 56px); font-weight: 600; color: var(--clay);
          line-height: 0.95; letter-spacing: -0.02em; }
        .hook-text { font-size: 15px; color: var(--ink-soft); line-height: 1.55; }
        .hook-note { display: block; font-size: 12px; color: var(--ink-faint); margin-top: 8px; line-height: 1.5; }
        .hero-stats { display: flex; gap: 48px; margin-top: 44px; flex-wrap: wrap; }
        .foot { border-top: 1px solid var(--rule); padding: 32px 0 60px; margin-top: 56px; }
        section.wrap { padding-top: 48px; }
        @media (max-width: 560px) {
          .hero-hook { grid-template-columns: 1fr; gap: 8px; padding: 22px 22px; }
          .hero-stats { gap: 28px; }
        }
      `}</style>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 3 }}>{label}</div>
    </div>
  );
}
