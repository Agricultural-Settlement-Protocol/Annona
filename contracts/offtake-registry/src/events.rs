//! Contract events — the composability surface. The indexer
//! (`apps/api/src/indexer`) builds every dashboard read-model from these, and
//! any third party can subscribe. Emission is mandatory.
//!
//! Each event uses the `#[contractevent]` macro: `topics = ["name"]` sets the
//! topic[0] symbol the indexer filters on (matching spec section 7 exactly),
//! `#[topic]` fields become the additional indexed topics (id / farmer / coop),
//! and the remaining fields are emitted as a named-field Map that mirrors
//! `packages/core/src/events.ts`.

use soroban_sdk::{contractevent, Address, Symbol};

use crate::types::{Commodity, FlagReason};

/// topics: ["agreement_created", id, farmer, coop]
#[contractevent(topics = ["agreement_created"])]
pub struct AgreementCreated {
    #[topic]
    pub id: u64,
    #[topic]
    pub farmer: Address,
    #[topic]
    pub coop: Address,
    pub commodity: Commodity,
    pub input_debt: i128,
    pub expected_vol_g: i128,
    pub hpp_per_kg: i128,
    pub tolerance_bps: u32,
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

/// topics: ["settled", id, farmer]
#[contractevent(topics = ["settled"])]
pub struct Settled {
    #[topic]
    pub id: u64,
    #[topic]
    pub farmer: Address,
    pub gross: i128,
    pub debt_netted: i128,
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
