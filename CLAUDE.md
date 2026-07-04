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
6. **Settlement is a three-way split, debt netted first.** `net_to_farmer = max(0, (gross - handling_cut) - input_debt)`. The collected debt splits into **Agrinas principal residu** + **KMP margin** (on-chain, separately tracked). Debt cleared before the farmer sees positive cashflow. Protects the coop AND Agrinas's principal. See `SMART-CONTRACT.md` §5.
6b. **Residu principal is Agrinas's money, not KMP's.** KMP holds it in pre-funded cash until remitted; the on-chain split-allocation + `confirm_remittance` reconciliation is the anti-moral-hazard guarantee. Never let the docs/UI imply KMP owns the residu principal.
6c. **Three parties, two gates.** Agrinas (operator) ↔ KMP (koperasi) ↔ Farmer, + read-only Government. `dispatch_supply` (Agrinas) then `accept_supply` (KMP) must both fire before debt is active. "KMP" is the primary term; KDMP is the flagship instance.
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

### 2026-07-04 — KMP dashboard: owner UX preferences + build patterns
- **What:** Built the KMP dashboard (screens A to F + Permintaan/Pembayaran/Residu/Pengaturan) with mock data. Owner gave detailed rounds of feedback that encode durable preferences, plus two recurring technical gotchas surfaced.
- **Fix / owner preferences (apply to ALL future dashboard work):**
  1. **Use the full width.** No wasted left/right whitespace. Page wrapper is `max-w-[1600px]`, side padding `lg:px-8`. Don't center content in a narrow column.
  2. **Custom scrollbar, never native.** Any fixed-height scroll region (activity feed, catalog list, long tables) uses `apps/web/components/scroll-area.tsx` (`ScrollArea`: branded overlay thumb + fade masks). Never leave the default browser scrollbar on a capped-height list.
  3. **No horizontal scroll inside cards.** Convert wide tables to responsive stacked card-lists when they live in a narrow column (see the catalog list in `create-agreement-form.tsx`). Horizontal scroll is only acceptable inside a full-width `TableFrame`.
  4. **Searchable pickers everywhere.** Every entity dropdown (pilih petani, pilih perjanjian, katalog) uses the shared `SearchSelect` (`components/kmp/search-select.tsx`), never a bare `<select>`.
  5. **Equal-size adjacent buttons.** Side-by-side buttons must share the same `size`. Pass `size` explicitly; don't rely on defaults differing between variants.
  6. **Buttons sized to context.** Header/utility actions (Ekspor CSV) are `size="sm"`. A primary commit action (Kirim Permintaan Gabungan) belongs under the relevant summary card as a full-width button, not crammed beside a search field.
  7. **Collapsible sidebar.** Shell sidebar collapses to an icon rail (persisted in localStorage), and `<main>` widens to fill the reclaimed space. Toggle button lives in the sidebar header.
  8. **One page per concern.** Owner split the combined "Setor & Bayar" into `Setor Panen` (deposits only), `Pembayaran` (settle + history), `Residu Agrinas` (remittance). When a screen does three jobs, prefer three focused pages + a grouped sidebar over one mega-screen.
  9. **Every screen wants: search, history (button top-right or a panel), status, complete detail.** History tables must be searchable too.
- **Fix / domain model clarified by owner:**
  - **Staged deposits (setoran berkala) are human-gated, not automatic.** `expected_vol` is only an estimate. A farmer may deposit multiple times (delivery `seq` 1..n) OR under-deliver (estimate 1500kg, actual 1000kg). There is NO auto-finish: the KMP officer clicks "Tandai Setoran Selesai" to close the harvest window. That freezes actual total, computes the flag vs estimate (`classifyFlag`), and moves the agreement to Delivered/Flagged. Payment is independent and also staged: you can pay for whatever volume already landed (debt nets first) before finalizing.
  - **Grade + kadar air are NOT known at agreement creation** (the create form never asks). On the agreement detail they are ESTIMATES until the first delivery: show a muted "Perkiraan" badge, then switch to "Aktual" (from the latest delivery) once harvest is deposited. Commodity + HPP price ARE locked facts from creation.
  - Harvest is forwarded to the **Agrinas warehouse (gudang Agrinas), NOT Bulog.** (Old copy said Bulog; corrected.)
