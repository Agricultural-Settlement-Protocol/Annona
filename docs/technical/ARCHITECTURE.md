# ARCHITECTURE — Annona Protocol

> System architecture, the 3-layer composability stack, project structure (Turborepo), settlement mechanism, and the on-chain/off-chain boundary. Product features live in `../PRD.md`; contract internals in `./SMART-CONTRACT.md`; data entities in `./ERD.md`; ecosystem hooks in `./INTEGRATIONS.md`.
>
> **v4.0 — corrected multi-party (PMK 15/2026).** Commercial parties (**Supplier** input principal, **KMP** koperasi, **Financier** working-capital, **Farmer**) + a read-only **Government** regulator + a non-transacting **Warehouse Operator** (infra). Double-confirmation lifecycle, three-way split settlement, residu reconciliation, plus an **offtake-financing loop** and a **subsidy (HET/e-RDKK) tier**. See §0. (Corrects the earlier single-"Agrinas" model; only the residu counterparty is renamed to the supplier — settlement math unchanged.)

---

## 0. Party & governance model (read first)

PMK 15/2026 splits the ecosystem into a **commercial rail** and a **regulatory rail**. Annona mirrors that split exactly. Validated 2026 ground truth: the commercial rail is fragmented across real institutions that do not share a record — v4.0 models each as its true role instead of one "Agrinas" super-entity.

```
  REGULATORY RAIL                         COMMERCIAL RAIL
  ┌───────────────────┐        ┌──────────────────────────────────────────┐
  │ GOVERNMENT        │        │ SUPPLIER (input principal) ↔ KMP ↔ FARMER │
  │ (regulator,       │◄──read─│ FINANCIER (working-capital talangan) ↔ KMP│
  │  read-only)       │        │ catalog · dispatch · pre-funded cash ·     │
  │ macro + FM/subsidy│        │ residu · settlement · financing            │
  └───────────────────┘        └──────────────────────────────────────────┘
   (Warehouse Operator = infra: builds/operates gudang, receives forwarded
    harvest off-chain; NOT a transacting party — see SMART-CONTRACT §8b.)
```

- **Supplier** (input principal, e.g. PT Pupuk Indonesia) owns the master saprotan catalog (`base_price` = principal), dispatches logistics, and verifies residu remittance. The old undifferentiated "Agrinas" role; not a regulator, not a financier, not the physical warehouse.
- **KMP** (Koperasi Mitra Petani; KDMP is the flagship Merah Putih instance) is the **decentralized paying agent**: pre-funds cash, drafts agreements, accepts physical supply, settles, holds + remits residu, and **requests offtake financing**.
- **Financier** (working-capital, e.g. LPDB-Koperasi) advances *talangan* against an on-chain offtake proof packet and is reconciled at settlement. New commercial party.
- **Farmer** receives the net payout, accrues reputation; e-RDKK eligibility gates the subsidized (HET) vs commercial price tier offered.
- **Government** (Dinas Koperasi / Bupati / Desa) is **read-only**: macro food-security oversight + force-majeure/subsidy intervention. Never touches supply-chain operations.
- **Warehouse Operator** (e.g. PT Agrinas Pangan Nusantara) builds/operates the gerai + gudang and receives forwarded harvest off-chain. **Infra only — signs nothing on-chain, not in the settlement loop.**

**Dashboards (4 shells):** KMP dashboard · Oversight dashboard (RBAC → Supplier operator view + Government regulator view) · **Financier dashboard** (`/financier`, own shell) · Farmer view. Supplier and Government are roles inside the one oversight app; Financier gets its own shell because it shares no screens with them (portfolio + approval queue, not supply-chain oversight).

---

## 1. Design principles

