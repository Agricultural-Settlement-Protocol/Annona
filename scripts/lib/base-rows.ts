/**
 * Off-chain base + reference rows shared by both demo data paths:
 *   - scripts/seed.ts        (synthetic events, MOCK wallet addresses)
 *   - scripts/demo-driver.ts (real testnet txns, REAL generated addresses)
 *
 * These rows are NOT on-chain and NOT produced by any event — the indexer only
 * RESOLVES against them (address -> farmer/coop/supplier uuid). So whichever path
 * populates the read-models, the parties/reference/catalog must exist first with
 * wallet addresses that match the on-chain addresses used. Parameterizing the
 * wallets lets the seed use mock addresses and the driver use real ones from the
 * same insert logic — no drift.
 */
import type { Db } from "../../apps/api/src/db/client.js";
import { schema } from "../../apps/api/src/db/client.js";
import {
  MOCK_SUPPLIER,
  MOCK_CATALOG,
  MOCK_COMMODITIES,
  MOCK_COOP,
  MOCK_FARMERS,
  MOCK_PRICE_REFS,
  MOCK_YIELD_TABLE,
} from "../../apps/web/lib/mock-data.js";

export interface WalletResolvers {
  supplierWallet: string;
  coopWallet: string;
  /** mock farmer id (e.g. "frm-001") -> the wallet address to store on the row. */
  farmerWallet: (mockFarmerId: string) => string;
}

export interface BaseRowIds {
  supplierId: string;
  coopId: string;
  /** mock catalog id (e.g. "cat-urea") -> saprotan_catalog uuid. */
  catalogIdMap: Map<string, string>;
}

/** Insert parties + reference + catalog + farmers with the given wallets. */
export async function seedBaseRows(db: Db, r: WalletResolvers): Promise<BaseRowIds> {
  const agrRows = await db
    .insert(schema.supplier)
    .values({ name: MOCK_SUPPLIER.name, walletAddress: r.supplierWallet })
    .returning({ id: schema.supplier.id });
  const supplierId = agrRows[0]?.id;
  if (!supplierId) throw new Error("base-rows: failed to insert supplier");

  const coRows = await db
    .insert(schema.coop)
    .values({
      supplierId,
      name: MOCK_COOP.name,
      kecamatan: MOCK_COOP.kecamatan,
      kabupaten: MOCK_COOP.kabupaten,
      provinsi: MOCK_COOP.provinsi,
      walletAddress: r.coopWallet,
      prefundedCashBalance: MOCK_COOP.prefundedCashBalance,
    })
    .returning({ id: schema.coop.id });
  const coopId = coRows[0]?.id;
  if (!coopId) throw new Error("base-rows: failed to insert coop");

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
      })
      .returning({ id: schema.saprotanCatalog.id });
    const id = rows[0]?.id;
    if (!id) throw new Error(`base-rows: failed to insert catalog ${item.code}`);
    catalogIdMap.set(item.id, id);
  }

  await db.insert(schema.farmer).values(
    MOCK_FARMERS.map((f) => ({
      coopId,
      name: f.name,
      ktpRaw: `DEMO-KTP-${f.id}`,
      ktpHash: f.ktpHash,
      walletAddress: r.farmerWallet(f.id),
      plotAreaHa: String(f.plotAreaHa),
      defaultCommodityCode: f.defaultCommodityCode,
      kecamatan: f.kecamatan,
      kabupaten: MOCK_COOP.kabupaten,
    })),
  );

  return { supplierId, coopId, catalogIdMap };
}

/** Truncate every read-model + base table (idempotent re-runs / genesis rebuild). */
export async function truncateAll(db: Db, sql: (typeof import("drizzle-orm"))["sql"]): Promise<void> {
  await db.execute(sql`
    truncate table
      ${schema.eventLog}, ${schema.settlement}, ${schema.delivery},
      ${schema.residuRemittance}, ${schema.agreementInput}, ${schema.agreement},
      ${schema.reputationCache}, ${schema.coopReputationCache}, ${schema.indexerCursor},
      ${schema.farmer}, ${schema.saprotanCatalog}, ${schema.priceRef},
      ${schema.yieldTable}, ${schema.commodity}, ${schema.coop}, ${schema.supplier}
    restart identity cascade
  `);
}
