---
name: annona-types
description: Sync TypeScript types in packages/core with the Rust contract types. Use when contract types change, or when starting packages/core from scratch. Reads lib.rs, generates canonical TS types, and updates packages/core/src/index.ts. Golden rule 5 enforcer.
---

# /annona-types — Contract → TypeScript Type Sync

This skill enforces **Golden Rule #5**: shared types live in `packages/core`. `web`, `api`, and `sdk` import from there and NEVER redefine. This prevents drift between contract events and dashboard read-models.

## Step 1: Read current state

```bash
cat contracts/offtake-registry/src/lib.rs 2>/dev/null | grep -A5 "pub enum\|pub struct" | head -100
cat packages/core/src/index.ts 2>/dev/null
```

## Step 2: Generate canonical TypeScript types

The TS types are a direct mirror of the Rust `#[contracttype]` types. Write to `packages/core/src/index.ts`:

```typescript
// packages/core/src/index.ts
// AUTO-SYNCED from contracts/offtake-registry/src/lib.rs
// DO NOT edit manually — run /annona-types to regenerate

// ── Lifecycle ──────────────────────────────────────────

export type Status =
  | "Created"
  | "PartiallyDelivered"
  | "Delivered"
  | "Settled"
  | "Flagged"
  | "ForceMajeure";

export type FlagReason = "None" | "Warning" | "PartialDelivery" | "Suspected";

// ── On-chain structs ────────────────────────────────────

export interface Commodity {
  code: string;          // GABAH / JAGUNG / KOPI
  grade: string;         // A / B / C
  moisture_bps: number;  // e.g. 1400 = 14.00%
  hpp_version: number;   // Inpres decree number
}

export interface Agreement {
  id: bigint;
  farmer: string;        // Stellar G-address
  coop: string;
  commodity: Commodity;
  input_debt: bigint;        // dIDR smallest-unit (rupiah-cents if decimals=2)
  expected_vol_g: bigint;    // grams
  delivered_vol_g: bigint;
  settled_vol_g: bigint;
  hpp_per_kg: bigint;        // settlement price, smallest-unit per kg
  tolerance_bps: number;     // e.g. 2000 = 20%
  ktp_hash: string;          // hex-encoded BytesN<32>
  status: Status;
  flag: FlagReason;
  remaining_debt: bigint;
  paid_to_farmer: bigint;
}

export interface HarvestReceipt {
  agreement_id: bigint;
  seq: number;
  farmer: string;
  volume_g: bigint;
  grade: string;
  timestamp: bigint;         // Unix seconds (Soroban ledger timestamp)
}

export interface Reputation {
  farmer: string;
  total_settled_g: bigint;
  deliveries: number;
  on_time_settlements: number;
  flags: number;
  force_majeure_events: number;  // NOT penalized
}

// ── Event shapes (indexer + SDK subscribe) ─────────────

export interface AgreementCreatedEvent {
  type: "agreement_created";
  id: bigint;
  farmer: string;
  coop: string;
  commodity: Commodity;
  input_debt: bigint;
  expected_vol_g: bigint;
  hpp_per_kg: bigint;
  tolerance_bps: number;
}

export interface DeliveryRecordedEvent {
  type: "delivery";
  agreement_id: bigint;
  seq: number;
  volume_g: bigint;
  grade: string;
  delivered_total_g: bigint;
}

export interface HarvestReceiptMintedEvent {
  type: "receipt";
  agreement_id: bigint;
  farmer: string;
  seq: number;
  volume_g: bigint;
  grade: string;
  timestamp: bigint;
}

export interface SettledEvent {
  type: "settled";
  agreement_id: bigint;
  farmer: string;
  gross: bigint;
  debt_netted: bigint;
  net_paid: bigint;
  settled_vol_g: bigint;
}

export interface FlaggedEvent {
  type: "flagged";
  agreement_id: bigint;
  reason: FlagReason;
}

export interface ForceMajeureEvent {
  type: "force_majeure";
  agreement_id: bigint;
  reason: string;
}

export interface ReputationUpdatedEvent {
  type: "reputation";
  farmer: string;
  deliveries: number;
  on_time_settlements: number;
  total_settled_g: bigint;
  flags: number;
}

export type AnnonaEvent =
  | AgreementCreatedEvent
  | DeliveryRecordedEvent
  | HarvestReceiptMintedEvent
  | SettledEvent
  | FlaggedEvent
  | ForceMajeureEvent
  | ReputationUpdatedEvent;

// ── Utility types ───────────────────────────────────────

/** Settlement math result (computed, not stored on-chain as a single struct) */
export interface SettlementPreview {
  delivered_kg: number;        // delivered_vol_g / 1000
  hpp_per_kg: number;          // in display rupiah
  gross: bigint;
  debt_netted: bigint;
  net_paid: bigint;
  flag: FlagReason;
  delivery_pct: number;        // delivered / expected * 100
}

/** Flag threshold constants (mirror contract logic) */
export const FLAG_THRESHOLDS = {
  NONE_BPS: 9800,            // ≥98% = Delivered, no flag
  WARNING_BPS: 8000,         // 80–98% = Warning
  PARTIAL_BPS: 4000,         // 40–80% = PartialDelivery
  // <40% = Suspected
} as const;

/** Compute settlement preview (same math as contract settle()) */
export function computeSettlement(
  deliveredVolG: bigint,
  settledVolG: bigint,
  hppPerKg: bigint,
  remainingDebt: bigint,
): SettlementPreview {
  const unsettledG = deliveredVolG - settledVolG;
  const gross = (unsettledG / BigInt(1000)) * hppPerKg;
  const debtNetted = gross < remainingDebt ? gross : remainingDebt;
  const netPaid = gross - debtNetted;
  return { gross, debt_netted: debtNetted, net_paid: netPaid } as any;
}
```

## Step 3: Update packages/core/package.json

```json
{
  "name": "@annona/core",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

## Step 4: Verify no local type redefinitions

```bash
# Check for rogue Status/Agreement/FlagReason definitions outside packages/core
grep -r "type Status\|interface Agreement\|type FlagReason" \
  apps/ packages/sdk/ packages/ui/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "from.*@annona/core\|import.*@annona/core\|// "

# If any found: remove them and add import from @annona/core
```

## Step 5: Type-check the whole workspace

```bash
pnpm check-types 2>&1 | head -40
```

Fix any type errors. Common issues after sync:
- `bigint` vs `number` mismatches (DB stores bigint, API serializes as string, UI gets string — convert at boundary)
- `string` tx addresses vs typed `Address` — keep as `string` in TS (Stellar G-addresses)
- Missing event type in union — add it to `AnnonaEvent`
