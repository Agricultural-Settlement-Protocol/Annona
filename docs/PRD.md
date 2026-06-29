# PRD — ANNONA PROTOCOL
### The Agricultural Offtake Settlement Rail on Stellar

> *Annona* — Roman goddess of the grain supply, depicted holding **scales** (fair settlement) and a **ship's prow** (logistics/offtake). She oversaw the just distribution of harvest to the people, cutting out hoarders and speculators. We are rebuilding the *Annona* — on Stellar, for Indonesia's village cooperatives, cutting out the *tengkulak*.

| | |
|---|---|
| **Name** | **Annona** (`annona.finance`) — was: *Lumbung* |
| **Category** | Agricultural Settlement Protocol / Offtake Rail (infrastructure, not just an app) |
| **One-liner** | A composable Soroban protocol that turns the cooperative input-credit → harvest-buyback (*yarnen*) loop into a tamper-proof, auto-netting, HPP-anchored settlement ledger — starting with Koperasi Desa Merah Putih (KDMP) and generalizable to any commodity cooperative. |
| **Event** | APAC Stellar Hackathon 2026 (Rise In × Stellar Development Foundation) |
| **Key dates** | Submission **15 Jul 2026** · Demo Day **18 Jul** (GCash, Manila) · Grand Finale **24 Jul** (online, 5-min pitch) · Prize pool **$60k** |
| **Hackathon scope** | Stellar **Testnet** + a real, deployed Soroban contract + live demo transactions. No mainnet rupiah, no off-ramp in MVP. |
| **Post-hackathon** | SCF Build Award track (MVP → Testnet → Mainnet tranches), positioned as reusable ecosystem infrastructure. |
| **Team** | 3: (1) PM + Fullstack/Vibecode, (2) Frontend + UI/UX, (3) Backend + Smart Contract |
| **Status** | v2.0 — build-ready |

> **This PRD is the product document** — problem, users, features, interfaces, roadmap, business. **All technical depth lives in [`docs/technical/`](./technical/):** [ARCHITECTURE](./technical/ARCHITECTURE.md) · [SMART-CONTRACT](./technical/SMART-CONTRACT.md) · [ERD](./technical/ERD.md) · [INTEGRATIONS](./technical/INTEGRATIONS.md) · [DATA-SOURCES](./technical/DATA-SOURCES.md) · [TECH-STACK](./technical/TECH-STACK.md).

---

## Daftar Isi (Table of Contents)

