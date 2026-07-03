//! On-chain types for the offtake-registry.
//!
//! These mirror the canonical TypeScript types in `packages/core` (Golden rule 5:
//! shared types live in `packages/core`; contract + dashboards must not drift).
//!
//! PII NEVER touches the chain (Golden rule 1). The only farmer-identity field
//! anywhere in these types is `ktp_hash: BytesN<32>` — a hash computed off-chain.
//! No name / phone / GPS field exists by construction.
//!
//! Money is `i128` in the settlement token's smallest unit (dIDR, 2 decimals =
//! rupiah-cents). Volumes are `i128` grams to avoid floats (`/1000` for kg).

use soroban_sdk::{contracttype, Address, BytesN, Env, Symbol};

/// Agreement lifecycle. Mirrors `packages/core/src/status.ts` `Status`.
#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum Status {
    /// agreement signed, inputs issued, debt recorded
    Created,
    /// some harvest in, more expected
    PartiallyDelivered,
    /// full expected volume received (>= 80% band)
    Delivered,
    /// payment netted + released, debt cleared (terminal)
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
    pub coop: Address,
    pub commodity: Commodity,
    /// input credit issued, settlement-token smallest unit
    pub input_debt: i128,
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
    pub status: Status,
    pub flag: FlagReason,
    /// netted down as settlement proceeds (debt cleared first, Golden rule 6)
    pub remaining_debt: i128,
    /// running net released to the farmer
    pub paid_to_farmer: i128,
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

/// Persistent-storage key space. Typed enum only (no ad-hoc symbols → no
/// collisions). Admin/Token/NextId are instance storage; the rest persistent.
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    NextId,
    Agreement(u64),
    Receipts(u64),
    Reputation(Address),
}

/// Oracle interface — DEFINED but NOT wired into `settle` in the MVP. Lets a
/// real feed (Reflector / Bapanas) later replace the stored `hpp_per_kg`
/// without touching settlement logic (spec section 4 / roadmap L5).
#[allow(dead_code)]
pub trait PriceProvider {
    fn hpp_for(env: Env, commodity: Symbol) -> i128;
}
