# SMART CONTRACT — Annona Protocol

> Full Soroban contract spec: the `offtake-registry` core + `didr-token`. Multi-party lifecycle, types, function signatures, events, three-way split settlement math, residu reconciliation, auth, and the oracle interface. Product-level description lives in `../PRD.md`; system context in `./ARCHITECTURE.md`.
>
> **v3.0 — multi-party model (PMK 15/2026).** The protocol now binds **three commercial parties** — **Agrinas** (operator: catalog + dispatch + residu), **KMP** (koperasi: pre-funded cash agent), **Farmer** — plus a read-only **Government** regulator. See §1a for the party model and why each write earns its place on-chain.

---

## 1. Contracts overview

| Contract | Role | Standard |
|---|---|---|
| **offtake-registry** | Protocol core. Agreements, double-confirmation lifecycle, deliveries, receipts, three-way split settlement, netting, residu reconciliation, farmer + coop reputation. | custom Soroban |
| **didr-token** | Demo IDR settlement asset. | **SAC** wrapping a SEP-41 asset on testnet |

Generic, commodity-agnostic, lifecycle-driven, composable. Amounts are `i128` in token smallest-unit; volumes in **grams** to avoid floats; percentages in **bps** (`10000 = 100%`).

### 1a. Party model (why three writers)

| Party | On-chain role | Signs |
|---|---|---|
| **Agrinas** (operator) | Sets `base_price_agrinas` (principal), dispatches supply, verifies residu remittance | `dispatch_supply`, `confirm_remittance`, `flag_remittance_dispute` |
| **KMP** (koperasi) | Pre-funds cash, drafts agreement, accepts physical supply, records delivery, settles, remits residu | `create_agreement`, `accept_supply`, `record_delivery`, `settle` |
| **Farmer** | Receives net payout; accrues reputation | (no writes in MVP; receives dIDR) |
| **Government** | Read-only oversight (macro + force-majeure intervention) | none |

**Why the chain earns its place here:** the residu (Agrinas's principal sitting inside KMP's cash) is precisely the multi-party, no-trust accounting the state's moral-hazard concern targets. On-chain split-allocation + dual-confirmation makes it impossible for one party to silently rewrite who is owed what. Everything else stays Postgres.

### 1b. On-chain vs off-chain data (and why)

**On-chain (this contract, §3):** `Agreement` (all fields — parties, the four price variables, volumes, `hpp_per_kg`, status, flag, the three-way split accruals, `residu_status`), `HarvestReceipt` (one per delivery, immutable), `Reputation` (farmer), `CoopReputation` (KMP). Nothing here is a lookup table — every field is either money/volume that moves as part of settlement, a status a human needs to trust wasn't rewritten, or a counter that has to be tamper-proof to mean anything as reputation.

**Off-chain (Postgres/Supabase, `apps/api/src/db/schema.ts`), and why each stays off-chain:**

