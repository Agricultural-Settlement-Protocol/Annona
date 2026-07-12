# DATA SOURCES — Annona Protocol

> Every external data input: what it is, granularity, access method, and how Annona uses it. Plus the honest gaps. This backs the yield estimator, the HPP settlement anchor, and demo seed data. Validated Jun 2026 — re-verify before pitch; Indonesian regs move fast.
>
> **v4.0 update:** institutional map corrected to four validated roles (supplier / warehouse operator / financier / government); added the **e-RDKK / HET subsidy gate** (§0.1 + §1), the **offtake-financing data** section (§5a, proof-derived), a **validation-status table** (§8), and the **SIMKOPDES overlap analysis** (§7). Everywhere "Agrinas" meant the input principal it is now **supplier**; where it meant the physical builder it is **warehouse operator**.

---

## 0.1 Subsidy eligibility gate — e-RDKK / i-Pubers (Kementan)

The subsidized-input (**HET**) price tier is gated by an **external Kementan** system, not by Annona. Annona **records the outcome** as a read-only farmer badge; it never re-implements or computes eligibility (same discipline as "estimate, never AI prediction").

- **What decides eligibility:** the Kementan **e-RDKK** database (Rencana Definitif Kebutuhan Kelompok) + the **i-Pubers** redemption app. Outside Kemenkop and outside Annona.
- **2026 mechanics:** redemption verifies **NIK / e-KTP** at the kiosk via i-Pubers; **Kartu Tani is superseded** (still valid only as a payment instrument); face-geotag capture at redemption; i-Pubers Offline exists for blank-spot areas.
- **Eligibility criteria:** WNI + active e-KTP + Poktan member + **≤2 ha** + one of **9 priority commodities** (padi, jagung, kedelai, cabai, bawang merah, bawang putih, tebu, kopi, kakao).
- **Scale:** ~14,1 juta NIK validated in e-RDKK; 2026 allocation ~9,55 juta ton; subsidy budget ~Rp46,87T; HET cut ~20% from Oct 2025.
- **How Annona uses it:** the farmer badge (`Terverifikasi e-RDKK` / `Belum` / `Non-Subsidi`) is **seeded in the demo**, designed as a `SubsidyEligibilityProvider` adapter for a post-hackathon i-Pubers/e-RDKK read. The badge decides the price tier at agreement creation: verified → subsidized items at **HET**; otherwise commercial only. **A real business rule, not decoration.**
- **Subsidy differential:** the state pays it **directly to the input supplier** (Pupuk Indonesia), not to the coop — so the coop still owes the *tebus* (principal) price for stock drawn (the input payable / "Utang #1").

Access/label: ✅ badge seeded in MVP · 🔌 adapter live post-hackathon. Payung hukum: Perpres pupuk bersubsidi + Permentan/Kepmentan HET & alokasi (**Kepmentan 1117/2025** for HET).

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

> **HET ≠ HPP** (the single most important price clarification for v4.0). **HET** (Harga Eceran Tertinggi) is the *input-side ceiling* — the most a subsidy-eligible farmer pays for **subsidized fertilizer** (Urea **Rp2.250/kg**, NPK **Rp2.300/kg** per Kepmentan 1117/2025). **HPP** (Harga Pembelian Pemerintah) is the *output-side floor* — what the KMP pays the farmer per kg of **harvest** (the settlement anchor above). Annona uses HET to set `base_price` on the input side (when the farmer is e-RDKK-eligible, §0.1) and HPP to settle on the output side. **Never conflate the two.**

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

**Seed defaults (validated 2025 productivity baselines):** padi GKP ~**6,355 t/ha**, jagung ~**5,9 t/ha** (BPS Angka Tetap 2025) — concrete numbers for the demo estimator until per-kabupaten tables are ingested.

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

## 5. Institutional map + KDMP context data (for narrative + seed realism)

