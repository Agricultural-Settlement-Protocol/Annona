#![cfg(test)]
//! Unit tests for the offtake-registry (v3.0 multi-party model).
//!
//! Money values here use the spec's worked-example whole-rupiah numbers for 1:1
//! readability against `docs/technical/SMART-CONTRACT.md` section 5. The contract
//! math is decimal-agnostic — dIDR's 7 decimals are a token/UI concern, so in
//! production every amount below is x10,000,000.

use soroban_sdk::{
    symbol_short,
    testutils::{storage::Persistent as _, Address as _, Events as _},
    token,
    xdr::{ContractEventBody, ScVal},
    Address, BytesN, Env,
};

use crate::errors::ContractError;
use crate::types::{Commodity, DataKey, FlagReason, ResiduStatus, Status};
use crate::{OfftakeRegistry, OfftakeRegistryClient};

// Spec worked-example constants (whole rupiah).
const HPP_PER_KG: i128 = 6_500;
const BASE_PRICE: i128 = 2_000_000; // Agrinas principal
const MARKUP_BPS: u32 = 1_000; // 10% KMP markup
const HANDLING_BPS: u32 = 500; // 5% KMP handling cut
const INPUT_DEBT: i128 = 2_200_000; // derived = 2,000,000 * 1.10
const EXPECTED_VOL_G: i128 = 2_750_000; // 0.5 ha x 5.5 t/ha
const PREFUND: i128 = 100_000_000; // dIDR pre-funded into the contract (escrow-lite)

struct Harness {
    env: Env,
    client: OfftakeRegistryClient<'static>,
    contract_id: Address,
    token_addr: Address,
    admin: Address,
    coop: Address,
    agrinas: Address,
    farmer: Address,
}

fn setup() -> Harness {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let coop = Address::generate(&env);
    let agrinas = Address::generate(&env);
    let farmer = Address::generate(&env);

    // dIDR as a SAC; admin is the issuer/mint authority.
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();

    // Deploy the registry via its __constructor(admin, token).
    let contract_id = env.register(OfftakeRegistry, (admin.clone(), token_addr.clone()));
    let client = OfftakeRegistryClient::new(&env, &contract_id);

    // Escrow-lite: coop treasury pre-funds the contract so settle() can pay out.
    token::StellarAssetClient::new(&env, &token_addr).mint(&contract_id, &PREFUND);

    Harness {
        env,
        client,
        contract_id,
        token_addr,
        admin,
        coop,
        agrinas,
        farmer,
    }
}

fn commodity() -> Commodity {
    Commodity {
        code: symbol_short!("GABAH"),
        grade: symbol_short!("A"),
        moisture_bps: 1_400,
        hpp_version: 1,
    }
}

fn ktp(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[7u8; 32])
}

fn ref_hash(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[9u8; 32])
}

/// Draft an agreement (status Created).
fn create(h: &Harness) -> u64 {
    h.client.create_agreement(
        &h.coop,
        &h.farmer,
        &h.agrinas,
        &commodity(),
        &BASE_PRICE,
        &MARKUP_BPS,
        &HANDLING_BPS,
        &EXPECTED_VOL_G,
        &HPP_PER_KG,
        &2_000, // tolerance_bps (stored, reserved)
        &ktp(&h.env),
    )
}

/// Draft + pass both gates (status Active), the precondition for deliveries.
fn create_active(h: &Harness) -> u64 {
    let id = create(h);
    h.client.dispatch_supply(&h.agrinas, &id);
    h.client.accept_supply(&h.coop, &id);
    id
}

/// Full happy path to a terminal Settled agreement with residu Pending.
fn create_settled(h: &Harness) -> u64 {
    let id = create_active(h);
    deliver(h, id, 2_600_000); // 2600 kg -> Delivered/Warning
    h.client.settle(&h.coop, &id);
    id
}

fn deliver(h: &Harness, id: u64, volume_g: i128) {
    h.client
        .record_delivery(&h.coop, &id, &volume_g, &symbol_short!("A"));
}

