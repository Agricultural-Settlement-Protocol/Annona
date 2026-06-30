---
name: annona-contract
description: Build, scaffold, test, or deploy the Annona offtake-registry Soroban contract. Use when asked to write/fix/verify contract code, settlement logic, tests, or deployment. Args: [fn-name|all|test|deploy|didr]. Spawns soroban-dev agent for full implementation.
---

# /annona-contract — Soroban Contract Builder

Invoke as `/annona-contract [target]` where target is:
- `all` — scaffold the complete `contracts/offtake-registry/src/lib.rs`
- `[fn-name]` — implement/fix a specific function (e.g., `settle`, `record_delivery`)
- `test` — write the complete test module (all 7 test cases)
- `deploy` — output the CLI deploy sequence for testnet
- `didr` — scaffold the dIDR SAC token setup
- (no arg) — ask user what they need

## Step 1: Check current state

```bash
ls contracts/offtake-registry/src/ 2>/dev/null || echo "CONTRACT NOT SCAFFOLDED YET"
ls contracts/didr-token/ 2>/dev/null || echo "DIDR NOT SCAFFOLDED YET"
cat contracts/offtake-registry/Cargo.toml 2>/dev/null | head -20
```

## Step 2: Spawn soroban-dev agent

Use the `soroban-dev` agent (Agent tool, subagent_type=soroban-dev) with a self-contained prompt that includes:
- The target (what to build/fix)
- The current state of lib.rs if it exists
- Any specific error or requirement from the user

The soroban-dev agent has the full contract spec embedded. It will write complete, compilable Rust.

## Step 3: After agent completes

Run `stellar contract build` to verify compilation:
```bash
cd contracts && stellar contract build 2>&1
```

If it fails, read the error and fix inline (common issues: missing `use` imports, TTL not extended on a new fn, event topic type mismatch).

## Step 4: For `test` target

After writing tests, run:
```bash
cd contracts && cargo test 2>&1
```

Ensure all 7 cases pass:
1. Happy path (create → deliver full → settle)
2. Partial settlement (2 deliveries, debt clears on first)
3. Warning flag (80–98% delivery)
4. PartialDelivery flag (40–80%)
5. Suspected flag (<40%, no auto-penalty)
6. ForceMajeure (no reputation penalty)
7. Debt-exceeds-gross (net = 0, no underflow)

## Step 5: For `deploy` target

Output the exact CLI sequence. User must fill in `<DEPLOYER_KEY>` and `<ADMIN_ADDR>`:

```bash
# 1. Build
cd contracts
stellar contract build

# 2. Deploy offtake-registry
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/offtake_registry.wasm \
  --network testnet \
  --source <DEPLOYER_KEY>
# → outputs CONTRACT_ID (save to .env)

# 3. Deploy dIDR as SAC
stellar contract asset deploy \
  --asset "dIDR:<ISSUER_ADDR>" \
  --network testnet \
  --source <DEPLOYER_KEY>
# → outputs DIDR_TOKEN_ID (save to .env)

# 4. Init contract
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <ADMIN_KEY> \
  -- init \
  --admin <ADMIN_ADDR> \
  --token <DIDR_TOKEN_ID>

# 5. Commit artifacts
echo "CONTRACT_ID=<id>" >> .env
echo "DIDR_TOKEN_ID=<id>" >> .env
# Commit WASM hash to repo (not the .env keys)
```

## Sacred contract invariants (check these after any change)

- [ ] Every public fn calls `env.storage().instance().extend_ttl(100_000, 120_000)` at the top
- [ ] Persistent entries: `env.storage().persistent().extend_ttl(&key, 100_000, 120_000)` when accessed
- [ ] `coop.require_auth()` on: create_agreement, record_delivery, mark_force_majeure
- [ ] `caller.require_auth()` on: settle
- [ ] ALL 7 events emitted (AgreementCreated, DeliveryRecorded, HarvestReceiptMinted, Settled, Flagged, ForceMajeure, ReputationUpdated)
- [ ] `Suspected` flag does NOT auto-increment `reputation.flags` — only sets the agreement flag
- [ ] `ForceMajeure`: `force_majeure_events++` on rep but `flags` counter unchanged
- [ ] `settle()` is idempotent for the unsettled volume: always computes on `delivered_vol_g - settled_vol_g`
- [ ] `net = max(0, gross - remaining_debt)` — never negative payout
- [ ] No PII stored on-chain (only `ktp_hash: BytesN<32>`)
- [ ] Volumes in grams (`i128`), `/1000` for kg in math
