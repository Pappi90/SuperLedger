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
