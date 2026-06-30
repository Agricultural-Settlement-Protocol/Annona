---
name: annona-indexer
description: Build, verify, or debug the Soroban event indexer in apps/api/src/indexer/. Polls Soroban RPC getEvents, writes idempotent read-models to Postgres via Drizzle. Args: [build|verify|schema|debug]. Critical path — dashboards and AI assistant depend on it.
---

# /annona-indexer — Event Indexer Builder

The indexer is the spine of Annona's read layer. It polls Soroban RPC `getEvents`, parses contract events, and writes read-models to Postgres. Dashboards never read the chain directly — they read Postgres.

**Idempotency rule (never break):** every event keyed by `(tx_hash, event_index)`. Re-running the indexer over already-processed events MUST be a no-op.

## Step 1: Check state

```bash
ls apps/api/src/indexer/ 2>/dev/null || echo "INDEXER NOT BUILT"
cat apps/api/src/indexer/index.ts 2>/dev/null | head -30
```

## Step 2: Build target

**`build`** — write the complete indexer from scratch  
**`verify`** — check existing indexer against the event schema  
**`schema`** — just output the Drizzle schema for indexer tables  
**`debug`** — diagnose why events aren't being indexed (check RPC, contract ID, ledger cursor)  

---

## Complete indexer structure

```
apps/api/src/indexer/
├── index.ts          # poll loop + event router
├── handlers/
│   ├── agreement.ts  # AgreementCreated handler
│   ├── delivery.ts   # DeliveryRecorded + HarvestReceiptMinted
│   ├── settlement.ts # Settled + ReputationUpdated
│   ├── flag.ts       # Flagged + ForceMajeure
│   └── index.ts      # handler registry
├── cursor.ts         # last-ledger persistence
└── parser.ts         # scValToNative wrappers + type coercion
```

## Event schema (what the contract emits — exact match required)

```typescript
// apps/api/src/indexer/parser.ts

import { scValToNative, xdr } from "@stellar/stellar-sdk";

// All 7 event types the indexer must handle:
export const EVENT_TYPES = [
  "agreement_created",
  "delivery",
  "receipt",
  "settled",
  "flagged",
  "force_majeure",
  "reputation",
] as const;

export type EventType = typeof EVENT_TYPES[number];

export function parseEventTopics(topics: xdr.ScVal[]) {
  return topics.map(t => scValToNative(t));
}

export function parseEventData(value: xdr.ScVal) {
  return scValToNative(value);
}

// Type guard helpers
export function isAgreementCreated(type: string) { return type === "agreement_created"; }
export function isSettled(type: string) { return type === "settled"; }
// etc.
```

## Core poll loop

```typescript
// apps/api/src/indexer/index.ts
import { SorobanRpc } from "@stellar/stellar-sdk";
import { db } from "../db";
import { indexedEvents } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { handleEvent } from "./handlers";
import { getCursor, saveCursor } from "./cursor";
import { parseEventTopics, parseEventData } from "./parser";

const rpc = new SorobanRpc.Server(
  process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org"
);
const CONTRACT_ID = process.env.CONTRACT_ID!;

if (!CONTRACT_ID) throw new Error("CONTRACT_ID env var required");

export async function runIndexer() {
  console.log(`[indexer] starting, contract: ${CONTRACT_ID}`);

  while (true) {
    try {
      await poll();
    } catch (err) {
      console.error("[indexer] poll error:", err);
    }
    await sleep(6_000); // ~1 ledger close
  }
}

async function poll() {
  const latest = await rpc.getLatestLedger();
  const cursor = await getCursor();

  if (latest.sequence <= cursor) return;

  const startLedger = cursor === 0
    ? Math.max(1, latest.sequence - 1000) // first run: look back 1000 ledgers
    : cursor + 1;

  console.log(`[indexer] polling ledgers ${startLedger}–${latest.sequence}`);

  const { events } = await rpc.getEvents({
    startLedger,
    filters: [{
      type: "contract",
      contractIds: [CONTRACT_ID],
    }],
    limit: 500,
  });

  let processed = 0;
  for (const event of events) {
    const txHash = event.txHash;
    // event.id is "ledger-txIndex-eventIndex" — use as unique key
    const eventIndex = event.id;

    // IDEMPOTENCY CHECK
    const exists = await db
      .select({ id: indexedEvents.id })
      .from(indexedEvents)
      .where(and(
        eq(indexedEvents.txHash, txHash),
        eq(indexedEvents.eventIndex, eventIndex),
      ))
      .limit(1);

    if (exists.length > 0) continue;

    // Parse
    const topics = parseEventTopics(event.topic);
    const data = parseEventData(event.value);
    const [eventType, ...rest] = topics as [string, ...unknown[]];

    // Dispatch
    await handleEvent({ eventType, topics: rest, data, txHash, eventIndex });

    // Mark processed (in same tx ideally — use DB transaction)
    await db.insert(indexedEvents).values({
      txHash,
      eventIndex,
      eventType,
    });

    processed++;
  }

  if (processed > 0) {
    console.log(`[indexer] processed ${processed} new events`);
  }

  await saveCursor(latest.sequence);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
```

## Event handlers (critical business logic)

