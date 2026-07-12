/**
 * Demo seed — the pre-deploy bridge (CLAUDE.md 2026-07-04 log).
 *
 * Populates the Postgres read-models WITHOUT a live chain so the API + KMP
 * dashboard render before `scripts/deploy.sh` is ever run. It does this by
 * replaying the existing `apps/web/lib/mock-data.ts` fixture through the SAME
 * `applyEvent` reducer the real indexer uses: base/reference rows are inserted
 * directly, then every agreement is driven as a stream of synthesized
 * @annona/core events (create → dispatch → accept → deliver → settle → residu).
 * So the pre-deploy demo DB and the post-deploy indexed DB are byte-identical by
 * construction, and settlement money always comes from `computeSplitSettlement`
 * (the same helper the contract test pins to the §5 worked example).
 *
 * Idempotent: truncates the read-models first, so re-runs — and a later genesis
 * rebuild by the indexer — never collide with these deterministic fake tx hashes.
 *
 * Run (needs DATABASE_URL): `pnpm tsx scripts/seed.ts` (offchain-only; the flag
 * is implied — this seed never touches Stellar).
 */
import { createHash } from "node:crypto";
import "dotenv/config";
import {
  type AnnonaEventType,
  type EventEnvelope,
  computeSplitSettlement,
  kgToGrams,
} from "@annona/core";
import { sql } from "drizzle-orm";
import { getDb, schema } from "../apps/api/src/db/client.js";
import { applyEvent } from "../apps/api/src/indexer/handlers.js";
import {
  MOCK_AGREEMENTS,
  MOCK_SUPPLIER,
  MOCK_CATALOG,
  MOCK_COMMODITIES,
  MOCK_COOP,
  MOCK_DELIVERIES,
  MOCK_FARMERS,
  MOCK_PRICE_REFS,
  MOCK_RESIDU_LEDGER,
  MOCK_SETTLEMENTS,
  MOCK_YIELD_TABLE,
} from "../apps/web/lib/mock-data.js";

const db = getDb();

/** mockCatalogId → uuid, filled by seedBaseRows, read when wiring input baskets. */
const catalogIdMapGlobal = new Map<string, string>();

/** Deterministic 64-hex fake tx hash so re-runs are stable + distinguishable
 *  from real (post-deploy) hashes. */
const txh = (label: string) => createHash("sha256").update(`annona-seed:${label}`).digest("hex");

/** A monotonic ledger clock so events sort in causal order. */
let ledger = 1000;
const secondsOf = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

function envelope<T>(type: AnnonaEventType, label: string, at: number, data: T): EventEnvelope<T> {
  return { type, txHash: txh(label), eventIndex: 0, ledger: ledger++, timestamp: at, data };
}

// biome-ignore lint/suspicious/noExplicitAny: applyEvent's discriminated union is satisfied by construction here.
const emit = (env: EventEnvelope<unknown>) => applyEvent(db, env as any);

async function truncate(): Promise<void> {
  // CASCADE clears dependents; RESTART IDENTITY is a no-op for uuid PKs but
  // keeps the statement future-proof.
  await db.execute(sql`
    truncate table
      ${schema.eventLog}, ${schema.settlement}, ${schema.delivery},
      ${schema.residuRemittance}, ${schema.agreementInput},
      ${schema.fundingRequestLine}, ${schema.fundingRequest}, ${schema.supplierPayable},
      ${schema.agreement},
      ${schema.reputationCache}, ${schema.coopReputationCache}, ${schema.indexerCursor},
      ${schema.farmer}, ${schema.saprotanCatalog}, ${schema.priceRef},
      ${schema.yieldTable}, ${schema.commodity}, ${schema.coop},
      ${schema.financier}, ${schema.warehouseOperator}, ${schema.supplier}
    restart identity cascade
  `);
}

