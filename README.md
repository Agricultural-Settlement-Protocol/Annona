<div align="center">

<img src="./assets/logo-annona.png" alt="Annona Protocol" height="96" />

# Annona Protocol

### The Agricultural Offtake Settlement Rail on Stellar

*Turning Indonesia's village input-credit to harvest-buyback loop (yarnen) into a tamper-proof, auto-netting, HPP-anchored on-chain ledger.*

[![Network](https://img.shields.io/badge/Stellar-Testnet%20Live-14B866?style=flat-square)](https://stellar.expert/explorer/testnet/contract/CC5NZIW5OYPYQYQOW2T6GAYDBLHBBZHG6BHYCQQH3FPM5OZEC7WJCQHQ)
[![Contract](https://img.shields.io/badge/Soroban-offtake--registry-10B3C4?style=flat-square)](https://stellar.expert/explorer/testnet/contract/CC5NZIW5OYPYQYQOW2T6GAYDBLHBBZHG6BHYCQQH3FPM5OZEC7WJCQHQ)
[![Contract tests](https://img.shields.io/badge/cargo%20test-54%20passing-14B866?style=flat-square)](./contracts)
[![Hackathon](https://img.shields.io/badge/APAC%20Stellar%20Hackathon-2026-1B1F1A?style=flat-square)](https://stellar.org)

[Product (PRD)](./docs/PRD.md) &nbsp;·&nbsp;
[Architecture](./docs/technical/ARCHITECTURE.md) &nbsp;·&nbsp;
[Smart Contract Spec](./docs/technical/SMART-CONTRACT.md) &nbsp;·&nbsp;
[Data Model (ERD)](./docs/technical/ERD.md) &nbsp;·&nbsp;
[Pitch](./docs/pitch-deck/PITCH-SCRIPT.md) &nbsp;·&nbsp;
[Contributor Guide](./CLAUDE.md)

</div>

---

## Deployed contracts (Stellar Testnet)

> Every on-chain action in the app renders its transaction hash with a live Stellar Expert link. The registry and the settlement asset below are live on Stellar Testnet.

| Contract / Account | Address | Explorer |
|---|---|---|
| **Offtake Registry** (Soroban, the core protocol) | `CC5NZIW5OYPYQYQOW2T6GAYDBLHBBZHG6BHYCQQH3FPM5OZEC7WJCQHQ` | [View](https://stellar.expert/explorer/testnet/contract/CC5NZIW5OYPYQYQOW2T6GAYDBLHBBZHG6BHYCQQH3FPM5OZEC7WJCQHQ) |
| **dIDR token** (SAC, settlement asset, 7 decimals) | `CAJKD7II6HCCVA57F2ERVCEQR33TIDKNXSK5FY4FDORUJ2NY62BCG4SX` | [View](https://stellar.expert/explorer/testnet/contract/CAJKD7II6HCCVA57F2ERVCEQR33TIDKNXSK5FY4FDORUJ2NY62BCG4SX) |
| **Admin / deployer** (service key) | `GBMZSJUV7BB24XPLX4ABUQTYK5SB6EZK5QUQ5JQELSB5AKZ76KXPVWDU` | [View](https://stellar.expert/explorer/testnet/account/GBMZSJUV7BB24XPLX4ABUQTYK5SB6EZK5QUQ5JQELSB5AKZ76KXPVWDU) |

- **Network:** Stellar Testnet
- **Registry WASM hash:** `ae8aa8c68da7fb9cc32271bd2fc181a4c09e527a4174e90dd6048fbd6eab463c`
- **Deployed:** 2026-07-13
- **Settlement asset:** dIDR, a Stellar Asset Contract (SAC) wrapping a classic asset (SEP-41 compatible), 7 decimals

Deploy artifacts are written to [`scripts/artifacts.testnet.json`](./scripts/artifacts.testnet.json) by [`scripts/deploy.sh`](./scripts/deploy.sh), which also wires these ids into the app env files.

---

## What is Annona?

Indonesia is capitalizing roughly **80,000 Koperasi Desa Merah Putih (KDMP)** village cooperatives to act as the farmer's **offtaker**: give farmers production inputs (pupuk, benih, pestisida) on credit, then buy the harvest back at the government floor price (HPP), cutting out the *tengkulak* (middleman). Under **PMK 15/2026** the state now absorbs the default risk, so the incentive to run that loop cleanly got weaker, not stronger.

The weak link: the input-credit to harvest-buyback loop (*yarnen*) is split across four institutions that do not share a record. Nobody can link "inputs given" to "harvest returned" to "money paid" to "sold on." Money leaks, farmers side-sell, and banks cannot trust the cooperative with capital.

**Annona encodes that loop as one Soroban smart contract:**

> register a farmer, issue inputs on credit (an on-chain Offtake Agreement carrying the debt and the HPP anchor), record graded delivery (an immutable Harvest Receipt), then **settle**, which computes `volume × HPP`, **auto-nets the input debt**, and splits the rest three ways. Every closed loop grows an on-chain reputation, the seed of a farmer financial identity.

One record, five parties, zero trust required.

> **We ship one app (KDMP-facing), but we architect a protocol:** a reusable offtake settlement standard any commodity cooperative, or any developer, can build on. The UI feels like a KDMP app; the contracts feel like infrastructure.

Built for the **APAC Stellar Hackathon 2026**, then the **Stellar Community Fund** Build track.

---

## Why blockchain, and only here

About 70% of Annona is a normal web app. The chain earns its place in exactly three spots:

1. **Tamper-evident settlement record** that no single party can rewrite (the "underlying transaksi" banks demand before they lend).
2. **Auto-netting trust primitive**, so no cooperative officer can quietly divert the difference between the harvest payment and the input debt.
3. **Composable financial identity** (reputation plus receipts) that other protocols can read without permission.

Everything else (PII, plots, catalog, read-models, reputation cache) is Postgres, and we say so in the UI.

> **Honest framing:** crypto is illegal as a means of payment in Indonesia. In production, money moves in rupiah off-chain and the chain holds the **tamper-proof record**. We never claim "autonomous settlement" or "the blockchain pays the farmer." See [ARCHITECTURE.md section 5](./docs/technical/ARCHITECTURE.md).

---

## The five parties

| Party | Role | On-chain? |
|---|---|---|
| **Farmer** (Petani) | Receives inputs on credit, delivers graded harvest, gets the net payout. | Wallet, receipts, reputation |
| **KMP** (Koperasi) | The offtaker: pre-funded cash agent, records deliveries, drives settlement. | Signs the core writes |
| **Supplier** (input principal, filled by PT Agrinas) | Sets the input master catalog (`base_price`), dispatches saprotan, is the residu counterparty. | Dispatch gate, residu reconciliation |
| **Financier** (e.g. LPDB) | Funds the coop's offtake working capital; disburses dIDR to the coop, reconciles on repayment. | Funding lifecycle |
| **Government** (Pemerintah) | Read-only oversight and audit. | Read-only |

Plus the **warehouse operator** ("gudang Agrinas"), a non-transacting infrastructure role that physically receives forwarded harvest.

**Three parties, two gates:** `dispatch_supply` (Supplier) then `accept_supply` (KMP) must both fire before a farmer's input debt goes active. Flags indicate, humans decide: statuses like `Suspected` are never automatic accusations, an officer resolves them.

---

## The core loop and the three-way split

```
register farmer ─► create agreement (input debt + expected volume + HPP anchor + subsidy tier)
                        │
              Supplier dispatch_supply ──► KMP accept_supply     (double-confirmation gate: debt now active)
                        │
                        ▼
              record delivery (volume + grade + kadar air)  ─► mint Harvest Receipt (immutable)
                        │
                        ▼
                    settle()   gross = volume × HPP
                               net_to_farmer = max(0, (gross − handling_cut) − input_debt)
                               debt_netted   = principal_to_supplier (residu) + coop_margin
                        ─► release net to farmer (dIDR on testnet)
                        ─► reputation ++   (supports staged / partial settlement)
```

Settlement is a **three-way split with debt netted first** (SMART-CONTRACT.md section 5). The collected debt splits into the **Supplier principal residu** (the Supplier's money, held by the KMP until remitted, reconciled on-chain against moral hazard) plus the **KMP margin**. Debt clears before the farmer sees positive cashflow, which protects both the cooperative and the Supplier's principal.

Worked hero example: base `Rp2.000.000` plus 10% markup, 5% handling, 2.600 kg gabah at HPP. Farmer receives `Rp13.855.000`, handling `Rp845.000`, coop margin `Rp200.000`, Supplier residu principal `Rp2.000.000`, debt netted `Rp2.200.000`.

---

## Architecture at a glance

```
                    Freighter wallet (writes)          Supabase Auth (dashboard role)
                            │                                   │
  ┌─────────────────────────┼───────────────────────────────────┼──────────────────────┐
  │  apps/web (Next.js 15)   │  role-routed dashboards: KMP · Supplier · Financier · Gov │
  └─────────────────────────┼───────────────────────────────────┼──────────────────────┘
                            │  read (REST)                       │
  ┌─────────────────────────▼───────────────────────────────────▼──────────────────────┐
  │  apps/api (Hono)   REST read-model · event indexer · settlement orchestrator · AI    │
  └───────────▲─────────────────────────────────┬───────────────────────────────────────┘
              │ getEvents (poll)                 │ SUM-derived read-models
  ┌───────────┴──────────────┐      ┌────────────▼───────────────┐
  │  Soroban offtake-registry │      │  Supabase / Postgres 16    │
  │  + dIDR SAC (Testnet)     │      │  PII · catalog · read-model │
  └───────────────────────────┘      └────────────────────────────┘
```

- **Shared types** live in [`packages/core`](./packages/core) (event shapes, `Agreement`, `Status`, money). `web`, `api`, and `sdk` import from there and never redefine, which prevents drift between the contract and the dashboards.
- **Read-models are a projection of the chain.** The indexer polls Soroban RPC `getEvents`, folds each event through one shared `applyEvent` reducer into Postgres, and advances a per-contract cursor. Idempotency is keyed by `(tx_hash, event_index)`. Running money (paid, debt, residu) is derived by SUM over settlement and delivery rows, never stored on the agreement row.

Full detail: [ARCHITECTURE.md](./docs/technical/ARCHITECTURE.md).

---

## Monorepo layout

```
annona/
├── apps/
│   ├── web/          # Next.js 15 + Tailwind v4: KMP / Supplier / Financier / Gov dashboards
│   └── api/          # Hono: REST read-model + event indexer + settlement orchestrator + AI
├── packages/
│   ├── core/         # shared TS types (Agreement, Status, events, money) = SINGLE SOURCE
│   ├── sdk/          # @annona/sdk: typed read client (the composability surface)
│   ├── ui/           # shared UI components + theme
│   └── config/       # shared tsconfig / biome / tailwind presets
├── contracts/        # Rust / Soroban: offtake-registry (v4.0) + didr-token
├── supabase/         # migrations + seed
├── scripts/          # deploy, fund-testnet, seed, seed-chain
└── docs/             # PRD.md + technical/ + pitch-deck/
```

Managed with **Turborepo** plus **pnpm workspaces**. Internal deps use `workspace:*`.

---

## Tech stack

| Area | Tech |
|---|---|
| Monorepo | Turborepo 2, pnpm 11, Node 22 |
| Web | Next.js 15 (App Router), React 19, Tailwind v4, TypeScript 5.6, next-intl (Bahasa default) |
| API | Hono 4, tsx, Drizzle ORM |
| Data | Supabase / Postgres 16 |
| Contract | Rust, soroban-sdk 26.1, target `wasm32v1-none` (Stellar Testnet) |
| Chain SDK | @stellar/stellar-sdk 16 (JS), @stellar/freighter-api 4 |
| Wallet | Freighter |
| AI | Groq `llama-3.3-70b` (chat) plus `llama-4-scout` (vision), read-only and grounded |
| Lint / format | Biome |

Full version table: [`docs/technical/TECH-STACK.md`](./docs/technical/TECH-STACK.md).

---

## Getting started

**Prerequisites:** Node 22 (`nvm use`), pnpm 11+. For the contract: Rust stable plus the Stellar CLI and the `wasm32v1-none` target.

### 1. Install and configure

```bash
pnpm install

# env: copy the examples, then fill in Supabase + contract ids
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Key env vars:

| Var | Where | Purpose |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | `apps/api/.env` | Postgres / Supabase connection |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `apps/web/.env.local` | Browser auth |
| `NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID` | `apps/web/.env.local` | Set it for **live mode** (Freighter signs writes). Leave it **unset** for **demo mode** (writes self-simulate, no wallet needed). |
| `NEXT_PUBLIC_DIDR_TOKEN_CONTRACT_ID` | `apps/web/.env.local` | dIDR settlement asset |
| `SOROBAN_RPC_URL` | both | Defaults to `https://soroban-testnet.stellar.org` |

### 2. Run the app

```bash
pnpm dev
#   web  -> http://localhost:3000
#   api  -> http://localhost:8787

# or one app at a time
pnpm --filter @annona/web dev
pnpm --filter @annona/api dev
```

### 3. Contract: build, test, deploy

```bash
cd contracts
cargo test                                             # 54 unit tests
cargo build --release --target wasm32v1-none -p offtake-registry

# deploy (writes scripts/artifacts.testnet.json + wires the app env files)
./scripts/deploy.sh
```

### 4. Seed the demo data

```bash
# synthetic: replays the fixture through the reducer (fast, placeholder wallets)
pnpm --filter @annona/scripts seed

# chain-backed: drives the REAL deployed contract, real wallets, real tx hashes
pnpm --filter @annona/scripts seed:chain
```

### 5. Run the indexer

```bash
pnpm --filter @annona/api indexer         # loop mode (polls every 5s, near real-time), use for the demo
pnpm --filter @annona/api indexer:once    # one-shot mode (one poll then exit), for cron / serverless
```

### Common commands

| Command | What |
|---|---|
| `pnpm dev` | Run all apps (turbo) |
| `pnpm build` | Build all (cached) |
| `pnpm lint` | Biome lint |
| `pnpm check-types` | TS typecheck across workspaces |
| `pnpm --filter @annona/web test:e2e` | Playwright E2E journeys |
| `pnpm --filter <pkg> <cmd>` | Target one workspace |

---

## Demo accounts

Auth is Supabase email plus password behind one shared `/auth` page. `app_user.role` routes the signed-in user to the matching dashboard. These are seeded testnet-demo accounts, fine to publish.

| Email | Password | Role | Dashboard |
|---|---|---|---|
| `kmp@annona.id` | `AnnonaKMP2026!` | KMP (koperasi) | `/kmp` |
| `pupukindonesia@annona.id` | `AnnonaSupplier2026!` | Supplier (operator) | `/oversight/supplier` |
| `financier@annona.id` | `AnnonaFinancier2026!` | Financier (LPDB) | `/financier` |
| `pemerintah@annona.id` | `AnnonaGov2026!` | Government (read-only) | `/oversight/pemerintah` |

> For a friction-free walkthrough, leave `NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID` unset so every write self-simulates (demo mode shows an amber "Mode Demo" badge). To sign for real, set the id and connect Freighter.

---

## Feature highlights

- **Offtake agreements** with a transparent yield estimate (`expected_vol = area × yield/ha`, BPS / KATAM source shown), never an "AI prediction."
- **Double-confirmation supply gate** (Supplier dispatch, KMP accept) before input debt goes active.
- **Staged, human-gated deposits** (setoran berkala): a farmer may deposit multiple times or under-deliver; the officer closes the harvest window.
- **Three-way split settlement** with debt netted first, partial settlement supported.
- **Residu reconciliation:** the Supplier principal is held by the KMP and reconciled on-chain (anti moral-hazard).
- **Offtake financing lifecycle:** request, approve, disburse (real dIDR financier to coop), reconcile on repayment.
- **Subsidy tier** (e-RDKK) recorded on the agreement (recorded, not verified on-chain).
- **On-chain reputation** per farmer and per cooperative.
- **AI assistant** (read-only, grounded in the read-model) for plain-Bahasa questions and document import.
- **Bahasa Indonesia first**, English toggle. Rupiah formatting everywhere. No em dashes in any UI string.

---

## Roadmap (five-layer progression)

```
L1 Settlement ─► L2 Reputation ─► L3 Receivable ─► L4 Liquidity ─► L5 RWA
  (MVP)           (seeded now)     (post)            (Blend / DeFindex) (gated on OJK)
```

RWA is the result of the flow, not the headline. Full detail: [PRD section 11](./docs/PRD.md).

---

## Project status

- ✅ Docs (PRD plus technical/) coherent at the **v4.0 multi-party model** (PMK 15/2026).
- ✅ Soroban `offtake-registry` **reworked to v4.0 and deployed to Testnet**: Supplier / Financier / Farmer split, dispatch/accept gates, three-way split, residu reconciliation, coop reputation, subsidy tier, and the full offtake-financing lifecycle. **54 unit tests green**, clippy and fmt clean, WASM approx 46 KB.
- ✅ Off-chain DB on Supabase (Drizzle schema live), including `harvest_shipment` logistics and `warehouse_stock`.
- ✅ Event indexer built (shared `applyEvent` reducer plus RPC poller, loop and one-shot modes, per-contract cursor).
- ✅ REST read-model routes (agreements, overview, coop, settlements, residu, farmers, financier, payable, subsidy, catalog, warehouse).
- ✅ Web dashboards wired to the live API; Freighter write path built with a demo-mode bridge.
- ✅ E2E (Playwright) journeys plus CI (types, lint, unit, contract, build, E2E, DB drift).
- 🟡 On-chain write path via Freighter is deploy-ready; single-wallet backend signer (Path A) is designed, not yet wired.

---

## Testing and CI

- **Contract:** `cargo test` (54 tests) plus a WASM budget build in CI.
- **Unit:** shared reducer, ScVal round-trip / envelope, and a contract-to-core drift tripwire.
- **E2E:** Playwright journeys run in demo mode (writes self-simulate, reads hit the live API), gated to PRs on `main` / `dev` plus the manual button to stay within the free CI budget.
- **DB:** drizzle-kit check plus an optional `supabase db diff` against the linked remote.

---

## Contributing

Read [`CLAUDE.md`](./CLAUDE.md) first. Golden rules:

1. **PII never touches the chain.** KTP, names, phone, and GPS go to Postgres only; the chain stores hashes, amounts, status, grades, and counters.
2. **Chain only where it earns its place** (tamper-proof record, auto-netting, reputation). Everything else is a normal web app.
3. **Never claim "autonomous settlement."** The correct framing is "tamper-proof settlement record."
4. **The yield estimate is a transparent formula, never an AI prediction.**
5. **Shared types live in `packages/core`;** never redefine them.
6. **Settlement is a three-way split, debt netted first;** the residu principal is the Supplier's money, not the KMP's.
7. **Flags indicate, humans decide.**
8. **No em dashes in any user-facing UI string or AI output.** Money is integer smallest-unit; volumes are grams on-chain. Log mistakes in the CLAUDE.md self-learning section.

---

## License

To be finalized before public release.

<div align="center">
<sub>Annona · named for the Roman goddess of the grain supply · APAC Stellar Hackathon 2026</sub>
</div>
