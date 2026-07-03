# scripts/

Operational scripts for Annona. To be implemented alongside the contract.

| Script | Purpose | Status |
|---|---|---|
| `fund-testnet.sh` | Generate + Friendbot-fund `annona-admin` / `annona-coop` / `annona-farmer` identities. | ✅ built |
| `deploy.sh` | `stellar contract build` → deploy dIDR SAC → deploy offtake-registry via `__constructor(admin, sac)` → pre-fund (escrow-lite) → write `artifacts.testnet.json`. | ✅ built |
| `seed.ts` | Create ~10 realistic farmers + agreements (gabah/jagung) for the demo. | ⬜ via `annona-seed` skill |

Run order: `./fund-testnet.sh` then `./deploy.sh`. Requires the `stellar` CLI.
There is no `didr-token` deploy step of its own — the dIDR SAC is created inside
`deploy.sh` (a classic-asset SAC, no Rust crate).
