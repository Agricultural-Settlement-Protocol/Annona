# ARCHITECTURE — Annona Protocol

> System architecture, the 3-layer composability stack, project structure (Turborepo), settlement mechanism, and the on-chain/off-chain boundary. Product features live in `../PRD.md`; contract internals in `./SMART-CONTRACT.md`; data entities in `./ERD.md`; ecosystem hooks in `./INTEGRATIONS.md`.
>
> **v3.0 — multi-party (PMK 15/2026).** Three commercial parties (**Agrinas** operator, **KMP** koperasi, **Farmer**) + a read-only **Government** regulator. Double-confirmation lifecycle, three-way split settlement, and residu reconciliation. See §0.

---

## 0. Party & governance model (read first)

PMK 15/2026 splits the ecosystem into a **commercial rail** and a **regulatory rail**. Annona mirrors that split exactly.

```
  REGULATORY RAIL                         COMMERCIAL RAIL
  ┌───────────────────┐        ┌──────────────────────────────────────────┐
  │ GOVERNMENT        │        │ AGRINAS (operator) ↔ KMP (koperasi) ↔     │
  │ (regulator,       │◄──read─│ FARMER                                     │
  │  read-only)       │        │ catalog · dispatch · pre-funded cash ·     │
  │ macro + FM/subsidy│        │ residu · settlement                        │
  └───────────────────┘        └──────────────────────────────────────────┘
```

- **Agrinas** owns the master saprotan catalog (`base_price_agrinas` = principal), dispatches logistics, and verifies residu remittance. Operator, not regulator.
- **KMP** (Koperasi Mitra Petani; KDMP is the flagship Merah Putih instance) is the **decentralized paying agent**: pre-funds cash, drafts agreements, accepts physical supply, settles, holds + remits residu.
- **Farmer** receives the net payout, accrues reputation.
- **Government** (Dinas Koperasi / Bupati / Desa) is **read-only**: macro food-security oversight + force-majeure/subsidy intervention. Never touches supply-chain operations.

**Dashboards (3 shells, not 4):** KMP dashboard · Oversight dashboard (RBAC → Agrinas operator view + Government regulator view) · Farmer view. Agrinas is a role inside the oversight app, not a separate product.

---

## 1. Design principles

