# DATA SOURCES — Annona Protocol

> Every external data input: what it is, granularity, access method, and how Annona uses it. Plus the honest gaps. This backs the yield estimator, the HPP settlement anchor, and demo seed data. Validated Jun 2026 — re-verify before pitch; Indonesian regs move fast.

---

## 1. Settlement price anchor — HPP (authoritative)

**HPP = Harga Pembelian Pemerintah** (government floor purchase price). This is the settlement price in every Agreement. It is set by **decree (Inpres / Kepbadan)**, not a live market — so it's stable, public, and legally defensible.

| Commodity | HPP (farm level) | Conditions | Source |
|---|---|---|---|
| **Gabah GKP** | **Rp 6,500/kg** | all qualities, at harvest | Inpres 4/2026 (held from 2025) |
| **Jagung pipilan kering** | **Rp 5,500/kg** | 18–20% moisture | Kepbadan 216/2025 + Inpres 10/2025 |
| Jagung (Bulog warehouse) | Rp 6,400/kg | ≤14% moisture, aflatoksin ≤50 ppb | same |
| Kedelai | no confirmed 2026 HPP (hist. ~Rp 8,500/kg) | — | — |

- **Inpres 4/2026** also targets **4M ton** gabah/beras CBP procurement in 2026.
- **In contract:** `hpp_per_kg` + `Commodity.hpp_version` (which decree). On HPP change, new agreements use the new version; existing ones honor their locked price.

---

## 2. Reference market prices (display only, not settlement)

| Source | URL | Granularity | Access |
|---|---|---|---|
| **Bapanas Panel Harga Pangan** | `panelharga.badanpangan.go.id` | national → provinsi → kabupaten/kota → per-pasar, daily | Public web portal; no clean public API (scrape/manual export) |
| **PIHPS (Bank Indonesia)** | `bi.go.id/hargapangan` | 82 cities/regencies, kabupaten/kota, by pasar | Public web portal; downloadable tables |

**Use:** shown on the Create-Agreement screen + auditor view as a market reference next to HPP (so the coop sees spread). **Never** used as settlement price.

---

## 3. Yield estimation (the transparent estimator — NOT ML)

`expected_vol = plot_area_ha × avg_yield_t_per_ha(commodity, kabupaten)`

| Source | URL | Granularity | Notes |
|---|---|---|---|
| **BPS** | `bps.go.id` | province (clean tables); kabupaten (annual pubs) | "Luas Panen, Produksi, Produktivitas Padi menurut Provinsi" is public. No clean API. **No kecamatan production.** |
| **KATAM Terpadu (Kementan)** | via Kementan portal | **7,042 kecamatan** | Planting calendar, dosage, flood/drought/pest risk, variety + seed/fertilizer recommendations. **Planning data, NOT actual production.** Best kecamatan-level input we have. |
| **Kementan BDSP / Satu Data** | `bdsp2.pertanian.go.id`, `satudata.pertanian.go.id` | kabupaten (production); kecamatan (some calendars) | Production/harvest-area/productivity by commodity. |

**In contract/UI:** the estimate is shown with its formula + cited source ("perkiraan berdasarkan rata-rata BPS Kabupaten X"). Labeled an estimate, never "AI prediction."

---

## 4. The honest gap (say this out loud to judges)

> **Kecamatan-level *actual yield/production* is NOT available as open structured data.**

- PIHPS / Bapanas prices → **kabupaten** floor.
- BPS production → **province** clean, **kabupaten** in PDFs.
- KATAM → **kecamatan**, but **recommendations/planning**, not actuals.

**Consequences (already baked into the design):**
1. Settlement anchors on **HPP (national)** — exists, legal, stable.
2. Estimates use **kabupaten yield + KATAM kecamatan inputs** — best available.
3. We do **not** promise a kecamatan price oracle. Oracle is an interface (`PriceProvider`) for when/if better feeds exist.
4. **The data flywheel:** once real deliveries flow through Annona, *we* become the first source of kecamatan-level actual yield data — which is itself a sellable asset (the founder's "sell hyperlocal farmer data per region" idea, Layer 3+).

---

## 5. KDMP context data (for narrative + seed realism)

| Fact | Value | Source |
|---|---|---|
| Registered KD/KMP | 83,376 (25 May 2026) | Kemenkopangan |
| Built / in progress | 1,357 / 30,500+ (25 Feb 2026) | CNN Indonesia |
| Operational target | Dec 2026 | Kemenkopangan |
| Loan terms | Rp3B max, 6% p.a., 72mo, 6–12mo grace | PMK 15/2026 |
| Financing routed via | PT Agrinas (operates units 2 yrs) | Inpres 17/2025 |
| Mandatory units | 7 | Tempo/Antara/CNBC |
| Default-risk estimate | Rp85.96T / 6 yrs (modeled @3%; real 6%) | Celios |
| Net income target | ~Rp1.4B/unit/yr @8% margin | gov projection |
| Dana Desa 2026 to KDMP | Rp34.57T (58% of Rp60.57T) | Kemenkopangan |

**Input catalog seed** (from KDMP brief, validated): pupuk subsidi (Urea, NPK Phonska — PT Pupuk Indonesia) & non-subsidi (Phonska Plus, ZA, ZK, Phosgreen); pupuk organik; benih (padi Inpari, jagung hibrida, cabai, bawang); agrokimia (insektisida/fungisida/herbisida/rodentisida); alsintan (traktor, transplanter, combine harvester, RMU).

---

## 6. Regulatory data (RWA path)

| Item | State | Source |
|---|---|---|
| Digital-asset framework | POJK 27/2024 + POJK 23/2025 (in force) | OJK |
| RWA-specific POJK | targeted **Q3 2026**, still drafting | OJK / press |
| Rupiah stablecoin | sandbox, BI-coordinated, not production | OJK |
| Crypto-as-payment | **illegal** (Currency Law) | — |
| Sandbox RWA graduates | GIDR (gold), Nano (securities), GORO (property) — **no ag/IDR-receivable yet** | OJK |

---

## 7. Data pipeline plan

| Phase | Approach |
|---|---|
| **MVP** | Manually curated seed: HPP from decrees, yield from BPS/KATAM, ~10 realistic farmers. Cached in `PRICE_REF` / `YIELD_TABLE` (see `ERD.md`), sources cited in-UI. |
| **Post-hackathon** | Scheduled scrapers/exports for Bapanas + PIHPS; KATAM ingestion; admin tool to update HPP on new decrees. |
| **Layer 3+** | Annona's own delivery data becomes the kecamatan yield dataset → SDK/data product. |