- **Fix / technical gotchas:**
  - `useState(MOCK_COOP.name)` narrows to a string LITERAL type when the source object is `as const`, so `setName(anyString)` fails typecheck. Use `useState<string>(...)`.
  - Subagents can die mid-task on **"session limit" API errors** (resets on a clock). Scope each agent's file ownership disjointly and write instructions so a resume/redo is cheap; after a failure, check `git status` + grep for the expected markers to see what actually landed before re-spawning or finishing manually. bigint must never cross a server→client prop boundary (keep interactive pages `"use client"` importing mock-data directly).
- **Rule:** Full-width layouts, custom `ScrollArea`, `SearchSelect`, collapsible sidebar, one-page-per-concern, and the human-gated staged-deposit model are now the house style for Annona dashboards. Don't reintroduce narrow centered columns, native scrollbars, bare selects, or a combined setor+bayar screen.

### 2026-07-03 — Merged offtake-registry contract branch (v2 model, pre-v3.0 pivot)
- **What:** `feat/offtake-registry-contract` merged in: real `contracts/` scaffold, 26 unit tests, `scripts/deploy.sh` + `fund-testnet.sh`. Built against the OLD two-party model (no Agrinas, no dispatch/accept gates, no 3-way split, no residu, no CoopReputation) because it predates the v3.0 multi-party pivot below. Contract engineering is solid and reusable; the business logic needs a rework pass to match `SMART-CONTRACT.md` v3.0.
- **Fix:** Contract source is untouched by this merge (belongs to whoever owns `contracts/`). Docs conflicts resolved by keeping v3.0 structure and folding in the real implementation findings from the contract build (see next entry). `packages/core/src/money.ts` keeps `DIDR_DECIMALS = 7` from the contract branch (hard Stellar constraint) alongside the v3.0 `computeSplitSettlement`/`deriveInputDebt` additions. The decimals jump (2 -> 7) silently broke every hardcoded smallest-unit literal in `apps/web` (landing hero card, `/design` demos) — they rendered amounts ~100,000x too small. Added `rupiah(whole)` helper in `packages/core/src/money.ts` and swapped every literal to it.
- **Rule:** Before claiming a contract feature is "done," read the actual `.rs` source, don't infer from doc sync commits alone — a doc can describe the intended spec while the code still implements an older model. Never hand-write a smallest-unit money literal (`200_000_000n`) in demo/seed/UI code — always `rupiah(2_000_000)`. It's decimals-proof and self-documenting.

### 2026-07-03 — Soroban contract build: SDK 26 gotchas + design decisions
- **What:** Scaffolding `contracts/offtake-registry` surfaced several non-obvious things. (1) soroban-sdk 26 + Rust 1.82+ **rejects** the classic `wasm32-unknown-unknown` target (reference-types/multi-value features); the SDK build script panics. (2) `env.events().publish(...)` is deprecated in SDK 26. (3) A dIDR **SAC wraps a classic asset**, which is fixed at **7 decimals** — the earlier "decimals=2" recommendation is unachievable without a hand-rolled SEP-41 token (which we avoid). (4) The spec's state diagram shows `Flagged → settle → Settled`, but the staged-settlement worked example needs settle to be repeatable and NOT prematurely terminal — the two conflict.
- **Fix:** (1) `rustup target add wasm32v1-none` and build for it (`stellar contract build` selects it automatically). (2) Migrated events to the `#[contractevent]` macro with `topics=["..."]` + per-field `#[topic]` — matches the spec's exact topic layout AND removes the deprecation. (3) Documented dIDR as 7-decimal SAC; the contract is decimal-agnostic (raw i128), so only `packages/core` money helpers need the scale. (4) Terminal `Settled` is reached only when status == `Delivered` (≥80% band) at settle time; below that, settle pays out but leaves the agreement open (staged settlement works, worked examples reproduce exactly). Also: bound write fns to `agreement.coop` (require_auth alone lets any signer target any agreement → added `Unauthorized`); `settle` allows coop OR admin (Path A service key). `#[contracttype]` structs need explicit `#[derive(Debug, PartialEq)]` for `assert_eq!` in tests; testutils traits (`Events`, `storage::Persistent`) must be `use`d for `.all()` / `.get_ttl()`.
- **Rule:** For any new Soroban work here: build with `wasm32v1-none`, use `#[contractevent]` (not `env.events().publish`), pin `soroban-sdk = "26.1.0"`, keep flag thresholds (9800/8000/4000) in lockstep with `packages/core/src/status.ts`, and treat the state DIAGRAM as illustrative — the worked numeric examples in the spec are the binding contract behavior when they conflict. **These SDK-level findings (constructor pattern, event macro, build target, decimals) still apply once the contract is reworked to v3.0** — only the business logic (parties, split, residu) changes.