fn balance(h: &Harness, who: &Address) -> i128 {
    token::Client::new(&h.env, &h.token_addr).balance(who)
}

// ── constructor + reads ───────────────────────────────────────────────────

#[test]
fn constructor_sets_admin_and_token() {
    let h = setup();
    assert_eq!(h.client.get_admin(), h.admin);
}

// ── create_agreement ───────────────────────────────────────────────────────

#[test]
fn create_agreement_happy_and_derives_input_debt() {
    let h = setup();
    let id = create(&h);
    // Assert events BEFORE any read invocation: env.events().all() reflects only
    // the most recent invocation, and a read emits none.
    assert!(!h.env.events().all().events().is_empty());
    assert_eq!(id, 0);

    let a = h.client.get_agreement(&id);
    assert_eq!(a.status, Status::Created);
    assert_eq!(a.flag, FlagReason::None);
    assert_eq!(a.agrinas, h.agrinas);
    // input_debt DERIVED from principal + markup, never free-entered.
    assert_eq!(a.base_price_agrinas, BASE_PRICE);
    assert_eq!(a.input_debt, INPUT_DEBT);
    assert_eq!(a.remaining_debt, INPUT_DEBT);
    assert_eq!(a.residu_status, ResiduStatus::Pending);
    assert_eq!(a.delivered_vol_g, 0);
    assert_eq!(a.paid_to_farmer, 0);

    // Coop agreement counter bumps.
    assert_eq!(h.client.get_coop_reputation(&h.coop).agreements, 1);

    // Second agreement gets the next id.
    assert_eq!(create(&h), 1);
    assert_eq!(h.client.get_coop_reputation(&h.coop).agreements, 2);
}

#[test]
fn create_agreement_rejects_nonpositive_amounts() {
    let h = setup();
    let c = commodity();
    let k = ktp(&h.env);
    // base_price_agrinas <= 0
    assert_eq!(
        h.client.try_create_agreement(
            &h.coop, &h.farmer, &h.agrinas, &c, &0, &MARKUP_BPS, &HANDLING_BPS, &EXPECTED_VOL_G,
            &HPP_PER_KG, &2_000, &k
        ),
        Err(Ok(ContractError::InvalidAmount))
    );
    // expected_vol_g <= 0
    assert_eq!(
        h.client.try_create_agreement(
            &h.coop, &h.farmer, &h.agrinas, &c, &BASE_PRICE, &MARKUP_BPS, &HANDLING_BPS, &0,
            &HPP_PER_KG, &2_000, &k
        ),
        Err(Ok(ContractError::InvalidAmount))
    );
    // hpp_per_kg <= 0
    assert_eq!(
        h.client.try_create_agreement(
            &h.coop, &h.farmer, &h.agrinas, &c, &BASE_PRICE, &MARKUP_BPS, &HANDLING_BPS,
            &EXPECTED_VOL_G, &0, &2_000, &k
        ),
        Err(Ok(ContractError::InvalidAmount))
    );
}

#[test]
fn create_agreement_records_coop_authorization() {
    let h = setup();
    create(&h);
    let auths = h.env.auths();
    assert_eq!(auths.first().map(|(addr, _)| addr.clone()), Some(h.coop.clone()));
}

// ── confirmation gates ─────────────────────────────────────────────────────

#[test]
fn gate_flow_created_to_active() {
    let h = setup();
    let id = create(&h);
    assert_eq!(h.client.get_agreement(&id).status, Status::Created);
    h.client.dispatch_supply(&h.agrinas, &id);
    assert_eq!(h.client.get_agreement(&id).status, Status::SupplyDispatched);
    h.client.accept_supply(&h.coop, &id);
    assert_eq!(h.client.get_agreement(&id).status, Status::Active);
}

#[test]
fn cannot_accept_before_dispatch() {
    let h = setup();
    let id = create(&h);
    assert_eq!(
        h.client.try_accept_supply(&h.coop, &id),
        Err(Ok(ContractError::InvalidStatus))
    );
}

