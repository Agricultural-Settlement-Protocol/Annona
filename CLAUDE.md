# CLAUDE.md — Annona Protocol

Guidance for Claude Code (and humans) working in this repo. Read this first.

---

## What this is

**Annona** is an agricultural offtake **settlement protocol** on Stellar/Soroban for Indonesia's Koperasi Desa Merah Putih (KDMP) and, generically, any commodity cooperative. It turns the input-credit to harvest-buyback (*yarnen*) loop into a tamper-proof, auto-netting, HPP-anchored on-chain ledger.

Built for the **APAC Stellar Hackathon 2026** (submit 15 Jul), then the **Stellar Community Fund** Build track.

**The one-line mental model:** we ship one app (KDMP-facing), but architect a protocol (a reusable offtake settlement standard). UI feels like a KDMP app; contracts feel like infrastructure others build on.

**Read before coding:**
- `docs/BUILD-PLAN.md` for the v4.0 execution plan: phases, lanes, per-phase test gates + checklists. **This is the live plan of record. When you finish a task, tick its checklist box and update the Progress Tracker in the SAME PR — a box is "done" only when merged + its Test Gate is green, never on a promise.**
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

### 2026-07-12 — v4.0 spec change: "Agrinas" splits into TWO roles, not one
- **What:** Applied `02-CHANGES-SMART-CONTRACT.md` + `01-CHANGES-PRD.md` (v3.0→v4.0: entity split + offtake financing + subsidy/HET tier). The trap: a naive find-replace of `agrinas → supplier` corrupts the doc. Under v4.0 "Agrinas" splits into **two distinct parties by context**: the input-supply + dispatch + residu-counterparty + `base_price` role → **supplier**; the physical warehouse / harvest-forwarding recipient (incl. the §8b v3.1 `confirm_harvest_receipt` hook + the §12 roadmap row) → **warehouse operator** (non-transacting infra). Routing forwarded harvest to "supplier" would be a factual error. Also catch derived names: `base_price_agrinas → base_price`, event field `principal_to_agrinas → principal_to_supplier`, `agreement.agrinas_id → agreement.supplier_id`. Retained "Agrinas" mentions are intentional: real regulatory entity "PT Agrinas" (= the warehouse-operator role) + rename-history callouts.
- **Fix:** Grep `-i agrinas` on the finished doc and confirm each survivor is either intentional history or the real "PT Agrinas" entity; verify each rename went to the RIGHT one of the two roles. Resolved the brief's own inconsistency (§2 table says "4 fns/4 events") toward the detailed spec (SC-B4/B7 = 5 write fns + get_funding + 5 events). Coverage ratio kept as source-specified `requested ÷ projected_settlement` (note: inverted from conventional "coverage," lower = safer — flag to owner).
- **Rule:** All FOUR change docs are now applied — SMART-CONTRACT + ERD + DATA-SOURCES + PRD are v4.0-coherent (2026-07-12). The dangling forward-refs are now resolved: `funding_request`/`funding_request_line`, `supplier_payable`, `agreement.supplier_id`, `mv_funding_queue`/`mv_subsidy_distribution` all exist in ERD; SIMKOPDES is DATA-SOURCES §7 (PRD cross-ref honored — had to renumber the old pipeline §7→§8 so SIMKOPDES could take §7). **Still lagging the spec (NOT built): the Rust contract (`contracts/offtake-registry/*.rs`), `packages/core` types, and `ARCHITECTURE.md` (its §5 is cross-ref'd from PRD §9 but still shows the v3.0 "Agrinas" party model).** Funding + subsidy are SPECIFIED, NOT BUILT. When applying multi-doc change sets, watch for cross-refs that pin a section NUMBER (PRD → "DATA-SOURCES §7"): inserting new sections shifts numbering, so decide the final integer for the referenced section first, then renumber around it.

### 2026-07-11 — Duplicate migration timestamp silently skips a push
- **What:** Two branches (`feat/v3-migration` and `feat/oversight-dashboard`) each independently generated a `supabase/migrations` file timestamped `20260707090000` and both survived the merge. One (`..._logistics_auth_harvest_date.sql`) was already applied to the shared Supabase project; the other (`..._settlement_agreement_and_volume.sql`, the actual `settlement.agreement_id`/`settled_vol_g` fix) was not. Supabase's tracker keys applied migrations by version number only, not filename — so with two files sharing one version, `supabase migration list`/`db push` treated the whole version as done and would have **silently skipped the unapplied settlement migration forever**. A third, separately-added file (`20260707091000_agreement_expected_harvest_date.sql`) was also a non-idempotent (`ADD COLUMN` without `IF NOT EXISTS`) duplicate of content already live, which would have made `db push` error outright.
- **Fix:** Before ANY `supabase db push`, run `supabase migration list` first and eyeball for duplicate/near-duplicate local timestamps, not just a blank Remote column. Cross-check what's actually live with `supabase db dump --linked --schema public` (grep for the specific columns/tables a pending migration claims to add) rather than trusting file presence. Renamed the genuinely-pending file to a fresh unique timestamp (`20260707093000`), deleted the two redundant duplicates (safe: neither had a remote-applied row), then pushed clean. Also confirmed via `supabase db dump --linked --data-only` that every remote table was empty before trusting a bare `NOT NULL` `ADD COLUMN` (no default) wouldn't fail on existing rows.
- **Rule:** Migration version numbers, not filenames, are the source of truth for what Supabase considers "applied." A timestamp collision between independently-authored migrations is a silent-skip landmine, not a merge-conflict that git will flag. Always diff local migration timestamps for collisions and diff local-vs-remote schema (not just the CLI's applied/unapplied table) before pushing after any multi-branch merge that touched `supabase/migrations`.

When the assistant (or an owner) makes a mistake, hits a non-obvious gotcha, or discovers a correction, **log it here** so it is not repeated. Newest on top. Keep each entry tight: what happened, the fix, the rule to apply next time. Both Claude and human owners maintain this.

**Format:**
```
### YYYY-MM-DD — <short title>
- **What:** what went wrong / what was confusing.
- **Fix:** what the correct approach is.
- **Rule:** the durable lesson to apply going forward.
```

<!-- Add new entries below this line. Do not delete past entries; supersede with a newer one if needed. -->

### 2026-07-07 — Phase 7 write path built (Freighter) + demo-mode bridge
- **What:** Built the KMP Freighter write path (deploy-ready; no live chain yet). New `apps/web/lib/{stellar,wallet,tx,invocations,hash}.ts` + `components/kmp/use-tx.ts` (real successor to `use-mock-tx.ts`) + `wallet-badge.tsx` in the shell. Wired the 6 KMP-signed fns at their call sites and cut `create-agreement-form.tsx` off mock-data onto the live API.
- **Fix / key decisions:**
  1. **Only 6 of 8 `useMockTx` call sites are contract writes.** create_agreement (create form), accept_supply (gudang inbound), record_delivery + mark_force_majeure (setor), settle (pembayaran), mark_residu_remitted (residu). The other two have NO KMP fn and stay on `useMockTx` as LOCAL actions: setor's "Tandai Setoran Selesai" (status/flag is auto-computed inside record_delivery via `classify()`, there is no finalize fn) and permintaan's "Kirim Permintaan Gabungan" (an off-chain notify-Agrinas signal; the next on-chain step `dispatch_supply` is Agrinas-signed, not KMP). Wiring either to a fabricated fn would be a silent bug.
  2. **`useTx.run` takes a BUILDER `(signer) => Invocation`, not a bare invocation.** Every fn's arg[0] is the coop/caller Address == the connected Freighter key, only known after `connectWallet()`. The builder closes over id/volume/etc. and receives the signer. In demo mode the builder is NOT called (it needs a real strkey).
  3. **Demo-mode bridge:** `isChainConfigured()` = is `NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID` set. Unset → `useTx` simulates sign+submit + fabricates a hash so the dashboard is fully walkable PRE-deploy; a `WalletBadge` shows an amber "Mode Demo" pill so a misconfigured env can't silently look live. Set → same hooks build/sign/submit for real. **Deploy handoff: copy `registryId` from `scripts/artifacts.testnet.json` into web `.env.local` as `NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID`** (the browser cannot read the artifacts file at runtime).
- **Fix / gotchas (the ScVal boundary is the real risk, not the plumbing):**
  - **A round-trip test (`apps/web/lib/invocations.test.ts`, `tsx --test`) caught the exact bug the advisor predicted:** `nativeToScVal(struct, { type: { field: ["u32", null] } })` MANGLES a struct's u32 fields (key → `NaN`, value → bigint, one field dropped). Fix: build the `Commodity` #[contracttype] as an explicit `xdr.ScVal.scvMap` with entries SORTED by symbol key (Soroban requires sorted map keys). `nativeToScVal` is still fine for scalar i128/u64/u32/symbol.
  - **`xdr.ScVal.scvBytes` .d.ts is narrowed to `Buffer`** but accepts a `Uint8Array` at runtime — cast `out as unknown as Buffer` (comment it) to avoid needing a global `Buffer` polyfill in the browser. Build `BytesN<32>` from hex → 32-byte Uint8Array.
  - **Force-majeure reason is free text but the contract wants a `Symbol`** (<=32 chars, `[A-Z0-9_]`). Sanitize at the call site (`toReasonSymbol`), narrative stays off-chain.
  - **Web `lint` script only lints `app/`** (many pre-existing `components/` files have a11y lint debt); lint your new `lib/`+`components/` files explicitly with `biome lint <paths>`. Freighter-api v4 exports `isConnected/requestAccess/getAddress/getNetwork/signTransaction` as `{value, error?}` — inspect the real d.ts, don't code getPublicKey from memory.
- **Verify:** `pnpm check-types` green (all 7 pkgs); `invocations.test.ts` 8/8 green — incl. a real-mode ENVELOPE test that runs `Contract.call(...ScVals)` → `TransactionBuilder` → `toXDR()` → re-parse, proving the Buffer-heavy encode path (Address/nativeToScVal/scvMap/XDR) that demo mode skips and that otherwise only fires post-deploy; `pnpm --filter @annona/web build` green (16 routes, write pages ~365 kB w/ stellar-sdk, no SSR break from freighter-api). Local stack brought up (docker Postgres + 3 migrations + seed → 12 agreements/10 farmers/56 events; API 200 with deposit-eligible rows) to make a write button clickable. **Browser click-through of the demo state machine NOT done** — the sandbox's snap chromium is too confined for CDP/dump-dom (no `/tmp` access, SingletonLock perm-denied). Covered instead by build SSR + the offline envelope test; the demo path itself is pure setState/setTimeout. Live Freighter signing unverifiable until the user deploys + wires the env var. **Watch on first live sign:** if it throws "Buffer is not defined," add a browser `Buffer` fallback in `next.config.ts` (webpack `resolve.fallback`).
- **Rule:** Map every write UI action to {exact contract fn | local/off-chain} BEFORE wiring — not every button is a tx. Pass the signer via a builder. Always round-trip-test ScVal builders (esp. structs + BytesN) offline; typecheck+lint will NOT catch a wrong ScVal type. Keep the demo-mode bridge + visible label so the FE renders pre-deploy and flips to live via one env var.

### 2026-07-07 — seed→API→curl slice verified live (local Postgres) + docker/psql gotchas
- **What:** Ran the previously-blocked end-to-end verification against a local docker-compose Postgres. Two environment gotchas cost time before the slice itself ran clean.
- **Fix / gotchas:**
  1. **`docker` CLI defaulted to the `desktop-linux` context** (socket `~/.docker/desktop/docker.sock`) which was down, even though the systemd daemon was UP at `/var/run/docker.sock`. `docker info` reported "daemon not running" and hid the real daemon. Fix: `docker context use default` (or `DOCKER_HOST=unix:///var/run/docker.sock`). Check `docker context ls` first when `docker info` fails but the service is started.
  2. **The host `psql` is a broken wrapper** ("You must install at least one postgresql-client-<version> package") — it exits 0 while doing nothing, so a migration loop silently applies nothing. Fix: run psql INSIDE the container: `docker exec -i -e PGPASSWORD=annona annona-postgres-1 psql -U annona -d annona -v ON_ERROR_STOP=1 < file.sql`. Use `-v ON_ERROR_STOP=1` and check `${PIPESTATUS[0]}`, not the pipeline exit.
  3. **compose Postgres does NOT auto-run migrations** and there is no `db:migrate` npm script — apply `apps/api/drizzle/0000 → 0001 → 0002` in order by hand (applying raw SQL bypasses drizzle's `__drizzle_migrations` journal, which is fine for a throwaway local DB; the app never reads the journal at runtime).
  4. **The seed's cwd is `scripts/`, not `apps/api/`**, so `import "dotenv/config"` there does NOT pick up `apps/api/.env`. Pass the URL inline: `DATABASE_URL=... pnpm --filter @annona/scripts seed`. The API `dev` server (cwd `apps/api`) does read `apps/api/.env`.
- **Result:** all 3 migrations applied (16 tables, `settlement.settled_vol_g`/`agreement_id` + `agreement.expected_harvest_date` present), seed replayed 12 agreements / 10 farmers / 5 settlements / 5 residu / 56 events, every route returned 200 with SUM-derived money, farmer joins, `createTxHash` from the event log, and the §5 split EXACT (farmer 13,855,000 / handling 845,000 / margin 200,000 / principal 2,000,000, debt netted 2,200,000). Detail route also carries saprotan `inputs` baskets + `deliveries`.
- **Rule:** When `docker info` fails on a machine where the service is running, suspect the context before the daemon. Never trust the host `psql` wrapper here — go through `docker exec`. The read-model is now proven end-to-end; the migrations are validated but still need pushing to the shared Supabase (only `0000` is live there) before teammates rely on them.

### 2026-07-07 — v3.0 contract rework landed + indexer/seed bridge built
- **What:** Continued the v2→v3.0 cutover. Contract (Phase 1) + `money.ts` (Phase 2) were already reworked and green (40 cargo tests). Built the read chain: the shared `applyEvent` reducer (Phase 4), the demo seed (Phase 3). Several non-obvious seams surfaced.
- **Fix / key decisions:**
  1. **The `agreement` read-model stores only chain-mirror status/flag; running money is DERIVED by SUM over `settlement` rows in the API** (not folded onto the agreement row). A duplicated settlement row would silently inflate every total, so the indexer's idempotency guard (eventLog on `(txHash,eventIndex)`) is load-bearing and MUST be atomic with the row writes (one transaction).
  2. **`Settled.settled_vol_g` is CUMULATIVE** (contract emits the running total) while its money fields are per-settle deltas. The reducer stores the per-settle volume delta = `cumulative - priorSUM`. Needed a schema addition: `settlement.settledVolG` + `settlement.agreementId` (`deliveryId` made nullable) — migration `0001`, mirrored into BOTH `apps/api/drizzle/` AND `supabase/migrations/`.
  3. **Status + flag are recomputed via `classifyDelivery` (new `@annona/core` helper) on every `DeliveryRecorded`**, never read off the `Flagged` event (which only fires for review-worthy bands) — otherwise the heal-upward case breaks.
  4. **Contract gap found + patched:** `resolve_dispute` emitted only `CoopReputationUpdated` (no agreement id), so the indexer couldn't move a resolved agreement's residu off `Disputed`. Added a `RemittanceResolved {id, coop, admin}` event (events.rs + lib.rs emit + test + `packages/core/events.ts`). Re-ran contract tests: still 40 green.
  5. **Anti-drift seam:** seed and indexer both fold the IDENTICAL `applyEvent`. The seed (`scripts/seed.ts`) imports `apps/web/lib/mock-data.ts` as its fixture and replays it as synthesized `@annona/core` events, so the pre-deploy demo DB and post-deploy indexed DB are identical by construction. Settlement money always from `computeSplitSettlement` (same helper the contract test pins to §5: farmer 13,855,000 / handling 845,000 / margin 200,000 / principal 2,000,000). Pure test in `apps/api/src/indexer/handlers.test.ts` (`pnpm --filter @annona/api test`).
- **Fix / gotchas:**
  - **pnpm was hard-failing every `pnpm --filter` script** with `ERR_PNPM_IGNORED_BUILDS` (biome/esbuild/sharp) via the pre-run deps-status-check, even with the binaries present. Fix: `verifyDepsBeforeRun: false` in `pnpm-workspace.yaml` (+ `pnpm rebuild` clears the pending state). A stray invalid `allowBuilds:` block in that file is re-added by a hook — harmless, ignore.
  - **`scripts/` is now a real workspace package** (`@annona/scripts`) so seed imports (`@annona/core`, `drizzle-orm`, `apps/api/src/*`) resolve under pnpm's isolated node_modules and it joins `pnpm check-types`. Run the seed via `pnpm --filter @annona/scripts seed`.
  - **`Commodity` in an `AgreementCreated` event is the full struct** (code/grade/moistureBps/hppVersion) — grade/moisture are the ESTIMATES shown until the first delivery overwrites grade with the ACTUAL.
- **Rule:** Read-model = chain-mirror status only + derive money by SUM; keep the eventLog idempotency guard atomic with writes; recompute status/flag from `classifyDelivery`, never the `Flagged` event; when editing the contract's emitted events, mirror them in `packages/core/events.ts` AND the reducer switch. Remaining: Phase 5 API routes (agreements list/detail + residu/settlements/overview aggregates — see the read-model-gaps note about `expectedHarvestDate`/`createTxHash`), Phase 7 FE cutover. Live seed→API→curl needs Docker up or a `DATABASE_URL` (blocked this session).
### 2026-07-06 — Oversight dashboard build: `role` prop + fragment keys
- **What:** Oversight dashboard agent named a custom component prop `role` (`<OversightShell role="agrinas">`); Biome flags every such JSX attribute as an invalid ARIA role. Also returned a keyless `<>...</>` fragment from a `.map()` (key was on the inner `<Tr>`), producing a React key warning only visible at runtime.
- **Fix:** Renamed prop to `viewRole` (destructure-aliased to `role` internally so bodies stay unchanged). Keyed the outer `<Fragment key=...>` instead of the inner row. Lint alone does not catch the fragment-key case; a dev-server render pass of every new page does.
- **Rule:** `role` joins `prefix`/`color` on the never-use-as-prop-name list (2026-06-30 entry). When a `.map()` returns multiple siblings, key the `<Fragment>`, not a child. Always boot the dev server and hit every new route once before calling frontend work verified; typecheck + lint miss runtime-only React warnings.

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
- ✅ Soroban `offtake-registry` contract **reworked to v3.0** (Agrinas party, dispatch/accept gates, three-way split, residu reconciliation + `RemittanceResolved`, CoopReputation). 40 unit tests green. `scripts/deploy.sh` ready; not yet deployed to testnet.
- ✅ Off-chain DB: Supabase linked (`ldjrsjyecihvynturgnr`), Drizzle schema live (16 tables). **Two UNAPPLIED migrations pending teammate coordination:** `0001` (`settlement.settledVolG`/`agreementId`) + `0002` (`agreement.expected_harvest_date`). Only `0000_init` is live on Supabase.
- ✅ Indexer built: shared `applyEvent` reducer + RPC poller + loop (`apps/api/src/indexer/`); pure §5 tests green. Demo seed (`scripts/seed.ts`, `@annona/scripts`) replays `mock-data.ts` through the same reducer.
- ✅ API routes (Phase 5): `agreements` (list/detail), `overview` (dashboard aggregates), `coop`, `settlements`, `residu`, `farmers`, `reference` — money DERIVED by SUM in `apps/api/src/lib/read-model.ts`. Thin spots left: Setor-Panen delivery history + saprotan-needs input baskets on supply requests.
- 🔄 FE cutover (Phase 7) IN PROGRESS (2026-07-07): built `apps/web/lib/api.ts` (typed read client, string-money→bigint parse, isomorphic) + `lib/use-api.ts` (client hook) + `hono/cors` on the API. Cut + browser-verified 7 pages: `perjanjian` list + `kmp` landing/Screen A (server `await`; landing aggregates live — debt 4.092M, residu 8.15M, rate 60%, cash 15.926M vs 48M), and (client `useApi`, headless-chromium verified) `residu`, `perjanjian/[id]` detail (reputation, §5 split, deliveries, residu), `petani` (10 farmers, repTier badges 5/2/3, running debt), `pembayaran` (payable picker = 1 correct agreement, §5 split helper), `pengaturan` (coop name/wallet). Closed the reputation gap: `/farmers` now left-joins `reputation_cache` → `reputation{...}` + derived `repTier`. Then cut the LAST 4: `permintaan` (extended `/overview` supplyRequestRows to carry saprotan input baskets; aggregation renders live), `gudang` (inbound zone from `/overview`; `MOCK_STOCK` warehouse stays marked-mock — no ERD table, page labels it "Catatan Lokal/off-chain"), `setor` + `DepositHistoryTable` (new `/deliveries` endpoint with settlement-aware `paid` flag), `shell.tsx` sidebar + `PaymentHistoryTable` (`/coop`, `/settlements`). ALL KMP read surfaces now live. Remaining un-backed-by-design: landing `MOCK_ACTIVITY` feed (no event-feed endpoint), gudang `MOCK_STOCK` (off-chain local inventory).
- ✅ Phase 7 WRITE path built (2026-07-07, deploy-ready): `apps/web/lib/{stellar,wallet,tx,invocations,hash}.ts` + `components/kmp/use-tx.ts` (real successor to `use-mock-tx.ts`) + `wallet-badge.tsx`. All 6 KMP-signed fns wired at their call sites (create_agreement in the now-live-API create form, accept_supply/record_delivery/mark_force_majeure/settle/mark_residu_remitted). Two non-contract actions stay local on `useMockTx` by design (setor finalize, permintaan submit). Demo-mode bridge: unset `NEXT_PUBLIC_OFFTAKE_REGISTRY_CONTRACT_ID` → hooks simulate + amber "Mode Demo" badge; set it (from `scripts/artifacts.testnet.json` `registryId`) → real Freighter sign/submit. ScVal builders round-trip-tested (`lib/invocations.test.ts`, 7/7). `check-types` + web `build` green. **Live signing unverified until the user deploys + wires the env var.** Oversight/Farmer dashboards + SDK still ⬜.
- ✅ Live seed→API→curl slice VERIFIED (2026-07-07) against a local docker-compose Postgres: all 3 migrations applied, seed replayed 12 agreements / 10 farmers / 5 settlements / 5 residu / 56 events, every route 200 with SUM-derived money, and the §5 split reproduced exactly (farmer 13,855,000 / handling 845,000 / margin 200,000 / principal 2,000,000, debt 2,200,000). All `supabase/migrations` are now pushed and live on the shared project (2026-07-11) — local and remote migration history match exactly (see SELF-LEARNING LOG entry).
