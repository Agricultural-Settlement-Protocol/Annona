# INTEGRATIONS — Annona Protocol

> Every external dependency: Stellar ecosystem protocols, wallets, oracles, AI, and government data. For each: **what it is, why we use it, when (MVP vs roadmap), and whether the SDK/API is free + how to access.** This answers "do we need to integrate other Stellar platforms, which, and is access free?"

---

## 1. Summary table — what we integrate & when

| Integration | Layer | MVP? | Access | Cost |
|---|---|---|---|---|
| **Freighter wallet** | User | ✅ MVP | `@stellar/freighter-api` (npm) | Free |
| **Stellar SDK (JS)** | Abstraction | ✅ MVP | `@stellar/stellar-sdk` (npm) | Free |
| **Soroban RPC + Horizon** | Execution | ✅ MVP | Public testnet endpoints | Free |
| **SAC / SEP-41 (dIDR)** | Execution | ✅ MVP | Built into Stellar protocol | Free (testnet) |
| **Reflector (oracle)** | Execution | 🔶 Interface in MVP, live post | On-chain contract + docs | Free to read |
| **Blend (lending)** | Execution | ⏭ Layer 4 | Open-source SDK + contracts | Free / open-source |
| **DeFindex (vaults)** | Abstraction | ⏭ Layer 4 | SDK + contracts | Free / open-source |
| **Gemini Flash (AI)** | Abstraction | ✅ MVP (cuttable) | `@google/genai` + API key | Paid (cheap) / free tier |
| **Gov data (Bapanas/BPS/KATAM)** | Off-chain | ✅ MVP (seed) | Public portals (mostly scrape/manual) | Free |

> **Composability verdict:** judges + SCF explicitly reward reusing ecosystem primitives over rebuilding. We reuse Freighter + SAC now; we design clean hooks for Reflector/Blend/DeFindex and integrate them in the roadmap layers where they actually add value. We never hand-roll a token, oracle, or lending pool.

---

## 2. Freighter (wallet) — MVP

- **What:** SDF's browser-extension wallet, Soroban-ready, supports `signAuthEntry` (smart-wallet / C-account flows).
- **Why:** coop + farmer demo accounts sign `create_agreement` / `record_delivery` / `settle`. Showing a real wallet signature = "real transactions" proof to judges.
- **Access:** `@stellar/freighter-api` (npm, free). `isConnected()`, `getAddress()`, `signTransaction()`, `signAuthEntry()`.
- **MVP use:** connect button in `apps/web`; pre-seeded testnet accounts for demo so judges aren't waiting on faucets.

## 3. Stellar SDK + RPC/Horizon — MVP

- **What:** `@stellar/stellar-sdk` (JS) builds/submits Soroban txns, reads contract state, parses events. Soroban RPC `getEvents` powers the indexer.
- **Why:** all chain I/O. Backend submits Path-A `settle()`; indexer polls events.
- **Access:** npm (free). Public testnet RPC + Horizon (free). Soroban CLI (`stellar`) for build/deploy/invoke.

## 4. SAC / SEP-41 — dIDR token — MVP

- **What:** **SAC** (Stellar Asset Contract) = the reference SEP-41 implementation. We issue **dIDR** (demo IDR) as a SAC-wrapped asset on testnet.
- **Why:** standard token → instantly composable with any Soroban protocol; 97% less CPU / 47% lower fees vs hand-rolled. The settlement asset `settle()` transfers.
- **Access:** native to Stellar protocol, free on testnet. `stellar contract asset deploy` to wrap an issued asset.

## 5. Reflector (oracle) — interface MVP, live post-hackathon

- **What:** Stellar's decentralized price oracle (CEX/DEX feeds + custom feeds), Soroban-native.
- **Why:** future automatic HPP / market-price feeds so settlement price isn't manually entered. Also feeds Layer 5 RWA pricing.
- **MVP:** we ship only the **`PriceProvider` trait** (see `SMART-CONTRACT.md` §4). MVP returns a stored HPP value. No live oracle call → no dependency risk in the demo.
- **Why interface-only now:** HPP is set by government decree (Inpres), not a live market — a real-time oracle adds little until we track market prices (Layer 3+). Reflector also can't give kabupaten/kecamatan granularity that doesn't exist (see `DATA-SOURCES.md`).
- **Access:** Reflector contracts are public + free to read on-chain; docs at reflector.network. Custom feeds (e.g., a Bapanas-sourced HPP feed) are the post-hackathon path.