#[test]
fn cannot_dispatch_twice() {
    let h = setup();
    let id = create(&h);
    h.client.dispatch_supply(&h.agrinas, &id);
    assert_eq!(
        h.client.try_dispatch_supply(&h.agrinas, &id),
        Err(Ok(ContractError::InvalidStatus))
    );
}

#[test]
fn cannot_deliver_before_active() {
    let h = setup();
    let id = create(&h);
    // Created: not past the gates.
    assert_eq!(
        h.client.try_record_delivery(&h.coop, &id, &100_000, &symbol_short!("A")),
        Err(Ok(ContractError::InvalidStatus))
    );
    // SupplyDispatched: still not past gate 2.
    h.client.dispatch_supply(&h.agrinas, &id);
    assert_eq!(
        h.client.try_record_delivery(&h.coop, &id, &100_000, &symbol_short!("A")),
        Err(Ok(ContractError::InvalidStatus))
    );
}

#[test]
fn dispatch_by_wrong_agrinas_is_unauthorized() {
    let h = setup();
    let id = create(&h);
    let stranger = Address::generate(&h.env);
    assert_eq!(
        h.client.try_dispatch_supply(&stranger, &id),
        Err(Ok(ContractError::Unauthorized))
    );
}

#[test]
fn accept_by_wrong_coop_is_unauthorized() {
    let h = setup();
    let id = create(&h);
    h.client.dispatch_supply(&h.agrinas, &id);
    let other_coop = Address::generate(&h.env);
    assert_eq!(
        h.client.try_accept_supply(&other_coop, &id),
        Err(Ok(ContractError::Unauthorized))
    );
}

// ── record_delivery: flag bands ────────────────────────────────────────────

#[test]
fn delivery_clean_band_no_flag() {
    let h = setup();
    let id = create_active(&h);
    deliver(&h, id, 2_700_000); // 98.18% of 2,750,000
    let a = h.client.get_agreement(&id);
    assert_eq!(a.status, Status::Delivered);
    assert_eq!(a.flag, FlagReason::None);
    assert_eq!(h.client.get_receipts(&id).get(0).unwrap().seq, 0);
}

#[test]
fn delivery_warning_band() {
    let h = setup();
    let id = create_active(&h);
    deliver(&h, id, 2_400_000); // 87.3%
    let a = h.client.get_agreement(&id);
    assert_eq!(a.status, Status::Delivered);
    assert_eq!(a.flag, FlagReason::Warning);
}

#[test]
fn delivery_partial_band() {
    let h = setup();
    let id = create_active(&h);
    deliver(&h, id, 1_650_000); // 60%
    let a = h.client.get_agreement(&id);
    assert_eq!(a.status, Status::PartiallyDelivered);
    assert_eq!(a.flag, FlagReason::PartialDelivery);
    assert_eq!(h.client.get_reputation(&h.farmer).flags, 1);
}

#[test]
fn delivery_suspected_band() {
    let h = setup();
    let id = create_active(&h);
    deliver(&h, id, 825_000); // 30%
    let a = h.client.get_agreement(&id);
    assert_eq!(a.status, Status::Flagged);
    assert_eq!(a.flag, FlagReason::Suspected);
    assert_eq!(h.client.get_reputation(&h.farmer).flags, 1);
}

#[test]
fn flag_heals_upward_across_deliveries() {
    let h = setup();
    let id = create_active(&h);
    deliver(&h, id, 1_375_000); // 50% -> PartialDelivery
    assert_eq!(h.client.get_agreement(&id).flag, FlagReason::PartialDelivery);
    deliver(&h, id, 1_225_000); // cumulative 2,600,000 = 94.5% -> Warning
    let a = h.client.get_agreement(&id);
    assert_eq!(a.status, Status::Delivered);
    assert_eq!(a.flag, FlagReason::Warning);
    assert_eq!(h.client.get_reputation(&h.farmer).deliveries, 2);
}

