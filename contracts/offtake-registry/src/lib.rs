#![no_std]
//! # offtake-registry — Annona protocol core
//!
//! A tamper-proof, auto-netting, HPP-anchored settlement ledger for the
//! input-credit → harvest-buyback (*yarnen*) loop. Generic and commodity-
//! agnostic. See `docs/technical/SMART-CONTRACT.md`.
//!
//! Design constraints enforced here:
//! - **PII never on chain**: only `ktp_hash` (see `types`).
//! - **Debt netted first**: `settle` clears `remaining_debt` before paying net.
//! - **Path-agnostic settlement**: `settle` moves the *stored* dIDR token and
//!   makes no assumption about how it was triggered (Demo / Path A backend /
//!   future Path B). The chain records the settlement; it never claims to pay
//!   real rupiah.
//! - **Flags indicate, humans decide**: classification is advisory.

mod errors;
mod events;
mod settlement;
mod storage;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, token, Address, BytesN, Env, Symbol, Vec};

use crate::errors::ContractError;
use crate::events::{
    AgreementCreated, DeliveryRecorded, Flagged, ForceMajeure, HarvestReceiptMinted,
    ReputationUpdated, Settled,
};
use crate::types::{Agreement, Commodity, FlagReason, HarvestReceipt, Reputation, Status};

#[contract]
pub struct OfftakeRegistry;

#[contractimpl]
impl OfftakeRegistry {
    /// One-time setup, atomic at deploy (Protocol 22+). Sets the admin and the
    /// settlement token (dIDR SAC) address, and initializes the id counter.
    /// Cannot re-run, so no reinitialization guard is needed.
    pub fn __constructor(env: Env, admin: Address, token: Address) {
        storage::set_admin(&env, &admin);
        storage::set_token(&env, &token);
        storage::set_next_id(&env, 0);
        storage::extend_instance(&env);
    }

    /// Coop creates the yarnen agreement: stores expected volume, HPP anchor,
    /// tolerance, and the off-chain KTP hash. Records `input_debt` as the
    /// initial `remaining_debt`. Status = Created. Returns the new id.
    pub fn create_agreement(
        env: Env,
        coop: Address,
        farmer: Address,
        commodity: Commodity,
        input_debt: i128,
        expected_vol_g: i128,
        hpp_per_kg: i128,
        tolerance_bps: u32,
        ktp_hash: BytesN<32>,
    ) -> Result<u64, ContractError> {
        coop.require_auth();
        storage::extend_instance(&env);

        if input_debt <= 0 || expected_vol_g <= 0 || hpp_per_kg <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        let id = storage::get_next_id(&env);
        let agreement = Agreement {
            id,
            farmer: farmer.clone(),
            coop: coop.clone(),
            commodity: commodity.clone(),
            input_debt,
            expected_vol_g,
            delivered_vol_g: 0,
            settled_vol_g: 0,
            hpp_per_kg,
            tolerance_bps,
            ktp_hash,
            status: Status::Created,
            flag: FlagReason::None,
            remaining_debt: input_debt,
            paid_to_farmer: 0,
        };
        storage::set_agreement(&env, &agreement);
        storage::set_next_id(&env, id + 1);

        AgreementCreated {
            id,
            farmer,
            coop,
            commodity,
            input_debt,
            expected_vol_g,
            hpp_per_kg,
            tolerance_bps,
        }
        .publish(&env);
        Ok(id)
    }