| Table | What | Why NOT on-chain |
|---|---|---|
| `commodity` | GABAH/JAGUNG code, unit, current HPP decree version | Static label lookup. No settlement math reads it directly; it's descriptive, not a trust boundary. |
| `saprotan_catalog` | Agrinas's editable price list, `base_price_agrinas` per region | The *table* is mutable reference data Agrinas updates anytime. What must be tamper-proof is the price a specific agreement locked in, and that **is** on-chain: `base_price_agrinas` is snapshotted into `Agreement` at `create_agreement` and frozen from then on. The catalog itself is just where that snapshot came from. |
| `price_ref` | HPP + market reference prices, multiple sources, dated | Same pattern as the catalog: `hpp_per_kg` snapshots into `Agreement` (that's the actual settlement anchor, tamper-proof). The reference table is a browsable/comparison feed, no trust property attaches to it. |
| `yield_table` | BPS/KATAM avg yield t/ha, feeds `expected_vol_g` | `expected_vol_g` is explicitly a transparent **estimate**, never a settlement input (CLAUDE.md golden rule 4: "never AI prediction," never gates money). No reason to pay Soroban storage rent for a number that never triggers a transfer. |
| `event_log` | Local copy of every emitted contract event | This *is* on-chain already, as the actual events (§7) — this table is the indexer's queryable mirror for dashboard joins/aggregates, not a second source of truth. Rebuildable by replaying events from genesis. |
| `indexer_cursor` | Last processed ledger number | Pure indexer bookkeeping ("where did I leave off"). Has no meaning as a contract concept at all. |

**The general rule (CLAUDE.md golden rule 2):** chain only earns its place for (a) tamper-evident settlement record, (b) programmatic auto-netting/split, (c) composable reputation/receipts. None of the six tables above are money movement or multi-party trust — they're reference data or rebuildable caches. Putting them on-chain would be paying gas for "blockchain because blockchain," the anti-pattern this protocol explicitly avoids.

**One exception worth calling out — `ktp_hash` lives in BOTH places on purpose, not by omission.** The raw KTP (`farmer.ktp_raw`) is PII and never leaves Postgres. But the *hash* of it is stored twice: once off-chain (`farmer.ktp_hash`, for reference) and once on-chain (`Agreement.ktp_hash: BytesN<32>`, anchored at `create_agreement`). This isn't "off-chain data on-chain" — a hash carries no PII, and the whole point is that anyone can re-hash the off-chain raw KTP and compare it to the on-chain value to prove the off-chain record wasn't swapped out from under the chain. That's the ERD's integrity rule, and it's the one place where the same fact deliberately exists on both sides of the boundary.

---

## 2. Lifecycle (state machine — double-layer confirmation)

```
                    create_agreement()            [KMP drafts = collective Surat Pesanan]
                          │                         debt locked (DRAFT, not yet active liability)
                          ▼
                     ┌─────────┐
                     │ Created │
                     └────┬────┘
              dispatch_supply()  [Agrinas validates order + releases logistics; price frozen]
                          │
                          ▼
                 ┌──────────────────┐
                 │ SupplyDispatched │  goods in transit; no unilateral price change
                 └────────┬─────────┘
              accept_supply()  [KMP inspects qty on arrival + confirms receipt]
                          │
                          ▼
                     ┌────────┐
                     │ Active │  input_debt now an ACTIVE liability on farmer reputation
                     └───┬────┘
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
                        ▼                          │ settle()  → three-way split
                  ┌──────────┐                     ▼
                  │ Flagged  │                ┌────────────┐
                  │ +reason  │── settle ─────►│  Settled   │ debt cleared, net paid,
                  └──────────┘                └─────┬──────┘ residu accrued to Agrinas
                        ▲                           │
        mark_force_majeure()                        │ (post-settle, off-chain rupiah remittance)
                        │                           ▼
              ┌──────────────┐        confirm_remittance() / flag_remittance_dispute()
              │ ForceMajeure │        [Agrinas verifies real bank mutation of residu principal]
              └──────────────┘          ResiduStatus: Pending → Remitted → Cleared | Disputed
```

**Two confirmation gates** protect against field manipulation: (1) Agrinas must `dispatch_supply` before goods are "on the way"; (2) KMP must `accept_supply` before debt becomes a live liability. Neither party can advance the other's gate.

---

## 3. Types

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, BytesN, Vec};

// ── Lifecycle ──
#[derive(Clone, PartialEq)]
#[contracttype]
pub enum Status {
    Created,            // KMP drafts agreement (collective Surat Pesanan); debt DRAFT, not active
    SupplyDispatched,   // Agrinas validated + released logistics; price frozen, goods in transit
    Active,             // KMP confirmed physical receipt; input_debt now ACTIVE liability (aka Disbursed)
    PartiallyDelivered, // some harvest in, more expected
    Delivered,          // full expected volume received
    Settled,            // three-way split executed, debt cleared, net paid
    Flagged,            // under-delivery; needs human review (sub-reason below)
    ForceMajeure,       // crop failure / disaster; closes w/o reputation penalty
}

#[derive(Clone, PartialEq)]
#[contracttype]
pub enum FlagReason { None, Warning, PartialDelivery, Suspected }

