#![no_std]
// `create_agreement` takes the spec-mandated parameters (four price variables,
// three transacting parties, commodity, subsidy tier, volumes, tolerance,
// ktp_hash); the Soroban macros re-expand that arity into generated helpers.
// This is inherent to the contract interface, so the lint is silenced crate-wide
// rather than fought per-callsite.
#![allow(clippy::too_many_arguments)]
//! # offtake-registry — Annona protocol core (v4.0, multi-party, PMK 15/2026)
//!
//! A tamper-proof, auto-netting, HPP-anchored settlement ledger for the
//! input-credit → harvest-buyback (*yarnen*) loop. Generic and commodity-
//! agnostic. See `docs/technical/SMART-CONTRACT.md`.
//!
//! Four commercial parties + a regulator (v4.0 corrects the earlier single
//! "Agrinas" operator into its true roles):
//! - **Supplier** (input principal): sets `base_price` (principal), dispatches
//!   supply, verifies residu remittance.
//! - **KMP** (`coop`): pre-funds cash, drafts the agreement, accepts supply,
//!   records deliveries, settles, remits residu principal, requests financing.
//! - **Financier** (working-capital): approves + disburses offtake *talangan*
//!   against a proof packet (real dIDR financier → coop); reconciled at settle.
//! - **Farmer**: receives the net payout; accrues reputation (no writes).
//! - **Government**: read-only (not a signer).
//!
//! Design constraints enforced here:
//! - **PII never on chain** (rule 1): only `ktp_hash`.
//! - **Two confirmation gates** (rule 6c): `dispatch_supply` (Supplier) then
//!   `accept_supply` (KMP) must both fire before `input_debt` is an ACTIVE
//!   liability and deliveries can be recorded.
//! - **Debt netted first, then split three ways** (rule 6): `settle` clears
//!   debt from (gross - handling) before paying the farmer, then splits the
//!   collected debt into Supplier principal residu + KMP margin.
//! - **Residu principal is Supplier's money** (rule 6b): tracked separately and
//!   reconciled via `mark_residu_remitted` → `confirm_remittance`.
//! - **Subsidy tier is recorded, not computed** (rule 4-adjacent): the contract
//!   anchors the KMP-submitted `subsidy_tier`; it never verifies e-RDKK.
//! - **Financing is a parallel lifecycle**: `request → approve/reject →
//!   disburse → reconcile`, independent of the agreement state machine (§B).
//! - **Flags indicate, humans decide** (rule 7): classification + dispute
//!   freeze are advisory.

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
    AgreementCreated, CoopReputationUpdated, DeliveryRecorded, Flagged, ForceMajeure,
    FundingApproved, FundingDisbursed, FundingReconciled, FundingRejected, FundingRequested,
    HarvestReceiptMinted, RemittanceCleared, RemittanceDisputed, RemittanceResolved,
    ReputationUpdated, ResiduRemitted, Settled, SupplyAccepted, SupplyDispatched,
};
use crate::types::{
    Agreement, Commodity, CoopReputation, FlagReason, FundingRequest, FundingStatus,
    HarvestReceipt, Reputation, ResiduStatus, Status, SubsidyTier,
};

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

    /// KMP drafts the yarnen agreement (the collective Surat Pesanan). Stores the
    /// four locked price variables and DERIVES `input_debt` from the Supplier
    /// principal + KMP markup. `subsidy_tier` records which price tier the
    /// snapshotted `base_price` came from — the contract trusts the KMP-submitted
    /// tier (the `Subsidized`==HET invariant is enforced off-chain; the chain
    /// never verifies e-RDKK). Status = Created; the debt is a DRAFT figure, not
    /// yet an active liability (that requires both confirmation gates). Bumps the
    /// coop's agreement counter. Returns the new id. Requires coop auth.
    pub fn create_agreement(
        env: Env,
        coop: Address,
        farmer: Address,
        supplier: Address,
        commodity: Commodity,
        subsidy_tier: SubsidyTier,
        base_price: i128,
        saprotan_markup_bps: u32,
        hpp_handling_fee_bps: u32,
        expected_vol_g: i128,
        hpp_per_kg: i128,
        tolerance_bps: u32,
        ktp_hash: BytesN<32>,
    ) -> Result<u64, ContractError> {
        coop.require_auth();
        storage::extend_instance(&env);

        if base_price <= 0 || expected_vol_g <= 0 || hpp_per_kg <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        let input_debt = settlement::derive_input_debt(base_price, saprotan_markup_bps)?;

        let id = storage::get_next_id(&env);
        let agreement = Agreement {
            id,
            farmer: farmer.clone(),
            coop: coop.clone(),
            supplier: supplier.clone(),
            commodity: commodity.clone(),
            subsidy_tier: subsidy_tier.clone(),
            base_price,
            saprotan_markup_bps,
            input_debt,
            hpp_handling_fee_bps,
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
            coop_handling_accrued: 0,
            coop_margin_accrued: 0,
            residu_principal: 0,
            residu_status: ResiduStatus::Pending,
        };
        storage::set_agreement(&env, &agreement);
        storage::set_next_id(&env, id + 1);

        // Count the drafted agreement against the coop. `agreements` is not in
        // the CoopReputationUpdated payload (the indexer derives it by counting
        // AgreementCreated events), so no coop-reputation event is emitted here.
        let mut coop_rep = storage::get_coop_reputation(&env, &coop);
        coop_rep.agreements += 1;
        storage::set_coop_reputation(&env, &coop_rep);

        AgreementCreated {
            id,
            farmer,
            coop,
            supplier,
            subsidy_tier,
            commodity,
            base_price,
            saprotan_markup_bps,
            input_debt,
            hpp_handling_fee_bps,
            expected_vol_g,
            hpp_per_kg,
            tolerance_bps,
        }
        .publish(&env);
        Ok(id)
    }

    /// GATE 1 — Supplier validates the collective order + releases logistics.
    /// `Created` -> `SupplyDispatched`. Price is now frozen (no unilateral
    /// change). Bound to the agreement's `supplier`. Requires supplier auth.
    pub fn dispatch_supply(env: Env, supplier: Address, id: u64) -> Result<(), ContractError> {
        supplier.require_auth();
        storage::extend_instance(&env);

        let mut agreement = storage::get_agreement(&env, id)?;
        if agreement.supplier != supplier {
            return Err(ContractError::Unauthorized);
        }
        if agreement.status != Status::Created {
            return Err(ContractError::InvalidStatus);
        }

        agreement.status = Status::SupplyDispatched;
        storage::set_agreement(&env, &agreement);

        SupplyDispatched {
            id,
            supplier,
            coop: agreement.coop,
        }
        .publish(&env);
        Ok(())
    }

    /// GATE 2 — KMP inspects the physical quantity on arrival + confirms receipt.
    /// `SupplyDispatched` -> `Active`. `input_debt` becomes an ACTIVE liability.
    /// Bound to the agreement's `coop`. Requires coop auth.
    pub fn accept_supply(env: Env, coop: Address, id: u64) -> Result<(), ContractError> {
        coop.require_auth();
        storage::extend_instance(&env);

        let mut agreement = storage::get_agreement(&env, id)?;
        if agreement.coop != coop {
            return Err(ContractError::Unauthorized);
        }
        if agreement.status != Status::SupplyDispatched {
            return Err(ContractError::InvalidStatus);
        }

        agreement.status = Status::Active;
        storage::set_agreement(&env, &agreement);

        SupplyAccepted {
            id,
            coop,
            input_debt: agreement.input_debt,
        }
        .publish(&env);
        Ok(())
    }

    /// KMP records a (possibly partial) harvest handover. Requires the agreement
    /// to be past both gates (>= Active) and not closed. Mints an immutable
    /// `HarvestReceipt`, accumulates `delivered_vol_g`, and recomputes
    /// (status, flag) from the CUMULATIVE ratio (flags heal upward). Bumps the
    /// farmer's delivery/flag reputation counters. Requires coop auth.
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
        // Cannot deliver before both gates fire (debt not yet active)...
        if agreement.status == Status::Created || agreement.status == Status::SupplyDispatched {
            return Err(ContractError::InvalidStatus);
        }
        // ...nor onto a terminal agreement.
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
        let (status, flag) =
            settlement::classify(agreement.delivered_vol_g, agreement.expected_vol_g);
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

    /// Settle the delivered-but-unsettled volume with the THREE-WAY split (§5).
    /// Debt is netted FIRST from (gross - handling), then the net is transferred
    /// in dIDR from the (pre-funded) contract to the farmer; the collected debt
    /// is split into Supplier principal residu + KMP margin (tracked, not moved in
    /// the demo). Callable repeatedly for staged settlement. Only the agreement's
    /// coop or the admin (Path A backend service key) may call it.
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

        let s = settlement::compute(
            delta_g,
            agreement.hpp_per_kg,
            agreement.hpp_handling_fee_bps,
            agreement.remaining_debt,
            agreement.base_price,
            agreement.input_debt,
        )?;

        agreement.settled_vol_g = agreement
            .settled_vol_g
            .checked_add(delta_g)
            .ok_or(ContractError::MathOverflow)?;
        agreement.remaining_debt = agreement
            .remaining_debt
            .checked_sub(s.debt_paid)
            .ok_or(ContractError::MathOverflow)?;
        agreement.paid_to_farmer = agreement
            .paid_to_farmer
            .checked_add(s.net_to_farmer)
            .ok_or(ContractError::MathOverflow)?;
        agreement.coop_handling_accrued = agreement
            .coop_handling_accrued
            .checked_add(s.handling_cut)
            .ok_or(ContractError::MathOverflow)?;
        agreement.coop_margin_accrued = agreement
            .coop_margin_accrued
            .checked_add(s.coop_margin)
            .ok_or(ContractError::MathOverflow)?;
        agreement.residu_principal = agreement
            .residu_principal
            .checked_add(s.principal_to_supplier)
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

        // Coop reputation: principal always accrues (it passed through KMP cash);
        // the settlement count bumps only when the agreement terminally settles.
        let mut coop_rep = storage::get_coop_reputation(&env, &agreement.coop);
        coop_rep.total_residu_principal = coop_rep
            .total_residu_principal
            .checked_add(s.principal_to_supplier)
            .ok_or(ContractError::MathOverflow)?;
        if became_settled {
            coop_rep.settlements += 1;
        }
        storage::set_coop_reputation(&env, &coop_rep);

        // Move the money: contract -> farmer, using the token set at deploy
        // (never a caller-supplied address). Only transfer a positive net.
        if s.net_to_farmer > 0 {
            let token_addr = storage::get_token(&env)?;
            let client = token::Client::new(&env, &token_addr);
            client.transfer(
                &env.current_contract_address(),
                &agreement.farmer,
                &s.net_to_farmer,
            );
        }

        Settled {
            id,
            farmer: agreement.farmer.clone(),
            gross: s.gross,
            handling_cut: s.handling_cut,
            debt_netted: s.debt_paid,
            principal_to_supplier: s.principal_to_supplier,
            coop_margin: s.coop_margin,
            net_paid: s.net_to_farmer,
            settled_vol_g: agreement.settled_vol_g,
        }
        .publish(&env);
        emit_reputation(&env, &reputation);
        emit_coop_reputation(&env, &coop_rep);
        Ok(())
    }

    /// Coop records crop failure / disaster. Closes the agreement as
    /// ForceMajeure and increments `force_majeure_events` — which is TRACKED but
    /// NOT penalized (no flag, no reputation hit). Requires coop auth.
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

    /// KMP asserts it has remitted the residu principal to Supplier (off-chain
    /// bank transfer; proof/ref uploaded off-chain, anchored here as `ref_hash`).
    /// Requires the agreement to have residu principal owed and `ResiduStatus`
    /// == Pending. Pending -> Remitted. Requires coop auth.
    pub fn mark_residu_remitted(
        env: Env,
        coop: Address,
        id: u64,
        ref_hash: BytesN<32>,
    ) -> Result<(), ContractError> {
        coop.require_auth();
        storage::extend_instance(&env);

        let mut agreement = storage::get_agreement(&env, id)?;
        if agreement.coop != coop {
            return Err(ContractError::Unauthorized);
        }
        if agreement.residu_status != ResiduStatus::Pending || agreement.residu_principal <= 0 {
            return Err(ContractError::InvalidResiduStatus);
        }

        agreement.residu_status = ResiduStatus::Remitted;
        let amount = agreement.residu_principal;
        storage::set_agreement(&env, &agreement);

        ResiduRemitted {
            id,
            coop,
            amount,
            ref_hash,
        }
        .publish(&env);
        Ok(())
    }

    /// Supplier verifies the real bank mutation of the residu principal.
    /// Remitted -> Cleared; the coop's `total_residu_cleared` accrues. Requires
    /// the agreement's supplier auth. (Path-A style: off-chain rupiah verified,
    /// then anchored.)
    pub fn confirm_remittance(env: Env, supplier: Address, id: u64) -> Result<(), ContractError> {
        supplier.require_auth();
        storage::extend_instance(&env);

        let mut agreement = storage::get_agreement(&env, id)?;
        if agreement.supplier != supplier {
            return Err(ContractError::Unauthorized);
        }
        if agreement.residu_status != ResiduStatus::Remitted {
            return Err(ContractError::InvalidResiduStatus);
        }

        agreement.residu_status = ResiduStatus::Cleared;
        let principal = agreement.residu_principal;
        let coop = agreement.coop.clone();
        storage::set_agreement(&env, &agreement);

        let mut coop_rep = storage::get_coop_reputation(&env, &coop);
        coop_rep.total_residu_cleared = coop_rep
            .total_residu_cleared
            .checked_add(principal)
            .ok_or(ContractError::MathOverflow)?;
        storage::set_coop_reputation(&env, &coop_rep);

        RemittanceCleared {
            id,
            coop,
            principal,
            supplier,
        }
        .publish(&env);
        emit_coop_reputation(&env, &coop_rep);
        Ok(())
    }

    /// Supplier found a mismatch / manipulation on a claimed remittance.
    /// Remitted -> Disputed; the coop's `disputes` counter bumps and `frozen`
    /// is set (an INDICATOR for human resolution, never an auto-accusation).
    /// Requires the agreement's supplier auth.
    pub fn flag_remittance_dispute(
        env: Env,
        supplier: Address,
        id: u64,
        reason: Symbol,
    ) -> Result<(), ContractError> {
        supplier.require_auth();
        storage::extend_instance(&env);

        let mut agreement = storage::get_agreement(&env, id)?;
        if agreement.supplier != supplier {
            return Err(ContractError::Unauthorized);
        }
        if agreement.residu_status != ResiduStatus::Remitted {
            return Err(ContractError::InvalidResiduStatus);
        }

        agreement.residu_status = ResiduStatus::Disputed;
        let coop = agreement.coop.clone();
        storage::set_agreement(&env, &agreement);

        let mut coop_rep = storage::get_coop_reputation(&env, &coop);
        coop_rep.disputes += 1;
        coop_rep.frozen = true;
        storage::set_coop_reputation(&env, &coop_rep);

        RemittanceDisputed { id, coop, reason }.publish(&env);
        emit_coop_reputation(&env, &coop_rep);
        Ok(())
    }

    /// Admin resolves a dispute: unfreezes the coop and returns the agreement's
    /// residu to Remitted (awaiting Supplier re-verification). The `disputes`
    /// counter is historical and left intact. Requires admin auth.
    pub fn resolve_dispute(
        env: Env,
        admin: Address,
        coop: Address,
        id: u64,
    ) -> Result<(), ContractError> {
        admin.require_auth();
        storage::extend_instance(&env);

        let stored_admin = storage::get_admin(&env)?;
        if admin != stored_admin {
            return Err(ContractError::Unauthorized);
        }

        let mut agreement = storage::get_agreement(&env, id)?;
        if agreement.coop != coop {
            return Err(ContractError::Unauthorized);
        }
        if agreement.residu_status != ResiduStatus::Disputed {
            return Err(ContractError::InvalidResiduStatus);
        }

        agreement.residu_status = ResiduStatus::Remitted;
        storage::set_agreement(&env, &agreement);

        let mut coop_rep = storage::get_coop_reputation(&env, &coop);
        coop_rep.frozen = false;
        storage::set_coop_reputation(&env, &coop_rep);

        RemittanceResolved { id, coop, admin }.publish(&env);
        emit_coop_reputation(&env, &coop_rep);
        Ok(())
    }

    // ── Offtake financing (§B) — a parallel lifecycle, independent of the
    // Created→Settled agreement machine. Requested → Approved → Disbursed →
    // Reconciled, with a reject branch. References its backing agreements only
    // off-chain via `backing_hash`. ──

    /// KMP requests working-capital *talangan* backed by an off-chain proof packet
    /// (agreement ids + receipts hashed into `backing_hash`). `projected_settlement`
    /// is the sum of kg × hpp across the backing agreements (the coverage
    /// denominator the financier reads off-chain). Status = Requested. Returns the
    /// new funding id. Requires coop auth.
    pub fn request_funding(
        env: Env,
        coop: Address,
        financier: Address,
        backing_hash: BytesN<32>,
        projected_settlement: i128,
        amount_requested: i128,
    ) -> Result<u64, ContractError> {
        coop.require_auth();
        storage::extend_instance(&env);

        if amount_requested <= 0 || projected_settlement <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        let id = storage::get_next_funding_id(&env);
        let funding = FundingRequest {
            id,
            coop: coop.clone(),
            financier: financier.clone(),
            backing_hash: backing_hash.clone(),
            projected_settlement,
            amount_requested,
            amount_approved: 0,
            amount_disbursed: 0,
            amount_reconciled: 0,
            status: FundingStatus::Requested,
        };
        storage::set_funding(&env, &funding);
        storage::set_next_funding_id(&env, id + 1);

        FundingRequested {
            id,
            coop,
            financier,
            projected_settlement,
            amount_requested,
            backing_hash,
        }
        .publish(&env);
        Ok(id)
    }

    /// Financier approves an amount (`0 < amount_approved <= amount_requested`).
    /// Requested -> Approved. Bound to the request's `financier`. Requires
    /// financier auth.
    pub fn approve_funding(
        env: Env,
        financier: Address,
        id: u64,
        amount_approved: i128,
    ) -> Result<(), ContractError> {
        financier.require_auth();
        storage::extend_instance(&env);

        let mut funding = storage::get_funding(&env, id)?;
        if funding.financier != financier {
            return Err(ContractError::Unauthorized);
        }
        if funding.status != FundingStatus::Requested {
            return Err(ContractError::InvalidFundingStatus);
        }
        if amount_approved <= 0 || amount_approved > funding.amount_requested {
            return Err(ContractError::InvalidAmount);
        }

        funding.amount_approved = amount_approved;
        funding.status = FundingStatus::Approved;
        storage::set_funding(&env, &funding);

        FundingApproved {
            id,
            financier,
            amount_approved,
        }
        .publish(&env);
        Ok(())
    }

    /// Financier declines. Requested -> Rejected (reason off-chain). Bound to the
    /// request's `financier`. Requires financier auth.
    pub fn reject_funding(
        env: Env,
        financier: Address,
        id: u64,
        reason: Symbol,
    ) -> Result<(), ContractError> {
        financier.require_auth();
        storage::extend_instance(&env);

        let mut funding = storage::get_funding(&env, id)?;
        if funding.financier != financier {
            return Err(ContractError::Unauthorized);
        }
        if funding.status != FundingStatus::Requested {
            return Err(ContractError::InvalidFundingStatus);
        }

        funding.status = FundingStatus::Rejected;
        storage::set_funding(&env, &funding);

        FundingRejected {
            id,
            financier,
            reason,
        }
        .publish(&env);
        Ok(())
    }

    /// Financier disburses `amount_approved` to KMP as a REAL dIDR transfer
    /// (financier → coop) via the deploy-set token — the second visible on-chain
    /// money movement in the demo, alongside the settlement payout. Approved ->
    /// Disbursed. Bound to the request's `financier`. Requires financier auth,
    /// which ALSO authorizes the nested token-transfer sub-invocation (unlike
    /// `settle`, the money moves FROM the caller, not the contract balance).
    pub fn disburse_funding(env: Env, financier: Address, id: u64) -> Result<(), ContractError> {
        financier.require_auth();
        storage::extend_instance(&env);

        let mut funding = storage::get_funding(&env, id)?;
        if funding.financier != financier {
            return Err(ContractError::Unauthorized);
        }
        if funding.status != FundingStatus::Approved {
            return Err(ContractError::InvalidFundingStatus);
        }

        let amount = funding.amount_approved;
        funding.amount_disbursed = amount;
        funding.status = FundingStatus::Disbursed;
        let coop = funding.coop.clone();
        storage::set_funding(&env, &funding);

        // Real money movement, financier -> coop, via the deploy-set token
        // (never a caller-supplied address). The financier authorizes this
        // sub-invocation as part of require_auth() above.
        let token_addr = storage::get_token(&env)?;
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&financier, &coop, &amount);

        FundingDisbursed {
            id,
            financier,
            amount_disbursed: amount,
            coop,
        }
        .publish(&env);
        Ok(())
    }

    /// Net collected input-principal against an outstanding advance. Accumulates
    /// `amount_reconciled`, CLAMPED so it never exceeds `amount_disbursed` (an
    /// over-reported collection cannot inflate repayment); flips Disbursed ->
    /// Reconciled once fully repaid. Auth mirrors `settle` (§9): the request's
    /// `coop` OR the admin (Path A service key) — so the same backend that drives
    /// `settle` can drive the financing-repayment leg without a fresh coop
    /// signature every time. (Open Decision B: a SEPARATE explicit call in MVP —
    /// NOT auto-hooked into `settle()`; that is a v4.1 nicety.)
    pub fn reconcile_funding(
        env: Env,
        caller: Address,
        id: u64,
        principal_collected: i128,
    ) -> Result<(), ContractError> {
        caller.require_auth();
        storage::extend_instance(&env);

        if principal_collected <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        let mut funding = storage::get_funding(&env, id)?;
        let admin = storage::get_admin(&env)?;
        if caller != funding.coop && caller != admin {
            return Err(ContractError::Unauthorized);
        }
        if funding.status != FundingStatus::Disbursed {
            return Err(ContractError::InvalidFundingStatus);
        }

        let proposed = funding
            .amount_reconciled
            .checked_add(principal_collected)
            .ok_or(ContractError::MathOverflow)?;
        funding.amount_reconciled = if proposed > funding.amount_disbursed {
            funding.amount_disbursed
        } else {
            proposed
        };
        let remaining = funding
            .amount_disbursed
            .checked_sub(funding.amount_reconciled)
            .ok_or(ContractError::MathOverflow)?;
        if remaining == 0 {
            funding.status = FundingStatus::Reconciled;
        }
        let amount_reconciled = funding.amount_reconciled;
        let coop = funding.coop.clone();
        storage::set_funding(&env, &funding);

        FundingReconciled {
            id,
            coop,
            amount_reconciled,
            remaining,
        }
        .publish(&env);
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

    pub fn get_coop_reputation(env: Env, coop: Address) -> CoopReputation {
        storage::get_coop_reputation(&env, &coop)
    }

    pub fn get_funding(env: Env, id: u64) -> Result<FundingRequest, ContractError> {
        storage::get_funding(&env, id)
    }

    pub fn get_admin(env: Env) -> Result<Address, ContractError> {
        storage::get_admin(&env)
    }
}

/// Emit `ReputationUpdated` from the current farmer counters. The event payload
/// mirrors `packages/core` (no force_majeure_events field there).
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

/// Emit `CoopReputationUpdated` from the current coop counters. Payload mirrors
/// `packages/core` (no `agreements`/`total_residu_principal` fields there — the
/// indexer derives those from AgreementCreated / Settled events).
fn emit_coop_reputation(env: &Env, coop_rep: &CoopReputation) {
    CoopReputationUpdated {
        coop: coop_rep.coop.clone(),
        settlements: coop_rep.settlements,
        total_residu_cleared: coop_rep.total_residu_cleared,
        disputes: coop_rep.disputes,
        frozen: coop_rep.frozen,
    }
    .publish(env);
}
