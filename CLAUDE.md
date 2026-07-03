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

### 2026-07-03 — Soroban contract build: SDK 26 gotchas + design decisions
- **What:** Scaffolding `contracts/offtake-registry` surfaced several non-obvious things. (1) soroban-sdk 26 + Rust 1.82+ **rejects** the classic `wasm32-unknown-unknown` target (reference-types/multi-value features); the SDK build script panics. (2) `env.events().publish(...)` is deprecated in SDK 26. (3) A dIDR **SAC wraps a classic asset**, which is fixed at **7 decimals** — the earlier "decimals=2" recommendation is unachievable without a hand-rolled SEP-41 token (which we avoid). (4) The spec's state diagram shows `Flagged → settle → Settled`, but the staged-settlement worked example needs settle to be repeatable and NOT prematurely terminal — the two conflict.
- **Fix:** (1) `rustup target add wasm32v1-none` and build for it (`stellar contract build` selects it automatically). (2) Migrated events to the `#[contractevent]` macro with `topics=["..."]` + per-field `#[topic]` — matches the spec's exact topic layout AND removes the deprecation. (3) Documented dIDR as 7-decimal SAC; the contract is decimal-agnostic (raw i128), so only `packages/core` money helpers need the scale. (4) Terminal `Settled` is reached only when status == `Delivered` (≥80% band) at settle time; below that, settle pays out but leaves the agreement open (staged settlement works, worked examples reproduce exactly). Also: bound write fns to `agreement.coop` (require_auth alone lets any signer target any agreement → added `Unauthorized`); `settle` allows coop OR admin (Path A service key). `#[contracttype]` structs need explicit `#[derive(Debug, PartialEq)]` for `assert_eq!` in tests; testutils traits (`Events`, `storage::Persistent`) must be `use`d for `.all()` / `.get_ttl()`.
- **Rule:** For any new Soroban work here: build with `wasm32v1-none`, use `#[contractevent]` (not `env.events().publish`), pin `soroban-sdk = "26.1.0"`, keep flag thresholds (9800/8000/4000) in lockstep with `packages/core/src/status.ts`, and treat the state DIAGRAM as illustrative — the worked numeric examples in the spec are the binding contract behavior when they conflict.

### 2026-06-30 — Design: avoid AI slop, trace the real brand
- **What:** First UI pass "screamed AI slop." Three root causes: (1) the logo mark was invented (an arrow-in-circle) instead of tracing the real asset (two interlocking chain links); (2) brand colors were a desaturated olive `#5F8130` + dull dark teal, which read flat/pale/normie; (3) generic centered-hero-over-three-cards layout with no brand-specific motif or opinion.
- **Fix:** (1) Always open and VIEW the real brand asset (extract embedded raster from the SVG, sample hex with `sharp`, crop the mark to study its geometry) and trace it, do not invent. (2) Vivid hue beats darkness: shifted to vivid emerald + luminous teal, added a two-tone system (vivid 400-500 for fills/large, AA-safe 700 for text/buttons) and made the emerald-to-teal brand GRADIENT the signature primitive. (3) Added a real opinion: Fraunces serif + Plus Jakarta pairing, an editorial Greco-Roman layer (Annona = Roman grain goddess: chain + wheat + seal motifs), asymmetric hero.
- **Rule:** Before designing, view the actual assets and sample real values. Lead with one signature primitive (here the gradient). Vivid + specific + asymmetric + brand-story motifs = not slop. Olive/desaturated mid-tones + centered defaults = slop. Keep the classical layer editorial (line motifs, serif), never costume (no marble/columns/toga).

### 2026-06-30 — Tailwind v4 + monorepo gotchas
- **What:** (a) Dynamically built class names (`bg-verdant-${s}`) are NOT detected by Tailwind v4's static scanner, so swatches rendered unstyled. (b) Next webpack could not resolve `.js` import specifiers pointing at `.ts` workspace source. (c) `prefix` is a reserved HTML attribute, clashes when used as a component prop name.
- **Fix:** (a) Use inline `style={{backgroundColor: hex}}` for dynamic color demos, or safelist literal classes. (b) Add `config.resolve.extensionAlias` (`.js` -> `.ts/.tsx`) in `next.config.ts`. (c) Renamed the prop to `leading`. Also: shared `library.json` must not set `rootDir` (resolves relative to the config file, not the consumer); pin pnpm build approvals in root `package.json` `pnpm.onlyBuiltDependencies`.
- **Rule:** For Tailwind v4 token demos use inline style; keep `@source` pointing at every consumed package's `src`. Never name a prop `prefix`/`color`/other DOM-reserved attrs.

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
- ✅ Soroban `offtake-registry` contract built + 25 unit tests green; WASM ~40 KB. Deploy via `scripts/deploy.sh` (dIDR SAC + registry). Not yet deployed to testnet (needs `stellar` CLI).
- ⬜ Indexer, dashboards, SDK to build.
