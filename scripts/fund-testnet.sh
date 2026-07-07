#!/usr/bin/env bash
# Generate + Friendbot-fund the Annona demo identities on Stellar testnet.
#
# Creates three CLI identities used across the demo:
#   annona-admin   — contract admin + dIDR issuer/mint authority (also the
#                    Path A settlement service key, and dispute resolver)
#   annona-agrinas — PT Agrinas operator (signs dispatch_supply + confirm/dispute
#                    remittance in the demo)
#   annona-coop    — the KMP cooperative (signs create/accept/record/settle/remit)
#   annona-farmer  — a demo farmer (receives settlement dIDR)
#
# Idempotent: re-running just re-funds existing keys. Requires the `stellar` CLI.
set -euo pipefail

NETWORK="${STELLAR_NETWORK:-testnet}"

for name in annona-admin annona-agrinas annona-coop annona-farmer; do
  if ! stellar keys address "$name" >/dev/null 2>&1; then
    echo "generating identity: $name"
    stellar keys generate "$name" --network "$NETWORK" --fund
  else
    echo "funding existing identity: $name"
    stellar keys fund "$name" --network "$NETWORK" || true
  fi
  echo "  $name = $(stellar keys address "$name")"
done

echo "done. testnet resets quarterly — re-run after a reset."
