#!/usr/bin/env python3
"""
Build lib/funds.json from an APRA Comprehensive Product Performance Package (CPPP)
MySuper spreadsheet.

APRA publishes a new CPPP once a year (around late August, covering the year to
30 June). To refresh the app's data:

    python scripts/build_data.py path/to/new_CPPP_MySuper.xlsx

This overwrites lib/funds.json. Commit the change and redeploy.

Requires: pandas, openpyxl   ->   pip install pandas openpyxl
"""
import sys, os, json, statistics
import pandas as pd

SHEET = "MySuper Products"
HEADER_MARKER = "Sort ID"   # the header row starts with this in column 0

RET_COLS = {
    "nir10yr": "10 year Net Investment Return (NIR) p.a.",
    "nir7yr":  "7 year Net Investment Return (NIR) p.a.",
    "nir5yr":  "5 year Net Investment Return (NIR) p.a.",
    "nir3yr":  "3 year Net Investment Return (NIR) p.a.",
}
FEE_COLS = {
    "totalFee10k":  "Total fees and costs charged\n($10,000 account balance)",
    "totalFee50k":  "Total fees and costs charged\n($50,000 account balance)",
    "totalFee100k": "Total fees and costs charged\n($100,000 account balance)",
    "totalFee250k": "Total fees and costs charged\n($250,000 account balance)",
}
ASSETS_COL   = "Member assets ($'000)#"
ACCOUNTS_COL = "Member accounts (rounded to nearest ten)#"
GROWTH_COL   = "Strategic growth asset allocation"
ID_COLS = ["RSE licensee", "RSE name", "Public offer status",
           "MySuper product name", "Single strategy / Lifecycle indicator"]


def find_header_row(path):
    raw = pd.read_excel(path, sheet_name=SHEET, header=None, nrows=15)
    for i in range(len(raw)):
        if str(raw.iloc[i, 0]).strip() == HEADER_MARKER:
            return i
    raise SystemExit(f"Could not find header row (marker '{HEADER_MARKER}') in sheet '{SHEET}'. "
                     "APRA may have changed the layout — inspect the file.")


def pct(v, dp=2):
    return None if pd.isna(v) else round(float(v) * 100, dp)


def asof_date(path):
    # Try to read the "as at" date from the sheet title; fall back to a placeholder.
    try:
        raw = pd.read_excel(path, sheet_name=SHEET, header=None, nrows=3)
        text = " ".join(str(x) for x in raw.values.flatten() if pd.notna(x))
        import re
        m = re.search(r"(\d{1,2}\s+\w+\s+\d{4})", text)
        if m:
            return m.group(1)
    except Exception:
        pass
    return "see source file"


def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: python scripts/build_data.py path/to/CPPP_MySuper.xlsx")
    path = sys.argv[1]
    if not os.path.exists(path):
        sys.exit(f"File not found: {path}")

    header = find_header_row(path)
    df = pd.read_excel(path, sheet_name=SHEET, header=header)

    missing = [c for c in [ASSETS_COL, *RET_COLS.values(), *FEE_COLS.values()] if c not in df.columns]
    if missing:
        sys.exit("Expected columns missing (APRA may have renamed them):\n  " + "\n  ".join(missing))

    # Forward-fill product identity so lifecycle sub-rows inherit their parent's identity
    df[ID_COLS] = df[ID_COLS].ffill()
    df["_key"] = df["RSE licensee"].astype(str) + "||" + df["MySuper product name"].astype(str)

    records = []
    for _key, grp in df.groupby("_key", sort=False):
        head = grp[grp[ASSETS_COL].notna()]
        if head.empty:
            continue
        h = head.iloc[0]
        strategy = str(h["Single strategy / Lifecycle indicator"]).strip()

        rec = {
            "trustee": str(h["RSE licensee"]).strip(),
            "fund": str(h["RSE name"]).strip(),
            "product": str(h["MySuper product name"]).strip(),
            "publicOffer": bool(h["Public offer status"] == "Public offer"),
            "strategy": strategy,
            "memberAccounts": int(h[ACCOUNTS_COL]) if pd.notna(h[ACCOUNTS_COL]) else None,
            "performanceTest": str(h["Pass/Fail indicator"]).strip() if pd.notna(h["Pass/Fail indicator"]) else None,
        }

        # Single-strategy returns sit on the head row.
        # Lifecycle returns sit on age-band sub-rows; use the highest-growth
        # (youngest / accumulation) stage as the headline figure.
        if strategy == "Single strategy":
            src = h
            rec["growthAllocation"] = round(float(h[GROWTH_COL]), 2) if pd.notna(h[GROWTH_COL]) else None
        else:
            subs = grp[grp[RET_COLS["nir5yr"]].notna()].copy()
            if subs.empty:
                src = h
                rec["growthAllocation"] = None
            else:
                subs["_g"] = pd.to_numeric(subs[GROWTH_COL], errors="coerce")
                src = subs.loc[subs["_g"].idxmax()]
                rec["growthAllocation"] = round(float(src["_g"]), 2) if pd.notna(src["_g"]) else None

        for k, col in RET_COLS.items():
            rec[k] = pct(src[col])
        for k, col in FEE_COLS.items():
            rec[k] = pct(h[col], 3)

        records.append(rec)

    usable = [r for r in records if r["nir5yr"] is not None and r["totalFee50k"] is not None]
    usable.sort(key=lambda x: x["nir5yr"], reverse=True)

    def percentiles(vals):
        s = sorted(vals)
        return {
            "min": min(s),
            "p25": round(statistics.quantiles(s, n=4)[0], 3),
            "median": round(statistics.median(s), 3),
            "p75": round(statistics.quantiles(s, n=4)[2], 3),
            "max": max(s),
            "mean": round(statistics.mean(s), 3),
        }

    as_at = asof_date(path)
    benchmark = {
        "nir5yr": percentiles([r["nir5yr"] for r in usable]),
        "nir3yr": percentiles([r["nir3yr"] for r in usable if r["nir3yr"] is not None]),
        "nir10yr": percentiles([r["nir10yr"] for r in usable if r["nir10yr"] is not None]),
        "totalFee50k": percentiles([r["totalFee50k"] for r in usable]),
        "count": len(usable),
        "asAt": as_at,
        "source": f"APRA Comprehensive Product Performance Package (CPPP) - MySuper Products, {as_at}",
    }

    out = {"funds": usable, "benchmark": benchmark}
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dest = os.path.join(here, "lib", "funds.json")
    with open(dest, "w") as f:
        json.dump(out, f, indent=2)

    print(f"OK  Wrote {len(usable)} funds to {dest}")
    print(f"    As-at date: {as_at}")
    print(f"    5yr net return: {benchmark['nir5yr']['min']}%–{benchmark['nir5yr']['max']}% "
          f"(median {benchmark['nir5yr']['median']}%)")
    print(f"    Fee on $50k:    {benchmark['totalFee50k']['min']}%–{benchmark['totalFee50k']['max']}% "
          f"(median {benchmark['totalFee50k']['median']}%)")
    fails = [r["fund"] for r in usable if r["performanceTest"] == "Fail"]
    print(f"    Funds that FAILED APRA performance test: {len(fails)}"
          + ("" if not fails else " -> " + ", ".join(fails)))
    print("\nNext: review lib/funds.json, commit, and redeploy.")


if __name__ == "__main__":
    main()