async function seedBaseRows(): Promise<Map<string, string>> {
  // Parties.
  const agrRows = await db
    .insert(schema.supplier)
    .values({ name: MOCK_SUPPLIER.name, walletAddress: MOCK_SUPPLIER.walletAddress })
    .returning({ id: schema.supplier.id });
  const supplierId = agrRows[0]?.id;
  if (!supplierId) throw new Error("seed: failed to insert supplier");

  const coRows = await db
    .insert(schema.coop)
    .values({
      supplierId,
      name: MOCK_COOP.name,
      kecamatan: MOCK_COOP.kecamatan,
      kabupaten: MOCK_COOP.kabupaten,
      provinsi: MOCK_COOP.provinsi,
      walletAddress: MOCK_COOP.walletAddress,
      prefundedCashBalance: MOCK_COOP.prefundedCashBalance,
    })
    .returning({ id: schema.coop.id });
  const coopId = coRows[0]?.id;
  if (!coopId) throw new Error("seed: failed to insert coop");

  // Reference data.
  await db.insert(schema.commodity).values(
    MOCK_COMMODITIES.map((c) => ({
      code: c.code,
      name: c.name,
      unit: c.unit,
      hppVersion: c.hppVersion,
    })),
  );
  await db.insert(schema.priceRef).values(
    MOCK_PRICE_REFS.map((p) => ({
      commodityCode: p.commodityCode,
      hpp: p.hppPerKg,
      hppSource: p.hppSource,
      marketPriceKabupaten: p.marketPriceKabupaten,
      pihpsSource: p.pihpsSource,
      asOf: p.asOf,
    })),
  );
  await db.insert(schema.yieldTable).values(
    MOCK_YIELD_TABLE.map((y) => ({
      commodityCode: y.commodityCode,
      kabupaten: y.kabupaten,
      avgYieldTPerHa: String(y.avgYieldTPerHa),
      source: y.source,
      year: y.year,
    })),
  );

  // Master catalog — build mockCatalogId → uuid for agreement-input FKs.
  const catalogIdMap = new Map<string, string>();
  for (const item of MOCK_CATALOG) {
    const rows = await db
      .insert(schema.saprotanCatalog)
      .values({
        supplierId,
        code: item.code,
        name: item.name,
        category: item.category,
        region: item.region,
        basePriceSupplier: item.basePriceSupplier,
        subsidiFlag: item.subsidiFlag,
        source: item.source,
        // v4.0 HET / e-RDKK tier: subsidized items are priced at HET and gated
        // on e-RDKK verification (recorded, never computed — Golden Rule 4).
        priceTier: item.subsidiFlag ? "subsidi" : "non_subsidi",
        hetPrice: item.subsidiFlag ? item.basePriceSupplier : null,
        erdkkGated: item.subsidiFlag ?? false,
      })
      .returning({ id: schema.saprotanCatalog.id });
    const id = rows[0]?.id;
    if (!id) throw new Error(`seed: failed to insert catalog ${item.code}`);
    catalogIdMap.set(item.id, id);
  }

  // Farmers (PII off-chain only). ktpRaw is a demo placeholder — never anchored.
  // e-RDKK badge is external reference data (recorded, never computed). Seed a
  // deterministic spread so the subsidy-distribution surface has real variety.
  const SUBSIDY_SPREAD = ["Terverifikasi", "Belum", "NonSubsidi"] as const;
  await db.insert(schema.farmer).values(
    MOCK_FARMERS.map((f, i) => ({
      coopId,
      name: f.name,
      ktpRaw: `DEMO-KTP-${f.id}`,
      ktpHash: f.ktpHash,
      walletAddress: f.walletAddress,
      plotAreaHa: String(f.plotAreaHa),
      defaultCommodityCode: f.defaultCommodityCode,
      kecamatan: f.kecamatan,
      kabupaten: MOCK_COOP.kabupaten,
      subsidyStatus: SUBSIDY_SPREAD[i % SUBSIDY_SPREAD.length],
    })),
  );

  return catalogIdMap;
}