#[test]
fn record_delivery_rejects_nonpositive_volume() {
    let h = setup();
    let id = create_active(&h);
    assert_eq!(
        h.client.try_record_delivery(&h.coop, &id, &0, &symbol_short!("A")),
        Err(Ok(ContractError::InvalidAmount))
    );
}

#[test]
fn record_delivery_by_wrong_coop_is_unauthorized() {
    let h = setup();
    let id = create_active(&h);
    let other_coop = Address::generate(&h.env);
    assert_eq!(
        h.client.try_record_delivery(&other_coop, &id, &100_000, &symbol_short!("A")),
        Err(Ok(ContractError::Unauthorized))
    );
}

#[test]
fn record_delivery_on_closed_agreement_rejected() {
    let h = setup();
    let id = create_settled(&h); // Delivered -> Settled
    assert_eq!(
        h.client.try_record_delivery(&h.coop, &id, &100_000, &symbol_short!("A")),
        Err(Ok(ContractError::AlreadyClosed))
    );
}

// ── settle: three-way split worked examples ────────────────────────────────

#[test]
fn settle_single_matches_worked_example() {
    let h = setup();
    let id = create_active(&h);
    deliver(&h, id, 2_600_000); // 2600 kg, Delivered/Warning

    h.client.settle(&h.coop, &id);

    let a = h.client.get_agreement(&id);
    assert_eq!(a.status, Status::Settled);
    assert_eq!(a.remaining_debt, 0);
    assert_eq!(a.settled_vol_g, 2_600_000);
    // gross 16,900,000; handling 845,000; debt 2,200,000; net 13,855,000.
    assert_eq!(a.paid_to_farmer, 13_855_000);
    assert_eq!(a.coop_handling_accrued, 845_000);
    assert_eq!(a.coop_margin_accrued, 200_000);
    assert_eq!(a.residu_principal, 2_000_000);
    assert_eq!(a.residu_status, ResiduStatus::Pending);
    assert_eq!(balance(&h, &h.farmer), 13_855_000);

    let rep = h.client.get_reputation(&h.farmer);
    assert_eq!(rep.total_settled_g, 2_600_000);
    assert_eq!(rep.on_time_settlements, 1);

    let cr = h.client.get_coop_reputation(&h.coop);
    assert_eq!(cr.settlements, 1);
    assert_eq!(cr.total_residu_principal, 2_000_000);
    assert_eq!(cr.total_residu_cleared, 0);
}

#[test]
fn settle_staged_totals_match_single() {
    let h = setup();
    let id = create_active(&h);

    // Delivery 1: 1000 kg (36% -> Flagged). gross 6,500,000, handling 325,000,
    // net_before 6,175,000, debt 2,200,000 -> net 3,975,000.
    deliver(&h, id, 1_000_000);
    h.client.settle(&h.coop, &id);
    let a1 = h.client.get_agreement(&id);
    assert_eq!(a1.paid_to_farmer, 3_975_000);
    assert_eq!(a1.remaining_debt, 0);
    assert_eq!(a1.residu_principal, 2_000_000);
    assert_eq!(a1.coop_margin_accrued, 200_000);
    // Not terminal: still Flagged, open for more deliveries.
    assert_eq!(a1.status, Status::Flagged);
    assert_eq!(balance(&h, &h.farmer), 3_975_000);

    // Delivery 2: +1600 kg (cumulative 94.5% -> Delivered). gross 10,400,000,
    // handling 520,000, debt 0 -> net 9,880,000.
    deliver(&h, id, 1_600_000);
    h.client.settle(&h.coop, &id);
    let a2 = h.client.get_agreement(&id);
    assert_eq!(a2.paid_to_farmer, 13_855_000); // identical to single-settle total
    assert_eq!(a2.coop_handling_accrued, 845_000);
    assert_eq!(a2.residu_principal, 2_000_000);
    assert_eq!(a2.status, Status::Settled);
    assert_eq!(balance(&h, &h.farmer), 13_855_000);
}

