# BUILD-PLAN.md — Annona v4.0 Execution Plan

> **Purpose.** One source of truth for HOW we build Annona v4.0 to a live, non-static,
> demo-ready state. Ordered by dependency, not by calendar. **No time estimates** — each phase
> is done when its **Test Gate** is green and every **Checklist** box is ticked.
>
> **How to use this doc (team rule).** When you finish a task, tick its checklist box in the
> same PR. A phase is **DONE** only when all its boxes are ticked AND its Test Gate is green.
> Update the **Progress Tracker** at the top. Never mark a box done on a promise — done means
> merged + gate-green. (This rule is mirrored in `CLAUDE.md`.)
>
> **Scope law.** Full v4.0 per the newest docs (`PRD.md`, `technical/SMART-CONTRACT.md`,
> `technical/ERD.md`, `technical/DATA-SOURCES.md` — all already v4.0 on this branch).
> **Only two things are deferred:** `@annona/sdk` (composability nicety) and the **Farmer
> dashboard** (read-only, off the demo critical path). Everything else ships.

---

## Progress Tracker

- [ ] Phase 0 — Foundation unblock + CI skeleton
- [ ] Phase 1 — Contract: supplier rename + subsidy tier
- [ ] Phase 2 — Contract: Offtake Financing lifecycle
- [ ] Phase 3 — `packages/core` sync
- [ ] Phase 4 — Schema + migration `0004`
- [ ] Phase 5 — Indexer + seed + API
- [ ] Phase 6 — Web read cutover
- [ ] Phase 7 — Web write path
- [ ] Phase 8 — Deploy testnet + wire live (kills the "static" bug)
- [ ] Phase 9 — E2E (Playwright) + full CI
- [ ] Phase 10 — Demo polish + acceptance audit

---

## The web2 / web3 boundary (read first)

Annona has exactly one write path:

```
Freighter (web3) → contract (web3) → event → indexer (web2) → Postgres → REST read (web2) → UI (web2)
     Lane C            Lane A                   Lane B                      Lane B          Lane C
```

The API is **read-only by design** — the chain is the source of truth; the indexer is the only
writer to Postgres. There is no `POST /farmer` that mutates the DB, and there never will be.
This is why data "reverts on refresh" today (see Phase 8 rationale).

---

## Lanes, parallelism, and the dependency graph

Three people, three lanes:

- **Lane A — Contract (web3):** Rust/Soroban `offtake-registry`, `packages/core`, deploy scripts.
- **Lane B — Backend (web2):** Drizzle schema + migrations, indexer, Hono API, seed.
- **Lane C — Frontend (web2):** Next.js dashboards, Freighter write path, i18n.

**Can contract and non-web3 run in parallel without waiting on each other? YES — and they should.**
The reason: **the specs are the contract-of-record.** `SMART-CONTRACT.md`, `ERD.md`, and `PRD.md`
are already v4.0 and pinned. So:

- Lane A builds the contract to `SMART-CONTRACT.md`.
- Lane B builds schema + indexer to `ERD.md` (event names + field shapes are already specified).
- Lane C builds UI to `PRD.md` screens against the existing API + demo-mode Freighter bridge.

They only **synchronize at two hard barriers:**