## 6. Blend (lending) — Layer 4 (Liquidity)

- **What:** Stellar's open-source, audited lending protocol (the canonical composable primitive — integrated by Meru, Beans, DeFindex).
- **Why:** Layer 4 — let coops/farmers **borrow working capital against their offtake receivables / reputation** before bank loans clear. We bring the underlying-transaksi proof; Blend brings the lending pool.
- **MVP:** none. We design the receivable (Layer 3) so it's collateralizable, and note the Blend adapter as roadmap.
- **Access:** open-source contracts + SDK, free. Composable via contract-to-contract calls.

## 7. DeFindex (vaults) — Layer 4

- **What:** strategy-aggregation vaults (route deposits into yield strategies, e.g. over Blend). SEP-56 tokenized-vault aligned.
- **Why:** the *safe, capped* version of the original "idle-fund yield" idea. Idle coop float (between funding and payout) could earn conservative, transparent, capped yield — NOT the regulatorily-radioactive "DeFi-farm public money" version (see PRD parking lot).
- **MVP:** none — explicitly parked. Designed-for only.
- **Access:** SDK + contracts, open-source, free.

## 8. Gemini Flash (AI assistant) — MVP (first to cut)

- **What:** Google's fast/cheap LLM for the auditor Q&A over read-models.
- **Why:** lets non-technical petinggi query data in plain Bahasa ("KDMP mana yang paling banyak utang?").
- **Access:** `@google/genai` + API key. Free tier exists; paid is cheap at hackathon volume.
- **Grounding:** read-only, fed only indexer read-models; every number links to a source agreement/event (no hallucinated figures). Swappable for Claude Haiku via a provider interface.
- **Scope:** first thing to cut if time-constrained (it's web2, not Stellar).

## 9. Government / agricultural data — MVP (seed data)

Used to seed realistic demo data + power the transparent yield estimate. Detail + endpoints in `./DATA-SOURCES.md`.

| Source | Use | Access |
|---|---|---|
| **Bapanas Panel Harga** | HPP + reference prices | Public portal (kabupaten granularity) |
| **PIHPS (BI)** | market price reference | Public portal `bi.go.id/hargapangan` |
| **BPS** | yield/ha by province/kabupaten | Public stats tables (no clean API) |
| **KATAM (Kementan)** | kecamatan planting/yield estimate inputs | Public portal |

> None offer a clean free API; MVP uses cached/seeded values with sources cited in-UI. A real data pipeline is post-hackathon.

---

## 10. The protocol-out story (Annona AS an integration)

Annona is not just a consumer of integrations — it's meant to be one other devs build on. The **`@annona/sdk`** + REST exposes:

- `getAgreement(id)`, `getReceipts(id)`, `getReputation(farmer)` — read primitives
- event subscription helpers
- (post) `tokenizeReceivable(id)` for RWA partners

This is the composability pitch: a lending startup, an insurer, or a government dashboard reads Annona's farmer history/reputation **without rebuilding the registry**. SDK stub + docs in MVP; full publish post-hackathon. This is the SCF "reusable infrastructure" criterion, concretely.

---

## 11. Integration risk register

| Risk | Mitigation |
|---|---|
| Live oracle dependency breaks demo | Interface-only in MVP; stored HPP value. |
| Testnet faucet / RPC flakiness during demo | Pre-seed accounts + pre-fund dIDR; record a fallback demo video. |
| AI API key / quota fails on stage | Cache canned answers for the 3–4 demo queries; AI is cuttable. |
| Blend/DeFindex API drift before Layer 4 | Adapter pattern; integrate only when we reach Layer 4. |
| Gov data has no API | Seed cached values + cite sources; pipeline is post-hackathon. |
