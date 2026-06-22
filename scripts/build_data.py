#!/usr/bin/env python3
"""
Build lib/funds.json from an APRA Comprehensive Product Performance Package (CPPP)
MySuper spreadsheet. Lifecycle-aware: preserves every age stage so the app can
show each user their age-appropriate return and fee.

Usage:
    python scripts/build_data.py path/to/new_CPPP_MySuper.xlsx

Requires: pandas, openpyxl   ->   pip install pandas openpyxl
"""
import sys, os, json, re, statistics
import pandas as pd

SHEET = "MySuper Products"
HEADER_MARKER = "Sort ID"

RET = {
    "nir10yr": "10 year Net Investment Return (NIR) p.a.",
    "nir7yr":  "7 year Net Investment Return (NIR) p.a.",
    "nir5yr":  "5 year Net Investment Return (NIR) p.a.",
    "nir3yr":  "3 year Net Investment Return (NIR) p.a.",
}
# All-in net return after BOTH investment and admin fees (APRA's $50k representative member)
NETRET = {
    "net10yr": "10 year Net Return ($50,000 rep member) p.a.",
    "net7yr":  "7 year Net Return ($50,000 rep member) p.a.",
    "net5yr":  "5 year Net Return ($50,000 rep member) p.a.",
    "net3yr":  "3 year Net Return ($50,000 rep member) p.a.",
}
FEE = {
    "totalFee10k":  "Total fees and costs charged\n($10,000 account balance)",
    "totalFee50k":  "Total fees and costs charged\n($50,000 account balance)",
    "totalFee100k": "Total fees and costs charged\n($100,000 account balance)",
    "totalFee250k": "Total fees and costs charged\n($250,000 account balance)",
}
ASSETS = "Member assets ($'000)#"
ACCOUNTS = "Member accounts (rounded to nearest ten)#"
GROWTH = "Strategic growth asset allocation"
STAGE = "Lifecycle stage name"
ID_COLS = ["RSE licensee", "RSE name", "Public offer status",
           "MySuper product name", "Single strategy / Lifecycle indicator"]


def find_header_row(path):
    raw = pd.read_excel(path, sheet_name=SHEET, header=None, nrows=15)
    for i in range(len(raw)):
        if str(raw.iloc[i, 0]).strip() == HEADER_MARKER:
            return i
    raise SystemExit(f"Couldn't find header row (marker '{HEADER_MARKER}'). APRA may have changed the layout.")


def pct(v, dp=2):
    return None if pd.isna(v) else round(float(v) * 100, dp)


def parse_stage_ages(label):
    s = str(label).strip()
    if s.lower().startswith("less than"):
        m = re.search(r"(\d+)", s); return (0, int(m.group(1)) - 1) if m else (0, 49)
    if "and over" in s.lower() or "and above" in s.lower():
        m = re.search(r"(\d+)", s); return (int(m.group(1)), 200) if m else (65, 200)
    nums = re.findall(r"(\d+)", s)
    if len(nums) >= 2: return (int(nums[0]), int(nums[1]))
    if len(nums) == 1: return (int(nums[0]), int(nums[0]))
    return None