const farmerAddr = (farmerId: string): string => {
  const f = MOCK_FARMERS.find((x) => x.id === farmerId);
  if (!f) throw new Error(`seed: unknown farmer ${farmerId}`);
  return f.walletAddress;
};

async function replayAgreement(a: (typeof MOCK_AGREEMENTS)[number]): Promise<void> {
  const oid = a.onchainId;
  let at = secondsOf(a.createdAt);
  const bump = () => (at += 3600);

  // 1. AgreementCreated — grade/moisture are ESTIMATES from the commodity struct.
  await emit(
    envelope("AgreementCreated", `created:${oid}`, at, {
      id: oid,
      farmer: farmerAddr(a.farmerId),
      coop: MOCK_COOP.walletAddress,
      supplier: MOCK_SUPPLIER.walletAddress,
      commodity: {
        code: a.commodityCode,
        grade: a.grade,
        moistureBps: a.moistureBps,
        hppVersion: a.hppVersion,
      },
      // v4.0 demo spread: every 3rd agreement priced at HET (subsidized).
      subsidyTier: Number(oid) % 3 === 0 ? "Subsidized" : "Commercial",
      basePriceSupplier: a.basePriceSupplier,
      saprotanMarkupBps: a.saprotanMarkupBps,
      inputDebt: a.inputDebt,
      hppHandlingFeeBps: a.hppHandlingFeeBps,
      expectedVolG: kgToGrams(a.expectedVolKg),
      hppPerKg: a.hppPerKg,
      toleranceBps: a.toleranceBps,
    }),
  );

  const past = (...s: string[]) => s.includes(a.status);
  const beyondCreated = !past("Created");
  const beyondDispatched = !past("Created", "SupplyDispatched");

  // 2. Gates.
  if (beyondCreated)
    await emit(
      envelope("SupplyDispatched", `dispatched:${oid}`, bump(), {
        id: oid,
        supplier: MOCK_SUPPLIER.walletAddress,
        coop: MOCK_COOP.walletAddress,
      }),
    );
  if (beyondDispatched)
    await emit(
      envelope("SupplyAccepted", `accepted:${oid}`, bump(), {
        id: oid,
        coop: MOCK_COOP.walletAddress,
        inputDebt: a.inputDebt,
      }),
    );

  // 3. Deliveries (cumulative running total, ordered by seq).
  const deliveries = MOCK_DELIVERIES.filter((d) => d.agreementId === a.id).sort(
    (x, y) => x.seq - y.seq,
  );
  let deliveredG = 0n;
  for (const d of deliveries) {
    deliveredG += kgToGrams(d.volumeKg);
    await emit(
      envelope("DeliveryRecorded", `delivery:${oid}:${d.seq}`, bump(), {
        id: oid,
        seq: d.seq,
        volumeG: kgToGrams(d.volumeKg),
        grade: d.grade,
        deliveredTotalG: deliveredG,
      }),
    );
  }

  // 4. Settlements — money via computeSplitSettlement (same helper as contract +
  //    FE); settledVolG carried CUMULATIVE (the on-chain running total).
  const settlements = MOCK_SETTLEMENTS.filter((s) => s.agreementId === a.id);
  let settledG = 0n;
  let remainingDebt = a.inputDebt;
  for (const [i, s] of settlements.entries()) {
    const before = settledG;
    settledG += kgToGrams(s.settledVolKg);
    const split = computeSplitSettlement({
      deliveredVolG: settledG,
      settledVolG: before,
      hppPerKg: a.hppPerKg,
      remainingDebt,
      hppHandlingFeeBps: a.hppHandlingFeeBps,
      basePriceSupplier: a.basePriceSupplier,
      inputDebt: a.inputDebt,
    });
    remainingDebt -= split.debtPaid;
    await emit(
      envelope("Settled", `settled:${oid}:${i}`, bump(), {
        id: oid,
        farmer: farmerAddr(a.farmerId),
        gross: split.grossSmallest,
        handlingCut: split.handlingCut,
        debtNetted: split.debtPaid,
        principalToSupplier: split.principalToSupplier,
        coopMargin: split.coopMargin,
        netPaid: split.netToFarmer,
        settledVolG: settledG,
      }),
    );
  }

  // 5. Force majeure closes the agreement without penalty.
  if (a.status === "ForceMajeure")
    await emit(envelope("ForceMajeure", `fm:${oid}`, bump(), { id: oid, reason: "FORCE_MAJEURE" }));

  // 6. Residu lifecycle (the Settled handler already created a Pending row).
  const residu = MOCK_RESIDU_LEDGER.find((r) => r.agreementId === a.id);
  if (residu && residu.status !== "Pending") {
    await emit(
      envelope("ResiduRemitted", `residu-remit:${oid}`, bump(), {
        id: oid,
        coop: MOCK_COOP.walletAddress,
        amount: residu.principalAmount,
        refHash: txh(`residu-ref:${oid}`),
      }),
    );
    if (residu.status === "Cleared")
      await emit(
        envelope("RemittanceCleared", `residu-clear:${oid}`, bump(), {
          id: oid,
          coop: MOCK_COOP.walletAddress,
          principal: residu.principalAmount,
          supplier: MOCK_SUPPLIER.walletAddress,
        }),
      );
    if (residu.status === "Disputed")
      await emit(
        envelope("RemittanceDisputed", `residu-dispute:${oid}`, bump(), {
          id: oid,
          coop: MOCK_COOP.walletAddress,
          reason: "MISMATCH",
        }),
      );
  }

  // 7. Wire off-chain-only detail to the freshly-created agreement: the input
  //    basket rows + expectedHarvestDate (neither is carried by any event).
  const created = await db
    .select({ id: schema.agreement.id })
    .from(schema.agreement)
    .where(sql`${schema.agreement.onchainId} = ${oid}`);
  const agreementUuid = created[0]?.id;
  if (agreementUuid) {
    await db
      .update(schema.agreement)
      .set({ expectedHarvestDate: a.expectedHarvestDate })
      .where(sql`${schema.agreement.id} = ${agreementUuid}`);
    if (a.inputs.length > 0) {
      await db.insert(schema.agreementInput).values(
        a.inputs.map((inp) => ({
          agreementId: agreementUuid,
          catalogId: catalogIdMapGlobal.get(inp.catalogId) as string,
          qty: String(inp.qty),
          basePriceSupplier: inp.basePriceSupplier,
          lineTotalPrincipal: inp.basePriceSupplier * BigInt(inp.qty),
        })),
      );
    }
  }
}

