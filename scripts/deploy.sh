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
# Pre-fund amount in the SAC's smallest unit (7 decimals), i.e. rupiah * 1e7.
# Default Rp1,000,000,000 — settle() pays net_to_farmer OUT OF THE CONTRACT's
# balance, and ONE hero-example settlement is Rp13,855,000 (=1.3855e14 units).
# The old default (1e13) covered 0.07 of a single settlement, so the first
# settle() would have failed on insufficient funds. Size this to the demo.
PREFUND="${PREFUND:-10000000000000000}"

# Soroban RPC. `soroban-testnet.stellar.org` is IPv6-ONLY; on an IPv4-only host
# the CLI dies with "client error (Connect)". Override with an IPv4-reachable
# node. Passphrase must still match the target network.
RPC_URL="${STELLAR_RPC_URL:-}"
NET_PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
if [ -n "$RPC_URL" ]; then
  NET_ARGS=(--rpc-url "$RPC_URL" --network-passphrase "$NET_PASSPHRASE")
else
  NET_ARGS=(--network "$NETWORK")
fi

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

# 2. dIDR SAC. Its address is DETERMINISTIC from (asset, issuer, passphrase), so on
#    a REdeploy `asset deploy` fails with "contract already exists" and, under
#    `set -e`, kills the script. The SAC is unaffected by any registry rework —
#    reuse it if it is already on-chain, deploy only when it is genuinely missing.
DIDR_SAC="$(stellar contract id asset --asset "${ASSET_CODE}:${ADMIN_ADDR}" "${NET_ARGS[@]}")"
if stellar contract invoke --id "$DIDR_SAC" --source "$ADMIN_KEY" "${NET_ARGS[@]}" \
     -- decimals >/dev/null 2>&1; then
  echo "  $ASSET_CODE SAC already deployed, reusing = $DIDR_SAC"
else
  echo "deploying $ASSET_CODE SAC..."
  stellar contract asset deploy \
    --asset "${ASSET_CODE}:${ADMIN_ADDR}" \
    --source "$ADMIN_KEY" \
    "${NET_ARGS[@]}" >/dev/null
  echo "  $ASSET_CODE SAC = $DIDR_SAC"
fi

# 3. Deploy the registry, passing __constructor(admin, token) args after `--`.
echo "deploying offtake-registry..."
REGISTRY_ID="$(stellar contract deploy \
  --wasm "$WASM" \
  --source "$ADMIN_KEY" \
  "${NET_ARGS[@]}" \
  -- \
  --admin "$ADMIN_ADDR" \
  --token "$DIDR_SAC")"
echo "  registry = $REGISTRY_ID"

# 4. Pre-fund the registry contract with dIDR (escrow-lite custody).
echo "pre-funding registry with $PREFUND units of $ASSET_CODE..."
stellar contract invoke \
  --id "$DIDR_SAC" \
  --source "$ADMIN_KEY" \
  "${NET_ARGS[@]}" \
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