1. **Chain only where it earns its place.** ~70% of Annona is a normal web app. On-chain is reserved for: (a) tamper-evident settlement record, (b) programmatic auto-netting + **three-way split-allocation** (farmer / supplier principal / KMP margin), (c) **double-confirmation** across parties who don't trust each other, (d) composable financial identity (farmer + coop reputation + receipts), (e) **offtake-financing disbursement + reconciliation** — money moving between distrusting parties against an on-chain proof packet. Everything else (including the input payable ledger and the catalog) is Postgres.
2. **PII never touches the ledger.** KTP, names, GPS, bank proofs → off-chain. On-chain stores hashes, amounts, status, grades, counters. (Mirrors AgTrail's funded "hash-on-chain" pattern.)
3. **App on top, protocol underneath.** The UI is KMP/supplier/financier-specific. The contracts are commodity-agnostic so coffee/fish/cacao coops — and other developers — can build on the same primitives.
4. **Graceful degradation between settlement paths.** Same contract + same events whether money moves on-chain (demo/future) or off-chain in rupiah (Path A). Only the trigger of `settle()` changes.
5. **Split allocation is on-chain, remittance is off-chain-verified.** The residu split (whose money is whose) is locked on-chain; the actual rupiah bank transfer of the supplier's principal is verified off-chain then anchored (`confirm_remittance`). This is the anti-moral-hazard guarantee. The financing disbursement, by contrast, IS a real on-chain money movement (financier → coop in dIDR).

---

## 2. The 3-layer composability stack

Mirrors Stellar's canonical Execution → Abstraction → User model (judges reward this framing).

```
┌──────────────────────────────────────────────────────────────────┐
│  USER LAYER  (apps/web — Next.js 15 + Tailwind v4 + Freighter)     │
│  ┌────────────────┐ ┌─────────────────────────┐ ┌──────────────┐  │
│  │ KMP Dashboard  │ │ Oversight Dash + AI      │ │ Farmer View  │  │
│  │ (koperasi)     │ │ RBAC: Supplier|Government│ │ (petani,     │  │
│  │                │ │ (operator | regulator)   │ │  mobile)     │  │
│  │  + FINANCIER   │ │  (own shell: /financier) │ │              │  │
│  └────────────────┘ └─────────────────────────┘ └──────────────┘  │
└───────────────┬───────────────────────────────────┬───────────────┘
                │ HTTPS (REST + @annona/sdk)         │ wallet sign (Freighter)
┌───────────────▼───────────────────────────────────▼───────────────┐
│  ABSTRACTION LAYER  (apps/api — Hono + indexer + AI)               │
│  • REST API + @annona/sdk read methods                            │
│  • Event Indexer (polls Soroban RPC getEvents → Postgres)         │
│  • Settlement orchestrator (Path A: verify rupiah → call settle)  │
│  • Residu reconciliation (verify bank mutation → confirm_remittance)│
│  • AI assistant (Gemini Flash over read-models, role-scoped)      │
└───────┬───────────────────────────────────────────┬───────────────┘
        │ invoke / read (stellar-sdk)                │ SQL (Drizzle)
┌───────▼─────────────────────────────┐  ┌───────────▼───────────────┐
│  EXECUTION LAYER  (contracts/, Soroban)│  OFF-CHAIN DB (Supabase/PG)│
│  • offtake-registry (core protocol)    │  • Farmer PII, plots       │
│    ├ Agreement lifecycle (2-gate)      │  • Saprotan catalog (base) │
│    ├ dispatch / accept (Supplier/KMP)  │  • Input line-items        │
│    ├ Harvest Receipt (immutable)       │  • Yield tables, HPP cache │
│    ├ 3-way split settle + auto-netting  │  • Residu remittance +proof│
│    ├ Residu reconciliation             │  • Read-models (dashboards)│
│    ├ Farmer + Coop reputation          │  • Reputation caches       │
│    └ PriceProvider interface (trait)   │  └─────────────────────────┘
│  • didr-token (SAC / SEP-41, testnet)  │
│         │ external composability hooks  │
│         ├─► Reflector  (oracle, future) │
│         ├─► Blend      (lending, L4)    │
│         └─► DeFindex   (vaults, L4)     │
└─────────────────────────────────────────┘
```

See `./INTEGRATIONS.md` for each external hook (what, when, SDK/API access).

---

## 3. Project structure (Turborepo monorepo)

```
annona/
├── apps/
│   ├── web/                    # Next.js 15 — all 3 dashboards (role-routed)
│   │   ├── app/
│   │   │   ├── (kmp)/          # koperasi operational cockpit (Screens A–F)
│   │   │   ├── (oversight)/    # RBAC: Supplier (M, I) + Government (G) + AI (H)
│   │   │   ├── financier/     # Financier shell — funding queue, portfolio
│   │   │   ├── (farmer)/       # mobile farmer view (J–L)
│   │   │   └── api/            # thin route handlers (BFF) if needed
│   │   ├── components/         # screen-specific
│   │   └── lib/                # freighter, sdk client, i18n
│   │
│   └── api/                    # Hono backend + indexer + AI
│       ├── src/
│       │   ├── routes/         # REST endpoints (also back @annona/sdk)
│       │   ├── indexer/        # Soroban RPC event poller → Postgres
│       │   ├── settlement/     # Path A orchestrator (verify rupiah → settle)
│       │   ├── ai/             # Gemini Flash grounded Q&A
│       │   └── db/             # Drizzle schema + queries
│       └── package.json
│
├── packages/
│   ├── sdk/                    # @annona/sdk — typed client (READ-first)
│   │   └── src/                # getAgreement, getReceipts, getReputation, subscribe
│   ├── ui/                     # shared shadcn/ui components, theme, charts
│   ├── core/                   # shared TS types (Agreement, Status, events) — single source
│   └── config/                 # tsconfig, biome, tailwind preset
│
├── contracts/                  # Rust / Soroban (own Cargo workspace, not pnpm)
│   ├── offtake-registry/       # the protocol core (see SMART-CONTRACT.md)
│   │   ├── src/
│   │   │   ├── lib.rs          # contract entrypoints (__constructor + public fns)
│   │   │   ├── types.rs        # Agreement/Status/... (mirror packages/core)
│   │   │   ├── storage.rs      # typed storage + TTL helpers
│   │   │   ├── settlement.rs   # pure gross/net/debt + flag classification
│   │   │   ├── events.rs       # #[contractevent] definitions
│   │   │   ├── errors.rs       # ContractError
│   │   │   └── test.rs         # 25 unit tests
│   │   └── Cargo.toml
│   └── Cargo.toml              # workspace (one member; release profile)
│   # dIDR is a classic-asset SAC — NO crate; issued+wrapped via scripts/deploy.sh
│
├── docs/                       # this PRD + technical/
├── scripts/                    # deploy.sh, seed.ts (10 demo farmers), fund-testnet.sh
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Shared-types rule:** `packages/core` holds the canonical TS mirror of on-chain structs + event shapes. `web`, `api`, and `sdk` all import from it → no drift between contract events and dashboard read-models.

---

## 4. Data flow (the core loop, end to end)

```
1. REGISTER
   web(KMP) ──register──► api ──► Postgres (PII, plot)   [no chain yet]

2. CREATE AGREEMENT (draft = collective Surat Pesanan)
   web(KMP) ─build tx─► Freighter sign ─► offtake-registry.create_agreement()
        · picks catalog item → base_price (Supplier, read-only; HET if e-RDKK-eligible, else commercial)
        · KMP sets saprotan_markup_bps + hpp_handling_fee_bps
        · contract DERIVES input_debt = base × (1 + markup); records subsidy_tier
        └─► emits AgreementCreated ─► indexer ─► Postgres read-model + Supplier bulk-request queue
        └─► api stores input-basket detail off-chain (linked by onchain_id)

3. DISPATCH (gate 1 — Supplier)
   web(Oversight/Supplier) ─sign─► dispatch_supply()   Created → SupplyDispatched
        └─► emits SupplyDispatched ─► KMP inbound-cargo monitor updates

4. ACCEPT SUPPLY (gate 2 — KMP)
   web(KMP) ─sign─► accept_supply()   SupplyDispatched → Active
        └─► emits SupplyAccepted (input_debt now an active farmer liability)

5. RECORD DELIVERY
   web(KMP) ─sign─► record_delivery(vol, grade)
        └─► mints HarvestReceipt + emits DeliveryRecorded/Flagged
        └─► indexer updates read-model + reputation cache

6. SETTLE (three-way split)
   Demo:  web(KMP) ─sign─► settle()  (contract moves dIDR net_to_farmer)
   Path A: rupiah paid off-chain ─► api/settlement verifies ─► settle()
        └─► emits Settled{gross, handling_cut, debt_netted, principal_to_supplier,
                           coop_margin, net_paid, settled_vol_g} + ReputationUpdated
        └─► residu_principal accrued (Supplier), coop_margin+handling accrued (KMP)
        └─► indexer ─► dashboards + farmer view update

7. RESIDU RECONCILIATION (KMP → Supplier)
   web(KMP) remits principal off-chain (bank) ─sign─► mark_residu_remitted(ref)
   api verifies bank mutation ─► web(Oversight/Supplier) ─sign─► confirm_remittance()
        └─► ResiduStatus Cleared + CoopReputationUpdated
        └─► mismatch ─► flag_remittance_dispute() freezes coop reputation

8. READ / OVERSIGHT
   web(Oversight/Government) ──► api read-models ──► macro dashboard (read-only)
   web(Oversight) ──► api/ai ──► Gemini over read-models (role-scoped) ──► grounded answer
   3rd party ──► @annona/sdk / REST ──► getAgreement/getReputation/getCoopReputation
```

**Offtake-financing loop (parallel, v4.0 — Financier ↔ KMP).** Runs alongside the core loop, not inside it: once agreements exist, KMP can borrow working capital against the on-chain offtake proof packet.

```
F1. REQUEST   web(KMP) ─sign─► request_funding(proof)          → FundingRequested
F2. APPROVE   web(Financier) ─sign─► approve_funding / reject_funding
F3. DISBURSE  web(Financier) ─sign─► disburse_funding()  (real dIDR: financier → coop) → FundingDisbursed
F4. RECONCILE at settlement, coop ─sign─► reconcile_funding()  (repay, capped at disbursed) → FundingReconciled
```

Unlike residu (an on-chain *accrual* mirroring off-chain rupiah), the funding disbursement in F3 is an **actual on-chain dIDR movement** between distrusting parties — see §1 principle 5 and `SMART-CONTRACT.md` §9 for the auth bindings.

---

## 5. Settlement mechanism (how money actually moves)

**Constraint:** crypto is illegal as a means of payment in Indonesia (Currency Law). Real rupiah moves via BRI/BCA/BRILink. So we never claim "blockchain pays the farmer."

### Three paths (one architecture)

| Path | When | Money rail | Chain's role | `settle()` trigger |
|---|---|---|---|---|
| **Demo** | Hackathon | testnet **dIDR** | actual transfer (PoC) | KMP signs in UI |
| **Path A** | Deployable now | **rupiah off-chain** | tamper-proof **record** | api verifies payment → calls settle |
| **Path B** | Future (gated) | licensed IDR stablecoin | actual transfer | on-chain, auto |

Path B is gated on OJK Q3 2026 RWA POJK + PT + licensed custodian. **Pitch language: "tamper-proof settlement record," NOT "autonomous settlement."** Honest and strong — it's exactly the "underlying transaksi" banks demand.

**Why it's robust:** contract logic + events are identical across paths. Migrating Path A → B swaps only how `settle()` is invoked and which token moves. No re-architecture. That is the design's whole point.

### The three-way split (on-site cashflow, PMK 15/2026)

KMP is the **decentralized paying agent** with **pre-funded** cash. One `settle()` produces three allocations from the gross HPP payout:

```
gross = volume × HPP
  ├─ handling_cut  (gross × hpp_handling_fee_bps)   → KMP keeps
  ├─ input_debt netted first, then split pro-rata:
  │     ├─ residu_principal (base_price)             → Supplier (remit back)
  │     └─ coop_margin      (markup portion)         → KMP keeps
  └─ net_to_farmer = (gross − handling_cut) − input_debt → farmer (dIDR / rupiah)
```

Only `net_to_farmer` moves as money in the demo (dIDR transfer). `residu_principal` and KMP's cuts are **on-chain accruals** mirroring the rupiah that physically stays in KMP's cash box until the principal is remitted to the Supplier and confirmed on-chain (`confirm_remittance`). Worked numbers: `SMART-CONTRACT.md` §5.

---

## 6. On-chain vs off-chain boundary (explicit)

| On-chain (Soroban) | Off-chain (Postgres) |
|---|---|
| Agreement id, farmer/coop/supplier addresses, commodity code/grade/moisture/hpp-version, subsidy_tier | Farmer name, KTP raw, phone, GPS |
| base_price, saprotan_markup_bps, input_debt (derived), hpp_handling_fee_bps | Saprotan catalog (base + HET tiers), input-basket line items, e-RDKK badge |
| expected_vol, delivered_vol, hpp, tolerance, status (incl. SupplyDispatched/Active), flag | Yield tables, HPP source decrees, market price refs |
| residu_principal, coop_margin/handling accrued, residu_status | Residu bank ref + uploaded transfer proof |
| KTP **hash** only | KTP raw (hashed before anchoring) |
| HarvestReceipt (vol, grade, ts) | Delivery photos, moisture notes |
| Farmer + Coop reputation counters | Reputation caches (fast reads), read-models |
| Settlement records, events | AI conversation logs |

---

## 7. Security & hygiene

- **Auth:** each write is bound to its party — `coop.require_auth()` (KMP: create/accept/deliver/settle/remit + request/reconcile funding), `supplier.require_auth()` (dispatch/confirm/dispute), `financier.require_auth()` (approve/reject/disburse funding), `admin.require_auth()` (resolve). `settle` caller auth (KMP in MVP; service/multisig in prod). The two confirmation gates (Supplier dispatch, KMP accept) mean no single party can advance the other's step. Full multisig role separation = roadmap. Detail in `./SMART-CONTRACT.md` §9.
- **TTL extension** on every public contract fn (instance + accessed persistent entries) — production hygiene that signals maturity to judges/SCF.
- **Keys:** demo testnet keys in `.env` only; never commit. Farmer/coop demo accounts pre-seeded by `scripts/seed.ts`.
- **Indexer idempotency:** events keyed by `(tx_hash, event_index)`; re-poll safe.
- **Off-chain integrity:** KTP hash on-chain lets any party verify the off-chain record wasn't swapped.

---

## 8. Environments

| Env | Chain | DB | Notes |
|---|---|---|---|
| local | testnet (shared) or local quickstart | local Supabase/PG | seed 10 farmers |
| demo | Stellar testnet | Supabase | the finale build; pre-funded dIDR |
| prod (future) | mainnet | Supabase prod | gated on regulation for money movement |