async function replayReputation(): Promise<void> {
  // Farmer reputation caches from the fixture's aggregate counters.
  for (const f of MOCK_FARMERS) {
    const r = f.reputation;
    await emit(
      envelope("ReputationUpdated", `rep:${f.id}`, ledger, {
        farmer: f.walletAddress,
        deliveries: r.deliveries,
        onTime: r.onTime,
        totalSettledG: kgToGrams(r.totalSettledKg),
        flags: r.flags,
      }),
    );
  }

  // Coop reputation from the residu ledger + terminal settlements.
  const cleared = MOCK_RESIDU_LEDGER.filter((r) => r.status === "Cleared");
  const disputes = MOCK_RESIDU_LEDGER.filter((r) => r.status === "Disputed").length;
  const totalCleared = cleared.reduce((sum, r) => sum + r.principalAmount, 0n);
  const settlements = MOCK_AGREEMENTS.filter((a) => a.status === "Settled").length;
  await emit(
    envelope("CoopReputationUpdated", "coop-rep", ledger, {
      coop: MOCK_COOP.walletAddress,
      settlements,
      totalResiduCleared: totalCleared,
      disputes,
      frozen: disputes > 0,
    }),
  );
}

/**
 * Link the seeded Supabase Auth users to their dashboard role in `app_user`.
 *
 * WHY this must run every seed: `truncate()` clears `coop`/`supplier` with
 * CASCADE, and `app_user.coop_id`/`supplier_id` are FKs — so truncating cascades
 * into `app_user` and wipes the role links. Without this step, every login
 * succeeds at Supabase Auth but `resolveRole()` finds no row and the UI shows
 * "Akun ini belum memiliki peran. Hubungi administrator."
 *
 * It joins `auth.users` by email, so it only links accounts that actually exist
 * in Supabase Auth (missing emails insert 0 rows — safe). Add supplier/financier
 * rows here once their auth users + the `app_role` enum values exist (v4.0).
 */