1. **Chain only where it earns its place.** ~70% of Annona is a normal web app. On-chain is reserved for: (a) tamper-evident settlement record, (b) programmatic auto-netting + **three-way split-allocation** (farmer / Agrinas principal / KMP margin), (c) **double-confirmation** across parties who don't trust each other, (d) composable financial identity (farmer + coop reputation + receipts). Everything else is Postgres.
2. **PII never touches the ledger.** KTP, names, GPS, bank proofs → off-chain. On-chain stores hashes, amounts, status, grades, counters. (Mirrors AgTrail's funded "hash-on-chain" pattern.)
3. **App on top, protocol underneath.** The UI is KMP/Agrinas-specific. The contracts are commodity-agnostic so coffee/fish/cacao coops — and other developers — can build on the same primitives.
4. **Graceful degradation between settlement paths.** Same contract + same events whether money moves on-chain (demo/future) or off-chain in rupiah (Path A). Only the trigger of `settle()` changes.
5. **Split allocation is on-chain, remittance is off-chain-verified.** The residu split (whose money is whose) is locked on-chain; the actual rupiah bank transfer of Agrinas's principal is verified off-chain then anchored (`confirm_remittance`). This is the anti-moral-hazard guarantee.

---

## 2. The 3-layer composability stack

Mirrors Stellar's canonical Execution → Abstraction → User model (judges reward this framing).

```
┌──────────────────────────────────────────────────────────────────┐
│  USER LAYER  (apps/web — Next.js 15 + Tailwind v4 + Freighter)     │
│  ┌────────────────┐ ┌─────────────────────────┐ ┌──────────────┐  │
│  │ KMP Dashboard  │ │ Oversight Dash + AI      │ │ Farmer View  │  │
│  │ (koperasi)     │ │ RBAC: Agrinas | Government│ │ (petani,     │  │
│  │                │ │ (operator | regulator)   │ │  mobile)     │  │
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
│    ├ dispatch / accept (Agrinas/KMP)   │  • Input line-items        │
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
│   │   │   ├── (oversight)/    # RBAC: Agrinas (M, I) + Government (G) + AI (H)
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
├── contracts/                  # Rust / Soroban
│   ├── offtake-registry/       # the protocol core (see SMART-CONTRACT.md)
│   │   ├── src/lib.rs
│   │   └── Cargo.toml
│   ├── didr-token/             # dIDR via SAC wrapper / SEP-41 (testnet demo asset)
│   └── Cargo.toml              # workspace
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
        · picks catalog item → base_price_agrinas (Agrinas, read-only)
        · KMP sets saprotan_markup_bps + hpp_handling_fee_bps
        · contract DERIVES input_debt = base × (1 + markup)
        └─► emits AgreementCreated ─► indexer ─► Postgres read-model + Agrinas bulk-request queue
        └─► api stores input-basket detail off-chain (linked by onchain_id)

3. DISPATCH (gate 1 — Agrinas)
   web(Oversight/Agrinas) ─sign─► dispatch_supply()   Created → SupplyDispatched
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
        └─► emits Settled{gross, handling_cut, debt_netted, principal_to_agrinas,
                           coop_margin, net_paid} + ReputationUpdated
        └─► residu_principal accrued (Agrinas), coop_margin+handling accrued (KMP)
        └─► indexer ─► dashboards + farmer view update

7. RESIDU RECONCILIATION (KMP → Agrinas)
   web(KMP) remits principal off-chain (bank) ─sign─► mark_residu_remitted(ref)
   api verifies bank mutation ─► web(Oversight/Agrinas) ─sign─► confirm_remittance()
        └─► ResiduStatus Cleared + CoopReputationUpdated
        └─► mismatch ─► flag_remittance_dispute() freezes coop reputation

8. READ / OVERSIGHT
   web(Oversight/Government) ──► api read-models ──► macro dashboard (read-only)
   web(Oversight) ──► api/ai ──► Gemini over read-models (role-scoped) ──► grounded answer
   3rd party ──► @annona/sdk / REST ──► getAgreement/getReputation/getCoopReputation
```

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
  │     ├─ residu_principal (base_price_agrinas)     → Agrinas (remit back)
  │     └─ coop_margin      (markup portion)         → KMP keeps
  └─ net_to_farmer = (gross − handling_cut) − input_debt → farmer (dIDR / rupiah)
```

Only `net_to_farmer` moves as money in the demo (dIDR transfer). `residu_principal` and KMP's cuts are **on-chain accruals** mirroring the rupiah that physically stays in KMP's cash box until the principal is remitted to Agrinas and confirmed on-chain (`confirm_remittance`). Worked numbers: `SMART-CONTRACT.md` §5.

---

## 6. On-chain vs off-chain boundary (explicit)

| On-chain (Soroban) | Off-chain (Postgres) |
|---|---|
| Agreement id, farmer/coop/agrinas addresses, commodity code/grade/moisture/hpp-version | Farmer name, KTP raw, phone, GPS |
| base_price_agrinas, saprotan_markup_bps, input_debt (derived), hpp_handling_fee_bps | Saprotan catalog, input-basket line items |
| expected_vol, delivered_vol, hpp, tolerance, status (incl. SupplyDispatched/Active), flag | Yield tables, HPP source decrees, market price refs |
| residu_principal, coop_margin/handling accrued, residu_status | Residu bank ref + uploaded transfer proof |
| KTP **hash** only | KTP raw (hashed before anchoring) |
| HarvestReceipt (vol, grade, ts) | Delivery photos, moisture notes |
| Farmer + Coop reputation counters | Reputation caches (fast reads), read-models |
| Settlement records, events | AI conversation logs |

---

## 7. Security & hygiene

- **Auth:** each write is bound to its party — `coop.require_auth()` (KMP: create/accept/deliver/settle/remit), `agrinas.require_auth()` (dispatch/confirm/dispute), `admin.require_auth()` (resolve). `settle` caller auth (KMP in MVP; service/multisig in prod). The two confirmation gates (Agrinas dispatch, KMP accept) mean no single party can advance the other's step. Full multisig role separation = roadmap. Detail in `./SMART-CONTRACT.md` §9.
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