    /// Coop records a (possibly partial) harvest handover. Mints an immutable
    /// `HarvestReceipt`, accumulates `delivered_vol_g`, and recomputes
    /// (status, flag) from the CUMULATIVE ratio (flags heal upward). Bumps the
    /// farmer's delivery/flag reputation counters.
    pub fn record_delivery(
        env: Env,
        coop: Address,
        id: u64,
        volume_g: i128,
        grade: Symbol,
    ) -> Result<(), ContractError> {
        coop.require_auth();
        storage::extend_instance(&env);

        if volume_g <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        let mut agreement = storage::get_agreement(&env, id)?;
        // Auth binds the signer; this binds the signer to THIS agreement's coop
        // so a valid coop cannot mutate another coop's agreement.
        if agreement.coop != coop {
            return Err(ContractError::Unauthorized);
        }
        if agreement.status == Status::Settled || agreement.status == Status::ForceMajeure {
            return Err(ContractError::AlreadyClosed);
        }

        // Append the receipt (seq = current receipt count).
        let mut receipts = storage::get_receipts(&env, id);
        let seq = receipts.len();
        let timestamp = env.ledger().timestamp();
        let receipt = HarvestReceipt {
            agreement_id: id,
            seq,
            farmer: agreement.farmer.clone(),
            volume_g,
            grade: grade.clone(),
            timestamp,
        };
        receipts.push_back(receipt);
        storage::set_receipts(&env, id, &receipts);

        // Accumulate and reclassify.
        agreement.delivered_vol_g = agreement
            .delivered_vol_g
            .checked_add(volume_g)
            .ok_or(ContractError::MathOverflow)?;
        let (status, flag) = settlement::classify(agreement.delivered_vol_g, agreement.expected_vol_g);
        agreement.status = status;
        agreement.flag = flag.clone();
        storage::set_agreement(&env, &agreement);

        // A flag is "review-worthy" only in the PartialDelivery / Suspected bands,
        // not a mild Warning (80-98%, within acceptable range). The Flagged event
        // and the reputation.flags counter both use this same predicate so the
        // event stream and the counter never disagree, and a healed agreement
        // (back up to the Warning band) stops firing flag badges. A Warning is
        // still visible to the UI via the agreement's `flag` field.
        let review_worthy = flag == FlagReason::PartialDelivery || flag == FlagReason::Suspected;

        let mut reputation = storage::get_reputation(&env, &agreement.farmer);
        reputation.deliveries += 1;
        if review_worthy {
            reputation.flags += 1;
        }
        storage::set_reputation(&env, &reputation);

        DeliveryRecorded {
            id,
            seq,
            volume_g,
            grade: grade.clone(),
            delivered_total_g: agreement.delivered_vol_g,
        }
        .publish(&env);
        HarvestReceiptMinted {
            id,
            farmer: agreement.farmer.clone(),
            seq,
            volume_g,
            grade,
            timestamp,
        }
        .publish(&env);
        if review_worthy {
            Flagged { id, reason: flag }.publish(&env);
        }
        emit_reputation(&env, &reputation);
        Ok(())
    }

