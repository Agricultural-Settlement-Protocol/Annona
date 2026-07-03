#!/usr/bin/env bash
# Build + deploy the Annona contracts to Stellar testnet, then pre-fund the
# registry (escrow-lite) so settle() can pay out. Writes contract ids + WASM
# hash to scripts/artifacts.testnet.json for the app/indexer/SDK to consume.
#
# Prereqs: `stellar` CLI installed, and identities created via
# ./fund-testnet.sh (annona-admin / annona-coop / annona-farmer).
#
# NOTE on dIDR decimals: dIDR is a SAC wrapping a CLASSIC Stellar asset, which
# is fixed at 7 decimals — the SAC cannot be minted at 2 decimals. The contract
# is decimal-agnostic (it moves raw i128 units), so this only affects how the
# UI/API scale rupiah. See the SELF-LEARNING LOG in CLAUDE.md.
set -euo pipefail

NETWORK="${STELLAR_NETWORK:-testnet}"
ADMIN_KEY="${ADMIN_KEY:-annona-admin}"
ASSET_CODE="${ASSET_CODE:-dIDR}"
# Pre-fund amount in the SAC's smallest unit (7 decimals). Default ~Rp1,000,000.
PREFUND="${PREFUND:-10000000000000}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARTIFACTS="$ROOT/scripts/artifacts.testnet.json"

ADMIN_ADDR="$(stellar keys address "$ADMIN_KEY")"
echo "admin ($ADMIN_KEY) = $ADMIN_ADDR"

# 1. Build the offtake-registry WASM (CLI selects the correct wasm32v1-none target).
echo "building offtake-registry..."
(cd "$ROOT/contracts" && stellar contract build)
WASM="$ROOT/contracts/target/wasm32v1-none/release/offtake_registry.wasm"
# The on-chain WASM hash is the sha256 of the built artifact.
WASM_HASH="$(sha256sum "$WASM" | cut -d' ' -f1)"

# 2. Deploy dIDR as a SAC (wraps the classic asset dIDR:<ADMIN> issued by admin).
echo "deploying $ASSET_CODE SAC..."
DIDR_SAC="$(stellar contract asset deploy \
  --asset "${ASSET_CODE}:${ADMIN_ADDR}" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK")"
echo "  $ASSET_CODE SAC = $DIDR_SAC"

# 3. Deploy the registry, passing __constructor(admin, token) args after `--`.
echo "deploying offtake-registry..."
REGISTRY_ID="$(stellar contract deploy \
  --wasm "$WASM" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  -- \
  --admin "$ADMIN_ADDR" \
  --token "$DIDR_SAC")"
echo "  registry = $REGISTRY_ID"

# 4. Pre-fund the registry contract with dIDR (escrow-lite custody).
echo "pre-funding registry with $PREFUND units of $ASSET_CODE..."
stellar contract invoke \
  --id "$DIDR_SAC" \
  --source "$ADMIN_KEY" \
  --network "$NETWORK" \
  -- \
  mint --to "$REGISTRY_ID" --amount "$PREFUND"

# 5. Record artifacts for the app / indexer / SDK.
cat >"$ARTIFACTS" <<JSON
{
  "network": "$NETWORK",
  "admin": "$ADMIN_ADDR",
  "didrSac": "$DIDR_SAC",
  "registryId": "$REGISTRY_ID",
  "registryWasmHash": "$WASM_HASH",
  "assetCode": "$ASSET_CODE",
  "decimals": 7,
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
echo "wrote $ARTIFACTS"
echo "done."
