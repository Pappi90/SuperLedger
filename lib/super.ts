import data from "./funds.json";

export type Fund = {
  trustee: string;
  fund: string;
  product: string;
  publicOffer: boolean;
  strategy: string;
  memberAccounts: number | null;
  performanceTest: string | null;
  growthAllocation: number | null;
  nir10yr: number | null;
  nir7yr: number | null;
  nir5yr: number | null;
  nir3yr: number | null;
  totalFee10k: number | null;
  totalFee50k: number | null;
  totalFee100k: number | null;
  totalFee250k: number | null;
};

export type Stats = {
  min: number; p25: number; median: number; p75: number; max: number; mean: number;
};

export type Benchmark = {
  nir5yr: Stats; nir3yr: Stats; nir10yr: Stats; totalFee50k: Stats;
  count: number; asAt: string; source: string;
};

export const funds: Fund[] = data.funds as Fund[];
export const benchmark: Benchmark = data.benchmark as Benchmark;

// Percentile rank: what % of funds this value beats (higher is better for returns)
export function percentileRank(value: number, values: number[], higherIsBetter = true): number {
  const sorted = [...values].sort((a, b) => a - b);
  const below = sorted.filter((v) => (higherIsBetter ? v < value : v > value)).length;
  return Math.round((below / sorted.length) * 100);
}

export function fundReturns(): number[] {
  return funds.map((f) => f.nir5yr).filter((v): v is number => v !== null);
}

export function fundFees(): number[] {
  return funds.map((f) => f.totalFee50k).filter((v): v is number => v !== null);
}

// Compound projection: balance forward with annual net return + monthly contributions
export function project(
  balance: number,
  annualNetReturnPct: number,
  extraMonthly: number,
  sgContributionAnnual: number,
  years: number
): number[] {
  const r = annualNetReturnPct / 100;
  let b = balance;
  const series = [Math.round(b)];
  for (let y = 0; y < years; y++) {
    b = b * (1 + r) + extraMonthly * 12 + sgContributionAnnual;
    series.push(Math.round(b));
  }
  return series;
}

export function formatMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return "$" + Math.round(n / 1000) + "k";
  return "$" + Math.round(n);
}

export function formatFull(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-AU");
}

// ── ATO balance-by-age benchmark ────────────────────────────────
import ato from "./atoBalances.json";

export type AgeBand = {
  band: string; ageFrom: number; ageTo: number; median: number;
  medianMale?: number; medianFemale?: number; verified: boolean;
};

export type AtoData = {
  source: string; asAt: string; licence: string; verified: boolean;
  national: { medianAll: number; averageAll: number; medianMale: number; medianFemale: number };
  byAge: AgeBand[];
};

export const atoBalances = ato as unknown as AtoData;

export function ageBandFor(age: number): AgeBand {
  const bands = atoBalances.byAge;
  for (const b of bands) {
    if (age >= b.ageFrom && age <= b.ageTo) return b;
  }
  return bands[bands.length - 1];
}

// How a balance compares to the median for that age band.
// Returns the ratio and a plain-English standing.
export function balanceStanding(balance: number, age: number): {
  band: AgeBand; median: number; ratio: number; aheadPct: number; verified: boolean;
} {
  const band = ageBandFor(age);
  const median = band.median;
  const ratio = median > 0 ? balance / median : 1;
  // crude but honest: express how far above/below the median midpoint they sit,
  // capped to a sensible 0-99 display range
  const aheadPct = Math.max(1, Math.min(99, Math.round(50 * ratio)));
  return { band, median, ratio, aheadPct, verified: band.verified && atoBalances.verified };
}

// ── Real percentile bands from ATO Table 22 ─────────────────────
import pctData from "./atoPercentiles.json";

type PctBand = {
  age: string; total: number;
  counts: Record<string, number>;
  p25: number; p50: number; p75: number; p90: number;
};

const pctBands = (pctData as { bands: PctBand[] }).bands;

// Map a precise age to Table 22's coarser age buckets
function pctBandFor(age: number): PctBand {
  let key: string;
  if (age < 30) key = "Under 30";
  else if (age <= 49) key = "30 - 49";
  else if (age <= 54) key = "50 - 54";
  else if (age <= 59) key = "55 - 59";
  else if (age <= 64) key = "60 - 64";
  else if (age <= 69) key = "65 - 69";
  else key = "70 and over";
  return pctBands.find((b) => b.age === key) ?? pctBands[0];
}

const BAL_BOUNDS: [string, number, number][] = [
  ["Less than $50,000", 0, 50000],
  ["$50,000 to $99,999", 50000, 100000],
  ["$100,000 to $149,999", 100000, 150000],
  ["$150,000 to $199,999", 150000, 200000],
  ["$200,000 to $249,999", 200000, 250000],
  ["$250,000 to $499,999", 250000, 500000],
  ["$500,000 to $749,999", 500000, 750000],
  ["$750,000 to $999,999", 750000, 1000000],
  ["$1,000,000 to $1,999,999", 1000000, 2000000],
  ["$2,000,000 or more", 2000000, 5000000],
];

// What percentile a given balance sits at within its age band (0-100).
// Returns the % of people your age with a SMALLER balance.
export function balancePercentile(balance: number, age: number): {
  percentile: number; topPct: number; ageLabel: string; p50: number;
} {
  const band = pctBandFor(age);
  const total = band.total;
  let below = 0;
  for (const [label, lo, hi] of BAL_BOUNDS) {
    const n = band.counts[label] ?? 0;
    if (balance >= hi) below += n;
    else if (balance <= lo) break;
    else { below += n * ((balance - lo) / (hi - lo)); break; }
  }
  const percentile = Math.max(1, Math.min(99, Math.round((below / total) * 100)));
  return { percentile, topPct: 100 - percentile, ageLabel: band.age, p50: band.p50 };
}