// ── Residu reconciliation (Agrinas principal held in KMP cash) ──
#[derive(Clone, PartialEq)]
#[contracttype]
pub enum ResiduStatus {
    Pending,   // principal withheld in KMP cash, not yet remitted to Agrinas
    Remitted,  // KMP claims bank transfer done + proof uploaded off-chain; awaiting Agrinas
    Cleared,   // Agrinas verified real bank mutation → dispute-free
    Disputed,  // Agrinas found mismatch → coop reputation frozen until resolved
}

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
    pub coop: Address,             // KMP — pre-funded cash agent
    pub agrinas: Address,          // operator — dispatch + residu authority
    pub commodity: Commodity,

    // ── price components (the four locked variables) ──
    pub base_price_agrinas: i128,  // Agrinas catalog cost = PRINCIPAL (read-only to KMP)
    pub saprotan_markup_bps: u32,  // KMP margin per contract, e.g. 1000 = 10%
    pub input_debt: i128,          // DERIVED = base_price_agrinas * (10000 + markup_bps) / 10000
    pub hpp_handling_fee_bps: u32, // KMP handling cut on gross HPP at settle, e.g. 500 = 5%

    // ── volumes + anchor ──
    pub expected_vol_g: i128,      // transparent estimate (area × yield/ha)
    pub delivered_vol_g: i128,     // accumulates across partial deliveries
    pub settled_vol_g: i128,       // volume already paid out (partial settlement)
    pub hpp_per_kg: i128,          // settlement anchor, smallest unit / kg
    pub tolerance_bps: u32,        // e.g. 2000 = 20%
    pub ktp_hash: BytesN<32>,      // off-chain PII reference only

    // ── state ──
    pub status: Status,
    pub flag: FlagReason,

    // ── running money (three-way split accounting) ──
    pub remaining_debt: i128,          // netted down as settlement proceeds
    pub paid_to_farmer: i128,          // running net released to farmer
    pub coop_handling_accrued: i128,   // KMP handling cut realized (KMP keeps)
    pub coop_margin_accrued: i128,     // KMP markup margin realized (KMP keeps)
    pub residu_principal: i128,        // Agrinas principal withheld in KMP cash (owed back)
    pub residu_status: ResiduStatus,
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
pub struct Reputation {          // per-farmer (unchanged)
    pub farmer: Address,
    pub total_settled_g: i128,
    pub deliveries: u32,
    pub on_time_settlements: u32,
    pub flags: u32,
    pub force_majeure_events: u32, // tracked but NOT penalized
}

#[derive(Clone)]
#[contracttype]
pub struct CoopReputation {      // per-KMP — the anti-moral-hazard signal Agrinas + Government read
    pub coop: Address,
    pub agreements: u32,
    pub settlements: u32,
    pub total_residu_principal: i128, // total principal that passed through KMP cash
    pub total_residu_cleared: i128,   // principal Agrinas confirmed remitted
    pub disputes: u32,
    pub frozen: bool,                 // true after a dispute until admin/Agrinas resolves
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
    Reputation(Address),   // farmer Reputation
    CoopReputation(Address), // KMP CoopReputation
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

    /// KMP drafts the yarnen agreement = the collective Surat Pesanan Agrinas will pull.
    /// input_debt is DERIVED: base_price_agrinas * (10000 + saprotan_markup_bps) / 10000.
    /// status = Created; debt is a DRAFT figure (not yet an active liability). requires coop auth.
    pub fn create_agreement(
        env: Env, coop: Address, farmer: Address, agrinas: Address, commodity: Commodity,
        base_price_agrinas: i128, saprotan_markup_bps: u32, hpp_handling_fee_bps: u32,
        expected_vol_g: i128, hpp_per_kg: i128, tolerance_bps: u32, ktp_hash: BytesN<32>,
    ) -> u64;

    /// GATE 1 — Agrinas validates the collective order + releases logistics.
    /// Created -> SupplyDispatched. Freezes price (blocks unilateral change). requires agrinas auth.
    pub fn dispatch_supply(env: Env, agrinas: Address, id: u64);

    /// GATE 2 — KMP inspects physical quantity on arrival + confirms receipt.
    /// SupplyDispatched -> Active. input_debt becomes an ACTIVE liability on farmer reputation.
    /// requires coop auth.
    pub fn accept_supply(env: Env, coop: Address, id: u64);

    /// KMP records a (possibly partial) harvest handover. Requires status Active/PartiallyDelivered/Flagged.
    /// mints a HarvestReceipt, accumulates delivered_vol_g, sets status + flag (per §6). requires coop auth.
    pub fn record_delivery(env: Env, coop: Address, id: u64, volume_g: i128, grade: Symbol);