1. **`packages/core` (Phase 3)** — the shared type contract. Lane A owns it; B + C consume it.
   Agree the event field names up front (they're in the spec) and B/C can code against a stub of
   `packages/core` before A finishes the Rust, then swap to the real types when Phase 3 lands.
2. **Deploy (Phase 8)** — the only place all three must be simultaneously real (real contract +
   real schema + real UI + running indexer).

Everything between those barriers is independent. Dependency graph:

```
Phase 0 ─┬─► Lane A: Phase 1 ─► Phase 2 ─► Phase 3 ─┐
         │                                          │
         ├─► Lane B: Phase 4 ─► Phase 5 ────────────┼─► Phase 8 ─► Phase 9 ─► Phase 10
         │        (schema from ERD, stub types)     │
         └─► Lane C: Phase 6 ─► Phase 7 ────────────┘
                  (UI from PRD, demo-mode bridge)
```

Phase 3 (core sync) is the merge point where B + C swap stub types for real ones. Phases 4–7 can
**start** against the spec before Phase 3 lands; they **finish** (integrate) after it.

---

## Agent + skill assignment (use these, do not hand-roll)

| Work | Use |
|---|---|
| Contract code / tests / settlement math | `soroban-dev` agent · `/annona-contract` skill |
| Sync `packages/core` ↔ Rust types | `/annona-types` skill (Golden Rule 5 enforcer) |
| Event indexer (RPC → Postgres) | `/annona-indexer` skill · `annona-api` agent |
| API routes / Drizzle schema / orchestrator | `annona-api` agent |
| Demo seed data | `/annona-seed` skill |
| Dashboard screens (A–L, M–P) | `/annona-screen <letter>` skill · `annona-frontend` agent |
| Pre-submission audit | `/annona-check` skill |
| Contract security / patterns reference | `smart-contracts`, `dapp`, `assets`, `data` Stellar skills |
| Supabase / migrations / RLS | `supabase` skill · `supabase-postgres-best-practices` skill |
| Code review before merge | `/code-review` (or `code-review-skill`) |
| Frontend craft / anti-slop | `frontend-design-guidelines` · `impeccable` · `number-formatting` |

---

## Phase 0 — Foundation unblock + CI skeleton (all lanes, do first)

Goal: identical working baseline for all three devs + a CI pipeline that guards from commit #1.

**Tasks**
- **[all]** `pnpm install` at root. *(Already applied — fixed the `@stellar/freighter-api` "Module
  not found": the dep was in `package.json` + lockfile but never materialized into the pnpm store.)*
- **[B] Fix the database (current blocker).** The API points at Supabase project
  `ldjrsjyecihvynturgnr`, which returns "tenant not found" (paused/deleted). Either **revive** it in
  the Supabase dashboard, or stand up a **local Postgres** and point `apps/api/.env` `DATABASE_URL`
  there. Then apply `0000→0003` and seed. (Docker setup lives outside this doc — ask the team lead.)
- **[B]** Push pending migrations `0001–0003` to the working DB. Before any push: `supabase migration
  list` and eyeball for duplicate timestamps (past landmine), then `supabase db push`.
- **[all]** Fill `.env` (api: `DATABASE_URL`, `DIRECT_URL`) + `.env.local` (web: `NEXT_PUBLIC_API_URL`,
  `GROQ_API_KEY`). Leave `NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID` **unset** (demo mode) until Phase 8.
- **[all]** Lock the four open decisions: **A** role label = `supplier`; **B** `reconcile_funding` =
  separate call; **C** Supplier + Financier share a "Mitra" RBAC shell, Government separate;
  **D** harvest receiver = `warehouse_operator` gudang.
- **[B] CI skeleton (GitHub Actions), runs on every PR from now on:** `pnpm check-types` + `biome lint`
  + `cargo test` + `apps/web/lib/invocations.test.ts` + indexer reducer tests. Grow it each phase.
  *(CI starts here, not at the end — E2E is the only piece that waits, because it needs a deploy target.)*

**Test Gate**
- `pnpm --filter @annona/web build` green; `pnpm check-types` green (all packages).
- `GET /health` returns `"db":"ok"`; every route returns 200; §5 split exact
  (farmer 13,855,000 / handling 845,000 / margin 200,000 / principal 2,000,000, debt 2,200,000).
- CI runs green on a throwaway PR; a deliberately broken type red-lights it.

**Checklist**
- [ ] `pnpm install` clean, web build green
- [ ] Database reachable (`/health` = `db:ok`)
- [ ] Migrations `0000–0003` applied to the working DB, no duplicate versions
- [ ] `.env` / `.env.local` filled, contract id left unset
- [ ] Four open decisions recorded here
- [ ] CI skeleton green on a test PR

**Blocks:** everything.

---

## Phase 1 — Contract: supplier rename + subsidy tier [Lane A]

Goal: match `SMART-CONTRACT.md` §A + §C. Pure rename + one additive enum. Settlement math untouched.
Use `soroban-dev` + `/annona-contract`.

**Tasks**
- Rename `agrinas` → `supplier` across `contracts/offtake-registry/src/*` (types/lib/events/storage/test).
  `base_price_agrinas` → `base_price`; event field `principal_to_agrinas` → `principal_to_supplier`.
  It is a rename to the correct role, not a new writer; keep the per-agreement-`Address` property.
- Add `SubsidyTier { Subsidized, Commercial }`; add `Agreement.subsidy_tier`; add the arg to
  `create_agreement` + the field to `AgreementCreated`. Contract records the tier, never verifies e-RDKK.
- Keep settlement formula, graded bands (9800/8000/4000), force-majeure, reputation as-is.

**Test Gate**
- `cargo test` — 40 renamed tests green + 2 new (subsidy_tier round-trips; settlement output identical
  before/after the rename — hero-example regression guard).
- `stellar contract build` for `wasm32v1-none`; WASM size logged (64KB budget headroom check).

**Checklist**
- [ ] `agrinas` → `supplier` rename complete (grep clean except intentional PT-Agrinas history)
- [ ] `SubsidyTier` + `subsidy_tier` field + `create_agreement` arg + event field
- [ ] 40 existing tests green after rename
- [ ] +2 new tests (subsidy round-trip, settlement regression)
- [ ] WASM builds under budget

**Blocks:** Phase 2.

---

## Phase 2 — Contract: Offtake Financing lifecycle [Lane A]

Goal: the new on-chain surface from `SMART-CONTRACT.md` §B. Self-contained; does not touch the
agreement state machine. Use `soroban-dev` + `/annona-contract funding`.

**Tasks**
- `FundingStatus { Requested, Approved, Rejected, Disbursed, Reconciled }` (§B1).
- `FundingRequest` struct (§B2). `DataKey::NextFundingId` + `Funding(u64)` (§B3); optional
  `CoopFunding(Address)->Vec<u64>` index (first cut if WASM tight).
- 6 fns (§B4): `request_funding` (coop), `approve/reject/disburse_funding` (financier),
  `reconcile_funding` (coop, separate call), `get_funding` (read). `disburse_funding` does a **real**
  `token.transfer(financier → coop)` — the demo's second visible money movement.
- 5 events (§B7). Bind every signer to the record's `financier`/`coop`. TTL-extend; emit events.

**Test Gate**
- `cargo test` full suite green (≈52+): happy path `Requested→Approved→Disbursed→Reconciled`; reject;
  `approve > requested` rejected; `disburse` before `approve` rejected; `reconcile` caps at disbursed;
  wrong-signer rejected per fn.
- **ScVal round-trip / envelope test** for `disburse_funding` (highest-risk encode path).
- WASM under 64KB; first cut if tight = `reject_funding` + `CoopFunding` index.

**Checklist**
- [ ] `FundingStatus` + `FundingRequest` + storage keys
- [ ] 6 funding fns with correct auth binding
- [ ] 5 funding events
- [ ] `disburse_funding` real dIDR transfer + envelope test
- [ ] Full lifecycle + negative-path tests green
- [ ] WASM under budget

**Blocks:** Phase 3, Phase 8.

---

## Phase 3 — `packages/core` sync [Lane A, consumed by B + C]

Goal: Golden Rule 5. Shared TS types are the single source; contract + dashboards must not drift.
Use `/annona-types`.

**Tasks**
- Mirror into `packages/core/src/`: the `supplier` rename, `SubsidyTier`, the 5 funding events +
  `FundingStatus` + `FundingRequest`, `base_price` rename. Update the `events.ts` reducer switch.

**Test Gate**
- `pnpm check-types` green across all 7 packages.
- A `tsx --test` shape test asserting each new event's field set matches the contract emit exactly.

**Checklist**
- [ ] Rename + new types mirrored to `packages/core`
- [ ] `events.ts` switch covers all new events
- [ ] Shape test green (drift tripwire)
- [ ] Lanes B + C swapped stub types → real types

**Blocks:** final integration of Phases 4–7.

---

## Phase 4 — Schema + migration `0004` [Lane B]

Goal: `ERD.md` v4.0 mirrors + off-chain-only tables. Use `annona-api` + `supabase` skill.

**Tasks**
- `apps/api/src/db/schema.ts`: rename table `agrinas` → `supplier` (+ FK `agreement.supplier_id`,
  `agreement_input`); add `financier`, `warehouse_operator`, `funding_request`, `funding_request_line`,
  `supplier_payable`; add `farmer.subsidy_status`, `saprotan_catalog.price_tier`/`het_price`/`erdkk_gated`
  (+ `base_price_agrinas` → `base_price_supplier`), `agreement.subsidy_tier` + `financier_id`;
  extend `app_user.role` → `kmp/supplier/financier/pemerintah` + `supplier_id`/`financier_id`;
  add views `mv_funding_queue`, `mv_funding_portfolio`, `mv_supplier_payable`, `mv_subsidy_distribution`.
- `db:generate` → `0004_*.sql`; copy to `supabase/migrations/` with a fresh unique timestamp
  (check `migration list` for collisions first).

**Test Gate**
- Applies clean on a throwaway DB **and** Supabase staging; `supabase db diff` clean; rollback tested.
- Existing seed still replays after the rename (no dangling `agrinas_*`).

**Checklist**
- [ ] Rename + new tables + new columns in `schema.ts`
- [ ] Read-model views added
- [ ] `role` enum + FKs extended
- [ ] `0004` generated + mirrored with unique timestamp
- [ ] Applies clean local + staging, `db diff` clean, rollback tested

**Blocks:** Phase 5.

---

## Phase 5 — Indexer + seed + API [Lane B]

Goal: read-model covers every v4.0 surface. Use `/annona-indexer` + `/annona-seed` + `annona-api`.

**Tasks**
- Extend `applyEvent`: 5 funding events; `subsidy_tier` on `AgreementCreated`; `supplier_payable`
  accrual on `SupplyDispatched`, reduction on `RemittanceCleared`. Keep the `(tx_hash, event_index)`
  idempotency guard atomic with row writes.
- New read routes: `funding` (list/detail + coverage ratio + risk badge), financier `queue`/`portfolio`,
  `payable`, subsidy distribution. Rename `agrinas` queries → `supplier`.
- Seed: **four wallets** (supplier, KMP, financier-with-dIDR, farmer), a funding-request demo across the
  lifecycle, e-RDKK badges, HET-tagged catalog.

**Test Gate**
- Pure reducer tests (mirror `handlers.test.ts`) for funding + payable; idempotency holds on replay.
- Live `seed → API → curl`: funding rows + coverage ratio + subsidy distribution + payable correct;
  **§5 split still exact** (regression guard).

**Checklist**
- [ ] Reducer handles funding + subsidy + payable events
- [ ] New read routes live
- [ ] `agrinas` → `supplier` in existing queries
- [ ] Seed extended to 4 wallets + funding demo
- [ ] Reducer tests + live curl slice green, split exact

**Blocks:** Phase 6, Phase 7.

---

## Phase 6 — Web read cutover [Lane C]

Goal: every new/renamed read surface renders live. Use `/annona-screen` + `annona-frontend` +
`frontend-design-guidelines`.

**Tasks**
- KMP: subsidy badge (F1); price-tier display in create (F2); "Utang ke Supplier" panel;
  **Screen O — Ajukan Dana Offtake** (select agreements → proof packet → submit → track).
- "Mitra" shell: rename `app/oversight/agrinas/` → `/supplier/` (Screens M1/M2/I); add **Screen P —
  Financier Approval Desk** (queue, coverage ratio, risk badge, approve/reject/disburse, portfolio);
  Government (Screen G) + subsidy-tier distribution.
- Extend auth role routing (`supplier`, `financier`). Retarget AI scope `"agrinas"` → `"supplier"`,
  add `"financier"` (Groq route already works — extend, don't rebuild).
- **House rules (non-negotiable):** full-width, `ScrollArea`, `SearchSelect`, one-page-per-concern,
  **NO em dashes**, rupiah formatting, tx-hash + explorer link on every on-chain action.

**Test Gate**
- Dev-server walk of **every** new/renamed route (typecheck+lint miss runtime React warnings).
  `biome lint` new `lib/`+`components/` explicitly. Web `build` green. Zero em dashes in UI strings.

**Checklist**
- [ ] KMP subsidy badge + price tier + payable panel + Screen O
- [ ] Mitra shell: supplier rename + Screen P + Government subsidy distribution
- [ ] Role routing + AI scopes extended
- [ ] Every route walked in dev server, no runtime warnings
- [ ] Lint + build green, no em dashes

**Blocks:** Phase 7, Phase 9.

---

## Phase 7 — Web write path: funding + subsidy signing [Lane C]

Goal: wire new write actions through the real Freighter builder. Use `annona-frontend` + `dapp` skill.

**Tasks**
- Map **every** new button to `{ contract fn | local/off-chain }` before wiring. New contract writes:
  `create_agreement` (+`subsidy_tier`), `request_funding`/`reconcile_funding` (coop), `approve/reject/
  disburse_funding` (financier — different signer context; surface role-aware wallet connect on Mitra).
- Extend `lib/invocations.ts` with new ScVal builders. Demo-mode bridge + `WalletBadge` unchanged.

**Test Gate**
- `invocations.test.ts` extended: round-trip **every** new builder offline incl. `disburse_funding`
  token-transfer envelope. Demo-mode click-through of the funding state machine. Types + build green.

**Checklist**
- [ ] Every new button mapped to fn or local
- [ ] Funding + subsidy builders wired, role-aware signer
- [ ] `invocations.test.ts` covers every new builder + envelope
- [ ] Demo-mode funding click-through works

**Blocks:** Phase 8.

---

## Phase 8 — Deploy testnet + wire live [A + B + C] (kills the "static" bug)

Goal: the whole loop runs on real testnet, chain → indexer → Postgres → UI. **This makes edits persist.**

> **Why data reverts on refresh today (root cause this phase fixes):** the API has no write endpoints;
> the only writer to Postgres is the indexer, fed by real chain events. With no contract deployed and no
> indexer running, every UI "change" is client-side React state only — refresh re-fetches Postgres and the
> change vanishes. In demo mode the tx hashes are also **fabricated**, which is exactly why teammates
> cannot test real transaction hashes. Deploying + running the indexer closes the loop.

**Tasks**
- **[A]** `scripts/deploy.sh` → deploy `offtake-registry` + dIDR SAC to testnet; write `registryId` to
  `scripts/artifacts.testnet.json`; fund the **financier** wallet with dIDR (needed for `disburse_funding`).
- **[C]** Copy `registryId` → web `.env.local` `NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID`
  (browser can't read the artifacts file at runtime). Flips `useTx` demo → live.
- **[B]** Run the indexer loop live (RPC `getEvents` → `applyEvent` → Postgres), cursor in `indexer_cursor`.
- **[all]** Execute the full circuit once on testnet: register (subsidized → HET) → `create_agreement` →
  `dispatch_supply` → `accept_supply` → **`request_funding` → `approve_funding` → `disburse_funding`
  (real dIDR)** → `record_delivery` → `settle` → `mark_residu_remitted` → `confirm_remittance` →
  `reconcile_funding`.

**Test Gate**
- **One real Freighter sign works end-to-end** (watch "Buffer is not defined" → `next.config.ts` webpack
  `resolve.fallback`). Every step shows a real tx hash + explorer link (no fabricated hashes). The indexer
  writes each event to Postgres; the UI read reflects the write **after refresh** (no longer static).
  §5 split exact on live chain; `reconcile_funding` nets input-principal correctly.

**Checklist**
- [ ] Contract + dIDR SAC deployed, `registryId` recorded, financier funded
- [ ] Web env wired, demo pill gone
- [ ] Indexer running live, cursor advancing
- [ ] Full circuit executed on testnet, real hashes
- [ ] Edit persists across refresh (static bug dead)

**Blocks:** Phase 9, Phase 10.

---

## Phase 9 — E2E (Playwright) + full CI [B + C]

Goal: lock the loop against regression; every PR self-verifies. The CI skeleton from Phase 0 now gains E2E.

**Tasks**
- **[C] Playwright E2E** against a deployed preview (Vercel) or local-against-testnet: KMP
  create→dispatch→accept→deliver→settle; funding journey (Ajukan Dana → approve → disburse → reconcile);
  oversight AI answering a grounded query. Mock Freighter at the wallet boundary for CI; real for the smoke run.
- **[B]** Add E2E + `supabase db diff` to the CI matrix. Extend `scripts/deploy.sh` to auto-copy `registryId`
  into env and (optionally) kick the indexer; document Vercel env vars.

**Test Gate**
- Playwright suite green against a live preview; a failing sign or broken read fails the run.
- Full CI (types + lint + cargo + unit + reducer + E2E) green on a throwaway PR.

**Checklist**
- [ ] Playwright covers the 3 core journeys
- [ ] Freighter mocked for CI, real for smoke
- [ ] E2E + db-diff added to CI
- [ ] Deploy script auto-wires env

**Blocks:** Phase 10 (soft).

---

## Phase 10 — Demo polish + acceptance audit [all]

Goal: submittable. Use `/annona-check` + `impeccable`.

**Tasks**
- **[C]** Demo beats (PRD §14): e-RDKK badge → HET; `disburse_funding` as the second money movement;
  three-way settle; residu confirm → Cleared; funding reconcile → Reconciled; AI "berapa exposure
  talangan koperasi ini?".
- **[all]** Honesty pass: testnet-only, no real rupiah, "tamper-proof settlement record" (never
  "blockchain pays the farmer"). SIMKOPDES rebuttal ready.
- **[C]** Deploy web + API to hosting (Vercel web; Vercel/Railway API; indexer as a worker) for a public URL.

**Test Gate**
- `/annona-check` audit (PRD §15) all pass. Demo dry-run on testnet under 5 min; every money figure
  rupiah-formatted; every on-chain action shows a real hash + explorer link.

**Checklist**
- [ ] Demo script beats land under 5 min
- [ ] Honesty pass + SIMKOPDES rebuttal
- [ ] Public deploy live
- [ ] `/annona-check` all green

---

## Deferred (post-MVP, out of this plan)

- **`@annona/sdk`** — third-party read client. Contract does not depend on it; web reads the API directly.
  Zero demo impact.
- **Farmer dashboard** — read-only, off the critical path. Specified in the PRD; build after the core loop.
- **v4.1 hooks (design-only):** on-chain `book_payable`/`clear_payable`; auto `reconcile_funding` inside
  `settle`; `forward_harvest`/`confirm_harvest_receipt`.

---

## Testing strategy (cheapest test first)

| Layer | Tool | Catches | When |
|---|---|---|---|
| Contract logic | `cargo test` | settlement, auth, lifecycle, funding invariants | every contract change, CI |
| ScVal boundary | `invocations.test.ts` (offline envelope) | wrong ScVal type/struct — invisible to typecheck | every builder change, CI |
| Type drift | `check-types` + core shape test | contract ↔ core ↔ UI drift | every change, CI |
| Reducer | `handlers.test.ts` (pure) | event → read-model, idempotency | every indexer change, CI |
| Read slice | `seed → API → curl` | money-by-SUM, joins, split exactness | after schema/API change |
| Lint/a11y | `biome lint` (explicit paths) | reserved props, style | every FE change, CI |
| Runtime React | dev-server route walk | fragment keys, hydration, demo state machine | every new page |
| **E2E** | **Playwright** | full journeys incl. Freighter sign, real build | on deploy + CI preview |
| Acceptance | `/annona-check` | PRD §15 + golden rules | before demo/submit |

The ScVal round-trip and the §5-split regression are the two tripwires that catch the worst silent
bugs — keep them green on every relevant change, in CI.
