---
name: annona-check
description: Pre-submission audit for the APAC Stellar Hackathon. Runs a systematic checklist against all acceptance criteria from PRD section 15. Use before submission (15 Jul) or before any demo. Reports pass/fail for every criterion.
---

# /annona-check — Pre-Submission Audit

Runs a systematic audit against the hackathon acceptance criteria (PRD §15). Reports clear PASS / FAIL / PARTIAL for each item.

**Invoke:** `/annona-check` — no args needed.

---

## Phase 1: Repository & code hygiene

```bash
# 1. pnpm workspaces configured
cat pnpm-workspace.yaml
cat turbo.json | head -20

# 2. No secrets committed
git log --oneline -5
git grep -l "SECRET\|PRIVATE_KEY\|secret_key\|mnemonic" -- '*.ts' '*.env' '*.json' 2>/dev/null | grep -v ".env.example\|CLAUDE.md"

# 3. .env files gitignored
cat .gitignore | grep -E "\.env$|\.env\."

# 4. TypeScript compiles clean
pnpm check-types 2>&1 | tail -5

# 5. Biome passes
pnpm lint 2>&1 | tail -10

# 6. No em dashes in UI strings
grep -r "—\|–" apps/web --include="*.tsx" --include="*.ts" --include="*.json" | grep -v "//\|/\*\|CLAUDE.md"
```

---

## Phase 2: Smart contract (the sacred core)

```bash
# 7. Contract builds
cd contracts && stellar contract build 2>&1 | tail -5
cd ..

# 8. WASM artifact exists
ls contracts/target/wasm32-unknown-unknown/release/*.wasm 2>/dev/null

# 9. Contract tests pass (all 7 cases)
cd contracts && cargo test 2>&1 | tail -20
cd ..
```

Manually verify contract has:
- [ ] `create_agreement` → `AgreementCreated` event emitted
- [ ] `record_delivery` → `HarvestReceiptMinted` + `DeliveryRecorded` emitted + flag logic
- [ ] `settle` → `Settled` + `ReputationUpdated` emitted + correct math
- [ ] `mark_force_majeure` → `ForceMajeure` emitted + NO reputation penalty
- [ ] Every public fn: TTL extension
- [ ] `require_auth` on all write fns

---

## Phase 3: Testnet deployment

```bash
# 10. CONTRACT_ID set
echo "CONTRACT_ID: $CONTRACT_ID"

# 11. Contract reachable on testnet
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- get_admin 2>&1

# 12. dIDR token deployed
echo "DIDR_TOKEN_ID: $DIDR_TOKEN_ID"

# 13. Demo accounts funded
curl -s "https://horizon-testnet.stellar.org/accounts/$COOP_WALLET" | python3 -c "import sys,json; a=json.load(sys.stdin); print('Coop funded:', any(b['asset_code']=='dIDR' for b in a['balances']))" 2>/dev/null || echo "Check manually"
```

---

## Phase 4: Full demo loop (end-to-end)

Run the 5-minute demo script programmatically:

```bash
# 14. Seed data present
pnpm exec tsx scripts/seed.ts --dry-run 2>&1 | tail -5

# 15. API running
curl -s http://localhost:3001/api/agreements | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Agreements: {len(d)}')"

# 16. Web running
curl -s http://localhost:3000 | grep -c "Annona\|KDMP" || echo "Web not running"
```

Demo script checklist (verify manually, run the app):

| Step | What to verify | PASS/FAIL |
|---|---|---|
| Register farmer | Farmer appears in Screen B | |
| Create agreement | `AgreementCreated` tx in Screen E, tx hash shows | |
| Record delivery | `HarvestReceiptMinted` tx shows, flag logic fires | |
| Settle (full) | `Settled` event, net = Rp14.9M, debt → 0 | |
| Partial settlement | 2 deliveries, debt clears on first | |
| Graded flag | Suspected flag appears in auditor queue (Screen G) | |
| AI question | Screen H answers "KDMP mana paling banyak utang?" with real data | |
| Farmer view | Screen K shows "terima Rp14.900.000" with tx link | |
| Reputation | Screen L shows updated counters | |

---

## Phase 5: Judging criteria (APAC Stellar Hackathon)

| Criterion | Check |
|---|---|
| **Deployed testnet contract** | CONTRACT_ID in .env, `get_admin` returns |
| **≥1 full settlement** | Budi Santoso scenario: 2,600kg, Rp14.9M net |
| **≥1 partial settlement** | Sari Dewi scenario: 2 deliveries |
| **≥1 graded flag** | Rini Susanto: Suspected flag visible in auditor |
| **3 working interfaces** | /coop, /auditor, /farmer all load without errors |
| **AI answers ≥3 queries** | Screen H: debt query, harvest query, underperform query |
| **Clean public repo** | README, contract in /contracts, docs in /docs |
| **Why blockchain** | Auto-netting, tamper-proof, composable — never "database with steps" |
| **Composability** | @annona/sdk exposes getAgreement/getReceipts/getReputation |
| **Stellar load-bearing** | Multi-party auto-netting CANNOT be single-party DB — articulate why |

---

## Phase 6: Narrative + framing check

Grep for language that judges will penalize:

```bash
# These must NOT appear in any demo/pitch/UI copy:
grep -r "autonomous settlement\|blockchain pays\|AI prediction\|ML prediction\|live rupiah\|actual payment" \
  apps/ docs/ README.md 2>/dev/null | grep -v ".md:#\|SMART-CONTRACT.md\|//\|ARCHITECTURE.md"
```

Correct framing:
- Settlement = "tamper-proof settlement record" NOT "autonomous settlement"
- Yield estimate = "transparent formula (area × yield/ha, BPS source)" NOT "AI prediction"
- dIDR = "testnet demo asset" NOT "live rupiah"
- Reputation = "on-chain counters" NOT "credit score"

---

## Output format

Print a summary like:

```
=== ANNONA PRE-SUBMISSION AUDIT ===
Date: [today]

PHASE 1 — Code hygiene
  [PASS] pnpm workspaces configured
  [PASS] No secrets in git
  [FAIL] Em dash found in apps/web/app/(farmer)/page.tsx line 42
  ...

PHASE 2 — Contract
  [PASS] Builds clean
  [PASS] Tests pass (7/7)
  ...

CRITICAL FAILURES (must fix before submit):
  1. Em dash in farmer view — use comma instead
  2. ...

READY TO SUBMIT: NO (2 blockers)
```

Sacred deadline: **15 Jul 2026**. Flag any items that risk missing it.
