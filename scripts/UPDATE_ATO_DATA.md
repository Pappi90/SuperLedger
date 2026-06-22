# How to add the real ATO balance-by-age figures

The app currently shows the "balance vs your age group" benchmark using **placeholder**
per-age medians. The national medians (shown in the summary) are real and confirmed.
To make the per-age numbers official, do this one-time update:

## 1. Download the ATO snapshot file
Go to the ATO 2023–24 individuals statistics page, find **Chart 12: median super
balance by age and sex**, and click the **Snapshot table 5** download link
(it goes to data.gov.au).

Direct dataset page:
https://data.gov.au/data/dataset/taxation-statistics-2023-24

You're looking for median super balance by **age range** (and optionally by sex).

## 2. Open it and find the age-band medians
You want the median balance for each band: 18–24, 25–29, 30–34, 35–39, 40–44,
45–49, 50–54, 55–59, 60–64, 65–69, 70+. Use the **combined male+female median**
for the main figure (it's the fairest single benchmark).

## 3. Edit one file: lib/atoBalances.json
For each age band, replace the "median" number with the real one, and change
its "verified" to true. When all bands are done, set the top-level
"verified": true as well. Update "asAt" if the data date differs.

Example — change this:
    { "band": "35-39", "ageFrom": 35, "ageTo": 39, "median": 52000, "verified": false }
to this (with the real number):
    { "band": "35-39", "ageFrom": 35, "ageTo": 39, "median": 48750, "verified": true }

## 4. Save, commit, push
Once "verified" is true everywhere, the orange "provisional figures" warning
disappears automatically and the tool shows official ATO data.

That's it — no code changes needed, just the numbers in that one file.

(If you'd rather, paste the age-band medians to Claude and it'll produce the
finished file for you to drop in.)
