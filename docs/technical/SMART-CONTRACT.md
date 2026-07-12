# SMART CONTRACT — Annona Protocol

> Full Soroban contract spec: the `offtake-registry` core + `didr-token`. Multi-party lifecycle, types, function signatures, events, three-way split settlement math, residu reconciliation, auth, and the oracle interface. Product-level description lives in `../PRD.md`; system context in `./ARCHITECTURE.md`.
>
> **v4.0 — corrected multi-party model (supplier / KMP / financier / farmer + gov).** Validated 2026 ground truth: the KDMP offtake loop is fragmented across real institutions that do not share a record. v4.0 corrects the earlier single-operator ("Agrinas") assumption by splitting it into its true roles — **Supplier** (input principal: catalog + dispatch + residu counterparty), **KMP** (koperasi: pre-funded cash agent), **Financier** (working-capital talangan against offtake proof), **Farmer** — plus a read-only **Government** regulator, and a non-transacting **Warehouse Operator** (infra). New on-chain surface this version: an **Offtake Financing lifecycle** (request → approve → disburse → reconcile) and a **subsidy tier** (e-RDKK / HET gate). The three-way settlement split, residu reconciliation, and `record_delivery`/`settle`/reputation core are **unchanged** — only the residu counterparty is correctly renamed from "Agrinas" to the **supplier**. See §1a for the party model and why each write earns its place on-chain.

---

## 1. Contracts overview

| Contract | Role | Standard |
|---|---|---|
| **offtake-registry** | Protocol core. Agreements, double-confirmation lifecycle, deliveries, receipts, three-way split settlement, netting, residu reconciliation, offtake-financing lifecycle, subsidy tier, farmer + coop reputation. | custom Soroban |
| **didr-token** | Demo IDR settlement asset. | **SAC** wrapping a SEP-41 asset on testnet |

Generic, commodity-agnostic, lifecycle-driven, composable. Amounts are `i128` in token smallest-unit; volumes in **grams** to avoid floats; percentages in **bps** (`10000 = 100%`).

### 1a. Party model (four on-chain-relevant roles + one infra note)

| Party | On-chain role | Signs |
|---|---|---|
| **Supplier** (input principal) | Sets `base_price` (principal) via the off-chain catalog snapshot; dispatches supply; verifies residu remittance | `dispatch_supply`, `confirm_remittance`, `flag_remittance_dispute` |
| **KMP** (koperasi) | Pre-funds cash, drafts agreement, accepts physical supply, records delivery, settles, remits residu, **requests financing** | `create_agreement`, `accept_supply`, `record_delivery`, `settle`, `mark_residu_remitted`, `request_funding` |
| **Financier** (pemodal) | Approves + disburses working-capital talangan against an offtake proof packet; reconciled at settlement | `approve_funding`, `disburse_funding`, `reject_funding` |
| **Farmer** | Receives net payout; accrues reputation; subsidy-eligibility gates the price tier offered | (no writes in MVP; receives dIDR) |
| **Government** | Read-only oversight (macro + force-majeure intervention) | none |

**Warehouse Operator** (builds/operates the physical gerai + gudang) is **not an on-chain transacting party** — it appears only as the off-chain recipient of forwarded harvest (the existing §8b harvest-forwarding leg, unchanged). This mirrors why `saprotan_catalog` is off-chain: physical/infra, no settlement math. The old undifferentiated "Agrinas" super-entity conflated this infra role, the input-supplier role, and (implicitly) the financier; v4.0 separates them so the doc matches the real KDMP institutional map.

**Why the chain earns its place here (strengthened by the split):** the residu (the **supplier's** principal sitting inside KMP's cash) is precisely the multi-party, no-trust accounting the state's moral-hazard concern targets. With the entity split there are now **three genuinely distrusting money-parties** — KMP holding the supplier's principal, the financier advancing capital against KMP's proof, and the farmer owed net — which *increases*, not decreases, the justification for a shared tamper-evident ledger. On-chain split-allocation + dual-confirmation makes it impossible for one party to silently rewrite who is owed what. The anti-pattern guard still holds: the input **payable ledger** (§8c) and the **catalog** (§1b) stay off-chain; only genuine multi-party money movement (settlement split, residu remittance, financing disburse/reconcile) is anchored.

**Multi-supplier / multi-financier readiness (no contract change needed).** If a KMP could choose among several suppliers or funders, does the contract or ERD change? No. `create_agreement` already takes a `supplier: Address` **per agreement** (not a global singleton), and `request_funding` takes a `financier: Address` **per request** — the ERD FKs both (see `ERD.md` §1). Supporting multiple suppliers or financiers is purely a data + UI question — seed more `SUPPLIER` / `FINANCIER` rows and add a picker to the relevant form — with zero change to signatures, storage keys, or the ERD's relationships. This parameterization is now doubly true and is a scaling strength, not a future rework item.