#[test]
fn settle_floors_net_at_zero_when_debt_exceeds_gross() {
    let h = setup();
    // Large principal (markup 0 -> input_debt == principal) vs a small delivery.
    let id = h.client.create_agreement(
        &h.coop,
        &h.farmer,
        &h.agrinas,
        &commodity(),
        &100_000_000, // base_price_agrinas
        &0,           // markup -> input_debt 100,000,000
        &HANDLING_BPS,
        &EXPECTED_VOL_G,
        &HPP_PER_KG,
        &2_000,
        &ktp(&h.env),
    );
    h.client.dispatch_supply(&h.agrinas, &id);
    h.client.accept_supply(&h.coop, &id);
    deliver(&h, id, 100_000); // 100 kg -> gross 650,000, handling 32,500
    h.client.settle(&h.coop, &id);

    let a = h.client.get_agreement(&id);
    assert_eq!(a.paid_to_farmer, 0); // net floored at 0
    assert_eq!(a.coop_handling_accrued, 32_500); // handling still taken
    // (gross - handling) = 617,500 all went to debt.
    assert_eq!(a.remaining_debt, 100_000_000 - 617_500);
    assert_eq!(a.residu_principal, 617_500);
    assert_eq!(a.settled_vol_g, 100_000);
    assert_eq!(balance(&h, &h.farmer), 0); // no transfer for a zero net
}

#[test]
fn settle_with_nothing_delivered_errors() {
    let h = setup();
    let id = create_active(&h); // Active, 0 delivered
    assert_eq!(
        h.client.try_settle(&h.coop, &id),
        Err(Ok(ContractError::NothingToSettle))
    );
}

#[test]
fn settle_twice_without_new_delivery_errors() {
    let h = setup();
    let id = create_active(&h);
    deliver(&h, id, 1_375_000); // 50% -> Flagged (non-terminal after settle)
    h.client.settle(&h.coop, &id);
    assert_eq!(
        h.client.try_settle(&h.coop, &id),
        Err(Ok(ContractError::NothingToSettle))
    );
}

#[test]
fn settle_by_admin_is_allowed() {
    // Path A: a backend service key (== admin here) triggers settle.
    let h = setup();
    let id = create_active(&h);
    deliver(&h, id, 2_600_000);
    h.client.settle(&h.admin, &id);
    assert_eq!(balance(&h, &h.farmer), 13_855_000);
}

#[test]
fn settle_by_stranger_is_unauthorized() {
    let h = setup();
    let id = create_active(&h);
    deliver(&h, id, 2_600_000);
    let stranger = Address::generate(&h.env);
    assert_eq!(
        h.client.try_settle(&stranger, &id),
        Err(Ok(ContractError::Unauthorized))
    );
}

#[test]
fn settle_on_force_majeure_rejected() {
    let h = setup();
    let id = create_active(&h);
    deliver(&h, id, 500_000);
    h.client.mark_force_majeure(&h.coop, &id, &symbol_short!("FLOOD"));
    assert_eq!(
        h.client.try_settle(&h.coop, &id),
        Err(Ok(ContractError::AlreadyClosed))
    );
}

// ── residu reconciliation ──────────────────────────────────────────────────

#[test]
fn residu_lifecycle_pending_remitted_cleared() {
    let h = setup();
    let id = create_settled(&h);
    assert_eq!(h.client.get_agreement(&id).residu_status, ResiduStatus::Pending);

    h.client.mark_residu_remitted(&h.coop, &id, &ref_hash(&h.env));
    assert_eq!(h.client.get_agreement(&id).residu_status, ResiduStatus::Remitted);

    h.client.confirm_remittance(&h.agrinas, &id);
    assert_eq!(h.client.get_agreement(&id).residu_status, ResiduStatus::Cleared);

    let cr = h.client.get_coop_reputation(&h.coop);
    assert_eq!(cr.total_residu_cleared, 2_000_000);
    assert_eq!(cr.settlements, 1);
    assert!(!cr.frozen);
}