/** Rupiah whole -> smallest unit (dIDR is 7-decimal). */
const R = (whole: number): bigint => BigInt(whole) * 10_000_000n;

/**
 * v4.0: seed the Offtake Financing demo — one Financier (LPDB Koperasi) + a
 * spread of funding requests across the lifecycle (Requested / Approved /
 * Disbursed / Reconciled), each backed by real agreements (the proof packet).
 * Returns the financier id so the app_user link can point at it.
 */
const FINANCIER_WALLET = "GFINANCIERLPDBKOPERASIDEMOTESTNETWALLETPLACEHOLDER00001";

async function seedFinancing(): Promise<string> {
  const finRows = await db
    .insert(schema.financier)
    .values({
      name: "LPDB Koperasi",
      walletAddress: FINANCIER_WALLET,
      poolBalance: R(500_000_000),
    })
    .returning({ id: schema.financier.id });
  const financierId = finRows[0]?.id;
  if (!financierId) throw new Error("seed: failed to insert financier");

  const coopId = (await db.select({ id: schema.coop.id }).from(schema.coop).limit(1))[0]?.id;
  if (!coopId) throw new Error("seed: no coop for financing");
  const agrs = await db
    .select({ id: schema.agreement.id, onchainId: schema.agreement.onchainId })
    .from(schema.agreement)
    .limit(6);

  // Event-driven (anti-drift): the SAME applyEvent reducer that the live indexer
  // uses writes each funding_request header + derives coverage/risk. Only the
  // OFF-CHAIN backing lines (like saprotan_catalog, not carried by any event) are
  // inserted directly, keyed to the header by on-chain id.
  // (targetStatus, requested, approved, disbursed, reconciled, projected, backingLines)
  const plan: [
    (typeof schema.fundingStatus.enumValues)[number],
    number,
    number,
    number,
    number,
    number,
    number,
  ][] = [
    ["Requested", 30_000_000, 0, 0, 0, 52_000_000, 2],
    ["Approved", 40_000_000, 35_000_000, 0, 0, 61_000_000, 2],
    ["Disbursed", 25_000_000, 25_000_000, 25_000_000, 0, 44_000_000, 1],
    ["Reconciled", 20_000_000, 20_000_000, 20_000_000, 20_000_000, 41_000_000, 1],
    ["Rejected", 55_000_000, 0, 0, 0, 58_000_000, 1], // 94% coverage → Tinggi → declined
  ];

  let agrCursor = 0;
  let onchain = 1;
  let ts = secondsOf("2026-07-01T00:00:00Z");
  const t = () => (ts += 60);
  for (const [status, req, appr, disb, rec, proj, lineCount] of plan) {
    const oid = BigInt(onchain++);
    await emit(
      envelope("FundingRequested", `funding-req:${oid}`, t(), {
        id: oid,
        coop: MOCK_COOP.walletAddress,
        financier: FINANCIER_WALLET,
        projectedSettlement: R(proj),
        amountRequested: R(req),
        backingHash: `demo${oid.toString().padStart(60, "0")}`,
      }),
    );
    if (status === "Rejected")
      await emit(
        envelope("FundingRejected", `funding-rej:${oid}`, t(), {
          id: oid,
          financier: FINANCIER_WALLET,
          reason: "COVERAGE_TOO_HIGH",
        }),
      );
    if (status === "Approved" || status === "Disbursed" || status === "Reconciled")
      await emit(
        envelope("FundingApproved", `funding-appr:${oid}`, t(), {
          id: oid,
          financier: FINANCIER_WALLET,
          amountApproved: R(appr),
        }),
      );
    if (status === "Disbursed" || status === "Reconciled")
      await emit(
        envelope("FundingDisbursed", `funding-disb:${oid}`, t(), {
          id: oid,
          financier: FINANCIER_WALLET,
          coop: MOCK_COOP.walletAddress,
          amountDisbursed: R(disb),
        }),
      );
    if (status === "Reconciled")
      await emit(
        envelope("FundingReconciled", `funding-rec:${oid}`, t(), {
          id: oid,
          coop: MOCK_COOP.walletAddress,
          amountReconciled: R(rec),
          remaining: R(disb - rec),
        }),
      );

    // Off-chain backing detail (the proof packet), matched to the reducer-written
    // header by on-chain id.
    const frId = (
      await db
        .select({ id: schema.fundingRequest.id })
        .from(schema.fundingRequest)
        .where(sql`${schema.fundingRequest.onchainId} = ${oid}`)
    )[0]?.id;
    if (!frId) continue;
    for (let i = 0; i < lineCount; i++) {
      const a = agrs[agrCursor % agrs.length];
      agrCursor++;
      if (!a) break;
      await db.insert(schema.fundingRequestLine).values({
        fundingRequestId: frId,
        agreementId: a.id,
        backingValue: R(Math.round(proj / lineCount)),
      });
    }
  }
  console.log(`[seed] seeded 1 financier + ${plan.length} funding requests (event-driven)`);
  return financierId;
}

