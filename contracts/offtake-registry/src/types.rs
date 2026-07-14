//! On-chain types for the offtake-registry (v4.0, multi-party model, PMK 15/2026).
//!
//! These mirror the canonical TypeScript types in `packages/core` (Golden rule 5:
//! shared types live in `packages/core`; contract + dashboards must not drift).
//! Rust is snake_case, `packages/core` is camelCase — the field MEANING must match,
//! not the casing (the indexer bridges the two).
//!
//! PII NEVER touches the chain (Golden rule 1). The only farmer-identity field
//! anywhere in these types is `ktp_hash: BytesN<32>` — a hash computed off-chain.
//! No name / phone / GPS field exists by construction.
//!
//! Money is `i128` in the settlement token's smallest unit. dIDR is a SAC wrapping
//! a CLASSIC Stellar asset, fixed at 7 decimals (Rp1 = 10,000,000 units). The
//! contract itself is decimal-agnostic — it moves raw `i128` units and never
//! interprets decimals. Volumes are `i128` grams to avoid floats (`/1000` for kg);
//! percentages are basis points (`10000 = 100%`).

use soroban_sdk::{contracttype, Address, BytesN, Env, Symbol};

/// Agreement lifecycle. Mirrors `packages/core/src/status.ts` `Status`.
/// Double-confirmation: `Created` -> (Supplier) `SupplyDispatched` -> (KMP) `Active`.
#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum Status {
    /// KMP drafts agreement (collective Surat Pesanan); debt DRAFT, not active
    Created,
    /// Supplier validated + released logistics; price frozen, goods in transit
    SupplyDispatched,
    /// KMP confirmed physical receipt; input_debt now an ACTIVE liability
    Active,
    /// some harvest in, more expected
    PartiallyDelivered,
    /// full expected volume received (>= 80% band)
    Delivered,
    /// three-way split executed, debt cleared, net paid (terminal)
    Settled,
    /// under-delivery; needs human review (terminal only via settle/force-majeure)
    Flagged,
    /// crop failure / disaster; closes without reputation penalty (terminal)
    ForceMajeure,
}

/// Under-delivery sub-reason. Mirrors `packages/core/src/status.ts` `FlagReason`.
/// The contract INDICATES; the human officer/auditor DECIDES. `Suspected` is
/// never an on-chain accusation (Golden rule 7).
#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum FlagReason {
    None,
    Warning,
    PartialDelivery,
    Suspected,
}

/// Residu reconciliation lifecycle (Supplier principal held in KMP cash).
/// Mirrors `packages/core/src/status.ts` `ResiduStatus`. Never on-chain money
/// movement — only the anchored record of an off-chain bank remittance.
#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum ResiduStatus {
    /// principal withheld in KMP cash, not yet remitted to Supplier
    Pending,
    /// KMP claims bank transfer done + proof uploaded off-chain; awaiting Supplier
    Remitted,
    /// Supplier verified real bank mutation -> dispute-free
    Cleared,
    /// Supplier found a mismatch -> coop reputation frozen until resolved
    Disputed,
}

/// Subsidy tier (e-RDKK / HET gate). RECORDED, never computed (Golden rule 4-adjacent):
/// the contract anchors which price tier the snapshotted `base_price` came from; it
/// does NOT verify e-RDKK eligibility (that outcome is external Kementan data). Mirrors
/// `packages/core/src/status.ts` `SubsidyTier`.
#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum SubsidyTier {
    /// farmer is e-RDKK verified; subsidized items priced at HET
    Subsidized,
    /// not verified / non-subsidized item; commercial base price
    Commercial,
}

/// Offtake-financing lifecycle (§B). Independent of the agreement state machine;
/// a `FundingRequest` references its backing agreements only off-chain (`backing_hash`).
/// Mirrors `packages/core/src/status.ts` `FundingStatus`.
#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum FundingStatus {
    /// KMP submitted a proof-backed request; awaiting financier
    Requested,
    /// financier approved `amount_approved` (<= `amount_requested`)
    Approved,
    /// financier declined (reason off-chain)
    Rejected,
    /// funds moved financier -> KMP (real dIDR transfer in the demo)
    Disbursed,
    /// input-principal collected at settlement has repaid the advance
    Reconciled,
}

/// Commodity metadata (grade / moisture / which HPP decree was used).
#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct Commodity {
    /// e.g. symbol_short!("GABAH") / "JAGUNG" / "KOPI"
    pub code: Symbol,
    /// grade per coop/Bulog SOP, e.g. "A" / "B" / "C"
    pub grade: Symbol,
    /// moisture in basis points, e.g. 1400 = 14.00%
    pub moisture_bps: u32,
    /// which HPP decree (Inpres no.) was used
    pub hpp_version: u32,
}