### 2026-07-03 — v3.0 pivot: multi-party model (PMK 15/2026)
- **What:** Docs were two-party (coop ↔ farmer, single auditor). New research (PMK 15/2026) makes it three commercial parties + a regulator: Agrinas (operator: master catalog `base_price_agrinas`, logistics dispatch, residu reconciliation), KMP (koperasi: pre-funded on-site cash agent), Farmer, and read-only Government. Adds a double-confirmation lifecycle (`Created → SupplyDispatched → Active → Delivered → Settled`), a three-way split settlement (farmer net / Agrinas principal residu / KMP margin), residu reconciliation, and coop reputation.
- **Fix:** Rewrote SMART-CONTRACT (types/fns/events/math/auth), ERD (Agrinas + catalog + residu + coop reputation), ARCHITECTURE (party model §0, stack, data flow, settlement), PRD (personas, core loop, F2/F2.1/F3/F4/F4.1/F6/F7/F8, screens A–M, settlement, demo). Dashboards = 3 shells: KMP / Oversight (RBAC Agrinas+Gov) / Farmer — Agrinas is a ROLE, not a separate app. New settlement math changes hero payout Rp14.9M → Rp13.855M (base 2M + 10% markup, 5% handling, 2,600kg gabah). **Landing/design-page hardcoded money literals assume 2-decimal dIDR and need re-scaling now that `DIDR_DECIMALS = 7` (see contract-build entry above).**
- **Rule:** Settlement price has four locked variables now: `base_price_agrinas` (principal, Agrinas-set), `saprotan_markup_bps` (KMP), derived `input_debt`, `hpp_handling_fee_bps` (KMP). Residu principal ≠ KMP money. Three signing wallets in demo. When editing docs, contract spec is source of truth; ERD + others mirror it — edit contract first, propagate.

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
│   ├── web/          # Next.js 15 — KMP / oversight (RBAC Agrinas+Gov) / farmer (role-routed)
│   └── api/          # Hono — REST + event indexer + settlement orchestrator + AI + Drizzle/Supabase
├── packages/
│   ├── core/         # shared TS types (Agreement, Status, events, money) = SINGLE SOURCE
│   ├── sdk/          # @annona/sdk — typed read client (composability surface)
│   ├── ui/           # shared shadcn/ui components, theme
│   └── config/       # shared tsconfig / biome / tailwind preset
├── contracts/        # Rust/Soroban — offtake-registry (v2 model, needs v3.0 rework) + didr-token
├── supabase/         # migrations + seed.sql (project: ldjrsjyecihvynturgnr)
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

- ✅ Docs (PRD + technical/) complete — **v3.0 multi-party model (PMK 15/2026)**.
- ✅ Turborepo scaffold (apps + packages).
- 🟡 Soroban `offtake-registry` contract scaffolded, 26 unit tests green, WASM built (`scripts/deploy.sh` ready) — **but v2 two-party model**, needs rework to v3.0 spec (Agrinas party, dispatch/accept gates, three-way split, residu reconciliation, CoopReputation). Not yet deployed to testnet.
- ✅ Off-chain DB: Supabase linked (`ldjrsjyecihvynturgnr`), Drizzle schema live (16 tables, RLS on all), reference data seeded.
- ⬜ Indexer, dashboards (KMP / Oversight-RBAC / Farmer), SDK to build.
