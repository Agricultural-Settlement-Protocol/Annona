---
name: annona-seed
description: Generate scripts/seed.ts with 10 realistic Indonesian farmers and demo agreements across lifecycle stages. Creates rich demo data covering happy path, partial settlement, flags, and force-majeure. Run before demo to populate testnet + DB.
---

# /annona-seed — Demo Seed Data Generator

Generates `scripts/seed.ts`: 10 realistic farmers across Java/Sumatra, multiple commodities (gabah hero, jagung secondary), all lifecycle stages covered for a rich demo.

## Step 1: Check current state

```bash
cat scripts/seed.ts 2>/dev/null | head -20 || echo "SEED SCRIPT NOT FOUND"
ls scripts/ 2>/dev/null
```

## Step 2: Write scripts/seed.ts

The seed must cover these scenarios (for demo richness):

| Farmer | Commodity | Scenario | For demo |
|---|---|---|---|
| Budi Santoso | Gabah | Settled (full, clean) | Happy path demo |
| Sari Dewi | Gabah | Settled (partial, 2 deliveries) | Partial settlement demo |
| Ahmad Fauzi | Gabah | Delivered, pending settle | "Settle" button live |
| Eko Prasetyo | Jagung | Delivered, Warning flag (85%) | Flag + 2nd commodity |
| Rini Susanti | Gabah | Flagged Suspected (<40%) | Auditor flag queue |
| Joko Widodo | Gabah | ForceMajeure | Force-majeure demo |
| Sri Mulyani | Gabah | PartiallyDelivered (60%) | In-progress |
| Hendra Setiawan | Jagung | Active, no delivery yet | New agreement |
| Dewi Rahayu | Gabah | Settled (debt > first delivery, clears on 2nd) | Edge case demo |
| Nur Hidayah | Gabah | Active, Created | Freshest agreement |

### Geographic spread (for kabupaten yield variety)

```typescript
const KABUPATEN_DATA = {
  "Grobogan":   { provinsi: "Jawa Tengah",  yieldPerHaG: 6_200_000 },
  "Demak":      { provinsi: "Jawa Tengah",  yieldPerHaG: 5_800_000 },
  "Klaten":     { provinsi: "Jawa Tengah",  yieldPerHaG: 6_500_000 },
  "Subang":     { provinsi: "Jawa Barat",   yieldPerHaG: 5_950_000 },
  "Karawang":   { provinsi: "Jawa Barat",   yieldPerHaG: 6_100_000 },
  "Sidoarjo":   { provinsi: "Jawa Timur",   yieldPerHaG: 6_300_000 },
  "Lamongan":   { provinsi: "Jawa Timur",   yieldPerHaG: 6_000_000 },
};
```

### HPP data (Inpres 4/2026)

```typescript
const HPP = {
  GABAH:  { perKg: 6_500, version: 4 },   // Rp6,500/kg
  JAGUNG: { perKg: 5_500, version: 4 },    // Rp5,500/kg
};
```

### Input basket catalog

```typescript
const INPUT_CATALOG = [
  { code: "UREA",     name: "Pupuk Urea",         category: "pupuk",     unitPrice: 2_250, subsidized: true  },
  { code: "NPK",      name: "NPK Phonska",         category: "pupuk",     unitPrice: 2_300, subsidized: true  },
  { code: "INPARI42", name: "Benih Inpari 42",     category: "benih",     unitPrice: 8_500, subsidized: false },
  { code: "HIBRIDA7", name: "Benih Jagung Hibrida",category: "benih",     unitPrice: 55_000, subsidized: false },
  { code: "FURADAN",  name: "Furadan (insektisida)",category: "pestisida", unitPrice: 45_000, subsidized: false },
];
```

### Seed script structure

```typescript
// scripts/seed.ts
import { createClient } from "@supabase/supabase-js";
import * as StellarSdk from "@stellar/stellar-sdk";

async function main() {
  // 1. Insert KDMP coop
  const coop = await insertCoop({
    name: "KDMP Desa Sukamaju",
    kecamatan: "Gubug",
    kabupaten: "Grobogan",
    provinsi: "Jawa Tengah",
    walletAddress: process.env.COOP_WALLET!,
  });

  // 2. Insert 10 farmers with pre-generated testnet keypairs
  const farmers = await insertFarmers(coop.id);

  // 3. For each farmer: create on-chain agreement + DB records
  // 4. For settled/delivered farmers: call record_delivery + settle
  // 5. Seed input_catalog, commodities, yield_table
  
  console.log("Seed complete:");
  console.log(`  Coop: ${coop.id}`);
  console.log(`  Farmers: ${farmers.length}`);
  farmers.forEach(f => console.log(`  - ${f.name}: ${f.scenario}`));
}

// Use pre-seeded testnet keys (fund with stellar keys generate --network testnet)
// Store in .env as FARMER_KEY_1 through FARMER_KEY_10
// NEVER use real keys in seed scripts
```

## Step 3: Generate demo keypairs file

Output to `scripts/demo-accounts.md` (not committed with real keys):
```
COOP_KEY    = G... (testnet only)
FARMER_01   = G... (Budi Santoso — happy path)
FARMER_02   = G... (Sari Dewi — partial)
...
```

Also create `scripts/fund-testnet.sh`:
```bash
#!/bin/bash
# Fund all demo accounts via Stellar testnet friendbot
ACCOUNTS=(
  "$COOP_WALLET"
  "$FARMER_KEY_1"
  # etc
)
for acc in "${ACCOUNTS[@]}"; do
  curl "https://friendbot.stellar.org?addr=$acc"
  sleep 0.5
done
echo "All accounts funded"
```

## Step 4: Verify seed can run

```bash
# Type-check
pnpm exec tsc scripts/seed.ts --noEmit 2>&1

# Dry-run (DB only, no chain calls)
DRY_RUN=true pnpm exec tsx scripts/seed.ts 2>&1 | head -30
```

## Demo data invariants

1. Farmer "Budi Santoso" MUST have a clean full-settled agreement (Rp14.9M example from docs — 2,600kg gabah × Rp6,500 − Rp2M debt = Rp14.9M net).
2. Farmer "Sari Dewi" MUST show 2 separate deliveries (partial settlement across them).
3. At least 1 farmer with `Suspected` flag in auditor queue.
4. At least 1 `ForceMajeure` agreement (no rep penalty).
5. At least 1 `JAGUNG` agreement (proves generic contract).
6. No real KTP numbers. Use format `3274XXXXXXXXX` with random digits.
7. All amounts must be Rp-realistic (input debts Rp1.5M–Rp3M, plots 0.25–1.5 ha).
8. KTP hash must be SHA-256 of `ktpRaw` (for verifiability demo). Use Node crypto.