**The corrected four-role model (v4.0).** The old single-"Agrinas" framing conflated three real institutions. Validated 2026 ground truth splits them:

| Institution / role | Real role in the loop (validated 2026) | In Annona's model | What it is NOT |
|---|---|---|---|
| **Input Principal / Saprotan Supplier** (e.g. PT Pupuk Indonesia) | Supplies subsidized (HET) + non-subsidized saprotan; owns the master catalog + principal `base_price`; dispatches stock; residu principal owed back here; per-coop input payable ("Utang #1") | on-chain `supplier` address; owns `saprotan_catalog`; `supplier_payable` ledger | not a working-capital financier; not a commodity buyer |
| **Warehouse Operator** (e.g. PT Agrinas Pangan Nusantara) | Builds gerai/gudang (PMK 15/2026, Rp3B/unit, assets → Pemda/Pemdes); operates units ~2 yrs | infra entity only; off-chain harvest receiver; **not a transacting party** | not a financier; not a saprotan creditor; not a commodity offtaker |
| **Financier / Pemodal** (e.g. LPDB Koperasi) | Kemenkop revolving-fund body; charter = koperasi modal kerja; **2026 priority = KDMP**; proof- and eligibility-gated | on-chain `financier` address; new financing loop | not an infra builder; funds are not automatic |
| **Downstream buyer** (Bulog / Coop Trade) | Bulog absorbs gabah/jagung for CBP at HPP; Coop Trade = B2B/export marketplace (live) | optional downstream `destination` on harvest shipment | does not record the upstream farmer-credit ↔ harvest link |

**The two-debt model (new to Annona, core to the corrected model):**
- **Utang #1 — Koperasi → Supplier:** trade payable for stock drawn (tebus price). Subsidized items sold to eligible farmers at HET; the state pays the subsidy differential to the supplier directly. Off-chain running ledger; paid down by on-chain residu remittances.
- **Utang #2 — Petani → Koperasi:** the *yarnen* input credit (`input_debt`), netted from harvest value at settlement. The auto-netted core (unchanged).

### KDMP context data

| Fact | Value | Source |
|---|---|---|
| Registered KD/KMP | 83,376 (25 May 2026) | Kemenkopangan |
| Built / in progress | 1,357 / 30,500+ (25 Feb 2026) | CNN Indonesia |
| Operational target | Dec 2026 | Kemenkopangan |
| Loan terms | Rp3B max, 6% p.a., 72mo, 6–12mo grace | PMK 15/2026 |
| Unit builder/operator | PT Agrinas = **warehouse operator** (builds + operates units ~2 yrs; not a financier or commodity buyer) | Inpres 17/2025 |
| Working-capital financier | LPDB-Koperasi (Kemenkop revolving fund; 2026 priority = KDMP; tarif ~3–7%/yr) | Dirut LPDB, Nov 2025 |
| Mandatory units | 7 | Tempo/Antara/CNBC |
| Default-risk estimate | Rp85.96T / 6 yrs (modeled @3%; real 6%) | Celios |
| Net income target | ~Rp1.4B/unit/yr @8% margin | gov projection |
| Dana Desa 2026 to KDMP | Rp34.57T (58% of Rp60.57T) | Kemenkopangan |

**Input catalog seed** (from KDMP brief, validated): pupuk subsidi (Urea, NPK Phonska — PT Pupuk Indonesia) & non-subsidi (Phonska Plus, ZA, ZK, Phosgreen); pupuk organik; benih (padi Inpari, jagung hibrida, cabai, bawang); agrokimia (insektisida/fungisida/herbisida/rodentisida); alsintan (traktor, transplanter, combine harvester, RMU). **Tag each with `price_tier`** (subsidi → HET vs non-subsidi → komersial) and add HET values for the subsidized ones (Urea **Rp2.250/kg**, NPK Phonska **Rp2.300/kg** — illustrative-realistic; confirm live Kepmentan HET before real deployment).