```typescript
// apps/api/src/indexer/handlers/agreement.ts
import { db } from "../../db";
import { agreements, farmers, coops } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function handleAgreementCreated(
  topics: unknown[], data: any, txHash: string
) {
  const [id, farmer, coop] = topics as [bigint, string, string];
  const { commodity, input_debt, expected_vol_g, hpp_per_kg, tolerance_bps } = data;

  // Find farmer by wallet address
  const farmerRow = await db.select({ id: farmers.id })
    .from(farmers)
    .where(eq(farmers.walletAddress, farmer))
    .limit(1);

  if (!farmerRow.length) {
    console.warn(`[indexer] farmer not found for address ${farmer} — agreement ${id}`);
    return; // farmer must be registered off-chain first
  }

  // Upsert agreement read-model (onchain_id is the join key)
  await db.insert(agreements).values({
    onchainId: Number(id),
    farmerId: farmerRow[0].id,
    coopId: /* find by wallet */ null!, // lookup coop by address
    commodityCode: commodity.code.toString(),
    grade: commodity.grade.toString(),
    moistureBps: commodity.moisture_bps,
    hppVersion: commodity.hpp_version,
    inputDebt: BigInt(input_debt),
    expectedVolG: BigInt(expected_vol_g),
    hppPerKg: BigInt(hpp_per_kg),
    toleranceBps: tolerance_bps,
    status: "Created",
    flag: "None",
    remainingDebt: BigInt(input_debt), // starts equal to input_debt
  })
  .onConflictDoUpdate({
    target: agreements.onchainId,
    set: { status: "Created", updatedAt: new Date() },
  });
}
```

```typescript
// apps/api/src/indexer/handlers/settlement.ts
export async function handleSettled(
  topics: unknown[], data: any, txHash: string
) {
  const [id, farmer] = topics as [bigint, string];
  const { gross, debt_netted, net_paid, settled_vol_g } = data;

  // Update agreement
  await db.update(agreements)
    .set({
      status: "Settled",
      settledVolG: BigInt(settled_vol_g),
      paidToFarmer: BigInt(net_paid),
      remainingDebt: BigInt(0), // fully netted
      updatedAt: new Date(),
    })
    .where(eq(agreements.onchainId, Number(id)));

  // Insert settlement record (for audit trail)
  const agr = await db.select({ id: agreements.id })
    .from(agreements)
    .where(eq(agreements.onchainId, Number(id)))
    .limit(1);

  if (agr.length) {
    await db.insert(settlements).values({
      agreementId: agr[0].id,
      gross: BigInt(gross),
      debtNetted: BigInt(debt_netted),
      netPaid: BigInt(net_paid),
      settledVolG: BigInt(settled_vol_g),
      txHash,
    });
  }
}

export async function handleReputationUpdated(
  topics: unknown[], data: any
) {
  const [farmer] = topics as [string];
  const { deliveries, on_time, total_settled_g, flags } = data;

  const farmerRow = await db.select({ id: farmers.id })
    .from(farmers)
    .where(eq(farmers.walletAddress, farmer))
    .limit(1);

  if (!farmerRow.length) return;

  await db.insert(reputationCache)
    .values({
      farmerId: farmerRow[0].id,
      deliveries,
      onTimeSettlements: on_time,
      totalSettledG: BigInt(total_settled_g),
      flags,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: reputationCache.farmerId,
      set: { deliveries, onTimeSettlements: on_time, totalSettledG: BigInt(total_settled_g), flags, updatedAt: new Date() },
    });
}
```

## Cursor persistence

```typescript
// apps/api/src/indexer/cursor.ts
import { readFile, writeFile } from "fs/promises";

const CURSOR_FILE = "/tmp/annona-indexer-cursor";

export async function getCursor(): Promise<number> {
  try {
    const val = await readFile(CURSOR_FILE, "utf8");
    return parseInt(val, 10) || 0;
  } catch {
    return 0;
  }
}

export async function saveCursor(ledger: number) {
  await writeFile(CURSOR_FILE, ledger.toString());
}
```

(Alternative: store cursor in `indexed_events` max ledger, or a separate `indexer_state` table.)

## Debug checklist

When events aren't appearing in dashboards:

```bash
# 1. Is CONTRACT_ID correct?
echo $CONTRACT_ID

# 2. Can we reach testnet RPC?
curl -s -X POST "https://soroban-testnet.stellar.org" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestLedger","params":{}}' | python3 -m json.tool

# 3. Are there events for this contract at all?
stellar events \
  --network testnet \
  --id $CONTRACT_ID \
  --start-ledger $(($(stellar contract invoke --id $CONTRACT_ID --network testnet -- get_admin 2>/dev/null || echo 0) - 1000)) \
  2>&1 | head -30

# 4. Check indexed_events table
psql $DATABASE_URL -c "SELECT event_type, count(*), max(processed_at) FROM indexed_events GROUP BY event_type ORDER BY 3 DESC;"

# 5. Check agreements table
psql $DATABASE_URL -c "SELECT status, count(*) FROM agreements GROUP BY status;"
```

## Verify against contract events

After running the indexer for a while, this query should match on-chain state:

```sql
-- Agreements indexed
SELECT status, count(*) FROM agreements GROUP BY status;
-- Expected after seed: Created(2), PartiallyDelivered(2), Delivered(1), Settled(3), Flagged(1), ForceMajeure(1)

-- Events processed
SELECT event_type, count(*) FROM indexed_events GROUP BY event_type ORDER BY count DESC;
-- Must include: agreement_created, delivery, receipt, settled, flagged, force_majeure, reputation
```