#[test]
fn confirm_before_remit_errors() {
    let h = setup();
    let id = create_settled(&h); // residu Pending, not Remitted
    assert_eq!(
        h.client.try_confirm_remittance(&h.agrinas, &id),
        Err(Ok(ContractError::InvalidResiduStatus))
    );
}

#[test]
fn remit_without_residu_errors() {
    let h = setup();
    let id = create_active(&h); // no settle -> residu_principal 0
    assert_eq!(
        h.client.try_mark_residu_remitted(&h.coop, &id, &ref_hash(&h.env)),
        Err(Ok(ContractError::InvalidResiduStatus))
    );
}

#[test]
fn mark_residu_remitted_by_wrong_coop_unauthorized() {
    let h = setup();
    let id = create_settled(&h);
    let other = Address::generate(&h.env);
    assert_eq!(
        h.client.try_mark_residu_remitted(&other, &id, &ref_hash(&h.env)),
        Err(Ok(ContractError::Unauthorized))
    );
}

#[test]
fn confirm_remittance_by_wrong_agrinas_unauthorized() {
    let h = setup();
    let id = create_settled(&h);
    h.client.mark_residu_remitted(&h.coop, &id, &ref_hash(&h.env));
    let other = Address::generate(&h.env);
    assert_eq!(
        h.client.try_confirm_remittance(&other, &id),
        Err(Ok(ContractError::Unauthorized))
    );
}

#[test]
fn dispute_freezes_then_resolve_unfreezes() {
    let h = setup();
    let id = create_settled(&h);
    h.client.mark_residu_remitted(&h.coop, &id, &ref_hash(&h.env));

    h.client
        .flag_remittance_dispute(&h.agrinas, &id, &symbol_short!("MISMATCH"));
    let cr = h.client.get_coop_reputation(&h.coop);
    assert_eq!(cr.disputes, 1);
    assert!(cr.frozen);
    assert_eq!(h.client.get_agreement(&id).residu_status, ResiduStatus::Disputed);

    // Admin resolves: coop unfreezes, residu returns to Remitted for re-verify.
    h.client.resolve_dispute(&h.admin, &h.coop, &id);
    // Agreement-scoped event lets the indexer un-strand the residu read-model row.
    assert_eq!(topic_arity(&h.env, "remittance_resolved"), Some(3)); // id, coop
    let cr2 = h.client.get_coop_reputation(&h.coop);
    assert!(!cr2.frozen);
    assert_eq!(cr2.disputes, 1); // historical, preserved
    assert_eq!(h.client.get_agreement(&id).residu_status, ResiduStatus::Remitted);
}

#[test]
fn dispute_before_remit_errors() {
    let h = setup();
    let id = create_settled(&h); // residu Pending, never remitted
    assert_eq!(
        h.client.try_flag_remittance_dispute(&h.agrinas, &id, &symbol_short!("X")),
        Err(Ok(ContractError::InvalidResiduStatus))
    );
}

#[test]
fn resolve_dispute_by_non_admin_unauthorized() {
    let h = setup();
    let id = create_settled(&h);
    h.client.mark_residu_remitted(&h.coop, &id, &ref_hash(&h.env));
    h.client
        .flag_remittance_dispute(&h.agrinas, &id, &symbol_short!("MISMATCH"));
    let stranger = Address::generate(&h.env);
    assert_eq!(
        h.client.try_resolve_dispute(&stranger, &h.coop, &id),
        Err(Ok(ContractError::Unauthorized))
    );
}

// ── force majeure ──────────────────────────────────────────────────────────

#[test]
fn mark_force_majeure_closes_without_penalty() {
    let h = setup();
    let id = create_active(&h);
    deliver(&h, id, 400_000); // would be Suspected/Flagged
    h.client.mark_force_majeure(&h.coop, &id, &symbol_short!("DROUGHT"));

    let a = h.client.get_agreement(&id);
    assert_eq!(a.status, Status::ForceMajeure);
    assert_eq!(a.flag, FlagReason::None); // flag cleared, no accusation

    let rep = h.client.get_reputation(&h.farmer);
    assert_eq!(rep.force_majeure_events, 1);
}