**Master Saprotan Catalog = supplier-owned data (not external).** In the v4.0 model, `base_price_supplier` (the principal/tebus cost) is the **supplier's master data**, managed on the Katalog Saprotan CRUD screen (Screen M1) per operational region — NOT scraped from a public feed. When `price_tier = subsidi`, the effective principal snapshotted at `create_agreement` is the **HET**; when commercial, the commercial price. Either way `base_price_supplier` is the principal owed to the supplier; the state pays the subsidy differential to the supplier directly, so the coop's payable is the tebus price regardless of tier. The `INPUT_CATALOG` / `SAPROTAN_CATALOG` seed above stands in for the supplier's catalog in the demo. The other two price levers are **business inputs, not data sources**: `saprotan_markup_percent` (KMP-set per contract, covers per-village logistics/labor) and `hpp_handling_fee_percent` (KMP handling cut at settlement). Only `hpp_per_kg`, HET, and reference market prices come from external sources.

---

## 5a. Offtake financing data (proof-derived, no external feed)

The offtake-financing feature needs **no external data feed** — every input is platform-internal and tamper-evident:

| Input | Source (internal) |
|---|---|
| Backing agreement terms | on-chain `Agreement` (created in F2) |
| Delivery proof | on-chain `HarvestReceipt` |
| Projected settlement value | `kg × HPP` using the anchored HPP |
| Coop reputation / risk badge | `CoopReputation` (on-chain) + derived score |
| Coverage ratio | requested ÷ projected settlement |
| Financier | `financier` address / FK (one funder in the demo; agnostic) |

**Why this is a strength to state explicitly:** financing is gated on **proof the protocol itself produced** (on-chain agreements + receipts, hashed into `backing_hash`) — nothing to scrape, nothing to fake. The "underlying transaksi" a real financier demands is exactly what the chain already guarantees.

---

## 6. Regulatory data (RWA path)

| Item | State | Source |
|---|---|---|
| Digital-asset framework | POJK 27/2024 + POJK 23/2025 (in force) | OJK |
| RWA-specific POJK | targeted **Q3 2026**, still drafting | OJK / press |
| Rupiah stablecoin | sandbox, BI-coordinated, not production | OJK |
| Crypto-as-payment | **illegal** (Currency Law) | — |
| Sandbox RWA graduates | GIDR (gold), Nano (securities), GORO (property) — **no ag/IDR-receivable yet** | OJK |

> The v4.0 **offtake-financing loop is testnet dIDR**, not a regulated financial instrument — the same honest constraint as settlement (no mainnet, no real rupiah). It does not change the RWA/OJK path; it is a proof-gated working-capital demo, not a licensed lending product.

---

## 7. SIMKOPDES overlap analysis (does Annona compete with Kemenkop's hub?)

> Answers the owner's Q2. This is a data-relationship question, so it lives here; the PRD problem/risk sections cross-reference it.

**What SIMKOPDES is (verified):** the Kementerian Koperasi data hub for cooperatives — a **reporting/monitoring** system exposing a performance dashboard, RAT records, business-transaction data, an EWS *Laporan Kesehatan Keuangan Koperasi*, and institutional/legal profile. It *reports and monitors*; it does not *run* a cooperative's day-to-day offtake transactions, does not auto-net input debt against harvest, does not settle, and does not finance.

**Overlap verdict: NO functional overlap — Annona sits beneath SIMKOPDES and feeds it.**

| Layer | SIMKOPDES | Annona |
|---|---|---|
| Purpose | Report + monitor cooperative health/volume to Kemenkop | Run + prove the underlying offtake transactions |
| Data direction | Consumes reported figures | Generates granular, tamper-evident transaction data |
| Offtake loop | Not modeled operationally | The whole product |
| Auto-netting / settlement | None | Core |
| Financing | None | New F-feature |
| Trust model | Self-reported | On-chain tamper-evident |

