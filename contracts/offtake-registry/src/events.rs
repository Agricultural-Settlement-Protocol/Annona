//! Contract events — the composability surface (v4.0, PMK 15/2026). The indexer
//! (`apps/api/src/indexer`) builds every dashboard read-model from these, and
//! any third party can subscribe. Emission is mandatory.
//!
//! Each event uses the `#[contractevent]` macro: `topics = ["name"]` sets the
//! topic[0] symbol the indexer filters on (matching spec section 7 exactly),
//! `#[topic]` fields become the additional indexed topics (id / farmer / coop /
//! supplier), and the remaining fields are emitted as a named-field Map that
//! mirrors `packages/core/src/events.ts` (camelCase there, snake_case here).

use soroban_sdk::{contractevent, Address, BytesN, Symbol};

use crate::types::{Commodity, FlagReason, SubsidyTier};

/// topics: ["agreement_created", id, farmer, coop]
#[contractevent(topics = ["agreement_created"])]
pub struct AgreementCreated {
    #[topic]
    pub id: u64,
    #[topic]
    pub farmer: Address,
    #[topic]
    pub coop: Address,
    pub supplier: Address,
    pub subsidy_tier: SubsidyTier,
    pub commodity: Commodity,
    pub base_price: i128,
    pub saprotan_markup_bps: u32,
    pub input_debt: i128,
    pub hpp_handling_fee_bps: u32,
    pub expected_vol_g: i128,
    pub hpp_per_kg: i128,
    pub tolerance_bps: u32,
}

/// topics: ["dispatched", id, supplier]. GATE 1 — Supplier released logistics.
#[contractevent(topics = ["dispatched"])]
pub struct SupplyDispatched {
    #[topic]
    pub id: u64,
    #[topic]
    pub supplier: Address,
    pub coop: Address,
}

/// topics: ["accepted", id, coop]. GATE 2 — KMP confirmed receipt; debt active.
#[contractevent(topics = ["accepted"])]
pub struct SupplyAccepted {
    #[topic]
    pub id: u64,
    #[topic]
    pub coop: Address,
    pub input_debt: i128,
}

/// topics: ["delivery", id]
#[contractevent(topics = ["delivery"])]
pub struct DeliveryRecorded {
    #[topic]
    pub id: u64,
    pub seq: u32,
    pub volume_g: i128,
    pub grade: Symbol,
    pub delivered_total_g: i128,
}

/// topics: ["receipt", id, farmer]
#[contractevent(topics = ["receipt"])]
pub struct HarvestReceiptMinted {
    #[topic]
    pub id: u64,
    #[topic]
    pub farmer: Address,
    pub seq: u32,
    pub volume_g: i128,
    pub grade: Symbol,
    pub timestamp: u64,
}

/// topics: ["settled", id, farmer]. Three-way split payload.
#[contractevent(topics = ["settled"])]
pub struct Settled {
    #[topic]
    pub id: u64,
    #[topic]
    pub farmer: Address,
    pub gross: i128,
    pub handling_cut: i128,
    pub debt_netted: i128,
    pub principal_to_supplier: i128,
    pub coop_margin: i128,
    pub net_paid: i128,
    pub settled_vol_g: i128,
}

/// topics: ["flagged", id]
#[contractevent(topics = ["flagged"])]
pub struct Flagged {
    #[topic]
    pub id: u64,
    pub reason: FlagReason,
}

/// topics: ["force_majeure", id]
#[contractevent(topics = ["force_majeure"])]
pub struct ForceMajeure {
    #[topic]
    pub id: u64,
    pub reason: Symbol,
}

/// topics: ["residu_remitted", id, coop]. KMP claims off-chain bank transfer done.
#[contractevent(topics = ["residu_remitted"])]
pub struct ResiduRemitted {
    #[topic]
    pub id: u64,
    #[topic]
    pub coop: Address,
    pub amount: i128,
    pub ref_hash: BytesN<32>,
}

/// topics: ["remittance_cleared", id, coop]. Supplier verified the bank mutation.
#[contractevent(topics = ["remittance_cleared"])]
pub struct RemittanceCleared {
    #[topic]
    pub id: u64,
    #[topic]
    pub coop: Address,
    pub principal: i128,
    pub supplier: Address,
}

/// topics: ["remittance_disputed", id, coop]. Supplier found a mismatch.
#[contractevent(topics = ["remittance_disputed"])]
pub struct RemittanceDisputed {
    #[topic]
    pub id: u64,
    #[topic]
    pub coop: Address,
    pub reason: Symbol,
}

/// topics: ["remittance_resolved", id, coop]. Admin cleared a dispute; the
/// agreement's residu returns to Remitted (awaiting Supplier re-verification).
/// Agreement-scoped so the indexer can un-strand the residu read-model row —
/// `CoopReputationUpdated` alone carries no agreement id.
#[contractevent(topics = ["remittance_resolved"])]
pub struct RemittanceResolved {
    #[topic]
    pub id: u64,
    #[topic]
    pub coop: Address,
    pub admin: Address,
}

/// topics: ["reputation", farmer]. Mirrors `packages/core` (no
/// force_majeure_events field there).
#[contractevent(topics = ["reputation"])]
pub struct ReputationUpdated {
    #[topic]
    pub farmer: Address,
    pub deliveries: u32,
    pub on_time: u32,
    pub total_settled_g: i128,
    pub flags: u32,
}

/// topics: ["coop_reputation", coop]. The anti-moral-hazard signal.
#[contractevent(topics = ["coop_reputation"])]
pub struct CoopReputationUpdated {
    #[topic]
    pub coop: Address,
    pub settlements: u32,
    pub total_residu_cleared: i128,
    pub disputes: u32,
    pub frozen: bool,
}

// ── Offtake-financing events (§B) ──

/// topics: ["funding_requested", id, coop]. KMP requests working-capital talangan.
#[contractevent(topics = ["funding_requested"])]
pub struct FundingRequested {
    #[topic]
    pub id: u64,
    #[topic]
    pub coop: Address,
    pub financier: Address,
    pub projected_settlement: i128,
    pub amount_requested: i128,
    pub backing_hash: BytesN<32>,
}

/// topics: ["funding_approved", id, financier]. Financier approved an amount.
#[contractevent(topics = ["funding_approved"])]
pub struct FundingApproved {
    #[topic]
    pub id: u64,
    #[topic]
    pub financier: Address,
    pub amount_approved: i128,
}

/// topics: ["funding_rejected", id, financier]. Financier declined (reason off-chain).
#[contractevent(topics = ["funding_rejected"])]
pub struct FundingRejected {
    #[topic]
    pub id: u64,
    #[topic]
    pub financier: Address,
    pub reason: Symbol,
}

/// topics: ["funding_disbursed", id, financier]. Real dIDR moved financier -> coop.
#[contractevent(topics = ["funding_disbursed"])]
pub struct FundingDisbursed {
    #[topic]
    pub id: u64,
    #[topic]
    pub financier: Address,
    pub amount_disbursed: i128,
    pub coop: Address,
}

/// topics: ["funding_reconciled", id, coop]. Input-principal netted against the advance.
#[contractevent(topics = ["funding_reconciled"])]
pub struct FundingReconciled {
    #[topic]
    pub id: u64,
    #[topic]
    pub coop: Address,
    pub amount_reconciled: i128,
    pub remaining: i128,
}
