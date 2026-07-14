#!/usr/bin/env bash
# Generate + Friendbot-fund the Annona demo identities on Stellar testnet, and
# give every dIDR-HOLDING party a trustline (+ seed the financier's balance).
#
# Identities:
#   annona-admin     — contract admin + dIDR issuer/mint authority (also the
#                      Path A settlement service key, and dispute resolver)
#   annona-agrinas   — the SUPPLIER (input principal): signs dispatch_supply +
#                      confirm/dispute remittance. LEGACY KEY NAME: under v4.0 this
#                      role is "Supplier"; "Agrinas" is now the (non-signing)
#                      warehouse operator. Kept as-is so existing keys keep working.
#   annona-coop      — the KMP cooperative (signs create/accept/record/settle/remit,
#                      and request/reconcile_funding). RECEIVES dIDR on disburse.
#   annona-farmer    — a demo farmer. RECEIVES dIDR on settle.
#   annona-financier — working-capital lender (approve/reject/disburse_funding).
#                      SENDS dIDR on disburse, so it needs a real balance.
#
# TRUSTLINES ARE NOT OPTIONAL. dIDR is a SAC wrapping a CLASSIC asset, so a
# classic account cannot hold it without a trustline — settle() (contract→farmer)
# and disburse_funding() (financier→coop) both FAIL without one. The contract
# itself needs none (a contract holds SAC balances directly).
#
# Idempotent: re-running re-funds existing keys and skips existing trustlines.
# Requires the `stellar` CLI.
set -euo pipefail

NETWORK="${STELLAR_NETWORK:-testnet}"
ASSET_CODE="${ASSET_CODE:-dIDR}"
# dIDR minted to the financier so it can actually disburse. 7 decimals ⇒ rupiah*1e7.
# Default Rp500,000,000 — comfortably covers the demo's advances.
FINANCIER_FUNDING="${FINANCIER_FUNDING:-5000000000000000}"

RPC_URL="${STELLAR_RPC_URL:-}"
NET_PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
if [ -n "$RPC_URL" ]; then
  NET_ARGS=(--rpc-url "$RPC_URL" --network-passphrase "$NET_PASSPHRASE")
  # The CLI reads STELLAR_RPC_URL from the ENV for every subcommand and then
  # REFUSES to run without a matching passphrase — including `keys fund`, which
  # only talks to Friendbot and needs no RPC at all. Export both so the plain
  # `--network` calls below don't trip over a half-specified env.
  export STELLAR_NETWORK_PASSPHRASE="$NET_PASSPHRASE"
else
  NET_ARGS=(--network "$NETWORK")
fi

# 1. Identities. Friendbot is resolved from the NAMED network, and the CLI errors
#    with "Friendbot is not available on this network" if STELLAR_RPC_URL is set in
#    the env (it then treats this as a custom network). Funding needs no Soroban RPC
#    at all, so strip the override for these calls — otherwise the account is never
#    CREATED on-chain and every later step (trustline, mint) fails downstream.
fund_key() {
  env -u STELLAR_RPC_URL -u STELLAR_NETWORK_PASSPHRASE \
    stellar keys "$@" --network "$NETWORK"
}

for name in annona-admin annona-agrinas annona-coop annona-farmer annona-financier; do
  if ! stellar keys address "$name" >/dev/null 2>&1; then
    echo "generating identity: $name"
    fund_key generate "$name" --fund
  else
    echo "funding existing identity: $name"
    fund_key fund "$name" || true
  fi
  addr="$(stellar keys address "$name")"
  # An account that does not exist on-chain silently poisons everything after it.
  if ! curl -sf "https://horizon-${NETWORK}.stellar.org/accounts/$addr" >/dev/null; then
    echo "ERROR: $name ($addr) is NOT funded on-chain — Friendbot failed." >&2
    exit 1
  fi
  echo "  $name = $addr"
done

ADMIN_ADDR="$(stellar keys address annona-admin)"
SAC="$(stellar contract id asset --asset "${ASSET_CODE}:${ADMIN_ADDR}" "${NET_ARGS[@]}")"
echo "$ASSET_CODE SAC = $SAC"

# 2. Trustlines for every account that HOLDS dIDR. The issuer (admin) never needs
#    one. Uses the classic `tx new change-trust` op; already-existing trustlines
#    are a no-op we tolerate.
for name in annona-coop annona-farmer annona-financier; do
  addr="$(stellar keys address "$name")"
  if curl -sf "https://horizon-${NETWORK}.stellar.org/accounts/$addr" \
       | grep -q "\"asset_code\": *\"${ASSET_CODE}\""; then
    echo "trustline ($ASSET_CODE) for $name: already present"
    continue
  fi
  echo "trustline ($ASSET_CODE) for $name..."
  # Do NOT swallow this: a failed change-trust surfaces much later as a cryptic
  # SAC "trustline entry is missing for account" on mint/transfer.
  env -u STELLAR_RPC_URL -u STELLAR_NETWORK_PASSPHRASE \
    stellar tx new change-trust \
      --source "$name" \
      --network "$NETWORK" \
      --line "${ASSET_CODE}:${ADMIN_ADDR}" >/dev/null
  echo "  ok"
done

# 3. Fund the financier with dIDR — disburse_funding moves dIDR FROM the financier,
#    not from the contract, so an unfunded financier makes the whole offtake-
#    financing loop fail at the one step that moves real money.
FINANCIER_ADDR="$(stellar keys address annona-financier)"
echo "minting $FINANCIER_FUNDING $ASSET_CODE to annona-financier..."
stellar contract invoke \
  --id "$SAC" \
  --source annona-admin \
  "${NET_ARGS[@]}" \
  -- \
  mint --to "$FINANCIER_ADDR" --amount "$FINANCIER_FUNDING"

echo "done. testnet resets quarterly — re-run after a reset."
