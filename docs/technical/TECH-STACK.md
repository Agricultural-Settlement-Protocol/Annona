# TECH STACK — Annona Protocol

> Latest stable versions targeted as of build start (Jun 2026). Pin exact versions in `package.json` / `Cargo.toml` at init. This file is the single source of truth for "what version of what."

---

## 1. Monorepo & tooling

| Tool | Version | Why |
|---|---|---|
| **Turborepo** | `2.x` | Monorepo task orchestration, remote caching, fast CI. One public repo → clean SCF open-source story. |
| **pnpm** | `9.x` | Workspace package manager (faster + stricter than npm/yarn for monorepos). |
| **Node.js** | `22 LTS` | Runtime for web + api + indexer. |
| **TypeScript** | `5.6+` | Strict mode across all TS packages. |
| **Biome** | `1.9+` | Lint + format (single fast tool, replaces ESLint+Prettier). Optional: keep ESLint if team prefers. |
| **Changesets** | `2.x` | Versioning for the published `@annona/sdk` package (post-hackathon). |

## 2. Smart contract (on-chain)

| Tool | Version | Why |
|---|---|---|
| **Rust** | stable (`1.81+`) | Soroban contract language. |
| **soroban-sdk** | `22.x` (latest) | Soroban contract SDK. Targets `wasm32-unknown-unknown`. |
| **Stellar CLI** (`stellar`) | latest | Build, deploy, invoke contracts; manage testnet identities/keys. (`stellar contract build/deploy/invoke`). |
| **Target** | `wasm32-unknown-unknown` | WASM compile target. |
| **Network** | Stellar **Testnet** (MVP) → Mainnet (post) | Soroban RPC + Horizon testnet endpoints. |

## 3. Frontend (apps/web)

| Tool | Version | Why |
|---|---|---|
| **Next.js** | `15.x` (App Router) | React framework; SSR for dashboards, route handlers if needed. |
| **React** | `19.x` | UI. |
| **Tailwind CSS** | `v4` | Utility CSS; functional-first, mobile-responsive. |
| **shadcn/ui** | latest | Accessible component primitives (tables, dialogs, charts shell). |
| **Recharts** or **Tremor** | latest | Dashboard charts (commodity distribution, settlement rate). |
| **@stellar/stellar-sdk** | `13.x` (JS) | Build/submit Soroban transactions, read contract state, parse events. |
| **@stellar/freighter-api** | latest | Wallet connect + `signAuthEntry` for coop/farmer accounts. |
| **TanStack Query** | `5.x` | Server-state caching for read-models + chain reads. |
| **next-intl** | latest | Bahasa Indonesia (default) + English toggle. |

## 4. Backend / Indexer (apps/api)

| Tool | Version | Why |
|---|---|---|
| **Hono** | `4.x` | Fast, lightweight TS API framework (runs on Node/edge). Serves REST + SDK backing endpoints. |
| **@stellar/stellar-sdk** | `13.x` | Submit `settle()` calls (Path A), poll Soroban RPC for events. |
| **Supabase** (Postgres `16`) | latest | Off-chain DB (PII, plots, catalog, read-models, reputation cache) + auth + storage. |
| **Drizzle ORM** | latest | TS-first, lightweight, type-safe SQL. (Alt: Prisma — heavier.) |
| **Indexer** | custom worker | Polls Soroban RPC `getEvents`, writes read-models to Postgres. Runs as a long-lived process / cron. |

## 5. AI layer

| Tool | Version | Why |
|---|---|---|
| **Google Gemini Flash** | `gemini-2.x-flash` (latest) | Cheap, fast LLM for the auditor Q&A over read-models. Read-only, grounded. |
| **@google/genai** | latest | Official JS SDK. |
| **Vercel AI SDK** | `4.x` (optional) | Streaming chat UI helper if useful. |

> AI note: Anthropic Claude (Haiku 4.5) is the stronger default for grounded tooling; Gemini Flash chosen for cost at hackathon scale. Swappable via a thin provider interface — decide at build time.

## 6. SDK (packages/sdk — `@annona/sdk`)

| Tool | Version | Why |
|---|---|---|
| **TypeScript** | `5.6+` | Typed client over the contract + read-models. |
| **@stellar/stellar-sdk** | `13.x` | Peer dep for on-chain reads. |
| **tsup** | latest | Bundle ESM+CJS for npm publish (post-hackathon). |

## 7. Infra / deploy

| Concern | Choice |
|---|---|
| Web hosting | **Vercel** (Next.js native). |
| API/indexer | **Railway** or **Fly.io** (long-lived indexer process) — or Supabase Edge Functions for stateless bits. |
| DB | **Supabase** (managed Postgres). |
| Contract | Stellar **Testnet** via Stellar CLI; WASM artifact committed + deploy script. |
| CI | GitHub Actions + Turborepo remote cache. |
| Secrets | `.env` + Vercel/Railway env; never commit keys. |

## 8. Version pinning checklist (do at init)
- [ ] `Cargo.toml` → pin `soroban-sdk = "22.x"`
- [ ] `package.json` (root) → pin Turborepo, pnpm via `packageManager` field
- [ ] `@stellar/stellar-sdk` → pin `13.x`
- [ ] Next 15 / React 19 / Tailwind v4 confirmed compatible (Tailwind v4 needs the new PostCSS-less setup)
- [ ] Node `.nvmrc` → `22`