**Positioning to state (and defend to a judge):** Annona is the transaction/settlement/proof layer that *generates* the granular volume + health signals a hub like SIMKOPDES would want as input. Annona **feeds** the reporting hub; it does not compete with it. Where a read API is available, Annona can also *consume* a cooperative's profile/health signal to enrich its own reputation/risk view — a two-way, complementary relationship, never a duplicate.

**Triple-check of flow + entities:**
1. **Entity check:** Annona's parties (supplier, KMP, financier, farmer, warehouse operator, government) are *transaction participants*. SIMKOPDES's "entity" is the cooperative-as-reporting-subject. Different plane — no collision. ✔
2. **Flow check:** Annona's flow is dispatch → accept → deliver → settle → remit → (finance/reconcile). SIMKOPDES has no such operational flow; it ingests outcomes. The one legitimate touchpoint is *Annona → SIMKOPDES* (push volume/health) and optionally *SIMKOPDES → Annona* (pull cooperative profile/health signal). ✔
3. **Data-ownership check:** Annona owns transaction truth (on-chain); SIMKOPDES owns the national reporting view. No field is authoritative in both. ✔
4. **Government-role check:** Annona's read-only Government persona is a *consumer* of Annona's own aggregates; it is not a re-implementation of SIMKOPDES. If anything, Annona's Government view is the drill-down that a SIMKOPDES dashboard row would link to. ✔

**One risk to name honestly:** a judge could say "Kemenkop already has SIMKOPDES." The rebuttal is exactly the layer distinction above — SIMKOPDES *reports*; nobody has the *operational + settlement + proof* layer that produces trustworthy data for it to report. That gap is Annona's whole reason to exist, and it is *strengthened*, not weakened, by the entity split (four distrusting parties need a shared ledger a single reporting portal cannot provide).

---

## 8. Data pipeline plan

| Phase | Approach |
|---|---|
| **MVP** | Manually curated seed: HPP from decrees, yield from BPS/KATAM, ~10 realistic farmers; **the supplier catalog with `price_tier` + HET, seeded e-RDKK badges, a seeded financier pool, and a funding-request demo**. Cached in `PRICE_REF` / `YIELD_TABLE` (see `ERD.md`), sources cited in-UI. |
| **Post-hackathon** | Scheduled scrapers/exports for Bapanas + PIHPS; KATAM ingestion; admin tool to update HPP on new decrees; **adapters: i-Pubers/e-RDKK badge check, financier profile read, downstream buyer confirmation**. |
| **Layer 3+** | Annona's own delivery data becomes the kecamatan yield dataset → SDK/data product. |

### Validation status (re-verify before any pitch — Indonesian regs move fast)

| Fact | Status | Note |
|---|---|---|
| HPP gabah Rp6.500 / jagung Rp5.500 | ✅ validated | Inpres 4/2026 / Kepbadan 216/2025; re-verify no mid-2026 revision |
| HET Urea Rp2.250 / NPK Rp2.300 | ✅ validated | Kepmentan 1117/2025; ~20% cut from Oct 2025 |
| LPDB-Koperasi = KDMP 2026 priority financier | ✅ validated | Dirut Krisdianto, Nov 2025; Inkubasi 2026 sasaran KDKMP; tarif ~3–7%/yr |
| e-RDKK / i-Pubers NIK gate; Kartu Tani superseded | ✅ validated | Kementan 2026; ~14,1 jt NIK |
| Warehouse operator builds/operates, assets → Pemda/Pemdes, not a financier/buyer | ✅ validated | PMK 15/2026; Inpres 17/2025 |
| Subsidy differential paid to supplier, not coop | ✅ validated | Perpres pupuk bersubsidi mechanics |
| Registered / operational KDMP count | ⚠️ moves monthly | cite the date in the deck; do not hard-assert a stale "Dec 2026 operational" claim — re-check the current figure |
| Kecamatan actual yield | ⚠️ still not open data | unchanged honest gap; see §4 |
