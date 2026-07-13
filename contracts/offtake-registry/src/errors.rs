//! Typed contract errors.
//!
//! We return `Result<_, ContractError>` for caller-recoverable validation
//! (bad amounts, wrong status, missing agreement) so clients get typed `try_*`
//! methods. Authorization failures panic via `require_auth()` by design (not a
//! Result path). Genuinely impossible states use checked math → `MathOverflow`.

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    /// admin/token not set (constructor never ran)
    NotInitialized = 1,
    /// no agreement with the given id
    AgreementNotFound = 2,
    /// operation not valid for the agreement's current status
    InvalidStatus = 3,
    /// non-positive money or volume input
    InvalidAmount = 4,
    /// settle called with no newly-delivered volume to pay out
    NothingToSettle = 5,
    /// write attempted on a terminal (Settled / ForceMajeure) agreement
    AlreadyClosed = 6,
    /// checked arithmetic overflow/underflow (should be unreachable)
    MathOverflow = 7,
    /// caller is not the agreement's coop (nor admin, for settle)
    Unauthorized = 8,
    /// residu operation not valid for the agreement's current ResiduStatus
    /// (e.g. confirm before remit, remit before settle, dispute before remit)
    InvalidResiduStatus = 9,
    /// no funding request with the given id
    FundingNotFound = 10,
    /// funding operation not valid for the request's current FundingStatus
    /// (e.g. approve/reject a non-Requested, disburse a non-Approved, reconcile
    /// a non-Disbursed request)
    InvalidFundingStatus = 11,
}