/// The core offtake agreement (the yarnen loop as one record).
#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct Agreement {
    pub id: u64,
    pub farmer: Address,
    /// KMP — pre-funded cash agent
    pub coop: Address,
    /// input principal — dispatch + residu authority
    pub supplier: Address,
    pub commodity: Commodity,
    /// which price tier the snapshotted `base_price` came from (recorded, not verified)
    pub subsidy_tier: SubsidyTier,

    // ── price components (the four locked variables) ──
    /// Supplier catalog cost = PRINCIPAL (read-only to KMP)
    pub base_price: i128,
    /// KMP margin per contract, e.g. 1000 = 10%
    pub saprotan_markup_bps: u32,
    /// DERIVED = base_price * (10000 + saprotan_markup_bps) / 10000
    pub input_debt: i128,
    /// KMP handling cut on gross HPP at settle, e.g. 500 = 5%
    pub hpp_handling_fee_bps: u32,

    // ── volumes + anchor ──
    /// transparent estimate (area x yield/ha), grams. Never "AI prediction".
    pub expected_vol_g: i128,
    /// accumulates across partial deliveries, grams
    pub delivered_vol_g: i128,
    /// volume already paid out (supports staged settlement), grams
    pub settled_vol_g: i128,
    /// settlement anchor, smallest unit per kg
    pub hpp_per_kg: i128,
    /// e.g. 2000 = 20%
    pub tolerance_bps: u32,
    /// off-chain PII reference ONLY — never raw KTP
    pub ktp_hash: BytesN<32>,

    // ── state ──
    pub status: Status,
    pub flag: FlagReason,

    // ── running money (three-way split accounting) ──
    /// netted down as settlement proceeds (debt cleared first, Golden rule 6)
    pub remaining_debt: i128,
    /// running net released to the farmer
    pub paid_to_farmer: i128,
    /// KMP handling cut realized (KMP keeps)
    pub coop_handling_accrued: i128,
    /// KMP markup margin realized (KMP keeps)
    pub coop_margin_accrued: i128,
    /// Supplier principal withheld in KMP cash (owed back)
    pub residu_principal: i128,
    pub residu_status: ResiduStatus,
}

/// Immutable per-delivery receipt. The financial-identity primitive (L3 basis).
#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct HarvestReceipt {
    pub agreement_id: u64,
    /// receipt sequence within an agreement (0-based)
    pub seq: u32,
    pub farmer: Address,
    pub volume_g: i128,
    pub grade: Symbol,
    pub timestamp: u64,
}

/// Append-only reputation counters per farmer (L2 hook). force_majeure_events
/// are TRACKED but NOT penalized (Golden rule / spec section 6).
#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct Reputation {
    pub farmer: Address,
    pub total_settled_g: i128,
    pub deliveries: u32,
    pub on_time_settlements: u32,
    pub flags: u32,
    pub force_majeure_events: u32,
}

/// Append-only reputation counters per KMP — the anti-moral-hazard signal
/// Supplier + Government + banks read: does this coop reliably remit Supplier's
/// principal residu? `frozen` is an INDICATOR for human review after a dispute,
/// never an automatic accusation.
#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct CoopReputation {
    pub coop: Address,
    pub agreements: u32,
    pub settlements: u32,
    /// total principal that passed through KMP cash
    pub total_residu_principal: i128,
    /// principal Supplier confirmed remitted
    pub total_residu_cleared: i128,
    pub disputes: u32,
    /// true after a dispute until admin/Supplier resolves
    pub frozen: bool,
}

/// Offtake-financing request (§B). Working-capital *talangan* the Financier
/// advances to a KMP against an off-chain proof packet (backing agreement ids +
/// receipts hashed into `backing_hash`). The advance is reconciled against the
/// input-principal collected as the backing agreements settle. This IS genuine
/// multi-party money movement (financier → coop dIDR), so it earns its on-chain
/// place; the proof packet detail stays off-chain behind the hash.
#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct FundingRequest {
    pub id: u64,
    /// KMP requesting the talangan
    pub coop: Address,
    /// financier advancing the working capital
    pub financier: Address,
    /// hash of the off-chain Bukti Offtake packet (agreement ids + receipts)
    pub backing_hash: BytesN<32>,
    /// sum(kg_expected_or_delivered × hpp) across backing agreements (coverage denom)
    pub projected_settlement: i128,
    pub amount_requested: i128,
    /// 0 until Approved; always <= amount_requested
    pub amount_approved: i128,
    /// moved financier -> coop at disbursement (real dIDR)
    pub amount_disbursed: i128,
    /// input-principal netted back as backing agreements settle; caps at disbursed
    pub amount_reconciled: i128,
    pub status: FundingStatus,
}

/// Persistent-storage key space. Typed enum only (no ad-hoc symbols → no
/// collisions). Admin/Token/NextId/NextFundingId are instance storage; the rest
/// persistent.
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    NextId,
    Agreement(u64),
    Receipts(u64),
    Reputation(Address),
    CoopReputation(Address),
    /// u64 funding-request counter
    NextFundingId,
    /// FundingRequest by id
    Funding(u64),
}

/// Oracle interface — DEFINED but NOT wired into `settle` in the MVP. Lets a
/// real feed (Reflector / Bapanas) later replace the stored `hpp_per_kg`
/// without touching settlement logic (spec section 4 / roadmap L5).
#[allow(dead_code)]
pub trait PriceProvider {
    fn hpp_for(env: Env, commodity: Symbol) -> i128;
}