async function seedAppUsers(financierId: string | null): Promise<void> {
  const coopRows = (await db.execute(sql`select id from coop limit 1`)) as unknown as {
    id: string;
  }[];
  const agrRows = (await db.execute(sql`select id from supplier limit 1`)) as unknown as {
    id: string;
  }[];
  const coopId = coopRows[0]?.id ?? null;
  const supplierId = agrRows[0]?.id ?? null;

  const accounts = [
    { email: "kmp@annona.id", role: "kmp", name: "Pengurus KMP Sukamaju", coop: coopId, agr: null, fin: null },
    { email: "agrinas@annona.id", role: "supplier", name: "Operator Supplier", coop: null, agr: supplierId, fin: null },
    { email: "pemerintah@annona.id", role: "pemerintah", name: "Petugas Pengawas Kementan", coop: null, agr: null, fin: null },
    { email: "financier@annona.id", role: "financier", name: "Pemodal (LPDB Koperasi)", coop: null, agr: null, fin: financierId },
  ] as const;

  for (const a of accounts) {
    await db.execute(sql`
      insert into app_user (id, email, role, display_name, coop_id, supplier_id, financier_id)
      select u.id, ${a.email}, ${a.role}::app_role, ${a.name}, ${a.coop}::uuid, ${a.agr}::uuid, ${a.fin}::uuid
      from auth.users u
      where u.email = ${a.email}
      on conflict (id) do update set
        role = excluded.role, display_name = excluded.display_name,
        coop_id = excluded.coop_id, supplier_id = excluded.supplier_id,
        financier_id = excluded.financier_id
    `);
  }
  console.log(`[seed] linked demo app_user roles (only emails present in auth.users)`);
}

async function main(): Promise<void> {
  console.log("[seed] truncating read-models...");
  await truncate();
  console.log("[seed] inserting base + reference rows...");
  const catalogIdMap = await seedBaseRows();
  for (const [k, v] of catalogIdMap) catalogIdMapGlobal.set(k, v);
  console.log(`[seed] replaying ${MOCK_AGREEMENTS.length} agreements as events...`);
  for (const a of MOCK_AGREEMENTS) await replayAgreement(a);
  await replayReputation();
  const financierId = await seedFinancing();
  await seedAppUsers(financierId);
  console.log("[seed] done. read-models populated from the mock-data fixture.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
