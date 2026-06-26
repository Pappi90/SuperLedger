import AuthGate from "@/components/AuthGate";
import { benchmark, funds } from "@/lib/super";

// Render this page dynamically instead of pre-rendering it at build time.
// AuthGate is a client component that creates a Supabase client; static
// pre-rendering tries to run that at build time (where the request-scoped
// environment isn't available), which throws. Forcing dynamic rendering means
// the Supabase client is only ever created in the browser, where the
// NEXT_PUBLIC_ vars are present. This is the correct mode for an auth-gated app.
export const dynamic = "force-dynamic";

/**
 * page.tsx — SuperLedger
 *
 * Phase 2 change: the full tool now sits behind a front-door landing/signup
 * VIEW (see components/AuthGate.tsx — note it is a UX shell, NOT real auth yet).
 *
 * This server component still computes the two hero "hook" figures exactly as
 * before — same lost-compounding and net-spread methodology — and passes them
 * to both the landing view (as a teaser) and the authenticated hero (unchanged).
 * Nothing about the numbers has changed; only where they're rendered.
 */

export default function Home() {
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

  // Net-return spread: the all-in difference a fund's performance makes, top 10%
  // vs bottom 20%, AFTER all fees. This is the historical spread — net returns are
  // far less persistent than fees, so it illustrates why the choice matters rather
  // than promising the gap can be captured by chasing past winners.
  const netGap = (() => {
    const nets = funds
      .map((f) => {
        if (f.strategy !== "Lifecycle" || !f.stages?.length) return f.net5yr;
        const s = f.stages.find((x) => x.ageFrom <= 40 && x.ageTo >= 40) ?? f.stages[0];
        return s.net5yr;
      })
      .filter((v): v is number => v !== null)
      .sort((a, b) => a - b);
    const pctl = (p: number) => {
      const idx = (p / 100) * (nets.length - 1);
      const lo = Math.floor(idx), hi = Math.ceil(idx);
      return nets[lo] + (nets[hi] - nets[lo]) * (idx - lo);
    };
    const bottom20 = pctl(20), top10 = pctl(90);
    const sg = 90000 * 0.12;
    let bTop = 30000, bBot = 30000;
    for (let y = 0; y < 37; y++) { bTop = bTop * (1 + top10 / 100) + sg; bBot = bBot * (1 + bottom20 / 100) + sg; }
    return { amount: Math.round(bTop - bBot), bottom20, top10 };
  })();
  const netGapLabel = "$" + (netGap.amount / 1000000).toFixed(1) + "m";

  // Packaged for the landing teaser. Same numbers, passed down as plain data.
  const hooks = {
    netGapLabel,
    lifetimeGapLabel,
    retirementYears,
    feeGap,
    bottom20: netGap.bottom20,
    top10: netGap.top10,
    count: benchmark.count,
  };

  // The authenticated hero — identical to the Phase 1 hero. Rendered on the
  // server and handed to AuthGate, which shows it above the tool once entered.
  const hero = (
    <>
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
          </p>

          <div className="hook-row">
            <div className="hero-hook">
              <span className="hook-fig mono">{netGapLabel}</span>
              <span className="hook-text">
                is the all-in difference a fund&apos;s <strong style={{ color: "var(--ink)" }}>performance</strong> has
                made over a working life — top 10% versus bottom 20%, after fees. Returns are the bigger lever.
                <span className="hook-note">
                  Net-return spread ({netGap.bottom20.toFixed(1)}% to {netGap.top10.toFixed(1)}%) over the last 5 years,
                  compounded over a 37-year career. Past performance doesn&apos;t predict future returns — this shows
                  why the choice matters, not a gain you can count on. Illustrative, not a forecast.
                  Future (nominal) dollars, not discounted to today&apos;s value; today&apos;s-dollar
                  equivalents are shown in your projection below.
                </span>
              </span>
            </div>

            <div className="hero-hook hook-fees">
              <span className="hook-fig mono">{lifetimeGapLabel}</span>
              <span className="hook-text">
                of that is just <strong style={{ color: "var(--ink)" }}>fees</strong> — about {retirementYears} years
                of a comfortable retirement, between the cheapest and priciest fund. And fees are the part you control.
                <span className="hook-note">
                  The {feeGap.toFixed(2)}-point fee gap, compounded over the same career. Counts the growth those fees
                  would have earned too, not just the fees themselves. Illustrative, not a forecast.
                  Future (nominal) dollars; today&apos;s-dollar equivalents shown in your projection below.
                </span>
              </span>
            </div>
          </div>

          <div className="hero-stats">
            <Stat value={`${benchmark.count}`} label="MySuper products compared" />
            <Stat value={`${benchmark.nir5yr.min}–${benchmark.nir5yr.max}%`} label="5yr return spread" />
            <Stat value={`${benchmark.totalFee50k.min}–${benchmark.totalFee50k.max}%`} label="annual fee spread" />
          </div>
        </div>
      </header>

      <style>{`
        .hero { padding: 80px 0 56px; border-bottom: 1px solid var(--rule); }
        .hero-title { font-size: clamp(34px, 6vw, 58px); margin: 20px 0 24px; max-width: 18ch; letter-spacing: -0.015em; }
        .ital { font-style: italic; color: var(--green); }
        .hero-sub { font-size: 19px; color: var(--ink-soft); max-width: 62ch; line-height: 1.62; }
        .hook-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px; max-width: 1000px; }
        .hero-hook { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 22px;
          padding: 24px 26px; background: var(--paper-raised); border: 1px solid var(--rule-strong);
          border-left: 4px solid var(--green); border-radius: 12px; }
        .hook-fees { border-left-color: var(--clay); }
        .hook-fig { font-size: clamp(34px, 4.5vw, 50px); font-weight: 600; color: var(--green);
          line-height: 0.95; letter-spacing: -0.02em; }
        .hook-fees .hook-fig { color: var(--clay); }
        .hook-text { font-size: 14.5px; color: var(--ink-soft); line-height: 1.5; }
        .hook-note { display: block; font-size: 11.5px; color: var(--ink-faint); margin-top: 8px; line-height: 1.5; }
        @media (max-width: 860px) { .hook-row { grid-template-columns: 1fr; } }
        .hero-stats { display: flex; gap: 48px; margin-top: 44px; flex-wrap: wrap; }
        section.wrap { padding-top: 48px; }
        @media (max-width: 560px) {
          .hero-hook { grid-template-columns: 1fr; gap: 8px; padding: 22px 22px; }
          .hero-stats { gap: 28px; }
        }
      `}</style>
    </>
  );

  const footer = (
    <footer className="foot">
      <div className="wrap">
        <p style={{ fontSize: 13, color: "var(--ink-faint)", lineHeight: 1.7 }}>
          Data source: APRA Comprehensive Product Performance Package (MySuper Products), as at 30 June 2025,
          licensed under CC BY 4.0. SuperLedger is an independent information tool and is not affiliated with APRA.
          This is general information only and does not constitute financial product advice.
        </p>
      </div>
      <style>{`.foot { border-top: 1px solid var(--rule); padding: 32px 0 60px; margin-top: 56px; }`}</style>
    </footer>
  );

  return <AuthGate hooks={hooks} hero={hero} footer={footer} />;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 3 }}>{label}</div>
    </div>
  );
}
