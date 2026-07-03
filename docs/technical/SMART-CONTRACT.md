# SMART CONTRACT — Annona Protocol

> Full Soroban contract spec: the `offtake-registry` core + `didr-token`. Lifecycle, types, function signatures, events, settlement math, auth, and the oracle interface. Product-level description lives in `../PRD.md`; system context in `./ARCHITECTURE.md`.

---

## 1. Contracts overview

| Contract | Role | Standard |
|---|---|---|
| **offtake-registry** | Protocol core. Agreements, deliveries, receipts, settlement, netting, reputation. | custom Soroban |
| **didr-token** | Demo IDR settlement asset. | **SAC** wrapping a SEP-41 asset on testnet |

Generic, commodity-agnostic, lifecycle-driven, composable. Amounts are `i128` in token smallest-unit; volumes in **grams** to avoid floats.

---

## 2. Lifecycle (state machine)

```
                    create_agreement()
                          │
                          ▼
                     ┌─────────┐
                     │ Created │  inputs issued, debt recorded
                     └────┬────┘
              record_delivery() (partial)
                          │
                          ▼
              ┌────────────────────┐   record_delivery() (rest)
              │ PartiallyDelivered │──────────────┐
              └─────────┬──────────┘              │
                        │                          ▼
                        │                    ┌───────────┐
                        │   under tolerance  │ Delivered │
                        ├───────────────────►└─────┬─────┘
                        ▼                          │ settle()
                  ┌──────────┐                     ▼
                  │ Flagged  │              ┌────────────┐
                  │ +reason  │── settle ───►│  Settled   │ debt cleared, net paid
                  └──────────┘              └────────────┘
                        ▲
        mark_force_majeure()  ──►  ┌──────────────┐
                                   │ ForceMajeure │ closes, no rep penalty
                                   └──────────────┘
```

---

## 3. Types

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, BytesN, Vec};

// ── Lifecycle ──
#[derive(Clone, PartialEq)]
#[contracttype]
pub enum Status {
    Created,            // agreement signed, inputs issued, debt recorded
    PartiallyDelivered, // some harvest in, more expected
    Delivered,          // full expected volume received
    Settled,            // payment netted + released, debt cleared
    Flagged,            // under-delivery; needs human review (sub-reason below)
    ForceMajeure,       // crop failure / disaster; closes w/o reputation penalty
}

#[derive(Clone, PartialEq)]
#[contracttype]
pub enum FlagReason { None, Warning, PartialDelivery, Suspected }

// ── Commodity metadata (future-proof: grade/moisture/HPP version) ──
#[derive(Clone)]
#[contracttype]
pub struct Commodity {
    pub code: Symbol,        // symbol_short!("GABAH") / "JAGUNG" / "KOPI"...
    pub grade: Symbol,       // "A" / "B" / "C" per coop/Bulog SOP
    pub moisture_bps: u32,   // e.g. 1400 = 14.00%
    pub hpp_version: u32,    // which HPP decree (Inpres no.) was used
}

#[derive(Clone)]
#[contracttype]
pub struct Agreement {
    pub id: u64,
    pub farmer: Address,
    pub coop: Address,
    pub commodity: Commodity,
    pub input_debt: i128,        // stablecoin smallest unit
    pub expected_vol_g: i128,    // transparent estimate (area × yield/ha)
    pub delivered_vol_g: i128,   // accumulates across partial deliveries
    pub settled_vol_g: i128,     // volume already paid out (partial settlement)
    pub hpp_per_kg: i128,        // settlement anchor, smallest unit / kg
    pub tolerance_bps: u32,      // e.g. 2000 = 20%
    pub ktp_hash: BytesN<32>,    // off-chain PII reference only
    pub status: Status,
    pub flag: FlagReason,
    pub remaining_debt: i128,    // netted down as settlement proceeds
    pub paid_to_farmer: i128,    // running net released
}