    /// settle the delivered-but-unsettled volume with the THREE-WAY split (§5):
    ///   gross         = (delivered_vol_g - settled_vol_g) * hpp_per_kg / 1000
    ///     (multiply BEFORE /1000 to preserve sub-kg precision)
    ///   handling_cut  = gross * hpp_handling_fee_bps / 10000          (KMP keeps)
    ///   debt_paid     = min(remaining_debt, gross - handling_cut)     (netted FIRST)
    ///   net_to_farmer = (gross - handling_cut) - debt_paid            (dIDR to farmer)
    ///   of debt_paid, split principal vs margin pro-rata:
    ///     principal_portion = debt_paid * base_price_agrinas / input_debt  -> residu_principal (Agrinas)
    ///     margin_portion    = debt_paid - principal_portion                -> coop_margin (KMP)
    /// transfers net_to_farmer (dIDR) from the pre-funded contract to farmer via
    /// the token address set at deploy (NEVER caller-supplied); updates
    /// settled_vol_g, farmer + coop reputation; emits Settled. Callable
    /// repeatedly (staged settlement). Auth: caller must be the agreement's
    /// coop OR the admin (Path A service key); require_auth() alone is not
    /// enough, the CALLER must also be bound to THIS agreement. The agreement
    /// closes to `Settled` only once the full expected harvest is in (status ==
    /// Delivered, the >= 80% band) and fully paid; below that band settle pays
    /// out but leaves the agreement open for further deliveries.
    pub fn settle(env: Env, caller: Address, id: u64);

    /// KMP records crop failure / disaster; status = ForceMajeure.
    /// closes agreement; reputation.force_majeure_events++ but NO flag penalty. requires coop auth.
    pub fn mark_force_majeure(env: Env, coop: Address, id: u64, reason: Symbol);

    /// KMP asserts it has remitted the residu principal to Agrinas (bank proof uploaded off-chain).
    /// ResiduStatus Pending -> Remitted. requires coop auth.
    pub fn mark_residu_remitted(env: Env, coop: Address, id: u64, ref_hash: BytesN<32>);

    /// Agrinas verifies the real bank mutation → ResiduStatus Cleared; coop_rep.total_residu_cleared += .
    /// requires agrinas auth. (Path-A style: off-chain rupiah verified, then anchored.)
    pub fn confirm_remittance(env: Env, agrinas: Address, id: u64);

    /// Agrinas found a mismatch / manipulation → ResiduStatus Disputed; coop_rep.disputes++, frozen = true.
    /// requires agrinas auth. Freezing is an INDICATOR for human resolution, never an auto-accusation.
    pub fn flag_remittance_dispute(env: Env, agrinas: Address, id: u64, reason: Symbol);

    /// admin (or Agrinas) clears a resolved dispute → unfreezes coop. requires admin auth.
    pub fn resolve_dispute(env: Env, admin: Address, coop: Address, id: u64);

    // ── read-only (composable: any app / @annona/sdk can call) ──
    pub fn get_agreement(env: Env, id: u64) -> Agreement;
    pub fn get_receipts(env: Env, id: u64) -> Vec<HarvestReceipt>;
    pub fn get_reputation(env: Env, farmer: Address) -> Reputation;
    pub fn get_coop_reputation(env: Env, coop: Address) -> CoopReputation;
    pub fn get_admin(env: Env) -> Address;
}

