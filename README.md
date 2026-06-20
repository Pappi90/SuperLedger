# SuperLedger

A free, no-sign-up web tool that lets Australians compare their super fund's
net returns and fees against every MySuper product, using official APRA data.

This is the MVP described in the build plan: the "age benchmarker + fee drain +
contribution modeller" combined into one page, seeded with real APRA data.

## Stack
- Next.js 14 (App Router) + React 18 + TypeScript
- Recharts for the projection chart
- Zero backend — all data is static JSON, all calc is client-side

## Run locally
```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy
Easiest path is Vercel (free tier):
```bash
npm install -g vercel
vercel
```
Or push to GitHub and import the repo at vercel.com.

## Project structure
```
app/
  layout.tsx        Root layout + metadata
  page.tsx          Landing hero + tool
  globals.css       "Ink & ledger" design system
components/
  Tool.tsx          Main interactive tool (inputs, results)
  PercentileBar.tsx Signature ranking bar
  Projection.tsx    Retirement projection chart
lib/
  super.ts          Types, percentile math, compound projection
  funds.json        Cleaned APRA seed data (28 funds + benchmarks)
data/
  funds.json        Source copy of the seed data
scripts/
  build_data.py     Rebuilds lib/funds.json from a new APRA spreadsheet
```

## The data
`lib/funds.json` is built from APRA's Comprehensive Product Performance
Package (MySuper Products, 30 June 2025), licensed CC BY 4.0. It contains
28 MySuper products that have both 5-year net investment returns and fee data,
plus pre-computed benchmark percentiles (min / p25 / median / p75 / max).

### Refreshing the data (yearly)
APRA publishes a new CPPP once a year, around late August, covering the year to
30 June. To update the app:

```bash
pip install pandas openpyxl            # one-time
python scripts/build_data.py path/to/new_CPPP_MySuper.xlsx
```

This rebuilds `lib/funds.json` in place. Review the printed summary, commit the
change, and redeploy. That's the whole job.

The script is structure-aware, not hardcoded: it finds the header row by marker,
forward-fills product identity, keeps top-level products (those with member
assets), and for lifecycle products pulls the highest-growth (youngest) age
band's returns as the headline accumulation figure. If APRA renames a column or
changes the layout, the script stops with a clear message naming what changed,
rather than silently producing wrong numbers — so always glance at the summary
it prints.

## Important
General information only — not financial advice. If you extend this toward
recommending funds or referral monetisation, get an AFSL / legal review first
(see the build plan). Keep referral disclosures explicit and rankings objective.

## Next features (from the roadmap)
- Shareable result card ("I'm ahead of 61% of funds my fund's age")
- Alias accounts + persistent SuperScore + leaderboards
- Choice (non-default) product universe from the heatmap sheets
- CDR / Open Finance auto-linking of real balances