#[derive(Clone)]
#[contracttype]
pub struct HarvestReceipt {
    pub agreement_id: u64,
    pub seq: u32,                // receipt sequence within an agreement
    pub farmer: Address,
    pub volume_g: i128,
    pub grade: Symbol,
    pub timestamp: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct Reputation {
    pub farmer: Address,
    pub total_settled_g: i128,
    pub deliveries: u32,
    pub on_time_settlements: u32,
    pub flags: u32,
    pub force_majeure_events: u32, // tracked but NOT penalized
}
```

### Storage keys (persistent, with TTL extension)
```rust
#[contracttype]
pub enum DataKey {
    Admin,
    Token,                 // didr-token address
    NextId,                // u64 agreement counter
    Agreement(u64),        // Agreement by id
    Receipts(u64),         // Vec<HarvestReceipt> by agreement id
    Reputation(Address),   // Reputation by farmer
}
```

---

## 4. Function signatures

```rust
#[contract]
pub struct OfftakeRegistry;

#[contractimpl]
impl OfftakeRegistry {
    /// one-time: set admin + settlement token (didr-token) address.
    /// Implemented as `__constructor` (runs atomically at deploy, Protocol 22+),
    /// which cannot re-run — so no reinitialization guard is needed.
    pub fn __constructor(env: Env, admin: Address, token: Address);

    /// coop creates the yarnen agreement; requires coop auth.
    /// stores expected volume, HPP anchor, tolerance; status = Created.
    pub fn create_agreement(
        env: Env, coop: Address, farmer: Address, commodity: Commodity,
        input_debt: i128, expected_vol_g: i128, hpp_per_kg: i128,
        tolerance_bps: u32, ktp_hash: BytesN<32>,
    ) -> u64;

    /// coop records a (possibly partial) harvest handover.
    /// mints a HarvestReceipt, accumulates delivered_vol_g,
    /// sets status (Delivered / PartiallyDelivered) + flag (per §6).
    pub fn record_delivery(env: Env, coop: Address, id: u64, volume_g: i128, grade: Symbol);

    /// settle the delivered-but-unsettled volume:
    ///   gross = (delivered_vol_g - settled_vol_g) * hpp_per_kg / 1000
    ///     (multiply BEFORE /1000 to preserve sub-kg precision)
    ///   debt netted FIRST: net = max(0, gross - remaining_debt)
    /// transfers net (dIDR) from the pre-funded contract to farmer via the
    /// token address set at deploy (NEVER caller-supplied), updates
    /// settled_vol_g + reputation, emits Settled. Callable repeatedly → staged
    /// settlement. Auth: caller must be the agreement's coop OR the admin (the
    /// Path A service key); require_auth() alone is not enough. The agreement
    /// closes to `Settled` only once the full expected harvest is in (status ==
    /// Delivered, the >= 80% band) and fully paid; below that band settle pays
    /// out but leaves the agreement open for further deliveries.
    pub fn settle(env: Env, caller: Address, id: u64);

    /// coop records crop failure / disaster; status = ForceMajeure.
    /// closes agreement; reputation.force_majeure_events++ but NO flag penalty.
    pub fn mark_force_majeure(env: Env, coop: Address, id: u64, reason: Symbol);

