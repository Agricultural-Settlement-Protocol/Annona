//! Typed storage accessors + TTL extension, centralized so no magic TTL numbers
//! leak into business logic.
//!
//! Storage classes: Admin/Token/NextId -> instance() (small global config,
//! shared instance TTL). Agreement/Receipts/Reputation -> persistent() (must
//! survive a full growing season; archived-but-restorable). Every accessor that
//! touches a persistent entry also extends its TTL.

use soroban_sdk::{Address, Env, Vec};

use crate::errors::ContractError;
use crate::types::{
    Agreement, CoopReputation, DataKey, FundingRequest, HarvestReceipt, Reputation,
};

// ~5s/ledger. Extend to ~30 days when TTL drops under ~1 day. Ample for the
// hackathon (testnet resets quarterly anyway); tune EXTEND_TO up for prod.
pub const TTL_THRESHOLD: u32 = 17_280; // ~1 day
pub const TTL_EXTEND_TO: u32 = 518_400; // ~30 days

/// Extend the instance TTL. Called at the top of every public function.
pub fn extend_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
}

// ── Admin ──
pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_admin(env: &Env) -> Result<Address, ContractError> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(ContractError::NotInitialized)
}

// ── Settlement token (dIDR SAC) ──
pub fn set_token(env: &Env, token: &Address) {
    env.storage().instance().set(&DataKey::Token, token);
}

pub fn get_token(env: &Env) -> Result<Address, ContractError> {
    env.storage()
        .instance()
        .get(&DataKey::Token)
        .ok_or(ContractError::NotInitialized)
}

// ── Agreement id counter ──
pub fn get_next_id(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::NextId)
        .unwrap_or(0u64)
}

pub fn set_next_id(env: &Env, id: u64) {
    env.storage().instance().set(&DataKey::NextId, &id);
}

// ── Funding-request id counter ──
pub fn get_next_funding_id(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::NextFundingId)
        .unwrap_or(0u64)
}

pub fn set_next_funding_id(env: &Env, id: u64) {
    env.storage().instance().set(&DataKey::NextFundingId, &id);
}

// ── FundingRequest ──
pub fn set_funding(env: &Env, funding: &FundingRequest) {
    let key = DataKey::Funding(funding.id);
    env.storage().persistent().set(&key, funding);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub fn get_funding(env: &Env, id: u64) -> Result<FundingRequest, ContractError> {
    let key = DataKey::Funding(id);
    let funding = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::FundingNotFound)?;
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    Ok(funding)
}

// ── Agreement ──
pub fn set_agreement(env: &Env, agreement: &Agreement) {
    let key = DataKey::Agreement(agreement.id);
    env.storage().persistent().set(&key, agreement);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

pub fn get_agreement(env: &Env, id: u64) -> Result<Agreement, ContractError> {
    let key = DataKey::Agreement(id);
    let agreement = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::AgreementNotFound)?;
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    Ok(agreement)
}

// ── Receipts (per-agreement append-only log) ──
pub fn get_receipts(env: &Env, id: u64) -> Vec<HarvestReceipt> {
    env.storage()
        .persistent()
        .get(&DataKey::Receipts(id))
        .unwrap_or_else(|| Vec::new(env))
}

pub fn set_receipts(env: &Env, id: u64, receipts: &Vec<HarvestReceipt>) {
    let key = DataKey::Receipts(id);
    env.storage().persistent().set(&key, receipts);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

// ── Reputation (per-farmer counters; defaults to zeros for new farmers) ──
pub fn get_reputation(env: &Env, farmer: &Address) -> Reputation {
    env.storage()
        .persistent()
        .get(&DataKey::Reputation(farmer.clone()))
        .unwrap_or_else(|| Reputation {
            farmer: farmer.clone(),
            total_settled_g: 0,
            deliveries: 0,
            on_time_settlements: 0,
            flags: 0,
            force_majeure_events: 0,
        })
}

pub fn set_reputation(env: &Env, reputation: &Reputation) {
    let key = DataKey::Reputation(reputation.farmer.clone());
    env.storage().persistent().set(&key, reputation);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}

// ── CoopReputation (per-KMP counters; defaults to zeros for a new coop) ──
pub fn get_coop_reputation(env: &Env, coop: &Address) -> CoopReputation {
    env.storage()
        .persistent()
        .get(&DataKey::CoopReputation(coop.clone()))
        .unwrap_or_else(|| CoopReputation {
            coop: coop.clone(),
            agreements: 0,
            settlements: 0,
            total_residu_principal: 0,
            total_residu_cleared: 0,
            disputes: 0,
            frozen: false,
        })
}

pub fn set_coop_reputation(env: &Env, coop_rep: &CoopReputation) {
    let key = DataKey::CoopReputation(coop_rep.coop.clone());
    env.storage().persistent().set(&key, coop_rep);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
}
