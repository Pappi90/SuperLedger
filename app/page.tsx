import Tool from "@/components/Tool";
import { benchmark, funds } from "@/lib/super";

export default function Home() {
  const best = [...funds].sort((a, b) => (b.nir5yr ?? 0) - (a.nir5yr ?? 0))[0];

  // Real lifetime cost of the fee gap between the cheapest and most expensive
  // MySuper fund, on a representative career (30 → 67, $30k start, $90k salary,
  // 12% SG, 7% net). Data-driven so the headline figure is never invented.
  const feeGap = benchmark.totalFee50k.max - benchmark.totalFee50k.min;
  const lifetimeGap = (() => {
    let bal = 30000, drag = 0;
    const sg = 90000 * 0.12;
    for (let y = 0; y < 37; y++) { drag += bal * (feeGap / 100); bal = bal * 1.07 + sg; }
    return Math.round(drag);
  })();
  const lifetimeGapLabel = "$" + Math.round(lifetimeGap / 1000) + "k";

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
              is the difference in fees alone between Australia&apos;s cheapest and most expensive
              MySuper fund, over a typical working life. Most people have no idea which side they&apos;re on.
              <span style={{ display: "block", fontSize: 12, color: "var(--ink-faint)", marginTop: 6 }}>
                Based on the {feeGap.toFixed(2)}-point fee gap applied over a 37-year career
                ($30k starting balance, $90k salary, 12% super, 7% returns). Illustrative, not a forecast.
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
        .hero { padding: 72px 0 56px; border-bottom: 1px solid var(--rule); }
        .hero-title { font-size: clamp(34px, 6vw, 60px); margin: 18px 0 24px; max-width: 22ch; }
        .ital { font-style: italic; color: var(--green); }
        .hero-sub { font-size: 19px; color: var(--ink-soft); max-width: 56ch; line-height: 1.6; }
        .hero-hook { display: flex; align-items: center; gap: 20px; margin-top: 32px; padding: 20px 24px;
          background: var(--clay-soft); border: 1px solid var(--clay); border-radius: 14px; max-width: 60ch; }
        .hook-fig { font-size: clamp(36px, 6vw, 52px); font-weight: 600; color: var(--clay); line-height: 1; flex: none; }
        .hook-text { font-size: 15px; color: var(--ink); line-height: 1.5; }
        .hero-stats { display: flex; gap: 40px; margin-top: 40px; flex-wrap: wrap; }
        .foot { border-top: 1px solid var(--rule); padding: 32px 0 60px; margin-top: 40px; }
        section.wrap { padding-top: 48px; }
      `}</style>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 600, color: "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