    // ── read-only (composable: any app / @annona/sdk can call) ──
    pub fn get_agreement(env: Env, id: u64) -> Agreement;
    pub fn get_receipts(env: Env, id: u64) -> Vec<HarvestReceipt>;
    pub fn get_reputation(env: Env, farmer: Address) -> Reputation;
    pub fn get_admin(env: Env) -> Address;
}

// ── Oracle interface (NOT implemented in MVP — trait only) ──
// Swap a stored HPP for Reflector / a Bapanas oracle later w/o touching settle().
pub trait PriceProvider {
    fn hpp_for(env: Env, commodity: Symbol) -> i128;
}
```

---

## 5. Settlement math (worked example)

- Inputs on credit: Rp2,000,000 → `input_debt` = `remaining_debt`
- Plot 0.5 ha, gabah, est. yield 5.5 t/ha → `expected_vol_g = 2,750,000`
- Delivered (full): 2,600 kg → `delivered_vol_g = 2,600,000`
- HPP gabah Rp6,500/kg → `gross = 2,600 × 6,500 = Rp16,900,000`
- `net = 16,900,000 − 2,000,000 = Rp14,900,000` → released to farmer in dIDR
- `remaining_debt → 0`, `settled_vol_g = 2,600,000`, `paid_to_farmer = 14,900,000`

**Partial settlement example:**
- Delivery 1: 1,000 kg → gross 6,500,000 → net = 6,500,000 − 2,000,000 = **4,500,000** paid; remaining_debt → 0
- Delivery 2: 1,600 kg → gross 10,400,000 → net = 10,400,000 − 0 = **10,400,000** paid
- Total paid 14,900,000 — identical to single settlement. Debt cleared first protects the coop.

> Decimal handling: `hpp_per_kg` and amounts are in dIDR smallest unit; volume in grams (`/1000` for kg). The contract itself is **decimal-agnostic** — it moves raw `i128` units and never interprets decimals. **Reality check:** dIDR is a SAC wrapping a *classic* Stellar asset, which is fixed at **7 decimals** — you cannot mint a classic-asset SAC at 2 decimals. The earlier "recommend 2" only applies to a hand-rolled SEP-41 token, which we deliberately avoid. So the deployed unit scale is 7 (Rp1 = 10,000,000 units); `packages/core` money helpers own that scale. The tests use whole-rupiah numbers for readability and are unaffected.

---

## 6. Graded-flag logic (contract indicates, human decides)

Computed in `record_delivery` against cumulative `delivered_vol_g` vs `expected_vol_g`:

| Delivered / expected | Status | Flag |
|---|---|---|
| ≥ 98% | `Delivered` | `None` |
| 80% – 98% | `Delivered` | `Warning` |
| 40% – 80% | `PartiallyDelivered` or `Flagged` | `PartialDelivery` |
| < 40%, no force-majeure | `Flagged` | `Suspected` (possible side-selling — **review only, never an on-chain accusation**) |
| crop failure recorded | `ForceMajeure` | `None`, no reputation penalty |

Thresholds are contract constants, computed with integer basis points (`ratio_bps = delivered * 10000 / expected`; floors 9800 / 8000 / 4000) to avoid floats, kept in lockstep with `packages/core/src/status.ts` FLAG_THRESHOLDS. `tolerance_bps` is stored on the agreement but reserved (the warning floor stays a fixed 8000 constant to guarantee that lockstep). `Suspected` is an indicator; the human officer/auditor resolves it in the dashboard.

**Implementation notes (as built):**
- The 40%–80% band maps to `PartiallyDelivered` (not `Flagged`); `Flagged` is reserved for the `< 40%` `Suspected` case.
- Flags are recomputed from CUMULATIVE delivered on every delivery, so they **heal upward** (e.g. 50% then +45% total = 95% → `Delivered`/`Warning`).
- The `Flagged` event + the `reputation.flags` counter both fire only for the review-worthy bands (`PartialDelivery` / `Suspected`), never for a mild `Warning` — so a healed agreement stops emitting flag badges and the event stream never disagrees with the counter.
- Terminal `Settled` is reached only when status == `Delivered` (≥ 80%) at settle time. A permanently under-delivered (`Flagged`) agreement is settled for what was delivered but stays open; its only other close path is `mark_force_majeure`. (This preserves the staged-settlement worked example over the simplified state diagram's `Flagged → Settled` edge.)
- Write fns bind the signer to the agreement: `record_delivery` / `mark_force_majeure` require `caller == agreement.coop` (→ `Unauthorized` otherwise); `settle` allows `coop` OR `admin`.
- Edge: a `Delivered`-band agreement whose gross still cannot cover the debt (`net == 0`) closes as `Settled` with `remaining_debt > 0`, which slightly contradicts "Settled = debt cleared." Economically it should not occur (harvest value exceeds input credit by design) and is untested; left as-is for MVP.

---

## 7. Events (the composability surface)

Explicit, indexed. The indexer (`apps/api/indexer`) builds every dashboard read-model from these; any third party can subscribe.

| Event | Topics | Data |
|---|---|---|
| `AgreementCreated` | `["agreement_created", id, farmer, coop]` | `{commodity, input_debt, expected_vol_g, hpp_per_kg, tolerance_bps}` |
| `DeliveryRecorded` | `["delivery", id]` | `{seq, volume_g, grade, delivered_total_g}` |
| `HarvestReceiptMinted` | `["receipt", id, farmer]` | `{seq, volume_g, grade, timestamp}` |
| `Settled` | `["settled", id, farmer]` | `{gross, debt_netted, net_paid, settled_vol_g}` |
| `Flagged` | `["flagged", id]` | `{reason}` |
| `ForceMajeure` | `["force_majeure", id]` | `{reason}` |
| `ReputationUpdated` | `["reputation", farmer]` | `{deliveries, on_time, total_settled_g, flags}` |

> Event emission is mandatory for explorer + downstream integration correctness (Soroban best practice).

---

## 8. Custody & escrow

- **MVP (escrow-lite):** coop pre-funds the registry contract (or approves a transfer). `settle()` performs the net transfer to the farmer and nets debt. Keeps the demo clean.
- **Escrow-designed:** funds locked at season start so farmer trusts the money exists before delivering. Implemented minimally; full multisig escrow (coop + auditor co-sign release) = roadmap (Layer 4).

---

## 9. Auth & roles

| Function | Auth |
|---|---|
| `init` | one-time, admin only |
| `create_agreement` | `coop.require_auth()` |
| `record_delivery` | `coop.require_auth()` |
| `mark_force_majeure` | `coop.require_auth()` |
| `settle` | `caller.require_auth()` — coop (demo) or backend service key (Path A); **multisig coop+auditor in prod** |
| read fns | none (public, composable) |

Soroban host handles signature verification + replay protection. Freighter signs via `signAuthEntry` for smart-wallet (C-account) flows.

---

## 10. didr-token

- Demo IDR settlement asset on **testnet**.
- Implement as a **SAC** (Stellar Asset Contract) wrapping an issued asset → ~97% less CPU / ~98% less RAM / ~47% lower fees than a hand-rolled token, and SEP-41-compatible out of the box (composability points).
- Admin (coop treasury demo account) mints dIDR to pre-fund settlement; `settle()` calls `token.transfer(contract → farmer)`.
- **No Rust crate.** Because it is a classic-asset SAC, there is nothing to hand-roll — it is issued + wrapped + minted entirely via the Stellar CLI in `scripts/deploy.sh`. There is no `contracts/didr-token/` crate.
- Decimals: **7** (fixed by the underlying classic asset; see the decimals note in section 5).

---

## 11. Testing & deploy

- **Unit tests** (`soroban_sdk::testutils`): ✅ 25 tests green in `contracts/offtake-registry/src/test.rs` — constructor, both settlement worked examples (single + staged), every flag band, flag healing, force-majeure, debt-exceeds-gross floor-at-0, `NothingToSettle`, auth binding (wrong coop / stranger / admin-allowed), TTL extension, and the i128 overflow guard. Run with `cd contracts && cargo test`.
- **Integration:** deploy to testnet via `scripts/deploy.sh`; `scripts/seed.ts` (annona-seed skill) creates 10 farmers + agreements; run full loop; assert events indexed.
- **Deploy:** `scripts/fund-testnet.sh` (identities) → `scripts/deploy.sh` = `stellar contract build` → deploy dIDR SAC → `stellar contract deploy` registry with `__constructor(admin, didr_sac)` → pre-fund → writes `scripts/artifacts.testnet.json` (contract ids + WASM hash). WASM is ~40 KB (limit 64 KB).
- **TTL:** extend instance + accessed persistent entry TTLs at the top of every public fn (constants in `storage.rs`).

---

## 12. Roadmap hooks (designed-for, not built in MVP)

| Layer | Contract change |
|---|---|
| L2 Reputation | already emitting; add scoring view fn |
| L3 Receivable | add `tokenize_receivable(id)` → mints a transferable claim on the agreement's future net |
| L4 Liquidity | escrow multisig; adapters to **Blend** (borrow against receivables) / **DeFindex** (idle-float vault, capped) |
| L5 RWA | swap PriceProvider → real oracle; compliance wrapper (ERC-3643-style) for licensed issuance |

See `./INTEGRATIONS.md` for external protocol details.
