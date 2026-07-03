//! Pure settlement + flag-classification math.
//!
//! Kept free of `Env`/storage so it is unit-testable in isolation — this is the
//! highest-risk logic in the contract. Debt is netted FIRST (Golden rule 6):
//! `net = max(0, gross - remaining_debt)`, so the coop is protected before the
//! farmer sees positive cashflow.

use crate::errors::ContractError;
use crate::types::{FlagReason, Status};

/// grams per kilogram
pub const GRAMS_PER_KG: i128 = 1_000;

// Graded-flag thresholds in basis points of (delivered / expected). Kept in
// lockstep with `packages/core/src/status.ts` FLAG_THRESHOLDS (0.98/0.8/0.4).
// `tolerance_bps` on the agreement is stored but reserved for roadmap use; the
// warning floor stays a fixed constant here to guarantee that lockstep.
pub const CLEAN_BPS: i128 = 9_800; // >= 98% -> Delivered / None
pub const WARNING_BPS: i128 = 8_000; // >= 80% -> Delivered / Warning
pub const PARTIAL_BPS: i128 = 4_000; // >= 40% -> PartiallyDelivered / PartialDelivery
                                     // <  40% -> Flagged / Suspected

/// Result of settling the currently-unsettled delivered volume.
pub struct Settlement {
    /// value of the settled volume at HPP, before netting
    pub gross: i128,
    /// portion of gross applied to outstanding debt
    pub debt_netted: i128,
    /// net released to the farmer (always >= 0)
    pub net: i128,
}

/// Compute a settlement over `delta_g` newly-settled grams.
///
/// `gross = delta_g * hpp_per_kg / 1000` — multiply BEFORE dividing by 1000 so
/// sub-kg precision is preserved. `debt_netted = min(gross, remaining_debt)`,
/// `net = gross - debt_netted` (floors at 0 because debt_netted <= gross).
pub fn compute(
    delta_g: i128,
    hpp_per_kg: i128,
    remaining_debt: i128,
) -> Result<Settlement, ContractError> {
    let gross = delta_g
        .checked_mul(hpp_per_kg)
        .ok_or(ContractError::MathOverflow)?
        / GRAMS_PER_KG;
    let debt_netted = if gross < remaining_debt {
        gross
    } else {
        remaining_debt
    };
    let net = gross
        .checked_sub(debt_netted)
        .ok_or(ContractError::MathOverflow)?;
    Ok(Settlement {
        gross,
        debt_netted,
        net,
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
