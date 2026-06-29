# CLAUDE.md — Annona Protocol

Guidance for Claude Code (and humans) working in this repo. Read this first.

---

## What this is

**Annona** is an agricultural offtake **settlement protocol** on Stellar/Soroban for Indonesia's Koperasi Desa Merah Putih (KDMP) and, generically, any commodity cooperative. It turns the input-credit to harvest-buyback (*yarnen*) loop into a tamper-proof, auto-netting, HPP-anchored on-chain ledger.

Built for the **APAC Stellar Hackathon 2026** (submit 15 Jul), then the **Stellar Community Fund** Build track.

**The one-line mental model:** we ship one app (KDMP-facing), but architect a protocol (a reusable offtake settlement standard). UI feels like a KDMP app; contracts feel like infrastructure others build on.

**Read before coding:**
- `docs/PRD.md` for product: features (F1 to F10), interfaces, roadmap, business.
- `docs/technical/ARCHITECTURE.md` for system, layers, project structure, settlement.
- `docs/technical/SMART-CONTRACT.md` for the Soroban contract spec.
- `docs/technical/ERD.md` for the data model.
- `docs/technical/INTEGRATIONS.md` for Stellar plus external deps.
- `docs/technical/DATA-SOURCES.md` for gov data plus HPP.
- `docs/technical/TECH-STACK.md` for exact versions.

---

## Golden rules (do not violate)

1. **PII never touches the chain.** KTP, names, phone, GPS go to Postgres only. On-chain stores hashes, amounts, status, grades, counters. Always hash KTP before anchoring.
2. **Chain only where it earns its place.** On-chain means (a) tamper-proof settlement record, (b) auto-netting, (c) reputation/receipts. Everything else is a normal web app. Don't put web2 things on-chain "because blockchain."
3. **Never claim "autonomous settlement" or "blockchain pays the farmer."** Crypto is illegal as payment in Indonesia. Correct framing is **"tamper-proof settlement record."** See `ARCHITECTURE.md` section 5 (three settlement paths).
4. **The yield estimate is a transparent formula, never "AI prediction."** `expected_vol = area × yield/ha`, with the BPS/KATAM source shown.
5. **Shared types live in `packages/core`.** Contract event shapes, `Agreement`, `Status`, and similar. `web`, `api`, `sdk` import from there and never redefine. Prevents drift between contract and dashboards.
6. **Settlement nets debt first.** `net = max(0, gross - remaining_debt)`. Debt cleared before the farmer sees positive cashflow. Protects the coop.
7. **Flags indicate, humans decide.** `Suspected` and similar are never automatic accusations. The officer/auditor resolves.

---

## NOTES (hard product/UX constraints)

- **NO EM DASHES IN UI.** Never render an em dash (—) in any user-facing string, label, copy, toast, or AI output shown to users. Use a comma, a period, parentheses, or the word "to" for ranges. This applies to all Bahasa and English UI text and to AI assistant responses. (Docs/code comments may use them; the rendered UI may not.)
- Bahasa Indonesia is the default UI language; English is a toggle.
- Every on-chain action in the UI shows a tx hash plus an explorer link.
- Money shown to users is formatted rupiah (e.g. `Rp14.900.000`), never raw smallest-unit integers.
- UI must stay legible to non-expert village officers: big numbers, color-coded statuses, plain Bahasa.

---

## SELF-LEARNING LOG (append-only)

When the assistant (or an owner) makes a mistake, hits a non-obvious gotcha, or discovers a correction, **log it here** so it is not repeated. Newest on top. Keep each entry tight: what happened, the fix, the rule to apply next time. Both Claude and human owners maintain this.

**Format:**
```
### YYYY-MM-DD — <short title>
- **What:** what went wrong / what was confusing.
- **Fix:** what the correct approach is.
- **Rule:** the durable lesson to apply going forward.
```

<!-- Add new entries below this line. Do not delete past entries; supersede with a newer one if needed. -->