### 1b. On-chain vs off-chain data (and why)

**On-chain (this contract, §3):** `Agreement` (all fields — parties, the four price variables, `subsidy_tier`, volumes, `hpp_per_kg`, status, flag, the three-way split accruals, `residu_status`), `HarvestReceipt` (one per delivery, immutable), `FundingRequest` (the offtake-financing lifecycle, §B), `Reputation` (farmer), `CoopReputation` (KMP). Nothing here is a lookup table — every field is either money/volume that moves as part of settlement or financing, a status a human needs to trust wasn't rewritten, or a counter that has to be tamper-proof to mean anything as reputation.

**Off-chain (Postgres/Supabase, `apps/api/src/db/schema.ts`), and why each stays off-chain:**

| Table | What | Why NOT on-chain |
|---|---|---|
| `commodity` | GABAH/JAGUNG code, unit, current HPP decree version | Static label lookup. No settlement math reads it directly; it's descriptive, not a trust boundary. |
| `saprotan_catalog` | Supplier's editable price list, `base_price` + `het_price` + `price_tier` per region | The *table* is mutable reference data the supplier updates anytime. What must be tamper-proof is the price a specific agreement locked in, and that **is** on-chain: `base_price` (the HET price if the item is subsidized and the farmer is eligible, else commercial) is snapshotted into `Agreement` at `create_agreement` and frozen from then on. The catalog itself is just where that snapshot came from. |
| `price_ref` | HPP + market reference prices, multiple sources, dated | Same pattern as the catalog: `hpp_per_kg` snapshots into `Agreement` (that's the actual settlement anchor, tamper-proof). The reference table is a browsable/comparison feed, no trust property attaches to it. |
| `farmer.subsidy_status` (e-RDKK/i-Pubers badge) | External Kementan eligibility outcome (Terverifikasi / Belum / Non-Subsidi) | The badge is external reference data, mutable, and no settlement math reads it directly. Only the *tier that applied to a specific agreement* is anchored on-chain (`subsidy_tier`), the same snapshot pattern as `base_price` and `hpp_per_kg`. Annona **records** the e-RDKK outcome; it never computes eligibility. |
| `supplier_payable` (Utang #1) | Running trade payable KMP owes the supplier for tebus (principal) price of dispatched stock | A running trade-payable balance is reference/accounting data, not multi-party money movement at the moment it is booked — no auto-netting transfer, no farmer/financier counterparty at accrual time. Same test that keeps `saprotan_catalog` off-chain. The on-chain `residu_principal` remittances *pay it down* (§8c). |
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
              dispatch_supply()  [supplier validates order + releases logistics; price frozen]
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
                  └──────────┘                └─────┬──────┘ residu accrued to supplier
                        ▲                           │
        mark_force_majeure()                        │ (post-settle, off-chain rupiah remittance)
                        │                           ▼
              ┌──────────────┐        confirm_remittance() / flag_remittance_dispute()
              │ ForceMajeure │        [supplier verifies real bank mutation of residu principal]
              └──────────────┘          ResiduStatus: Pending → Remitted → Cleared | Disputed
```

**Two confirmation gates** protect against field manipulation: (1) the supplier must `dispatch_supply` before goods are "on the way"; (2) KMP must `accept_supply` before debt becomes a live liability. Neither party can advance the other's gate.

**Parallel financing lifecycle (independent state strip — §B).** The offtake-financing loop references agreements but has its own lifecycle; it is *not* tangled into the Created→Settled agreement machine:
```
request_funding()      approve_funding()      disburse_funding()     reconcile_funding()
   Requested  ───────►   Approved   ───────►   Disbursed  ─────────►   Reconciled
        │                                                             ▲
        └── reject_funding() ─► Rejected                              │
              (input-principal from backing agreements' settle() nets here)
```
The funding loop consumes the *same* `Settled` events the agreement loop emits; there is no second source of truth for what was collected.

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
    SupplyDispatched,   // supplier validated + released logistics; price frozen, goods in transit
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

// ── Residu reconciliation (supplier principal held in KMP cash) ──
#[derive(Clone, PartialEq)]
#[contracttype]
pub enum ResiduStatus {
    Pending,   // principal withheld in KMP cash, not yet remitted to supplier
    Remitted,  // KMP claims bank transfer done + proof uploaded off-chain; awaiting supplier
    Cleared,   // supplier verified real bank mutation → dispute-free
    Disputed,  // supplier found mismatch → coop reputation frozen until resolved
}

// ── Subsidy tier (e-RDKK / HET gate — recorded, never computed) ──
#[derive(Clone, PartialEq)]
#[contracttype]
pub enum SubsidyTier {
    Subsidized,     // farmer is e-RDKK verified; subsidized items priced at HET
    Commercial,     // not verified / non-subsidized item; commercial base price
}

// ── Offtake financing lifecycle (§B — independent of the agreement state machine) ──
#[derive(Clone, PartialEq)]
#[contracttype]
pub enum FundingStatus {
    Requested,      // KMP submitted a proof-backed request; awaiting financier
    Approved,       // financier approved amount_approved (<= amount_requested)
    Rejected,       // financier declined (reason off-chain)
    Disbursed,      // funds moved financier -> KMP (dIDR in demo)
    Reconciled,     // input-principal collected at settlement has repaid the advance
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
    pub supplier: Address,         // input principal — dispatch + residu authority
    pub commodity: Commodity,
    pub subsidy_tier: SubsidyTier, // which price tier the snapshotted base_price came from

    // ── price components (the four locked variables) ──
    pub base_price: i128,          // supplier catalog cost = PRINCIPAL (HET if Subsidized, else commercial; read-only to KMP)
    pub saprotan_markup_bps: u32,  // KMP margin per contract, e.g. 1000 = 10%
    pub input_debt: i128,          // DERIVED = base_price * (10000 + markup_bps) / 10000
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
    pub residu_principal: i128,        // supplier principal withheld in KMP cash (owed back)
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
pub struct CoopReputation {      // per-KMP — the anti-moral-hazard signal supplier + Government read
    pub coop: Address,
    pub agreements: u32,
    pub settlements: u32,
    pub total_residu_principal: i128, // total principal that passed through KMP cash
    pub total_residu_cleared: i128,   // principal supplier confirmed remitted
    pub disputes: u32,
    pub frozen: bool,                 // true after a dispute until admin/supplier resolves
}

#[derive(Clone)]
#[contracttype]
pub struct FundingRequest {      // offtake-financing (§B). References agreements by id off-chain (backing_hash)
    pub id: u64,
    pub coop: Address,
    pub financier: Address,
    pub backing_hash: BytesN<32>,   // hash of the off-chain Bukti Offtake packet (agreement ids + receipts)
    pub projected_settlement: i128, // sum(kg_expected_or_delivered * hpp) across backing agreements
    pub amount_requested: i128,
    pub amount_approved: i128,      // 0 until Approved
    pub amount_disbursed: i128,
    pub amount_reconciled: i128,    // input-principal netted back as backing agreements settle
    pub status: FundingStatus,
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
    NextFundingId,         // u64 funding counter
    Funding(u64),          // FundingRequest by id
    // optional: CoopFunding(Address) -> Vec<u64> for fast per-coop lookups
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

    /// KMP drafts the yarnen agreement = the collective Surat Pesanan the supplier will pull.
    /// input_debt is DERIVED: base_price * (10000 + saprotan_markup_bps) / 10000.
    /// subsidy_tier records which price tier base_price came from — INVARIANT: if
    /// subsidy_tier == Subsidized, base_price must equal the item's HET (enforced off-chain
    /// at snapshot time; the contract records the KMP-submitted tier, it does not verify e-RDKK).
    /// status = Created; debt is a DRAFT figure (not yet an active liability). requires coop auth.
    pub fn create_agreement(
        env: Env, coop: Address, farmer: Address, supplier: Address, commodity: Commodity,
        subsidy_tier: SubsidyTier, base_price: i128, saprotan_markup_bps: u32, hpp_handling_fee_bps: u32,
        expected_vol_g: i128, hpp_per_kg: i128, tolerance_bps: u32, ktp_hash: BytesN<32>,
    ) -> u64;

    /// GATE 1 — supplier validates the collective order + releases logistics.
    /// Created -> SupplyDispatched. Freezes price (blocks unilateral change). requires supplier auth.
    pub fn dispatch_supply(env: Env, supplier: Address, id: u64);

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
    ///     principal_portion = debt_paid * base_price / input_debt  -> residu_principal (supplier)
    ///     margin_portion    = debt_paid - principal_portion        -> coop_margin (KMP)
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

    /// KMP asserts it has remitted the residu principal to the supplier (bank proof uploaded off-chain).
    /// ResiduStatus Pending -> Remitted. requires coop auth.
    pub fn mark_residu_remitted(env: Env, coop: Address, id: u64, ref_hash: BytesN<32>);

    /// supplier verifies the real bank mutation → ResiduStatus Cleared; coop_rep.total_residu_cleared += .
    /// requires supplier auth. (Path-A style: off-chain rupiah verified, then anchored.)
    pub fn confirm_remittance(env: Env, supplier: Address, id: u64);

    /// supplier found a mismatch / manipulation → ResiduStatus Disputed; coop_rep.disputes++, frozen = true.
    /// requires supplier auth. Freezing is an INDICATOR for human resolution, never an auto-accusation.
    pub fn flag_remittance_dispute(env: Env, supplier: Address, id: u64, reason: Symbol);

    /// admin (or supplier) clears a resolved dispute → unfreezes coop. requires admin auth.
    pub fn resolve_dispute(env: Env, admin: Address, coop: Address, id: u64);

    // ── Offtake financing (§B) — parallel lifecycle, references agreements via backing_hash ──

    /// KMP requests working-capital talangan backed by an off-chain proof packet
    /// (agreement ids + harvest receipts, hashed into backing_hash). projected_settlement
    /// is the sum of kg * hpp across the backing agreements. status = Requested. requires coop auth.
    pub fn request_funding(
        env: Env, coop: Address, financier: Address,
        backing_hash: BytesN<32>, projected_settlement: i128, amount_requested: i128,
    ) -> u64;

    /// Financier approves an amount (<= amount_requested). Requested -> Approved. requires financier auth.
    pub fn approve_funding(env: Env, financier: Address, id: u64, amount_approved: i128);

    /// Financier declines. Requested -> Rejected (reason off-chain). requires financier auth.
    pub fn reject_funding(env: Env, financier: Address, id: u64, reason: Symbol);

    /// Financier disburses amount_approved to KMP (dIDR transfer in demo). Approved -> Disbursed.
    /// requires financier auth. Moves dIDR financier -> coop via the deploy-set token address.
    pub fn disburse_funding(env: Env, financier: Address, id: u64);

    /// Called from settle() (or by coop) to net collected input-principal against an outstanding
    /// advance. Accumulates amount_reconciled; Disbursed -> Reconciled once fully repaid. requires coop auth.
    /// Open Decision B: kept a SEPARATE explicit call in MVP (mirrors mark_residu_remitted being
    /// distinct from settle); auto-hook inside settle() noted as a v4.1 nicety.
    pub fn reconcile_funding(env: Env, coop: Address, id: u64, principal_collected: i128);

    // ── read-only (composable: any app / @annona/sdk can call) ──
    pub fn get_agreement(env: Env, id: u64) -> Agreement;
    pub fn get_receipts(env: Env, id: u64) -> Vec<HarvestReceipt>;
    pub fn get_reputation(env: Env, farmer: Address) -> Reputation;
    pub fn get_coop_reputation(env: Env, coop: Address) -> CoopReputation;
    pub fn get_funding(env: Env, id: u64) -> FundingRequest;
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

**Locked price variables (from the supplier catalog + KMP inputs):**
- `base_price` (principal) = Rp2,000,000 (this is the HET price if `subsidy_tier == Subsidized`, else the commercial price; the settlement math is identical either way)
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
- `principal_portion = 2,200,000 × (2,000,000 / 2,200,000) =` **Rp2,000,000** → `residu_principal` owed back to the supplier
- `margin_portion = 2,200,000 − 2,000,000 =` **Rp200,000** → `coop_margin_accrued` (KMP keeps)

**Cash reality (on-site cashflow, PMK 15/2026):** KMP pays `net_to_farmer` (Rp13,855,000) from its **pre-funded** cash. It **retains Rp2,200,000** of gross as residu, of which **Rp2,000,000 is the supplier's principal** (must be remitted) and **Rp200,000 + Rp845,000 = Rp1,045,000 is KMP's own** (margin + handling). Post-settle, KMP transfers the Rp2,000,000 principal to the supplier off-chain; the supplier confirms → `ResiduStatus = Cleared`. (That remittance also pays down the off-chain input payable / "Utang #1" — see §8c.)

**Partial settlement example (same agreement):**
- Delivery 1: 1,000 kg → gross 6,500,000 → handling 325,000 → net_before_debt 6,175,000 → debt_paid 2,200,000 → **net_to_farmer 3,975,000**; remaining_debt → 0; principal 2,000,000 + margin 200,000 accrued.
- Delivery 2: 1,600 kg → gross 10,400,000 → handling 520,000 → net_before_debt 9,880,000 → debt_paid 0 → **net_to_farmer 9,880,000**.
- Totals: farmer 13,855,000 · handling 845,000 · margin 200,000 · principal-residu 2,000,000 — identical to the single settlement. Debt (and therefore residu) resolves first, protecting both the coop's cash and the supplier's principal.

> Decimal handling: `hpp_per_kg`, `base_price`, and dIDR amounts are in dIDR smallest unit; volume in grams (`/1000` for kg); percentages in bps (`/10000`). The contract itself is **decimal-agnostic** — it moves raw `i128` units and never interprets decimals. **Reality check (as built):** dIDR is a SAC wrapping a *classic* Stellar asset, which is fixed at **7 decimals** — a classic-asset SAC cannot be minted at 2. The earlier "recommend 2" only applies to a hand-rolled SEP-41 token, which we deliberately avoid. So the deployed unit scale is 7 (Rp1 = 10,000,000 units); `packages/core` money helpers (`DIDR_DECIMALS`) own that scale — worked examples above use whole-rupiah numbers for readability and are unaffected. Pro-rata principal/margin split uses integer math; the remainder rule assigns any rounding dust to margin (KMP) so `residu_principal` never over-states the supplier's claim.

> **Subsidy tier does not alter the settlement formula.** HET (when the item is subsidized and the farmer is e-RDKK verified) only sets the *input-side* `base_price` / `input_debt`; settlement still uses HPP on the output side. Keep the two distinct: **HET** = the input ceiling the farmer pays for subsidized fertilizer (Kepmentan 1117/2025, e.g. Urea Rp2.250/kg, NPK Rp2.300/kg); **HPP** = the output floor the KMP pays per kg of harvest (Inpres 4/2026, gabah GKP Rp6.500/kg). A `Subsidized` agreement simply snapshots a lower `base_price` — the three-way split, netting, and residu run byte-for-byte identically.

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
- Write fns bind the signer to the agreement: `record_delivery` / `mark_force_majeure` require `caller == agreement.coop` (→ `Unauthorized` otherwise); `settle` allows `coop` OR `admin`. **v3.0 adds:** `dispatch_supply` binds to `agreement.supplier`, `accept_supply` to `agreement.coop`. **v4.0 adds:** `approve_funding` / `reject_funding` / `disburse_funding` bind to the funding record's `financier`; `request_funding` / `reconcile_funding` to its `coop`.
- Edge: a `Delivered`-band agreement whose gross still cannot cover the debt (`net == 0`) closes as `Settled` with `remaining_debt > 0`, which slightly contradicts "Settled = debt cleared." Economically it should not occur (harvest value exceeds input credit by design) and is untested; left as-is for MVP. **v3.0 note:** the same edge applies to `residu_principal` once the split lands, watch it in the rework's test suite.

---

## 7. Events (the composability surface)

Explicit, indexed. The indexer (`apps/api/indexer`) builds every dashboard read-model from these; any third party can subscribe.

| Event | Topics | Data |
|---|---|---|
| `AgreementCreated` | `["agreement_created", id, farmer, coop]` | `{supplier, subsidy_tier, commodity, base_price, saprotan_markup_bps, input_debt, hpp_handling_fee_bps, expected_vol_g, hpp_per_kg, tolerance_bps}` |
| `SupplyDispatched` | `["dispatched", id, supplier]` | `{coop}` |
| `SupplyAccepted` | `["accepted", id, coop]` | `{input_debt}` (debt now active) |
| `DeliveryRecorded` | `["delivery", id]` | `{seq, volume_g, grade, delivered_total_g}` |
| `HarvestReceiptMinted` | `["receipt", id, farmer]` | `{seq, volume_g, grade, timestamp}` |
| `Settled` | `["settled", id, farmer]` | `{gross, handling_cut, debt_netted, principal_to_supplier, coop_margin, net_paid, settled_vol_g}` |
| `Flagged` | `["flagged", id]` | `{reason}` |
| `ForceMajeure` | `["force_majeure", id]` | `{reason}` |
| `ResiduRemitted` | `["residu_remitted", id, coop]` | `{amount, ref_hash}` |
| `RemittanceCleared` | `["remittance_cleared", id, coop]` | `{principal, supplier}` |
| `RemittanceDisputed` | `["remittance_disputed", id, coop]` | `{reason}` |
| `FundingRequested` | `["funding_requested", id, coop]` | `{financier, projected_settlement, amount_requested, backing_hash}` |
| `FundingApproved` | `["funding_approved", id, financier]` | `{amount_approved}` |
| `FundingRejected` | `["funding_rejected", id, financier]` | `{reason}` |
| `FundingDisbursed` | `["funding_disbursed", id, financier]` | `{amount_disbursed, coop}` |
| `FundingReconciled` | `["funding_reconciled", id, coop]` | `{amount_reconciled, remaining}` |
| `ReputationUpdated` | `["reputation", farmer]` | `{deliveries, on_time, total_settled_g, flags}` |
| `CoopReputationUpdated` | `["coop_reputation", coop]` | `{settlements, total_residu_cleared, disputes, frozen}` |

> Event emission is mandatory for explorer + downstream integration correctness (Soroban best practice).

---

## 8. Custody, escrow & residu

- **On-site cashflow (PMK 15/2026):** KMP is the decentralized paying agent. It **pre-funds** the settlement balance (or approves a transfer) so `settle()` can release `net_to_farmer` immediately at the scale.
- **Residu = split allocation.** The debt KMP collects is not all KMP's: `residu_principal` (the supplier's money) is tracked separately on-chain from `coop_margin` + `coop_handling` (KMP's money). This is the on-chain guarantee against principal squatting / misuse.
- **Remittance is off-chain rupiah, on-chain record.** KMP transfers principal to the supplier via bank; `mark_residu_remitted` (KMP) → `confirm_remittance` (supplier verifies mutation) → `Cleared`, exactly the Path-A pattern. Mismatch → `flag_remittance_dispute` freezes coop reputation for human review.
- **Escrow-designed:** funds locked at season start so the farmer trusts the money exists before delivering. Full multisig escrow (coop + auditor co-sign release) = roadmap (Layer 4).

---

## 8a. Offtake financing (Permintaan Dana Offtake) — new on-chain surface (v4.0)

**What.** KMP requests working-capital *talangan* from a **Financier**, backed by an on-chain-verifiable proof packet (active agreements + harvest receipts hashed into `backing_hash`). The financier verifies the packet, approves an amount (`≤ requested`), and disburses dIDR into the coop; the advance is reconciled against the input-principal collected as the backing agreements settle.

**Why on-chain (the load-bearing "why chain" for this feature).** Financing is money moving between two parties who do **not** trust each other, on the strength of a proof packet. Disbursement and reconciliation are exactly (a) a tamper-evident settlement record and (b) programmatic netting — the golden rule's first two clauses. The disbursed talangan must provably reconcile against the *same* `Settled` events the contract already emits, with no party able to silently rewrite what was advanced or repaid. This clears the bar the same way residu does; more distrusting money-parties = more, not less, justification for the shared ledger (§1a).

**Lifecycle (parallel, independent — see §2 strip):** `request_funding` (coop) → `approve_funding` / `reject_funding` (financier) → `disburse_funding` (financier, real dIDR transfer) → `reconcile_funding` (coop, nets input-principal). Types (`FundingRequest`, `FundingStatus`) in §3; functions in §4; auth in §9; events in §7.

**Financing UX signals (off-chain, derived).** The financier sees a **coverage ratio** (`amount_requested ÷ projected_settlement`) and a **risk badge** derived from the coop's on-chain `CoopReputation`. These are display aids computed off-chain; only the money movement + status are anchored. Proof-gated: no valid `backing_hash` packet, no request. **Financier-agnostic** — the financier is a per-record `Address`/FK (§1a readiness).

> **Open Decision B (recorded):** `reconcile_funding` is a **separate explicit call** in MVP (mirrors `mark_residu_remitted` being distinct from `settle`), not auto-fired inside `settle()`. Auto-hook noted as a v4.1 nicety.

---

## 8b. Harvest forwarding logistics (off-chain in MVP, on-chain v3.1 roadmap)

**Status: NOT implemented on-chain.** KMP forwards accepted harvest to the **warehouse operator's gudang** (the infra party that builds/operates the gerai + gudang — *not* the supplier, and not a settlement participant; see §1a). As of 2026-07-07 this whole leg is a Postgres feature (`apps/api/src/db/schema.ts`: `harvest_shipment` + `harvest_shipment_line`), with no contract function backing it yet.

**The off-chain design (today):**
- `harvest_shipment` is a **batch lot** — one row per coop-to-warehouse dispatch of a commodity, with a `status` enum `Draft → Dikirim → Diterima → Selisih`, a KMP-declared `total_volume_g`, and a warehouse-operator-confirmed `received_volume_g` (+ `discrepancy_note` when they disagree).
- `harvest_shipment_line` preserves **per-farmer traceability inside the batch**: each line references the original `delivery` (and therefore the `agreement` and `farmer`) that contributed volume to the lot. Lines with the same grade but different `moisture_bps` are kept separate — the UI rolls them up into a weighted-average moisture per grade-lot, standard grain-logistics practice, rather than collapsing them into one imprecise number.
- The gate mirrors the residu pattern exactly: KMP marks a shipment **Dikirim** (declares what it sent), the warehouse operator marks it **Diterima** (confirms) or **Selisih** (flags a discrepancy with a mandatory note). Two independent attestations, neither party can unilaterally finalize the other's side.

**Why this is off-chain right now (golden rule 2 / §1b pattern):** this is a **physical goods movement**, not a money settlement — the same distinction that keeps `saprotan_catalog` and `price_ref` off-chain (§1b above). It has no auto-netting math and touches no dIDR transfer. It is also arriving while the `offtake-registry` contract itself is still mid-rework to the v3.0 party model (§0 header) — adding a fourth write surface before the three-way split lands would be premature. That said, the **Dikirim/Diterima two-party attestation is chain-worthy long-term**: it is exactly the kind of "neither party can rewrite what the other confirmed" record the contract already earns its place for (dispatch_supply/accept_supply, mark_residu_remitted/confirm_remittance).

**Planned v3.1 upgrade (design only, not built):**
```rust
/// KMP declares a harvest lot forwarded to the warehouse operator's gudang. Off-chain
/// shipment detail (per-farmer lines, grade/moisture) is hashed into
/// shipment_hash; only the hash + declared total anchor on-chain.
/// requires coop auth.
pub fn forward_harvest(env: Env, coop: Address, shipment_hash: BytesN<32>, total_volume_g: i128) -> u64;

/// Warehouse operator confirms physical receipt at the gudang, or records a
/// mismatch (received_volume_g != declared) — this IS the Selisih case,
/// surfaced for human resolution, never an automatic accusation.
/// requires warehouse-operator auth (a per-shipment Address, like supplier/financier).
pub fn confirm_harvest_receipt(env: Env, operator: Address, id: u64, received_volume_g: i128);
```
This mirrors the residu dual-gate: `forward_harvest` ≈ `mark_residu_remitted` (declare, unverified), `confirm_harvest_receipt` ≈ `confirm_remittance` (verify) with a `Selisih`/dispute branch ≈ `flag_remittance_dispute`. When this lands, `harvest_shipment`/`harvest_shipment_line` become the off-chain detail behind an on-chain `shipment_hash`, the same relationship `saprotan_catalog` has to the on-chain `base_price` snapshot. Note the confirming party here is the **warehouse operator**, not the supplier — the v4.0 entity split makes these two distinct infra vs input-principal roles (a decision the change brief left for §8b to make; recorded here).

---

## 8c. Input payable ("Utang #1") — off-chain ledger, paid down by on-chain residu

**The nuance.** When the supplier dispatches stock, KMP owes the supplier the *tebus* (principal) price for that stock — a **trade payable** distinct from the residu. In the old single-"Agrinas" model this was invisible because one party owned everything; with the split it becomes explicit. Note the subsidy channel does not remove it: the state pays the subsidy differential **directly to the supplier**, but the coop still owes the *tebus* price for stock drawn.

**Decision: the input payable ledger stays OFF-chain in MVP** (Postgres `supplier_payable`). Principled reason: a running trade-payable balance is *reference / accounting* data, not multi-party money movement *at the moment it is booked* — it has no auto-netting transfer and no farmer/financier counterparty at accrual time. Same test that keeps `saprotan_catalog` off-chain (§1b). **However**, the *residu principal* (the portion collected at settlement owed back to the supplier) **is** on-chain already (`residu_principal` + the remittance dual-gate) — because that IS a verified multi-party money movement.

**The relationship:** the on-chain `residu_principal` remittances *pay down* the off-chain input payable. The payable is the off-chain running total; the residu remittances are the on-chain verified events that reduce it — exactly how the off-chain `harvest_shipment` detail sits behind on-chain events (§8b). This is the **two-debt model**: Utang #1 = coop→supplier trade payable (off-chain); Utang #2 = farmer→coop yarnen credit (`input_debt`, netted on-chain at settlement).

---

## 9. Auth & roles

| Function | Auth |
|---|---|
| `init` | one-time, admin only |
| `create_agreement` | `coop.require_auth()` (KMP) |
| `dispatch_supply` | `supplier.require_auth()` |
| `accept_supply` | `coop.require_auth()` (KMP) |
| `record_delivery` | `coop.require_auth()` (KMP) |
| `mark_force_majeure` | `coop.require_auth()` (KMP) |
| `settle` | `caller.require_auth()` — coop (demo) or backend service key (Path A); **multisig coop+auditor in prod** |
| `mark_residu_remitted` | `coop.require_auth()` (KMP) |
| `confirm_remittance` | `supplier.require_auth()` |
| `flag_remittance_dispute` | `supplier.require_auth()` |
| `resolve_dispute` | `admin.require_auth()` |
| `request_funding` | `coop.require_auth()` (KMP) |
| `approve_funding` | `financier.require_auth()` |
| `reject_funding` | `financier.require_auth()` |
| `disburse_funding` | `financier.require_auth()` |
| `reconcile_funding` | `coop.require_auth()` (KMP) — or admin/service key, same pattern as `settle` |
| read fns | none (public, composable) |

Soroban host handles signature verification + replay protection. Freighter signs via `signAuthEntry` for smart-wallet (C-account) flows. The writing parties map to **four** demo wallets pre-seeded by `scripts/seed.ts` — **supplier / KMP / financier / farmer-receiver** (the financier wallet must hold dIDR to disburse).

---

## 10. didr-token

- Demo IDR settlement asset on **testnet**.
- Implement as a **SAC** (Stellar Asset Contract) wrapping an issued asset → ~97% less CPU / ~98% less RAM / ~47% lower fees than a hand-rolled token, and SEP-41-compatible out of the box (composability points).
- Admin (KMP treasury demo account) mints dIDR to pre-fund settlement; `settle()` calls `token.transfer(contract → farmer)` for `net_to_farmer` only. Residu principal + KMP margin are on-chain accruals, not dIDR movements in the demo (they mirror the real rupiah that never leaves KMP cash until remitted).
- **Financing disbursement is a real dIDR movement (v4.0):** `disburse_funding` calls `token.transfer(financier → coop)` for `amount_approved` — unlike residu principal (an accrual), this actually moves dIDR. It gives the demo a **second visible on-chain money movement** (working-capital talangan) alongside the settlement payout. The financier demo wallet must be pre-seeded/funded with dIDR in `scripts/seed.ts`.
- **No Rust crate.** Because it is a classic-asset SAC, there is nothing to hand-roll — it is issued + wrapped + minted entirely via the Stellar CLI in `scripts/deploy.sh`. There is no `contracts/didr-token/` crate.
- Decimals: **7** (fixed by the underlying classic asset; see the decimals note in section 5).

---

## 11. Testing & deploy

- **Unit tests** (`soroban_sdk::testutils`): **v2 baseline, ✅ 26 tests green** in `contracts/offtake-registry/src/test.rs` — constructor, both settlement worked examples (single + staged), every flag band, flag healing, force-majeure, debt-exceeds-gross floor-at-0, `NothingToSettle`, auth binding (wrong coop / stranger / admin-allowed), TTL extension, i128 overflow guard. Run with `cd contracts && cargo test`. **v3.0 rework needs to add:** full lifecycle incl. `SupplyDispatched`/`Active` gates (cannot `accept_supply` before `dispatch_supply`, cannot `record_delivery` before `Active`); derived `input_debt` math; three-way split correctness incl. pro-rata principal/margin + rounding dust to margin; residu lifecycle (Pending→Remitted→Cleared) + dispute freeze/unfreeze; auth for the 7 new fns per §9. **v4.0 adds (additive to the above):** funding lifecycle (`Requested→Approved→Disbursed→Reconciled`, reject path, approve-above-request rejected, disburse-before-approve rejected, reconcile caps at disbursed); subsidy tier recorded correctly + `Subsidized` requires `base_price == HET` (off-chain assertion in seed/integration, since the contract trusts the submitted tier); supplier auth rename (dispatch/confirm/dispute bind to `supplier`, not `agrinas`).
- **Integration:** deploy to testnet via `scripts/deploy.sh`; `scripts/seed.ts` (annona-seed skill) creates farmers + agreements — **v4.0 needs FOUR wallets — supplier / KMP / financier / farmer-receiver** (was three), the financier funded with dIDR to disburse; run the full loop across all parties incl. a financing request→approve→disburse→reconcile beat; assert every event indexed.
- **Deploy:** `scripts/fund-testnet.sh` (identities) → `scripts/deploy.sh` = `stellar contract build` → deploy dIDR SAC → `stellar contract deploy` registry with `__constructor(admin, didr_sac)` → pre-fund → writes `scripts/artifacts.testnet.json` (contract ids + WASM hash). v2 WASM is ~40 KB (limit 64 KB); watch this budget as the v3.0 fields/fns land. **v4.0 WASM watch:** the funding enum + `FundingRequest` struct + 6 fns are the biggest single addition — if the 64 KB budget gets tight, the `reject_funding` path or the `CoopFunding` index is the first cut (keep the four happy-path fns).
- **TTL:** extend instance + accessed persistent entry TTLs at the top of every public fn (constants in `storage.rs`).

---

## 12. Roadmap hooks (designed-for, not built in MVP)

| Layer | Contract change |
|---|---|
| v3.1 Harvest logistics | `forward_harvest(coop, shipment_hash, total_volume_g)` + `confirm_harvest_receipt(operator, id, received_volume_g)` — dual-gate mirroring residu reconciliation, with a `Selisih` dispute path (§8b). Confirming party is the **warehouse operator** (infra), not the supplier. Off-chain `harvest_shipment`/`harvest_shipment_line` today. |
| v4.1 Input payable | optional `book_payable`/`clear_payable` dual-gate if the supplier ever wants the input payable (Utang #1) itself tamper-evident — same reasoning as the v3.1 `forward_harvest`/`confirm_harvest_receipt` pair. Design-only; off-chain `supplier_payable` ledger in MVP (§8c). |
| v4.1 Financing auto-reconcile | optional auto-hook firing `reconcile_funding` inside `settle()` (Open Decision B); separate explicit call in MVP. |
| L2 Reputation | already emitting farmer + coop reputation; add scoring view fn + credit-unlock tiers |
| L3 Receivable | add `tokenize_receivable(id)` → mints a transferable claim on the agreement's future net |
| L4 Liquidity | escrow multisig; adapters to **Blend** (borrow against receivables) / **DeFindex** (idle-float vault, capped) |
| L5 RWA | swap PriceProvider → real oracle; compliance wrapper (ERC-3643-style) for licensed issuance |

See `./INTEGRATIONS.md` for external protocol details.
