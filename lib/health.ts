// ============================================================================
// Super Health — scoring for the three-ring summary.
// Pure and swappable: the UI (components/SuperHealthRings.tsx) only consumes the
// shape returned here. Change a weight or a formula in this file and the rings
// update with no UI changes. All copy is neutral/factual by design — it never
// suggests changing funds or contributions and never makes a recommendation.
// Percentile inputs come straight from Tool.tsx (the same memoised values used
// everywhere else), so the rings always agree with the rest of the tool.
// ============================================================================

import { benchmark, asfaLumpSum, formatFull } from "./super";

export type SuperHealthInput = {
  balance: number;
  userFeePct: number;        // fee % at the user's balance tier (for the $ figure)
  feeScore: number;          // 0-100, percentile (lower fee = better) — from Tool
  userNetReturn: number;     // all-in net return % (after all fees)
  perfScore: number;         // 0-100, percentile of net return — from Tool
  projectedTodaysDollars: number; // projected balance at retirement, today's dollars
};

export type RingKey = "fees" | "performance" | "readiness";

export type HealthRing = {
  key: RingKey;
  title: string;
  score: number;     // 0-100
  scored: boolean;   // whether this ring contributes to the composite score
  primary: string;   // headline figure
  compare: string;   // neutral comparison sentence
  note: string;      // clarifier on what this ring means / how it relates to the others
  aria: string;      // screen-reader description
};

export type SuperHealth = {
  rings: HealthRing[];
  score: number;     // composite 0-100
  band: string;      // neutral label
  weakest: HealthRing;
};

// Relative weight of each ring in the overall score. Fees are intentionally 0:
// they're already reflected in net return (the performance ring) and in the
// readiness projection (which uses net return), so weighting fees here would
// double-count them. The fee ring stays visible for context, just unscored.
export const HEALTH_WEIGHTS: Record<RingKey, number> = {
  fees: 0,
  performance: 0.5,
  readiness: 0.5,
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function computeSuperHealth(input: SuperHealthInput): SuperHealth {
  const { balance, userFeePct, feeScore, userNetReturn, perfScore, projectedTodaysDollars } = input;

  // Peer medians and the readiness benchmark come from canonical data.
  const peerFeePct = benchmark.totalFee50k.median;
  const userFeeAnnual = (userFeePct / 100) * balance;
  const peerFeeAnnual = (peerFeePct / 100) * balance;
  const peerNetReturn = benchmark.net5yr.median;
  const comfortableBenchmark = asfaLumpSum("comfortable", "single");

  const readinessScore = clamp(
    comfortableBenchmark > 0 ? Math.round((projectedTodaysDollars / comfortableBenchmark) * 100) : 0
  );

  const rings: HealthRing[] = [
    {
      key: "fees",
      title: "Fee health",
      score: clamp(Math.round(feeScore)),
      scored: HEALTH_WEIGHTS.fees > 0,
      primary: `${formatFull(userFeeAnnual)} / year on ${formatFull(balance)}`,
      compare: `The median comparable fund charges ${formatFull(
        peerFeeAnnual
      )}. Your fees rank ahead of about ${Math.round(feeScore)}% of similar options.`,
      note: "Shown for context — already reflected in your net returns, so it isn't counted again in the score.",
      aria: `Fee health, ${Math.round(feeScore)} out of 100, shown for context and not counted in the overall score. You pay ${formatFull(
        userFeeAnnual
      )} a year, against a median comparable fund of ${formatFull(peerFeeAnnual)}.`,
    },
    {
      key: "performance",
      title: "Performance health",
      score: clamp(Math.round(perfScore)),
      scored: HEALTH_WEIGHTS.performance > 0,
      primary: `${userNetReturn.toFixed(1)}% p.a. · net, after all fees`,
      compare: `The median comparable option returned ${peerNetReturn.toFixed(
        1
      )}%. Around the ${Math.round(perfScore)}th percentile of similar funds.`,
      note: "Already after fees — read with the fee ring for value for money.",
      aria: `Performance health, ${Math.round(perfScore)} out of 100. Your net return after all fees is ${userNetReturn.toFixed(
        1
      )} percent, against a median of ${peerNetReturn.toFixed(1)} percent.`,
    },
    {
      key: "readiness",
      title: "Retirement readiness",
      score: readinessScore,
      scored: HEALTH_WEIGHTS.readiness > 0,
      primary: `Tracking toward ~${formatFull(projectedTodaysDollars)} (today's dollars)`,
      compare: `Compared with the ASFA "comfortable" single benchmark of ${formatFull(
        comfortableBenchmark
      )}, reflecting your age, balance, contributions and time to retirement.`,
      note: "A guide to a lifestyle; the comfortable benchmark assumes you own your home.",
      aria: `Retirement readiness, ${readinessScore} out of 100. Your balance is tracking toward about ${formatFull(
        projectedTodaysDollars
      )} in today's dollars, against a comfortable benchmark of ${formatFull(comfortableBenchmark)}.`,
    },
  ];

  const score = Math.round(
    rings[0].score * HEALTH_WEIGHTS.fees +
      rings[1].score * HEALTH_WEIGHTS.performance +
      rings[2].score * HEALTH_WEIGHTS.readiness
  );

  // Biggest opportunity is chosen only among rings that count toward the score,
  // so the headline insight stays consistent with what the score measures.
  const scoredRings = rings.filter((r) => r.scored);
  const weakest = scoredRings.reduce((a, b) => (b.score < a.score ? b : a));
  const band =
    score >= 80 ? "Strong" : score >= 65 ? "Solid" : score >= 50 ? "Building" : "Getting started";

  return { rings, score, band, weakest };
}
