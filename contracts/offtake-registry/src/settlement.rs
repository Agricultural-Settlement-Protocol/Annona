//! Pure settlement + flag-classification math (v3.0 three-way split).
//!
//! Kept free of `Env`/storage so it is unit-testable in isolation — this is the
//! highest-risk logic in the contract. Order of operations per SMART-CONTRACT.md
//! section 5:
//!   gross          = delta_g * hpp_per_kg / 1000   (multiply BEFORE /1000)
//!   handling_cut   = gross * hpp_handling_fee_bps / 10000        (KMP keeps)
//!   debt_paid      = min(remaining_debt, gross - handling_cut)   (netted FIRST)
//!   net_to_farmer  = (gross - handling_cut) - debt_paid          (dIDR to farmer)
//! Then split debt_paid pro-rata against input_debt into principal (Agrinas
//! residu) vs margin (KMP), assigning any integer-division dust to margin so
//! `residu_principal` never over-states Agrinas's claim (Golden rule 6/6b).

use crate::errors::ContractError;
use crate::types::{FlagReason, Status};

/// grams per kilogram
pub const GRAMS_PER_KG: i128 = 1_000;

/// basis-points denominator (10000 = 100%)
pub const BPS_DENOM: i128 = 10_000;

// Graded-flag thresholds in basis points of (delivered / expected). Kept in
// lockstep with `packages/core/src/status.ts` FLAG_THRESHOLDS (0.98/0.8/0.4).
// `tolerance_bps` on the agreement is stored but reserved for roadmap use; the
// warning floor stays a fixed constant here to guarantee that lockstep.
pub const CLEAN_BPS: i128 = 9_800; // >= 98% -> Delivered / None
pub const WARNING_BPS: i128 = 8_000; // >= 80% -> Delivered / Warning
pub const PARTIAL_BPS: i128 = 4_000; // >= 40% -> PartiallyDelivered / PartialDelivery
                                     // <  40% -> Flagged / Suspected

/// Result of settling the currently-unsettled delivered volume (three-way split).
pub struct Settlement {
    /// value of the settled volume at HPP, before any cut or netting
    pub gross: i128,
    /// KMP handling cut on gross (KMP keeps)
    pub handling_cut: i128,
    /// portion of (gross - handling) applied to outstanding debt
    pub debt_paid: i128,
    /// net released to the farmer (always >= 0)
    pub net_to_farmer: i128,
    /// of debt_paid, Agrinas's principal (residu owed back to Agrinas)
    pub principal_to_agrinas: i128,
    /// of debt_paid, KMP's markup margin (KMP keeps)
    pub coop_margin: i128,
}

/// Derive `input_debt` from the Agrinas principal + KMP markup.
/// `input_debt = base_price_agrinas * (10000 + saprotan_markup_bps) / 10000`.
pub fn derive_input_debt(
    base_price_agrinas: i128,
    saprotan_markup_bps: u32,
) -> Result<i128, ContractError> {
    base_price_agrinas
        .checked_mul(BPS_DENOM + i128::from(saprotan_markup_bps))
        .ok_or(ContractError::MathOverflow)
        .map(|v| v / BPS_DENOM)
}

/// Compute a three-way-split settlement over `delta_g` newly-settled grams.
///
/// `input_debt` is the ORIGINAL derived debt (the pro-rata denominator), not the
/// current `remaining_debt`; `base_price_agrinas` is the ORIGINAL principal. The
/// split ratio stays constant across staged settlements so accrued principal +
/// margin always reconstruct to the original debt.
pub fn compute(
    delta_g: i128,
    hpp_per_kg: i128,
    hpp_handling_fee_bps: u32,
    remaining_debt: i128,
    base_price_agrinas: i128,
    input_debt: i128,
) -> Result<Settlement, ContractError> {
    let gross = delta_g
        .checked_mul(hpp_per_kg)
        .ok_or(ContractError::MathOverflow)?
        / GRAMS_PER_KG;

    let handling_cut = gross
        .checked_mul(i128::from(hpp_handling_fee_bps))
        .ok_or(ContractError::MathOverflow)?
        / BPS_DENOM;

    let net_before_debt = gross
        .checked_sub(handling_cut)
        .ok_or(ContractError::MathOverflow)?;

    let debt_paid = if net_before_debt < remaining_debt {
        net_before_debt
    } else {
        remaining_debt
    };

    let net_to_farmer = net_before_debt
        .checked_sub(debt_paid)
        .ok_or(ContractError::MathOverflow)?;

    // Pro-rata split of the collected debt. Principal floors (integer division);
    // any rounding dust falls to margin so principal never over-states Agrinas.
    let principal_to_agrinas = if input_debt == 0 {
        0
    } else {
        debt_paid
            .checked_mul(base_price_agrinas)
            .ok_or(ContractError::MathOverflow)?
            / input_debt
    };
    let coop_margin = debt_paid
        .checked_sub(principal_to_agrinas)
        .ok_or(ContractError::MathOverflow)?;

    Ok(Settlement {
        gross,
        handling_cut,
        debt_paid,
        net_to_farmer,
        principal_to_agrinas,
        coop_margin,
    })
}

/// Classify cumulative delivered-vs-expected into a (status, flag) pair.
///
/// Recomputed from CUMULATIVE delivered on every delivery, so flags heal upward
/// (e.g. 50% then +45% total = 95% -> Delivered/Warning). `Suspected` is an
/// indicator for human review, never an automatic accusation (Golden rule 7).
pub fn classify(delivered_vol_g: i128, expected_vol_g: i128) -> (Status, FlagReason) {
    // Defensive: create_agreement validates expected_vol_g > 0, so this guards
    // only against a corrupt/unreachable state.
    if expected_vol_g <= 0 {
        return (Status::Flagged, FlagReason::Suspected);
    }
    // saturating_mul: ratio math is non-monetary; astronomically large volumes
    // saturate rather than trap (they still land in the CLEAN band).
    let ratio_bps = delivered_vol_g.saturating_mul(10_000) / expected_vol_g;
    if ratio_bps >= CLEAN_BPS {
        (Status::Delivered, FlagReason::None)
    } else if ratio_bps >= WARNING_BPS {
        (Status::Delivered, FlagReason::Warning)
    } else if ratio_bps >= PARTIAL_BPS {
        (Status::PartiallyDelivered, FlagReason::PartialDelivery)
    } else {
        (Status::Flagged, FlagReason::Suspected)
    }
}
