<div align="center">

# 🌾 Annona Protocol

### The Agricultural Offtake Settlement Rail on Stellar

*Tamper-proof, auto-netting, HPP-anchored settlement for Indonesia's village cooperatives.*

[Product Docs (PRD)](./docs/PRD.md) ·
[Architecture](./docs/technical/ARCHITECTURE.md) ·
[Smart Contract](./docs/technical/SMART-CONTRACT.md) ·
[Contributing Guide (CLAUDE.md)](./CLAUDE.md)

</div>

---

## What is Annona?

Koperasi Desa Merah Putih (KDMP) is mandated to act as an **offtaker**: give farmers production inputs (pupuk, benih, pestisida) on credit, then buy their harvest back at the government floor price (HPP), cutting out the *tengkulak* (middleman). The weak link is that the input-credit to harvest-buyback loop (*yarnen*) lives in spreadsheets and WhatsApp, so money leaks, farmers side-sell, and banks cannot trust the cooperative.

**Annona encodes that loop as a Soroban smart contract:** register a farmer, issue inputs on credit (an on-chain Offtake Agreement with the debt and the HPP anchor), record graded delivery (an immutable Harvest Receipt), then settle, which pays `volume × HPP`, **auto-nets the input debt**, and releases the rest to the farmer, supporting partial settlement. Every loop grows an on-chain reputation, the seed of a farmer financial identity.

> **We ship one app (KDMP-facing), but architect a protocol** (a reusable offtake settlement standard any commodity cooperative, or any developer, can build on).

Built for the **APAC Stellar Hackathon 2026**, then the **Stellar Community Fund** Build track.

---

## Why blockchain (and only here)

About 70% of Annona is a normal web app. The chain earns its place in exactly three spots:

1. **Tamper-evident settlement record** that no single party can rewrite (the "underlying transaksi" banks demand).
2. **Auto-netting trust primitive**, so no cooperative officer can quietly divert the difference between harvest payment and input debt.
3. **Composable financial identity** (reputation + receipts) that other protocols read without permission.

Everything else is Postgres, and we say so.

---

## Monorepo layout

```
annona/
├── apps/
│   ├── web/          # Next.js 15 + Tailwind v4 — coop / auditor / farmer dashboards
│   └── api/          # Hono — REST + event indexer + settlement orchestrator + AI
├── packages/
│   ├── core/         # shared TS types (Agreement, Status, events, money) = SINGLE SOURCE
│   ├── sdk/          # @annona/sdk — typed read client (the composability surface)
│   ├── ui/           # shared UI components + theme
│   └── config/       # shared tsconfig / biome / tailwind presets
├── contracts/        # Rust/Soroban — offtake-registry + didr-token (not yet scaffolded)
├── scripts/          # fund-testnet, deploy, seed
└── docs/             # PRD.md + technical/
```

Managed with **Turborepo** + **pnpm workspaces**. Internal deps use `workspace:*`.

---

## Tech stack

| Area | Tech |
|---|---|
| Monorepo | Turborepo 2, pnpm 9+, Node 22 |
| Web | Next.js 15, React 19, Tailwind v4, TypeScript 5.6 |
| API | Hono 4, tsx, @stellar/stellar-sdk 13 |
| Data | Supabase / Postgres 16, Drizzle ORM |
| Contract | Rust, soroban-sdk 22 (Stellar testnet) |
| Wallet | Freighter |
| AI | Groq `llama-3.3-70b` (chat) + `llama-4-scout` (vision, file/image import), read-only, grounded, cuttable |
| Lint/format | Biome |

Full version table: [`docs/technical/TECH-STACK.md`](./docs/technical/TECH-STACK.md).

---

## Getting started

**Prerequisites:** Node 22 (`nvm use`), pnpm 9+.

```bash
# 1. install all workspaces
pnpm install

# 2. set up env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# 3. run everything (turbo)
pnpm dev
#   web  -> http://localhost:3000
#   api  -> http://localhost:8787

# or run one app
pnpm --filter @annona/web dev
pnpm --filter @annona/api dev
```

### Common commands

| Command | What |
|---|---|
| `pnpm dev` | Run all apps (turbo) |
| `pnpm build` | Build all (cached) |
| `pnpm lint` | Biome lint |
| `pnpm format` | Biome format (write) |
| `pnpm check-types` | TS typecheck across workspaces |
| `pnpm --filter <pkg> <cmd>` | Target one workspace |

---

## Demo accounts

Auth is Supabase email+password behind one shared `/auth` page. `app_user.role` routes the signed-in user to the matching dashboard:

| Email | Password | Role | Dashboard |
|---|---|---|---|
| `kmp@annona.id` | `AnnonaKMP2026!` | KMP (koperasi) | `/kmp` |
| `agrinas@annona.id` | `AnnonaAgrinas2026!` | Agrinas (operator) | `/oversight/agrinas` |
| `pemerintah@annona.id` | `AnnonaGov2026!` | Pemerintah (read-only) | `/oversight/pemerintah` |

These are seeded testnet-demo accounts only, fine to publish.

---

## How it works (the core loop)

```
register farmer ─► create agreement (debt + expected vol + HPP anchor)
                       │
                       ▼
              record delivery (volume + grade)  ─► mint Harvest Receipt
                       │
                       ▼
                   settle()  ─► gross = volume × HPP
                                net   = max(0, gross - debt)   (debt netted first)
                                ─► release net to farmer (dIDR on testnet)
                                ─► reputation ++
```

Settlement framing is honest: crypto is illegal as payment in Indonesia, so in production money moves in rupiah off-chain and the chain stores the **tamper-proof record**. We never claim "autonomous settlement." See [`ARCHITECTURE.md` section 5](./docs/technical/ARCHITECTURE.md).

---

## Roadmap (5-layer progression)

```
L1 Settlement ─► L2 Reputation ─► L3 Receivable ─► L4 Liquidity ─► L5 RWA
  (MVP)           (seed in MVP)    (post)            (Blend/DeFindex)  (gated on OJK)
```

RWA is the result of the flow, not the headline. Full detail: [PRD section 11](./docs/PRD.md).

---

## Status

- ✅ Docs (PRD + technical/) — v3.0 multi-party model (PMK 15/2026)
- ✅ Turborepo scaffold (apps + packages, boots + type-checks)
- 🟡 Soroban contract (`contracts/offtake-registry`) scaffolded, 26 unit tests green — v2 two-party model, needs rework to v3.0
- ✅ Supabase Auth (email+password, `/auth`) + `app_user` RBAC live; KMP and Oversight dashboards built on mock data
- ✅ Off-chain logistics tables live (`harvest_shipment`, `harvest_shipment_line`) — KMP → gudang Agrinas forwarding, off-chain in MVP
- ⬜ Indexer, on-chain-wired dashboards, SDK

---

## Contributing

Read [`CLAUDE.md`](./CLAUDE.md) first. Highlights:

- PII never touches the chain.
- **No em dashes in any user-facing UI string or AI output.**
- Shared types live in `packages/core`; never redefine them.
- Money is integer smallest-unit; volumes are grams on-chain.
- Log mistakes in the CLAUDE.md self-learning section so they are not repeated.

---

## License

TBD before public release.