def asof_date(path):
    try:
        raw = pd.read_excel(path, sheet_name=SHEET, header=None, nrows=3)
        text = " ".join(str(x) for x in raw.values.flatten() if pd.notna(x))
        m = re.search(r"(\d{1,2}\s+\w+\s+\d{4})", text)
        if m: return m.group(1)
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
    missing = [c for c in [ASSETS, *RET.values(), *FEE.values()] if c not in df.columns]
    if missing:
        sys.exit("Expected columns missing (APRA may have renamed them):\n  " + "\n  ".join(missing))

    df[ID_COLS] = df[ID_COLS].ffill()
    df["_key"] = df["RSE licensee"].astype(str) + "||" + df["MySuper product name"].astype(str)

    records = []
    for _key, grp in df.groupby("_key", sort=False):
        head = grp[grp[ASSETS].notna()]
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
            "memberAccounts": int(h[ACCOUNTS]) if pd.notna(h[ACCOUNTS]) else None,
            "performanceTest": str(h["Pass/Fail indicator"]).strip() if pd.notna(h["Pass/Fail indicator"]) else None,
        }

        if strategy == "Single strategy":
            rec["growthAllocation"] = round(float(h[GROWTH]), 2) if pd.notna(h[GROWTH]) else None
            for k, col in RET.items(): rec[k] = pct(h[col])
            for k, col in NETRET.items(): rec[k] = pct(h[col])
            for k, col in FEE.items(): rec[k] = pct(h[col], 3)
            rec["stages"] = None
        else:
            stages = []
            for _, r in grp.iterrows():
                if pd.isna(r[RET["nir5yr"]]):
                    continue
                ages = parse_stage_ages(r[STAGE])
                if not ages:
                    continue
                st = {"ageFrom": ages[0], "ageTo": ages[1],
                      "growthAllocation": round(float(r[GROWTH]), 2) if pd.notna(r[GROWTH]) else None}
                for k, col in RET.items(): st[k] = pct(r[col])
                for k, col in NETRET.items(): st[k] = pct(r[col])
                for k, col in FEE.items(): st[k] = pct(r[col], 3)
                stages.append(st)
            stages.sort(key=lambda s: s["ageFrom"])
            rec["stages"] = stages
            if stages:
                rec["growthAllocation"] = stages[0]["growthAllocation"]
                for k in list(RET) + list(NETRET): rec[k] = stages[0][k]
                for k in FEE: rec[k] = stages[0][k]
            else:
                rec["growthAllocation"] = None
                for k in list(RET) + list(NETRET) + list(FEE): rec[k] = None
        records.append(rec)

    usable = [r for r in records
              if (r["nir5yr"] is not None or (r["stages"] and len(r["stages"]) > 0))
              and r["totalFee50k"] is not None]

    def at_age(r, age, field):
        if r["strategy"] == "Single strategy":
            return r[field]
        for s in r["stages"]:
            if s["ageFrom"] <= age <= s["ageTo"]:
                return s[field]
        return r["stages"][0][field] if r["stages"] else None

    def P(vals):
        s = sorted(vals)
        return {"min": min(s), "p25": round(statistics.quantiles(s, n=4)[0], 3),
                "median": round(statistics.median(s), 3),
                "p75": round(statistics.quantiles(s, n=4)[2], 3),
                "max": max(s), "mean": round(statistics.mean(s), 3)}

    bench_ret = [at_age(r, 40, "nir5yr") for r in usable if at_age(r, 40, "nir5yr") is not None]
    bench_net = [at_age(r, 40, "net5yr") for r in usable if at_age(r, 40, "net5yr") is not None]
    bench_fee = [at_age(r, 40, "totalFee50k") for r in usable if at_age(r, 40, "totalFee50k") is not None]
    as_at = asof_date(path)
    benchmark = {
        "nir5yr": P(bench_ret), "net5yr": P(bench_net), "totalFee50k": P(bench_fee), "count": len(usable),
        "asAt": as_at,
        "note": "Lifecycle funds benchmarked at age-40 stage for cohort stats; users see their own age-band figures.",
        "source": f"APRA CPPP MySuper, {as_at}",
    }

    usable.sort(key=lambda r: (at_age(r, 40, "net5yr") if at_age(r, 40, "net5yr") is not None else -99), reverse=True)
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for dest in [os.path.join(here, "lib", "funds.json"), os.path.join(here, "data", "funds.json")]:
        with open(dest, "w") as f:
            json.dump({"funds": usable, "benchmark": benchmark}, f, indent=2)

    singles = sum(1 for r in usable if r["strategy"] == "Single strategy")
    lifes = sum(1 for r in usable if r["strategy"] == "Lifecycle")
    print(f"OK  Wrote {len(usable)} funds ({singles} single-strategy, {lifes} lifecycle)")
    print(f"    As-at date: {as_at}")
    print(f"    5yr return (age 40): {benchmark['nir5yr']['min']}%-{benchmark['nir5yr']['max']}% "
          f"(median {benchmark['nir5yr']['median']}%)")
    fails = [r["fund"] for r in usable if r["performanceTest"] == "Fail"]
    print(f"    Failed APRA performance test: {len(fails)}" + ("" if not fails else " -> " + ", ".join(fails)))
    print("\nNext: review lib/funds.json, commit, and redeploy.")


if __name__ == "__main__":
    main()