1. [TL;DR](#1-tldr)
2. [Problem & Context](#2-problem--context-validated-jun-2026)
3. [Why Now · Why Stellar · Why We Win](#3-why-now--why-stellar--why-we-win)
4. [Goals & Non-Goals](#4-goals--non-goals)
5. [Users & Personas](#5-users--personas)
6. [The Core Loop](#6-the-core-loop-user-stories)
7. [MVP Scope — Detailed Feature Specifications](#7-mvp-scope--detailed-feature-specifications)
   - 7.1 [Feature F1 — Farmer Registry](#71-f1--farmer-registry)
   - 7.2 [Feature F2 — Offtake Agreement Creation](#72-f2--offtake-agreement-creation-the-core-write)
   - 7.3 [Feature F3 — Delivery & Harvest Receipt](#73-f3--delivery--harvest-receipt)
   - 7.4 [Feature F4 — Settlement & Auto-Netting](#74-f4--settlement--auto-netting)
   - 7.5 [Feature F5 — Graded Flags & Force-Majeure](#75-f5--graded-flags--force-majeure)
   - 7.6 [Feature F6 — On-chain Reputation (seed)](#76-f6--on-chain-reputation-seed)
   - 7.7 [Feature F7 — Coop Dashboard](#77-f7--cooperative-dashboard)
   - 7.8 [Feature F8 — Auditor Dashboard + AI Assistant](#78-f8--auditor-dashboard--ai-assistant)
   - 7.9 [Feature F9 — Farmer View](#79-f9--farmer-view)
   - 7.10 [Feature F10 — Lightweight Inventory](#710-f10--lightweight-inventory)
   - 7.11 [MVP cut order](#711-mvp-cut-order-3-person-reality)
8. [Interface Specifications (screen-by-screen)](#8-interface-specifications-screen-by-screen)
9. [Settlement Mechanism (product view)](#9-settlement-mechanism-product-view)
10. [Project Structure](#10-project-structure)
11. [Roadmap — 5-Layer Progression (detailed)](#11-roadmap--the-5-layer-progression-detailed)
12. [Data Sources (summary)](#12-data-sources-summary)
13. [Stellar Ecosystem Integrations (summary)](#13-stellar-ecosystem-integrations-summary)
14. [Demo Script](#14-demo-script-5-minute-finale)
15. [Success Metrics](#15-success-metrics)
16. [Risks & Parking Lot](#16-risks--parking-lot)
17. [Key Research Findings](#17-key-research-findings-validated-jun-2026)
18. [Open Decisions](#18-open-decisions)

---

## 1. TL;DR

Koperasi Desa Merah Putih (KDMP) is mandated to act as an **offtaker**: supply farmers with production inputs (pupuk, benih, pestisida) on credit, then buy their harvest back at the government floor price (HPP), cutting out the *tengkulak*. The fatal weakness: there is **no trustworthy shared record** linking "inputs given on credit" to "harvest delivered back." That gap is where money leaks, where farmers side-sell, where disputes fester — and it's exactly the **"underlying transaksi"** banks and the state demand before trusting a cooperative with capital.

Annona encodes that loop as a Soroban smart contract: register farmer → issue inputs on credit (on-chain **Offtake Agreement** with debt + HPP anchor) → record graded delivery (immutable **Harvest Receipt**) → **settle** (`payment = volume × HPP`, **auto-net the debt**, release the rest, supports **partial settlement**) → every loop grows an on-chain **reputation** (the seed of farmer financial identity). Three dashboards (coop / auditor+AI / farmer) read one shared ledger.

The chain earns its place in exactly one spot: **multi-party, tamper-evident auto-netting + record-keeping between parties who don't trust each other** (farmer ↔ coop ↔ bank ↔ government). Everything else is a normal web app — and we say so.

**We ship one app (Annona for KDMP) but architect a protocol** (a generic offtake settlement standard any commodity coop, or any developer, can build on). That duality is the whole pitch.

---

## 2. Problem & Context (validated Jun 2026)

### 2.1 Premise correction (read first)
The original framing — *"KMP can't repay its 6% / Rp3bn loan — help them repay"* — is **obsolete**. Under **PMK 15/2026 (eff. 1 Apr 2026)**, banks lend to **PT Agrinas Pangan Nusantara** (not the coop), which builds + **operates the units for 2 years**; repayment is **deducted at-source** from Dana Desa / DAU-DBH before money reaches the village. **Default risk is socialized to the state.** Pitching "help them repay" would get us killed by a finance judge.

### 2.2 The real problem (what we solve)
1. **The offtaker loop is not auditable** — inputs out, harvest back, money moving, all in spreadsheets/WhatsApp. No shared truth → skimming, side-selling, disputes, no audit at scale.
2. **Moral hazard is now WORSE** — because the state backstops the loan, the incentive to run the business cleanly *weakens*; an independent tamper-evident record of real activity is *more* valuable, not less. (The counter-intuitive insight judges love.)
3. **PT Agrinas runs units 2 years** → an external operator needs **verifiable proof** of each coop's real transactions, separate from the coop's own books. Annona is that proof layer.
4. **Banks lend against the "underlying transaksi"** (DPR Komisi XI: *"selama ada underlying transaksinya"*). **Annona's on-chain ledger IS that proof.**
5. **Stakes:** Celios estimated **Rp85.96T** default risk over 6 years — modeled at 3%, real rate 6%, so *worse*. The 1998 KUD collapse (top-down, government-dependent, mass *kredit macet*) is the structural-parallel cautionary tale Annona's transparency breaks.

### 2.3 Why the offtaker unit
KDMP must run **7 mandatory units**; the offtaker/saprotan flow is the one with a clean, contractable, on-chain-able loop, and it's policy-aligned (KDMP is an official channel for gabah procurement at HPP + CBP distribution). We build this rail first; architecture extends to other units later.

*(Full regulatory/market detail → [§17](#17-key-research-findings-validated-jun-2026) and [`technical/DATA-SOURCES.md`](./technical/DATA-SOURCES.md).)*

---

## 3. Why Now · Why Stellar · Why We Win

### 3.1 Regulatory tailwind (honest)
- **POJK 27/2024 + 23/2025** in force; an **RWA-specific POJK targeted Q3 2026** (still drafting) — we sit at the inflection point.
- OJK exploring a **Rupiah stablecoin** (sandbox, not production). Sandbox RWA graduates: GIDR (gold), Nano (securities), GORO (property) — **no ag/IDR-receivable yet = open lane.**
- **Hard constraint:** crypto **illegal as payment** (Currency Law). MVP = testnet PoC; regulated money path gated on Q3 2026 + license + custodian. **We never pretend testnet tokens are live rupiah.**

### 3.2 Why Stellar (3 things that truly need a chain)
1. **Tamper-evident settlement record** — the "underlying transaksi" no single party can rewrite.
2. **Auto-netting trust primitive** — debt netted against payment programmatically; no officer can skim the difference.
3. **Composable financial identity** — reputation + Harvest Receipts other protocols read without permission. This is what makes Annona infrastructure, not an app.

Stellar fit: sub-cent fees (thousands of micro-settlements), SEP-41/SAC tokens, mature stablecoin + off-ramp ecosystem, Soroban (Rust→WASM), and judges **reward composability** — reuse primitives (Freighter, SAC, Reflector, Blend, DeFindex) over hand-rolling. *(Detail → [`technical/ARCHITECTURE.md`](./technical/ARCHITECTURE.md).)*

### 3.3 Why we win
| Judge / SCF wants | Annona delivers |
|---|---|
| Real, functional, real utility | Working offtake loop, live testnet tx, modeled on a Rp-trillion policy program |
| User-facing financial app | Input-credit + HPP harvest settlement for real coops & farmers |
| Real testnet/mainnet tx | Deployed Soroban contract + dIDR transfers in the 5-min demo |
| **Composability** (headline) | Standard SEP-41; generic reusable offtake contract; reputation/receipts readable via SDK; oracle interface for Reflector |
| Stellar load-bearing (SCF #6) | Auto-netting + multi-party tamper-proof record can't be a single-party DB |
| Open-source + README | Public monorepo, documented contract + SDK stub |
| Real local problem | KDMP offtaker auditability, HPP-anchored, Indonesia-specific |
| Differentiation | PH's **TyFi** (won "Best Use of Stellar") + Nigeria's **AgTrail** (SCF #38) are nearest. Our edge: **KDMP-specific, HPP-anchored auto-netting *settlement protocol*** + reputation→receivable flywheel. No IDR RWA in funded list. |

---

## 4. Goals & Non-Goals

### Goals (by 15 Jul)
- **G1.** Full offtake loop end-to-end in ≤2 min with real testnet tx.
- **G2.** Soroban contract: create agreement (lifecycle), graded delivery (Harvest Receipt), settle with auto-netting + **partial settlement**.
- **G3.** Three interfaces (coop / auditor+AI / farmer) reading contract state.
- **G4.** Generic, composable contract + documented events + oracle interface → credible protocol story.
- **G5.** Regulation-aware narrative MVP → SCF infra → RWA, with honest constraints.

### Non-goals (out of MVP — protects scope)
- ✗ Mainnet, real rupiah, off-ramp.
- ✗ Yield-farming vault (parked + regulatorily radioactive — [§16](#16-risks--parking-lot)).
- ✗ ML harvest prediction (transparent `area × yield/ha` only).
- ✗ Kecamatan price oracle (data doesn't exist — [§12](#12-data-sources-summary)).
- ✗ Full on-chain inventory · ✗ computer-vision grading · ✗ parametric insurance.
- ✗ Live SDK/public explorer (interface designed; full build post-hackathon).

---

## 5. Users & Personas

| Persona | Goal | Pain today | What Annona gives |
|---|---|---|---|
| **Petani** (farmer) | Inputs without cash; fair price; track record | Tengkulak prices; opaque debt; no credit history | Inputs on credit, transparent debt, net payout at HPP, **reputation → future cash loans** |
| **Pengurus KDMP** (officer) | Clean, defensible offtaker book; not a finance/tech expert | Spreadsheets, leakage accusations, no proof | One ledger, auto-netting, auditable proof, **AI assistant in plain Bahasa** |
| **Petinggi / Auditor / Agrinas** | See which coops perform; verify activity | "Why can't this KDMP pay?" with zero visibility | Read-only exposure/performance/flags, queried via **chatbot** |
| **Bank / Himbara** *(Tier 2)* | Lend against verifiable activity | No trustworthy underlying-transaksi proof | On-chain settlement history as collateralizable proof |
| **Investor / Pemodal** *(Tier 3)* | Finance harvest receivables | No transparent instrument | Tokenized offtake receivables under OJK RWA |
| **Other developers** *(protocol)* | Build lending/insurance/analytics on farmer data | Rebuild registry + history from scratch | **SDK/API** to read agreements/receipts/reputation |

---

## 6. The Core Loop (user stories)

1. *Pengurus* registers a farmer (plot + commodity; PII off-chain, hash on-chain).
2. *Farmer* requests inputs (e.g., Rp2,000,000 pupuk+benih) → on-chain **Offtake Agreement** records debt + obligation to sell harvest to KDMP.
3. *Contract* stores expected volume (transparent estimate), settlement price = **HPP**, tolerance band; status `Created`.
4. *Pengurus* records delivered volume + grade at harvest → contract mints immutable **Harvest Receipt**; status `Delivered`/`PartiallyDelivered`.
5. *Contract* settles: `payment = delivered_kg × HPP`, nets debt, releases net to farmer, emits `Settled`, updates **reputation**. Partial deliveries settle incrementally.
6. *Contract* raises a **graded flag** (`Warning`/`PartialDelivery`/`Suspected`) for human review if under tolerance — never an auto-accusation.
7. *Pengurus* records **force-majeure** on crop failure → closes without reputation penalty.
8. *Auditor* sees exposure/upcoming harvests/rates/flags from one ledger — or asks the **AI assistant** in plain Bahasa.

---

## 7. MVP Scope — Detailed Feature Specifications

Each feature: **what it does, why, acceptance criteria, on/off-chain split, which interface.** Contract mechanics → [`technical/SMART-CONTRACT.md`](./technical/SMART-CONTRACT.md).

### 7.1 F1 — Farmer Registry
- **What:** coop registers/manages farmers (name, KTP, wallet, plot area, default commodity, kecamatan/kabupaten).
- **Why:** every agreement ties to a real plot; the base for estimates + reputation.
- **On/off-chain:** PII off-chain; KTP **hash** anchored on first agreement. Wallet generated or connected.
- **Interface:** Coop Dashboard → Screen B.
- **Acceptance:** create/search/edit farmer; reputation badge shows; KTP never leaves off-chain DB; hash verifiable.

### 7.2 F2 — Offtake Agreement Creation (the core write)
- **What:** issue inputs on credit + create the on-chain agreement (debt, expected volume, HPP anchor, tolerance, commodity metadata).
- **Why:** this is the *yarnen* contract — the thing banks call the "underlying transaksi."
- **Details:**
  - **Input basket** from catalog (pupuk/benih/pestisida/alsintan) → running total = `input_debt`.
  - **Auto-estimate** `expected_vol = area × yield/ha(kabupaten)` shown with formula + BPS/KATAM source (labeled estimate, not AI).
  - **HPP panel** auto-fills current decree price + version.
  - **Tolerance slider** default 20%.
  - Plain-language **preview** before signing.
- **On/off-chain:** agreement core on-chain (`create_agreement`); input line-items off-chain linked by `onchain_id`.
- **Interface:** Coop Dashboard → Screen C. Freighter signs.
- **Acceptance:** agreement appears on-chain with tx hash; `AgreementCreated` indexed; debt + expected + HPP correct; preview matches chain state.

### 7.3 F3 — Delivery & Harvest Receipt
- **What:** record harvest handover (volume + grade + moisture) → mint immutable **Harvest Receipt**; supports multiple (partial) deliveries.
- **Why:** the immutable proof of what was actually delivered = financial-identity primitive + future receivable basis.
- **Details:** live preview of gross/net/flag before confirming; grade per coop/Bulog SOP dropdown (no computer vision).
- **On/off-chain:** receipt on-chain (`record_delivery` → `HarvestReceiptMinted`); photos/notes off-chain.
- **Interface:** Coop Dashboard → Screen D.
- **Acceptance:** each delivery mints a sequenced receipt with tx link; `delivered_vol_g` accumulates; status transitions correctly.

### 7.4 F4 — Settlement & Auto-Netting
- **What:** compute `gross = delivered_kg × HPP`, **net the debt first**, release net to farmer; supports **partial/staged settlement**.
- **Why:** the trust primitive — no officer can divert the difference; debt cleared before farmer cashflow protects the coop.
- **Details:** worked example — 2,600 kg gabah × Rp6,500 = Rp16.9M − Rp2M debt = **Rp14.9M** to farmer. Partial: settle per delivery, debt nets down across them.
- **On/off-chain:** `settle()` moves dIDR (demo) / records verified rupiah (Path A); `Settled` + `ReputationUpdated` events.
- **Interface:** Coop Dashboard → Screen D (settle button); reflected in Farmer Screen K.
- **Acceptance:** net math correct incl. debt-exceeds-gross (floors at 0); ≥1 full + ≥1 partial settlement demoed on-chain.

### 7.5 F5 — Graded Flags & Force-Majeure
- **What:** under-tolerance delivery → graded flag (`Warning` 80–98% / `PartialDelivery` 40–80% / `Suspected` <40%); crop failure → `ForceMajeure` (no penalty).
- **Why:** real-world nuance; the contract *indicates*, the human *decides* — never an automatic accusation (Brainstorm #3).
- **On/off-chain:** flag/force-majeure on-chain; resolution notes off-chain.
- **Interface:** set in Coop Screen D; surfaced in Auditor Screen G flag queue.
- **Acceptance:** correct band classification; `Suspected` is reviewable, not punitive; force-majeure leaves reputation intact.

### 7.6 F6 — On-chain Reputation (seed)
- **What:** append-only per-farmer counters: deliveries, on-time settlements, total settled volume, flags, force-majeure events.
- **Why:** the seed of farmer financial identity → the "grind to unlock cash loans" hook (Layer 2).
- **On/off-chain:** on-chain counters; off-chain cache for fast reads + derived score.
- **Interface:** Farmer Screen L (progress-to-unlock); badges across all screens.
- **Acceptance:** counters update on every settle/flag; cache matches chain; badge renders.

### 7.7 F7 — Cooperative Dashboard
- **What:** the operational cockpit (overview, registry, create, deliver, settle, agreement detail, inventory).
- **Why:** the daily tool for a non-expert village officer.
- **Interface:** Screens A–F ([§8](#8-interface-specifications-screen-by-screen)).
- **Acceptance:** all stat cards live from indexer; every on-chain action shows tx hash; mobile/tablet responsive.

### 7.8 F8 — Auditor Dashboard + AI Assistant
- **What:** read-only oversight (protocol metrics, coop leaderboard, flag queue, commodity distribution) + plain-Bahasa **chatbot** over read-models.
- **Why:** answers the petinggi's "which KDMP underperforms and why?" — and makes data legible to non-technical officials.
- **Interface:** Screens G–I.
- **Acceptance:** metrics aggregate across all on-chain agreements; AI answers ≥3 demo queries grounded with source links (no hallucinated numbers); AI is cuttable.

### 7.9 F9 — Farmer View
- **What:** mobile-first, dignity-first view of debt, harvest, payout, and reputation.
- **Why:** transparency that fights opaque debt; the aspirational reputation hook.
- **Interface:** Screens J–L.
- **Acceptance:** clear "you owe / you must sell / you receive" cards with tx links; reputation progress bar.

### 7.10 F10 — Lightweight Inventory
- **What:** minimal input stock in/out + harvest received/forwarded — off-chain, linked to agreements.
- **Why:** the brief's "pencatatan internal supply chain," honestly scoped (only *delivery* events are anchored on-chain).
- **Interface:** Coop Screen F.
- **Acceptance:** stock reconciles to agreements; clearly labeled off-chain.

### 7.11 MVP cut order (3-person reality)
Cut in this order under time pressure: **(1) SDK build → (2) AI chat → (3) force-majeure UI → (4) partial-settlement UI.**
**Sacred (never cut):** contract + happy-path settlement + Coop Dashboard + Auditor Dashboard.

---

## 8. Interface Specifications (screen-by-screen)

Three interfaces + AI. Each screen: **purpose · components · data source · actions.** All mobile-responsive. Bahasa primary, English toggle.

> **Design principle:** KDMP operators are *not* finance/tech experts. Big color-coded numbers, plain Bahasa, AI does the heavy lifting. Every on-chain action shows a **tx hash + explorer link** (proves "real transactions").

### 8.1 Cooperative Dashboard (Pengurus) — operational cockpit

**Screen A — Home / Overview**
- *Purpose:* at-a-glance offtaker-book health.
- *Components:* 4 hero cards (**Outstanding Debt**, **Active Agreements**, **Expected Harvest This Week** kg+Rp, **Settlement Rate**); **"Panen Minggu Ini"** panel (farmers harvesting this week: name, commodity, expected kg/Rp, plot); **Funding-needed banner** (Rp to have ready this week, green=funded/red=shortfall); **recent activity feed** (live events).
- *Data:* indexer read-models + estimator. *Actions:* + Daftarkan Petani, + Buat Perjanjian, jump to farmer.

**Screen B — Farmer Registry** *(F1)*
- *Components:* searchable table — name, kecamatan, plot(ha), commodity, active agreements, reputation badge 🟢🟡🔴, outstanding debt.
- *Actions:* register (name, KTP→hashed, wallet, plot, commodity, region), edit, open detail. *Data:* off-chain DB + on-chain reputation.

**Screen C — Create Offtake Agreement** *(F2)*
- *Components:* select farmer (autofill) → input basket (running debt total) → auto-estimate panel (formula + BPS source) → HPP panel (decree + date) → tolerance slider → plain-language preview.
- *Actions:* Buat Perjanjian → Freighter → `create_agreement` → tx hash shown. *Data:* catalog, yield table, HPP cache.

**Screen D — Record Delivery / Settle** *(F3, F4, F5)*
- *Components:* select agreement → volume(kg) + grade(A/B/C) + moisture → live gross/net/flag preview → status banner 🟢/🟡/🔴 + "Tandai Gagal Panen".
- *Actions:* confirm → `record_delivery` (receipt minted, tx) → "Selesaikan Pembayaran" → `settle` (net released, tx). *Data:* chain + estimator.

**Screen E — Agreement Detail**
- *Components:* lifecycle timeline (Created→Delivered→Settled), debt vs paid, all receipts (tx links), settlement records, flag/force-majeure notes, explorer link.

**Screen F — Inventory / Supply (lite)** *(F10)*
- *Components:* input stock in/out tied to agreements; harvest received vs forwarded to Bulog. Off-chain table, labeled.

### 8.2 Auditor / Petinggi Dashboard — oversight + AI

**Screen G — Cooperative Health Overview** *(F8)*
- *Purpose:* "which KDMP underperforms and why?"
- *Components:* **protocol metrics row** (Active Agreements, Total Settled Rp+kg, Settlement Rate, Repayment Rate, Outstanding Debt, Flag Count); **coop leaderboard** (per-KDMP rates, sortable, red floats up); **commodity distribution** chart; **flag queue** grouped by reason with review action.
- *Data:* indexer aggregates across all on-chain agreements.

**Screen H — AI Assistant (chatbot)** *(F8)*
- *Components:* chat over read-models. Demo prompts: *"KDMP mana paling banyak utang belum terbayar?"* · *"Siapa panen minggu depan?"* · *"Kenapa KDMP Sukamaju settlement rate rendah?"* · *"Berapa dana yang harus disiapkan bulan ini?"*
- *Behavior:* read-only, grounded, every figure links to source; Gemini Flash; first to cut.

**Screen I — Audit Trail / Explorer (lite)**
- *Components:* searchable event log (Created/Settled/Flagged) with testnet explorer links. Public no-login explorer = future.

### 8.3 Farmer View (Petani) — mobile-first, dignity-first

**Screen J — My Agreements & Debt** *(F2)* — big cards: "Utang: Rp2,000,000", "Wajib jual: ~2,750 kg", "Harga: Rp6,500/kg", status progress bar.
**Screen K — My Harvest & Payment** *(F4)* — "Setor 2,600 kg → Rp16,900,000 − utang Rp2,000,000 = **terima Rp14,900,000**" + tx link, wallet balance.
**Screen L — My Reputation** *(F6)* — score + badge, deliveries, on-time, total volume; **progress-to-unlock:** *"Selesaikan 2 panen lagi untuk membuka pinjaman tunai."*

### 8.4 Cross-cutting
Bahasa default + EN toggle · tx hash + explorer link on every chain action · consistent color-coded statuses · simplified Freighter connect, pre-seeded demo accounts · designed loading/empty/error states.

---

## 9. Settlement Mechanism (product view)

**Constraint:** crypto is illegal as payment in Indonesia; real money is rupiah. So we never claim "blockchain pays the farmer."

| Path | When | Money rail | Chain's role |
|---|---|---|---|
| **Demo** | Hackathon | testnet **dIDR** | actual transfer (PoC) |
| **Path A** | Deployable now | **rupiah off-chain** (BRI/BRILink) | tamper-proof **record** (backend verifies payment → calls `settle`) |
| **Path B** | Future (gated) | licensed IDR stablecoin | actual on-chain transfer |

**Pitch language: "tamper-proof settlement record," NOT "autonomous settlement."** Same contract + events across all paths — only the `settle()` trigger changes. Honest, buildable, and degrades gracefully. *(Full detail → [`technical/ARCHITECTURE.md`](./technical/ARCHITECTURE.md) §5.)*

---

## 10. Project Structure

**Turborepo monorepo** (one public repo → clean SCF open-source story; shared types; fast CI). Full tree + rationale → [`technical/ARCHITECTURE.md`](./technical/ARCHITECTURE.md) §3.

```
annona/
├── apps/
│   ├── web/          # Next.js 15 — coop / auditor / farmer dashboards (role-routed)
│   └── api/          # Hono backend + event indexer + settlement orchestrator + AI
├── packages/
│   ├── sdk/          # @annona/sdk — typed read client (composability surface)
│   ├── ui/           # shared shadcn/ui components, theme, charts
│   ├── core/         # shared TS types (Agreement, Status, events) — single source
│   └── config/       # tsconfig, biome, tailwind preset
├── contracts/
│   ├── offtake-registry/   # Rust/Soroban protocol core
│   └── didr-token/         # dIDR via SAC (testnet demo asset)
├── scripts/          # deploy.sh, seed.ts (10 farmers), fund-testnet.sh
├── docs/             # PRD.md + technical/
└── turbo.json · pnpm-workspace.yaml · package.json
```

**Stack (latest):** Next.js 15 · React 19 · Tailwind v4 · TypeScript 5.6 · Hono 4 · Supabase/Postgres 16 · Drizzle · Rust + soroban-sdk 22 · @stellar/stellar-sdk 13 · Freighter · Gemini Flash · Turborepo 2 · pnpm 9 · Node 22. Full version table → [`technical/TECH-STACK.md`](./technical/TECH-STACK.md).

---

## 11. Roadmap — The 5-Layer Progression (detailed)

**RWA is the *result* of the flow, not the headline.** Each layer is only possible because the previous one created the data. Below: per-layer features, the interface they live in, and the Stellar integration they unlock.

```
L1 SETTLEMENT ─► L2 REPUTATION ─► L3 RECEIVABLE ─► L4 LIQUIDITY ─► L5 RWA
  (MVP)           (seed in MVP)     (post)           (post)          (gated)
```

### Layer 1 — Settlement  ◄ HACKATHON MVP
- **Thesis:** every input→harvest→payment recorded, tamper-proof, auto-netted.
- **Features:** F1–F5 + F7–F10 (registry, agreement, delivery+receipt, settlement+netting, partial settlement, graded flags, force-majeure, coop + auditor dashboards, farmer view, lite inventory).
- **Interfaces:** all three dashboards.
- **Stellar:** Freighter, SAC/dIDR, Soroban RPC. *(Output: on-chain transaction history exists.)*

### Layer 2 — Reputation  ◄ seed in MVP, matures post
- **Thesis:** delivery + settlement history → farmer financial identity.
- **Features:**
  - **Reputation scoring engine** (weight on-time settlements, volume reliability, flag-free streak; force-majeure neutral).
  - **Credit-unlock tiers** — farmer "grinds" reputation; crossing a threshold unlocks **cash loans** (not just input-credit). *(The founder's core hook.)*
  - **Reputation explorer** (public, per-farmer history) — read by banks/insurers.
- **New interface:** **Farmer Reputation & Credit screen** (extends Screen L) with tier ladder + "apply for cash advance" once unlocked.
- **Stellar:** on-chain reputation reads via `@annona/sdk`. *(Output: creditworthiness signal.)*

### Layer 3 — Receivable
- **Thesis:** an Offtake Agreement = a future harvest receivable with economic value (designed-for from day 1, no re-architecture).
- **Features:**
  - **`tokenize_receivable(agreement)`** → a transferable claim on the agreement's future net payout.
  - **Receivable marketplace (private)** — coops list, vetted funders view.
  - **Hyperlocal data product** — Annona's accumulated delivery data sold per region (the founder's "sell farmer data per daerah" idea) via the SDK/data API.
- **New interface:** **Receivable Desk** (auditor/coop) — list, status, funding offers; **Data Marketplace** (developer/partner portal).
- **Stellar:** SEP-41 receivable tokens; SDK as the data/composability surface. *(Output: a financeable instrument.)*

### Layer 4 — Liquidity
- **Thesis:** pool receivables → working capital for coops/farmers before bank loans clear.
- **Features:**
  - **Liquidity pool** of vetted receivables; funders deposit, earn from the HPP-repaid spread.
  - **Borrow-against-receivable** via **Blend** integration.
  - **Idle-float vault** via **DeFindex** — the *safe, capped, transparent* version of the parked yield idea (NOT DeFi-farming public money).
  - **Multisig escrow** (coop + auditor co-sign release).
- **New interface:** **Funder/Investor Dashboard** (deposit, portfolio, yield, risk by coop reputation).
- **Stellar:** **Blend** (lending), **DeFindex** (vaults), multisig. *(Output: working capital ahead of bank cycle.)*

### Layer 5 — RWA  ◄ gated on OJK Q3 2026 POJK + license + custodian
- **Thesis:** tokenized, OJK-compliant offtake receivables; investors fund farmers directly.
- **Features:**
  - **Compliance wrapper** (ERC-3643-style permissioned tokens) + licensed custodian.
  - **Real price oracle** via **Reflector** (swap the `PriceProvider` interface).
  - **Public RWA marketplace** for retail/institutional pemodal.
- **New interface:** **Public RWA Marketplace** + KYC/AML onboarding.
- **Stellar:** Reflector oracle, compliant token standards, off-ramp partners (USDC/MGUSD/MoneyGram). *(Output: the fundraising story — earned, not claimed.)*

**SCF tranche mapping:** MVP (L1, testnet) → Testnet hardening (L1–2) → Mainnet (L2–3). Open-source contracts throughout.

---

## 12. Data Sources (summary)

Full detail + endpoints + the honest gaps → [`technical/DATA-SOURCES.md`](./technical/DATA-SOURCES.md).

- **Settlement anchor = HPP** (decree-set, public, stable): gabah **Rp6,500/kg** (Inpres 4/2026), jagung **Rp5,500/kg**. The contract's settlement price.
- **Reference prices:** Bapanas Panel Harga + PIHPS (kabupaten granularity, public portals, no clean API) — display only.
- **Yield estimate:** BPS (province/kabupaten) + KATAM (7,042 kecamatan, *planning* data). Transparent formula, not ML.
- **The gap (say it):** kecamatan-level *actual yield* is NOT open data. → settle on HPP, estimate on kabupaten. **Annona's own data becomes the first kecamatan yield dataset** (Layer 3 data product).
- **MVP:** curated seed (~10 farmers) cached with sources cited in-UI; real pipeline post-hackathon.

---

## 13. Stellar Ecosystem Integrations (summary)

**Yes, we integrate — selectively, and we never hand-roll.** Full matrix + access/cost → [`technical/INTEGRATIONS.md`](./technical/INTEGRATIONS.md).

| Integration | When | Access / Cost |
|---|---|---|
| **Freighter** (wallet) | ✅ MVP | `@stellar/freighter-api`, free |
| **Stellar SDK + RPC/Horizon** | ✅ MVP | npm + public testnet, free |
| **SAC / SEP-41** (dIDR token) | ✅ MVP | native protocol, free |
| **Reflector** (oracle) | 🔶 interface MVP, live L5 | public contract, free to read |
| **Blend** (lending) | ⏭ L4 | open-source SDK, free |
| **DeFindex** (vaults) | ⏭ L4 | open-source SDK, free |
| **Gemini Flash** (AI) | ✅ MVP (cuttable) | API key, free tier/cheap |

**Composability is bidirectional:** we consume primitives, *and* expose `@annona/sdk` so others build on Annona (lending, insurance, gov dashboards read our farmer history/reputation without rebuilding it). That's the SCF "reusable infrastructure" criterion, concretely.

---

## 14. Demo Script (5-minute finale)

1. **(30s) Problem** — "KDMP must be the farmer's offtaker, but the input→harvest→payment loop lives in spreadsheets. That's where money leaks and banks lose trust. Since April 2026 PMK 15 made the *state* eat default risk — so running it cleanly got *weaker*. A record nobody can fake is now worth more than ever."
2. **(30s) Insight** — "Banks lend *'selama ada underlying transaksinya.'* Annona *is* that transaction — on-chain, auto-netting, skim-proof. Named after the Roman grain-supply system that did this 2,000 years ago."
3. **(2m) Live demo (testnet)** — register farmer → issue Rp2M inputs → **AgreementCreated** (show tx) → record 2,600 kg grade-A → **Harvest Receipt minted** → **settle**: HPP paid, debt auto-netted, farmer gets Rp14.9M dIDR (show tx) → **reputation ticks up**. Under-deliver another → **graded flag** on auditor dashboard → ask **AI** "kenapa underperform?" → grounded Bahasa answer.
4. **(60s) Why Stellar + composable** — auto-netting trust primitive; HPP-anchored; generic contract any coop reuses; reputation/receipts readable via SDK; Reflector-ready oracle. "Not an app. A settlement *rail*."
5. **(30s) Vision + ask** — Settlement → Reputation → Receivable → Liquidity → RWA. "80,000 cooperatives, Rp-trillion scale, no IDR RWA protocol on Stellar yet. We're the rail."

---

## 15. Success Metrics

- **Hackathon:** deployed testnet contract; ≥1 full + ≥1 partial settlement + ≥1 graded flag live; 3 working interfaces; AI answers ≥3 queries; clean public repo; judges can't break "why blockchain."
- **Product:** # agreements settled; % auto-netted without dispute; flag precision (human-confirmed vs false); time-to-answer "which KDMP underperforms"; # farmers crossing reputation threshold; (Tier 2) # third-party SDK integrations.

---

## 16. Risks & Parking Lot

### 16.1 Risks
| Risk | Sev | Mitigation |
|---|---|---|
| "Database with extra steps" | High | Scope chain to the one thing it needs: multi-party auto-netting + tamper-proof record; reputation/receipts readable by others. Say it out loud. |
| Premise sounds pre-PMK-15 | High | Lead post-April-2026: auditability/bankability + *worsened* moral hazard. |
| Crypto-as-payment illegal | High | Testnet PoC; Path A = "tamper-proof record" not "autonomous payment"; never claim live rupiah. |
| "Autonomous settlement" claim collapses | High | Use §9 hybrid framing; honesty is the strength. |
| No real KDMP/field data | Med | Synthetic-realistic data; pursue ≥1 LoI before finale. |
| Over-scope by 15 Jul | High | Cut order [§7.11]; sacred core protected. |
| Estimate reads as hand-wavy AI | Med | Transparent formula + BPS source; never "ML prediction." |
| Kecamatan oracle promised but absent | Med | HPP national + kabupaten reference; oracle = interface only. |
| AI hallucinates numbers | Med | Grounded in indexer data; figures link to source; cuttable. |

### 16.2 Parking lot
| Idea | Verdict | Why |
|---|---|---|
| Auto yield-farming vault | ⛔ Cut + radioactive | DeFi-farming Dana-Desa-linked public money to service quasi-sovereign debt = OJK won't permit; reads as naivety amid Rp85.96T risk. Safe capped version → L4 via DeFindex only. |
| ML harvest prediction | 🟡 Downgrade | No kecamatan training data. Transparent formula now; ML once delivery history flows (flywheel). |
| Kecamatan price oracle | 🟡 Reframe | Doesn't exist openly. HPP + kabupaten; oracle interface now, Reflector later. |
| Full on-chain inventory | 🟡 Later | Web2 inventory; weak why-chain. Anchor only delivery events. |
| Disaster/force-majeure + tolerance | 🟢 Thin in MVP | One flag + one band; parametric insurance is separate. |
| Petinggi chatbot | 🟢 Thin layer | Great demo; web2 over read-models; cut first. |
| On-chain reputation | ✅ Seed MVP | The cash-loan grind hook (L2). |
| Harvest Receipt | ✅ MVP | Financial-identity primitive + receivable basis. |
| Partial settlement | ✅ MVP | Real harvests staged. |
| Escrow | 🟢 Lite MVP | Coop pre-funds; multisig escrow → L4. |
| Generic/composable contract | ✅ MVP | Protocol-not-app thesis. |
| SDK / API / explorer | ⏭ Designed, post | The composability story; stub + docs in MVP. |
| Tokenize receivable (RWA) | ⏭ L5 | Gated on OJK POJK + license + custodian. |

---

## 17. Key Research Findings (validated Jun 2026)

> Real numbers with sources, so the team + judges share ground truth. Full detail → [`technical/DATA-SOURCES.md`](./technical/DATA-SOURCES.md). Re-verify before pitch.

**KDMP regulation & scale:** PMK 15/2026 (banks→PT Agrinas; repayment deducted from Dana Desa; Rp3B/6%/72mo); Agrinas operates units 2 yrs (Inpres 17/2025); **83,376 registered** (May 2026), 1,357 built / 30,500+ in progress, operational target Dec 2026; **7 mandatory units**; Celios **Rp85.96T** default risk (modeled @3%, real 6%); KUD-1998 structural parallel; ~Rp1.4B/unit/yr target @8% margin (Celios critique: thin margins, warung competition).

**Prices/data:** HPP gabah **Rp6,500/kg** (Inpres 4/2026), jagung **Rp5,500/kg**; PIHPS/Bapanas = kabupaten granularity; BPS province-clean, no kecamatan production; KATAM = 7,042 kecamatan planning data. **Kecamatan actual yield = not open data.**

**OJK/RWA:** POJK 27/2024 + 23/2025 in force; RWA POJK targeted Q3 2026 (drafting); Rupiah stablecoin in sandbox; crypto-as-payment illegal; sandbox graduates GIDR/Nano/GORO — **no ag/IDR RWA yet**.

**Stellar:** APAC Hackathon (submit 15 Jul, Demo 18 Jul, Finale 24 Jul, $60k); SCF (154 awards/$14.4M in 2025, Stellar must be load-bearing, open-source, MVP→Testnet→Mainnet); precedents **TyFi** (won "Best Use of Stellar") + **AgTrail** (SCF #38); $3.35B RWA on Stellar; USDC $4.2B remittance, MGUSD/MoneyGram 475k cash-out points; **no IDR stablecoin on Stellar = gap**. Soroban: SEP-41/SAC, SEP-56 vaults, mandatory events, `require_auth`, TTL extension.

---

## 18. Open Decisions

1. **Letter of Intent** — ≥1 real coop / Agrinas / Dinas Koperasi contact before finale. Highest-leverage non-code task. *(PM.)*
2. **Demo commodity** — **gabah** hero (cleanest HPP); jagung second to prove generic contract. ✅
3. **Custody for `settle`** — pre-funded contract (escrow-lite) for cleanest demo. ✅
4. **AI scope** — confirm Gemini Flash (or Claude Haiku); lock 3–4 demo queries; agree it's first to cut.
5. **dIDR decimals** — 2 (rupiah-cents) vs 0 (whole rupiah). Recommend 2.
6. **Brand + repo** — confirm **Annona**, register `annona.finance`, init public monorepo before Day 1.
7. **Cut order (locked)** — SDK → AI chat → force-majeure UI → partial-settlement UI. Sacred: contract + happy-path settlement + coop + auditor dashboards.

---

*PRD v2.0 — Annona Protocol. Product doc; technical depth in [`docs/technical/`](./technical/). Built to win the hackathon and earn the right to build the protocol.*