    /// Settle the delivered-but-unsettled volume. Debt is netted FIRST, then the
    /// net is transferred in dIDR from the (pre-funded) contract to the farmer.
    /// Callable repeatedly for staged settlement. Only the agreement's coop or
    /// the admin (e.g. the Path A backend service key) may call it.
    pub fn settle(env: Env, caller: Address, id: u64) -> Result<(), ContractError> {
        caller.require_auth();
        storage::extend_instance(&env);

        let mut agreement = storage::get_agreement(&env, id)?;
        let admin = storage::get_admin(&env)?;
        if caller != agreement.coop && caller != admin {
            return Err(ContractError::Unauthorized);
        }
        if agreement.status == Status::Settled || agreement.status == Status::ForceMajeure {
            return Err(ContractError::AlreadyClosed);
        }

        let delta_g = agreement
            .delivered_vol_g
            .checked_sub(agreement.settled_vol_g)
            .ok_or(ContractError::MathOverflow)?;
        if delta_g <= 0 {
            return Err(ContractError::NothingToSettle);
        }

        let s = settlement::compute(delta_g, agreement.hpp_per_kg, agreement.remaining_debt)?;

        agreement.settled_vol_g = agreement
            .settled_vol_g
            .checked_add(delta_g)
            .ok_or(ContractError::MathOverflow)?;
        agreement.remaining_debt = agreement
            .remaining_debt
            .checked_sub(s.debt_netted)
            .ok_or(ContractError::MathOverflow)?;
        agreement.paid_to_farmer = agreement
            .paid_to_farmer
            .checked_add(s.net)
            .ok_or(ContractError::MathOverflow)?;

        // Close the agreement only once the full expected harvest has been
        // received (status == Delivered, the >= 80% band) and now fully paid.
        // Below that band settle pays out but leaves the agreement open for more
        // deliveries — this is what makes staged settlement work.
        let became_settled = agreement.status == Status::Delivered;
        if became_settled {
            agreement.status = Status::Settled;
        }
        storage::set_agreement(&env, &agreement);

        let mut reputation = storage::get_reputation(&env, &agreement.farmer);
        reputation.total_settled_g = reputation
            .total_settled_g
            .checked_add(delta_g)
            .ok_or(ContractError::MathOverflow)?;
        if became_settled {
            reputation.on_time_settlements += 1;
        }
        storage::set_reputation(&env, &reputation);

        // Move the money: contract -> farmer, using the token set at deploy
        // (never a caller-supplied address). Only transfer a positive net.
        if s.net > 0 {
            let token_addr = storage::get_token(&env)?;
            let client = token::Client::new(&env, &token_addr);
            client.transfer(&env.current_contract_address(), &agreement.farmer, &s.net);
        }

        Settled {
            id,
            farmer: agreement.farmer.clone(),
            gross: s.gross,
            debt_netted: s.debt_netted,
            net_paid: s.net,
            settled_vol_g: agreement.settled_vol_g,
        }
        .publish(&env);
        emit_reputation(&env, &reputation);
        Ok(())
    }

    /// Coop records crop failure / disaster. Closes the agreement as
    /// ForceMajeure and increments `force_majeure_events` — which is TRACKED but
    /// NOT penalized (no flag, no reputation hit).
    pub fn mark_force_majeure(
        env: Env,
        coop: Address,
        id: u64,
        reason: Symbol,
    ) -> Result<(), ContractError> {
        coop.require_auth();
        storage::extend_instance(&env);

        let mut agreement = storage::get_agreement(&env, id)?;
        if agreement.coop != coop {
            return Err(ContractError::Unauthorized);
        }
        if agreement.status == Status::Settled || agreement.status == Status::ForceMajeure {
            return Err(ContractError::AlreadyClosed);
        }

        agreement.status = Status::ForceMajeure;
        agreement.flag = FlagReason::None;
        storage::set_agreement(&env, &agreement);

        let mut reputation = storage::get_reputation(&env, &agreement.farmer);
        reputation.force_majeure_events += 1;
        storage::set_reputation(&env, &reputation);

        ForceMajeure { id, reason }.publish(&env);
        Ok(())
    }

    // ── read-only (public, composable — no auth) ──

    pub fn get_agreement(env: Env, id: u64) -> Result<Agreement, ContractError> {
        storage::get_agreement(&env, id)
    }

    pub fn get_receipts(env: Env, id: u64) -> Vec<HarvestReceipt> {
        storage::get_receipts(&env, id)
    }

    pub fn get_reputation(env: Env, farmer: Address) -> Reputation {
        storage::get_reputation(&env, &farmer)
    }

    pub fn get_admin(env: Env) -> Result<Address, ContractError> {
        storage::get_admin(&env)
    }
}

/// Emit `ReputationUpdated` from the current counters. The event payload mirrors
/// `packages/core` (no force_majeure_events field there).
fn emit_reputation(env: &Env, reputation: &Reputation) {
    ReputationUpdated {
        farmer: reputation.farmer.clone(),
        deliveries: reputation.deliveries,
        on_time: reputation.on_time_settlements,
        total_settled_g: reputation.total_settled_g,
        flags: reputation.flags,
    }
    .publish(env);
}