// ── reads / errors ─────────────────────────────────────────────────────────

#[test]
fn get_agreement_unknown_id_errors() {
    let h = setup();
    assert_eq!(
        h.client.try_get_agreement(&999),
        Err(Ok(ContractError::AgreementNotFound))
    );
}

#[test]
fn reputation_accumulates_across_agreements() {
    let h = setup();
    let id0 = create_active(&h);
    deliver(&h, id0, 2_600_000);
    h.client.settle(&h.coop, &id0);

    let id1 = create_active(&h);
    deliver(&h, id1, 2_700_000);
    h.client.settle(&h.coop, &id1);

    let rep = h.client.get_reputation(&h.farmer);
    assert_eq!(rep.deliveries, 2);
    assert_eq!(rep.on_time_settlements, 2);
    assert_eq!(rep.total_settled_g, 5_300_000);

    let cr = h.client.get_coop_reputation(&h.coop);
    assert_eq!(cr.settlements, 2);
    assert_eq!(cr.agreements, 2);
}

// ── storage hygiene / arithmetic ───────────────────────────────────────────

#[test]
fn persistent_ttl_extended_on_write() {
    let h = setup();
    let id = create(&h);
    let ttl = h.env.as_contract(&h.contract_id, || {
        h.env.storage().persistent().get_ttl(&DataKey::Agreement(id))
    });
    assert!(ttl > 0);
}

// ── event topic layout (the composability surface the indexer filters on) ──

/// Topic count of the most recent event whose topic[0] Symbol == `name`, or None.
/// Also proves topic[0] encodes as a Symbol (not a String).
fn topic_arity(env: &Env, name: &str) -> Option<usize> {
    let all = env.events().all();
    let mut found = None;
    for ev in all.events() {
        let ContractEventBody::V0(v0) = &ev.body;
        if let Some(ScVal::Symbol(sym)) = v0.topics.first() {
            if sym.0.to_utf8_string_lossy() == name {
                found = Some(v0.topics.len());
            }
        }
    }
    found
}

#[test]
fn event_topic_layout_is_locked() {
    // env.events().all() reflects the most recent invocation, so assert each
    // event's arity right after the call that emits it. Arities per spec §7.
    let h = setup();
    let id = create(&h);
    assert_eq!(topic_arity(&h.env, "agreement_created"), Some(4)); // id, farmer, coop

    h.client.dispatch_supply(&h.agrinas, &id);
    assert_eq!(topic_arity(&h.env, "dispatched"), Some(3)); // id, agrinas

    h.client.accept_supply(&h.coop, &id);
    assert_eq!(topic_arity(&h.env, "accepted"), Some(3)); // id, coop

    deliver(&h, id, 2_600_000);
    assert_eq!(topic_arity(&h.env, "delivery"), Some(2)); // id
    assert_eq!(topic_arity(&h.env, "receipt"), Some(3)); // id, farmer

    h.client.settle(&h.coop, &id);
    assert_eq!(topic_arity(&h.env, "settled"), Some(3)); // id, farmer
    assert_eq!(topic_arity(&h.env, "reputation"), Some(2)); // farmer
    assert_eq!(topic_arity(&h.env, "coop_reputation"), Some(2)); // coop

    h.client.mark_residu_remitted(&h.coop, &id, &ref_hash(&h.env));
    assert_eq!(topic_arity(&h.env, "residu_remitted"), Some(3)); // id, coop

    h.client.confirm_remittance(&h.agrinas, &id);
    assert_eq!(topic_arity(&h.env, "remittance_cleared"), Some(3)); // id, coop
}

#[test]
fn settle_guards_against_overflow() {
    let h = setup();
    let id = create_active(&h);
    // A delivery large enough that delta_g * hpp_per_kg overflows i128 in settle.
    deliver(&h, id, i128::MAX);
    assert_eq!(
        h.client.try_settle(&h.coop, &id),
        Err(Ok(ContractError::MathOverflow))
    );
}