// ── Oracle interface (NOT implemented in MVP — trait only) ──
// Swap a stored HPP for Reflector / a Bapanas oracle later w/o touching settle().
pub trait PriceProvider {
    fn hpp_for(env: Env, commodity: Symbol) -> i128;
}
```

---

## 5. Settlement math — the three-way split (worked example)

**Locked price variables (from Agrinas catalog + KMP inputs):**
- `base_price_agrinas` (principal) = Rp2,000,000
- `saprotan_markup_bps` = 1000 (10%) → `input_debt = 2,000,000 × 1.10 =` **Rp2,200,000**
- `hpp_handling_fee_bps` = 500 (5%)

**Harvest + settle:**
- Plot 0.5 ha, gabah, est. yield 5.5 t/ha → `expected_vol_g = 2,750,000`
- Delivered (full): 2,600 kg → `delivered_vol_g = 2,600,000`
- HPP gabah Rp6,500/kg → `gross = 2,600 × 6,500 =` **Rp16,900,000**
- `handling_cut = 16,900,000 × 5% =` **Rp845,000** (KMP keeps)
- `net_before_debt = 16,900,000 − 845,000 =` Rp16,055,000
- `debt_paid = min(2,200,000, 16,055,000) =` Rp2,200,000 (netted first)
- **`net_to_farmer = 16,055,000 − 2,200,000 =`** **Rp13,855,000** → released to farmer in dIDR

**Split of the Rp2,200,000 debt collected (the "Uang Residu"):**
- `principal_portion = 2,200,000 × (2,000,000 / 2,200,000) =` **Rp2,000,000** → `residu_principal` owed back to Agrinas
- `margin_portion = 2,200,000 − 2,000,000 =` **Rp200,000** → `coop_margin_accrued` (KMP keeps)

**Cash reality (on-site cashflow, PMK 15/2026):** KMP pays `net_to_farmer` (Rp13,855,000) from its **pre-funded** cash. It **retains Rp2,200,000** of gross as residu, of which **Rp2,000,000 is Agrinas's principal** (must be remitted) and **Rp200,000 + Rp845,000 = Rp1,045,000 is KMP's own** (margin + handling). Post-settle, KMP transfers the Rp2,000,000 principal to Agrinas off-chain; Agrinas confirms → `ResiduStatus = Cleared`.

**Partial settlement example (same agreement):**
- Delivery 1: 1,000 kg → gross 6,500,000 → handling 325,000 → net_before_debt 6,175,000 → debt_paid 2,200,000 → **net_to_farmer 3,975,000**; remaining_debt → 0; principal 2,000,000 + margin 200,000 accrued.
- Delivery 2: 1,600 kg → gross 10,400,000 → handling 520,000 → net_before_debt 9,880,000 → debt_paid 0 → **net_to_farmer 9,880,000**.
- Totals: farmer 13,855,000 · handling 845,000 · margin 200,000 · principal-residu 2,000,000 — identical to the single settlement. Debt (and therefore residu) resolves first, protecting both the coop's cash and Agrinas's principal.

> Decimal handling: `hpp_per_kg`, `base_price_agrinas`, and dIDR amounts are in dIDR smallest unit; volume in grams (`/1000` for kg); percentages in bps (`/10000`). The contract itself is **decimal-agnostic** — it moves raw `i128` units and never interprets decimals. **Reality check (as built):** dIDR is a SAC wrapping a *classic* Stellar asset, which is fixed at **7 decimals** — a classic-asset SAC cannot be minted at 2. The earlier "recommend 2" only applies to a hand-rolled SEP-41 token, which we deliberately avoid. So the deployed unit scale is 7 (Rp1 = 10,000,000 units); `packages/core` money helpers (`DIDR_DECIMALS`) own that scale — worked examples above use whole-rupiah numbers for readability and are unaffected. Pro-rata principal/margin split uses integer math; the remainder rule assigns any rounding dust to margin (KMP) so `residu_principal` never over-states Agrinas's claim.

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

Thresholds are contract constants, computed with integer basis points (`ratio_bps = delivered * 10000 / expected`; floors 9800 / 8000 / 4000) to avoid floats, kept in lockstep with `packages/core/src/status.ts` FLAG_THRESHOLDS. `tolerance_bps` is stored on the agreement but reserved (the warning floor stays a fixed 8000 constant to guarantee that lockstep). `Suspected` (farmer) and `Disputed` (coop residu) are both indicators; the human officer/auditor/operator resolves them in the dashboard, never an automatic accusation.

**Implementation notes (as built, v2 baseline — carries forward into the v3.0 rework):**
- The 40%–80% band maps to `PartiallyDelivered` (not `Flagged`); `Flagged` is reserved for the `< 40%` `Suspected` case.
- Flags are recomputed from CUMULATIVE delivered on every delivery, so they **heal upward** (e.g. 50% then +45% total = 95% → `Delivered`/`Warning`).
- The `Flagged` event + the `reputation.flags` counter both fire only for the review-worthy bands (`PartialDelivery` / `Suspected`), never for a mild `Warning` — so a healed agreement stops emitting flag badges and the event stream never disagrees with the counter.
- Terminal `Settled` is reached only when status == `Delivered` (≥ 80%) at settle time. A permanently under-delivered (`Flagged`) agreement is settled for what was delivered but stays open; its only other close path is `mark_force_majeure`. (This preserves the staged-settlement worked example over the simplified state diagram's `Flagged → Settled` edge.)
- Write fns bind the signer to the agreement: `record_delivery` / `mark_force_majeure` require `caller == agreement.coop` (→ `Unauthorized` otherwise); `settle` allows `coop` OR `admin`. **v3.0 adds:** `dispatch_supply` binds to `agreement.agrinas`, `accept_supply` to `agreement.coop`.
- Edge: a `Delivered`-band agreement whose gross still cannot cover the debt (`net == 0`) closes as `Settled` with `remaining_debt > 0`, which slightly contradicts "Settled = debt cleared." Economically it should not occur (harvest value exceeds input credit by design) and is untested; left as-is for MVP. **v3.0 note:** the same edge applies to `residu_principal` once the split lands, watch it in the rework's test suite.

---

## 7. Events (the composability surface)

Explicit, indexed. The indexer (`apps/api/indexer`) builds every dashboard read-model from these; any third party can subscribe.

| Event | Topics | Data |
|---|---|---|
| `AgreementCreated` | `["agreement_created", id, farmer, coop]` | `{agrinas, commodity, base_price_agrinas, saprotan_markup_bps, input_debt, hpp_handling_fee_bps, expected_vol_g, hpp_per_kg, tolerance_bps}` |
| `SupplyDispatched` | `["dispatched", id, agrinas]` | `{coop}` |
| `SupplyAccepted` | `["accepted", id, coop]` | `{input_debt}` (debt now active) |
| `DeliveryRecorded` | `["delivery", id]` | `{seq, volume_g, grade, delivered_total_g}` |
| `HarvestReceiptMinted` | `["receipt", id, farmer]` | `{seq, volume_g, grade, timestamp}` |
| `Settled` | `["settled", id, farmer]` | `{gross, handling_cut, debt_netted, principal_to_agrinas, coop_margin, net_paid, settled_vol_g}` |
| `Flagged` | `["flagged", id]` | `{reason}` |
| `ForceMajeure` | `["force_majeure", id]` | `{reason}` |
| `ResiduRemitted` | `["residu_remitted", id, coop]` | `{amount, ref_hash}` |
| `RemittanceCleared` | `["remittance_cleared", id, coop]` | `{principal, agrinas}` |
| `RemittanceDisputed` | `["remittance_disputed", id, coop]` | `{reason}` |
| `ReputationUpdated` | `["reputation", farmer]` | `{deliveries, on_time, total_settled_g, flags}` |
| `CoopReputationUpdated` | `["coop_reputation", coop]` | `{settlements, total_residu_cleared, disputes, frozen}` |

> Event emission is mandatory for explorer + downstream integration correctness (Soroban best practice).

---

## 8. Custody, escrow & residu

- **On-site cashflow (PMK 15/2026):** KMP is the decentralized paying agent. It **pre-funds** the settlement balance (or approves a transfer) so `settle()` can release `net_to_farmer` immediately at the scale.
- **Residu = split allocation.** The debt KMP collects is not all KMP's: `residu_principal` (Agrinas's money) is tracked separately on-chain from `coop_margin` + `coop_handling` (KMP's money). This is the on-chain guarantee against principal squatting / misuse.
- **Remittance is off-chain rupiah, on-chain record.** KMP transfers principal to Agrinas via bank; `mark_residu_remitted` (KMP) → `confirm_remittance` (Agrinas verifies mutation) → `Cleared`, exactly the Path-A pattern. Mismatch → `flag_remittance_dispute` freezes coop reputation for human review.
- **Escrow-designed:** funds locked at season start so the farmer trusts the money exists before delivering. Full multisig escrow (coop + auditor co-sign release) = roadmap (Layer 4).

---

## 9. Auth & roles

| Function | Auth |
|---|---|
| `init` | one-time, admin only |
| `create_agreement` | `coop.require_auth()` (KMP) |
| `dispatch_supply` | `agrinas.require_auth()` |
| `accept_supply` | `coop.require_auth()` (KMP) |
| `record_delivery` | `coop.require_auth()` (KMP) |
| `mark_force_majeure` | `coop.require_auth()` (KMP) |
| `settle` | `caller.require_auth()` — coop (demo) or backend service key (Path A); **multisig coop+auditor in prod** |
| `mark_residu_remitted` | `coop.require_auth()` (KMP) |
| `confirm_remittance` | `agrinas.require_auth()` |
| `flag_remittance_dispute` | `agrinas.require_auth()` |
| `resolve_dispute` | `admin.require_auth()` |
| read fns | none (public, composable) |

Soroban host handles signature verification + replay protection. Freighter signs via `signAuthEntry` for smart-wallet (C-account) flows. The three writing parties (Agrinas / KMP / farmer-receiver) map to three demo wallets pre-seeded by `scripts/seed.ts`.

---

## 10. didr-token

- Demo IDR settlement asset on **testnet**.
- Implement as a **SAC** (Stellar Asset Contract) wrapping an issued asset → ~97% less CPU / ~98% less RAM / ~47% lower fees than a hand-rolled token, and SEP-41-compatible out of the box (composability points).
- Admin (KMP treasury demo account) mints dIDR to pre-fund settlement; `settle()` calls `token.transfer(contract → farmer)` for `net_to_farmer` only. Residu principal + KMP margin are on-chain accruals, not dIDR movements in the demo (they mirror the real rupiah that never leaves KMP cash until remitted).
- **No Rust crate.** Because it is a classic-asset SAC, there is nothing to hand-roll — it is issued + wrapped + minted entirely via the Stellar CLI in `scripts/deploy.sh`. There is no `contracts/didr-token/` crate.
- Decimals: **7** (fixed by the underlying classic asset; see the decimals note in section 5).

---

## 11. Testing & deploy

- **Unit tests** (`soroban_sdk::testutils`): **v2 baseline, ✅ 26 tests green** in `contracts/offtake-registry/src/test.rs` — constructor, both settlement worked examples (single + staged), every flag band, flag healing, force-majeure, debt-exceeds-gross floor-at-0, `NothingToSettle`, auth binding (wrong coop / stranger / admin-allowed), TTL extension, i128 overflow guard. Run with `cd contracts && cargo test`. **v3.0 rework needs to add:** full lifecycle incl. `SupplyDispatched`/`Active` gates (cannot `accept_supply` before `dispatch_supply`, cannot `record_delivery` before `Active`); derived `input_debt` math; three-way split correctness incl. pro-rata principal/margin + rounding dust to margin; residu lifecycle (Pending→Remitted→Cleared) + dispute freeze/unfreeze; auth for the 7 new fns per §9.
- **Integration:** deploy to testnet via `scripts/deploy.sh`; `scripts/seed.ts` (annona-seed skill) creates farmers + agreements — **v3.0 needs the 3 operator/coop/farmer wallets**, not just farmers; run full loop across all three parties; assert every event indexed.
- **Deploy:** `scripts/fund-testnet.sh` (identities) → `scripts/deploy.sh` = `stellar contract build` → deploy dIDR SAC → `stellar contract deploy` registry with `__constructor(admin, didr_sac)` → pre-fund → writes `scripts/artifacts.testnet.json` (contract ids + WASM hash). v2 WASM is ~40 KB (limit 64 KB); watch this budget as the v3.0 fields/fns land.
- **TTL:** extend instance + accessed persistent entry TTLs at the top of every public fn (constants in `storage.rs`).

---

## 12. Roadmap hooks (designed-for, not built in MVP)

| Layer | Contract change |
|---|---|
| L2 Reputation | already emitting farmer + coop reputation; add scoring view fn + credit-unlock tiers |
| L3 Receivable | add `tokenize_receivable(id)` → mints a transferable claim on the agreement's future net |
| L4 Liquidity | escrow multisig; adapters to **Blend** (borrow against receivables) / **DeFindex** (idle-float vault, capped) |
| L5 RWA | swap PriceProvider → real oracle; compliance wrapper (ERC-3643-style) for licensed issuance |

See `./INTEGRATIONS.md` for external protocol details.