### 2026-06-30 — Repo bootstrap conventions
- **What:** Initial scaffold; no mistakes yet, seeding the log with baseline rules so they are not relearned.
- **Fix:** Use pnpm (not npm/yarn), `workspace:*` for internal deps, Biome (not ESLint+Prettier).
- **Rule:** Before adding a dependency, check it is not already provided by a workspace package; before adding a config, check `packages/config` does not already export it.

---

## Repo layout

```
annona/
├── apps/
│   ├── web/          # Next.js 15 — coop / auditor / farmer dashboards (role-routed)
│   └── api/          # Hono — REST + event indexer + settlement orchestrator + AI
├── packages/
│   ├── core/         # shared TS types (Agreement, Status, events) = SINGLE SOURCE
│   ├── sdk/          # @annona/sdk — typed read client (composability surface)
│   ├── ui/           # shared shadcn/ui components, theme
│   └── config/       # shared tsconfig / biome / tailwind preset
├── contracts/        # Rust/Soroban — offtake-registry + didr-token (NOT yet scaffolded)
├── scripts/          # deploy, seed, fund-testnet
└── docs/             # PRD + technical/
```

---

## Commands

| Command | What |
|---|---|
| `pnpm install` | Install all workspaces |
| `pnpm dev` | Run all apps in dev (turbo) |
| `pnpm --filter web dev` | Run only the web app |
| `pnpm --filter api dev` | Run only the API |
| `pnpm build` | Build all (turbo, cached) |
| `pnpm lint` | Biome lint across workspaces |
| `pnpm format` | Biome format |
| `pnpm check-types` | TS typecheck across workspaces |

Package manager is **pnpm** (workspaces). Node **22** (`.nvmrc`). Use `pnpm --filter <pkg>` to target one workspace. Internal deps use `workspace:*`.

---

## Conventions

- **TypeScript strict** everywhere. No `any` without a comment justifying it.
- **Imports:** internal packages via `@annona/core`, `@annona/sdk`, `@annona/ui`.
- **Money:** integers in smallest unit (rupiah-cents). Never floats for money. Volumes in **grams** on-chain.
- **Bahasa first** in UI strings, English toggle via `next-intl`. Code/comments in English.
- **Env:** never commit keys. `.env.local` (web), `.env` (api). Testnet keys only.
- **Indexer idempotency:** events keyed by `(tx_hash, event_index)`.
- **Lint/format:** Biome (single tool). Run before commit.

---

## Stellar specifics

- Network: **testnet** for MVP. Soroban RPC plus Horizon public endpoints.
- Wallet: **Freighter** (`@stellar/freighter-api`), supports `signAuthEntry`.
- Token: **dIDR** via SAC (SEP-41 compatible). Settlement asset.
- On-chain reads via `@stellar/stellar-sdk` (13.x). Contract reads exposed through `@annona/sdk`.
- Don't hand-roll tokens/oracles/lending. Reuse SAC, Reflector, Blend, DeFindex. See `INTEGRATIONS.md`.
- When writing the contract (later): `require_auth()` on writes, TTL-extend every public fn, emit events (mandatory).

---

## When working here

- **Match surrounding code style.** Read neighbors before adding.
- **Don't over-build.** Respect the MVP cut order (PRD section 7.11): SDK, then AI chat, then force-majeure UI, then partial-settlement UI are the first cuts. Sacred: contract + happy-path settlement + coop + auditor dashboards.
- **Don't commit or push unless asked.** If asked and on default branch, branch first.
- **Available Stellar skills** (use them): `smart-contracts`, `dapp`, `assets`, `data`, `standards`, `agentic-payments`, `zk-proofs`. Invoke via the Skill tool when the task matches.
- **Update `docs/` when you change behavior.** Keep PRD/technical in sync with code.
- **Log mistakes in the SELF-LEARNING LOG above.**

---

## Status

- ✅ Docs (PRD + technical/) complete.
- ✅ Turborepo scaffold (apps + packages).
- ⬜ Soroban contract (`contracts/`) not yet scaffolded.
- ⬜ Indexer, dashboards, SDK to build.
