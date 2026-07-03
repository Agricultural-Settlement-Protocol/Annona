# ARCHITECTURE — Annona Protocol

> System architecture, the 3-layer composability stack, project structure (Turborepo), settlement mechanism, and the on-chain/off-chain boundary. Product features live in `../PRD.md`; contract internals in `./SMART-CONTRACT.md`; data entities in `./ERD.md`; ecosystem hooks in `./INTEGRATIONS.md`.

---

## 1. Design principles

1. **Chain only where it earns its place.** ~70% of Annona is a normal web app. On-chain is reserved for: (a) tamper-evident settlement record, (b) programmatic auto-netting, (c) composable financial identity (reputation + receipts). Everything else is Postgres.
2. **PII never touches the ledger.** KTP, names, GPS → off-chain. On-chain stores hashes, amounts, status, grades, counters. (Mirrors AgTrail's funded "hash-on-chain" pattern.)
3. **App on top, protocol underneath.** The UI is KDMP-specific. The contracts are commodity-agnostic so coffee/fish/cacao coops — and other developers — can build on the same primitives.
4. **Graceful degradation between settlement paths.** Same contract + same events whether money moves on-chain (demo/future) or off-chain in rupiah (Path A). Only the trigger of `settle()` changes.

---

## 2. The 3-layer composability stack

Mirrors Stellar's canonical Execution → Abstraction → User model (judges reward this framing).

```
┌──────────────────────────────────────────────────────────────────┐
│  USER LAYER  (apps/web — Next.js 15 + Tailwind v4 + Freighter)     │
│  ┌────────────────┐ ┌─────────────────────┐ ┌──────────────────┐  │
│  │ Coop Dashboard │ │ Auditor Dash + AI    │ │ Farmer View      │  │
│  │ (pengurus)     │ │ (petinggi/Agrinas)   │ │ (petani, mobile) │  │
│  └────────────────┘ └─────────────────────┘ └──────────────────┘  │
└───────────────┬───────────────────────────────────┬───────────────┘
                │ HTTPS (REST + @annona/sdk)         │ wallet sign (Freighter)
┌───────────────▼───────────────────────────────────▼───────────────┐
│  ABSTRACTION LAYER  (apps/api — Hono + indexer + AI)               │
│  • REST API + @annona/sdk read methods                            │
│  • Event Indexer (polls Soroban RPC getEvents → Postgres)         │
│  • Settlement orchestrator (Path A: verify rupiah → call settle)  │
│  • AI assistant (Gemini Flash over read-models, read-only)        │
└───────┬───────────────────────────────────────────┬───────────────┘
        │ invoke / read (stellar-sdk)                │ SQL (Drizzle)
┌───────▼─────────────────────────────┐  ┌───────────▼───────────────┐
│  EXECUTION LAYER  (contracts/, Soroban)│  OFF-CHAIN DB (Supabase/PG)│
│  • offtake-registry (core protocol)    │  • Farmer PII, plots       │
│    ├ Agreement lifecycle               │  • Input catalog           │
│    ├ Harvest Receipt (immutable)       │  • Yield tables, HPP cache │
│    ├ Settlement + auto-netting         │  • Read-models (dashboards)│
│    ├ Reputation (append-only)          │  • Reputation cache        │
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
│   │   │   ├── (coop)/         # pengurus dashboard routes
│   │   │   ├── (auditor)/      # petinggi dashboard + AI chat
│   │   │   ├── (farmer)/       # mobile farmer view
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
   web(coop) ──register──► api ──► Postgres (PII, plot)   [no chain yet]

2. CREATE AGREEMENT
   web(coop) ─build tx─► Freighter sign ─► offtake-registry.create_agreement()
        └─► emits AgreementCreated ─► indexer ─► Postgres read-model
        └─► api stores input-basket detail off-chain (linked by onchain_id)

3. RECORD DELIVERY
   web(coop) ─sign─► record_delivery(vol, grade)
        └─► mints HarvestReceipt + emits DeliveryRecorded/Flagged
        └─► indexer updates read-model + reputation cache

4. SETTLE
   Demo:  web(coop) ─sign─► settle()  (contract moves dIDR to farmer)
   Path A: rupiah paid off-chain ─► api/settlement verifies ─► settle()
        └─► emits Settled{gross, debt_netted, net_paid} + ReputationUpdated
        └─► indexer ─► dashboards + farmer view update

5. READ / OVERSIGHT
   web(auditor) ──► api read-models ──► dashboard
   web(auditor) ──► api/ai ──► Gemini over read-models ──► grounded answer
   3rd party ──► @annona/sdk / REST ──► getAgreement/getReputation  (composability)
```

---

## 5. Settlement mechanism (how money actually moves)

**Constraint:** crypto is illegal as a means of payment in Indonesia (Currency Law). Real rupiah moves via BRI/BCA/BRILink. So we never claim "blockchain pays the farmer."

### Three paths (one architecture)

| Path | When | Money rail | Chain's role | `settle()` trigger |
|---|---|---|---|---|
| **Demo** | Hackathon | testnet **dIDR** | actual transfer (PoC) | coop signs in UI |
| **Path A** | Deployable now | **rupiah off-chain** | tamper-proof **record** | api verifies payment → calls settle |
| **Path B** | Future (gated) | licensed IDR stablecoin | actual transfer | on-chain, auto |

Path B is gated on OJK Q3 2026 RWA POJK + PT + licensed custodian. **Pitch language: "tamper-proof settlement record," NOT "autonomous settlement."** Honest and strong — it's exactly the "underlying transaksi" banks demand.

**Why it's robust:** contract logic + events are identical across paths. Migrating Path A → B swaps only how `settle()` is invoked and which token moves. No re-architecture. That is the design's whole point.

---

## 6. On-chain vs off-chain boundary (explicit)

| On-chain (Soroban) | Off-chain (Postgres) |
|---|---|
| Agreement id, addresses, commodity code/grade/moisture/hpp-version | Farmer name, KTP raw, phone, GPS |
| input_debt, expected_vol, delivered_vol, hpp, tolerance, status, flag | Input-basket line items, unit prices |
| KTP **hash** only | KTP raw (hashed before anchoring) |
| HarvestReceipt (vol, grade, ts) | Yield tables, HPP source decrees, market price refs |
| Reputation counters | Reputation cache (fast reads), read-models |
| Settlement records, events | AI conversation logs |

---

## 7. Security & hygiene

- **Auth:** `coop.require_auth()` on all write fns; `settle` caller auth (coop in MVP; service/multisig in prod). Role separation (coop + auditor multisig) = roadmap. Detail in `./SMART-CONTRACT.md`.
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
