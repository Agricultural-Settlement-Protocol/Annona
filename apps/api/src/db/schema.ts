/**
 * Drizzle schema — the off-chain Postgres (Supabase) side of Annona.
 * Mirrors docs/technical/ERD.md (v3.0 multi-party model, PMK 15/2026).
 *
 * Authority rule: for any money/volume/status value, ON-CHAIN WINS. These
 * tables are PII stores, reference data, and rebuildable read-model caches.
 *
 * Conventions (CLAUDE.md):
 * - Money: bigint in smallest unit (rupiah-cents). Never floats.
 * - Volumes: bigint grams. Percentages: integer bps (10000 = 100%).
 * - PII (name, ktp_raw, geo) exists ONLY here, never on-chain.
 * - Indexer idempotency: event_log unique on (tx_hash, event_index).
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ────────────────────────── enums (mirror @annona/core) ────────────────────────── */

export const agreementStatus = pgEnum("agreement_status", [
  "Created",
  "SupplyDispatched",
  "Active",
  "PartiallyDelivered",
  "Delivered",
  "Settled",
  "Flagged",
  "ForceMajeure",
]);

export const flagReason = pgEnum("flag_reason", [
  "None",
  "Warning",
  "PartialDelivery",
  "Suspected",
]);

export const residuStatus = pgEnum("residu_status", ["Pending", "Remitted", "Cleared", "Disputed"]);

export const stockStatus = pgEnum("stock_status", ["Tersedia", "Menipis", "Habis"]);

// v4.0: the input-principal operator role is "supplier" (was "agrinas" pre-4b).
// "supplier"/"financier" are the Mitra roles; PT Agrinas is the real-world entity
// that fills the supplier role. Warehouse operator is infra (non-role).
export const appRole = pgEnum("app_role", [
  "kmp",
  "pemerintah",
  "supplier",
  "financier",
]);

export const shipmentStatus = pgEnum("shipment_status", [
  "Draft",
  "Dikirim",
  "Diterima",
  "Selisih",
]);

/* ── v4.0 additive enums (subsidy tier + offtake financing) ── */

/** Which price tier the agreement's snapshotted base_price came from.
 *  Mirrors the on-chain `SubsidyTier` (SMART-CONTRACT.md §C). */
export const subsidyTier = pgEnum("subsidy_tier", ["Subsidized", "Commercial"]);

/** Farmer e-RDKK eligibility badge (recorded, never computed). */
export const subsidyStatus = pgEnum("subsidy_status", [
  "Terverifikasi",
  "Belum",
  "NonSubsidi",
]);

/** Offtake-financing lifecycle. Mirrors on-chain `FundingStatus`. */
export const fundingStatus = pgEnum("funding_status", [
  "Requested",
  "Approved",
  "Rejected",
  "Disbursed",
  "Reconciled",
]);

/** Off-chain input-payable ("Utang #1") running status. */
export const payableStatus = pgEnum("payable_status", ["Outstanding", "Partial", "Cleared"]);

/* ────────────────────────── parties ────────────────────────── */

/** Supplier (input-principal operator) — owns the master catalog, dispatches
 *  logistics, verifies residu remittance. Real-world entity: PT Agrinas Pangan
 *  Nusantara. (Table renamed agrinas -> supplier in Phase 4b.) */
export const supplier = pgTable("supplier", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Stellar G-address (supplier signing wallet) */
  walletAddress: text("wallet_address").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Financier (Pemodal) — working-capital talangan provider (e.g. LPDB Koperasi).
 *  v4.0 NEW party. Reviews an offtake proof packet + disburses dIDR; reconciled
 *  at settlement. Financier-agnostic: an address + FK, one funder in the demo. */
export const financier = pgTable("financier", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Stellar G-address (financier signing wallet) */
  walletAddress: text("wallet_address").notNull().unique(),
  /** simulated/pre-funded talangan pool (display only) */
  poolBalance: bigint("pool_balance", { mode: "bigint" }).notNull().default(sql`0`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Warehouse Operator (infra) — builds/operates gerai + gudang (PMK 15/2026).
 *  NON-transacting: no wallet, signs nothing on-chain; the off-chain physical
 *  receiver of forwarded harvest. Corrects the old "gudang Agrinas" conflation. */
export const warehouseOperator = pgTable("warehouse_operator", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kabupaten: text("kabupaten"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** KMP (Koperasi Mitra Petani) — the pre-funded on-site cash agent.
 *  KDMP is the flagship instance. */
export const coop = pgTable(
  "coop",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id),
    name: text("name").notNull(),
    kecamatan: text("kecamatan").notNull(),
    kabupaten: text("kabupaten").notNull(),
    provinsi: text("provinsi").notNull(),
    /** Stellar G-address */
    walletAddress: text("wallet_address").notNull().unique(),
    /** on-site cashflow display only; chain is authoritative for accruals */
    prefundedCashBalance: bigint("prefunded_cash_balance", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("coop_supplier_id_idx").on(t.supplierId)],
);

/** Farmer — PII lives ONLY here. ktp_raw is hashed before anchoring;
 *  ktp_hash mirrors the on-chain BytesN<32> for integrity verification. */
export const farmer = pgTable(
  "farmer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coopId: uuid("coop_id")
      .notNull()
      .references(() => coop.id),
    /** PII — off-chain only */
    name: text("name").notNull(),
    /** PII — hashed before anchoring; never leaves this DB */
    ktpRaw: text("ktp_raw").notNull(),
    /** hex sha-256, mirrors on-chain ktp_hash */
    ktpHash: text("ktp_hash").notNull(),
    /** Stellar G-address */
    walletAddress: text("wallet_address").notNull().unique(),
    plotAreaHa: numeric("plot_area_ha", { precision: 8, scale: 2 }).notNull(),
    defaultCommodityCode: text("default_commodity_code").references(() => commodity.code),
    kecamatan: text("kecamatan").notNull(),
    kabupaten: text("kabupaten").notNull(),
    /** optional plot polygon — PII, off-chain only */
    geo: jsonb("geo"),
    /** e-RDKK/i-Pubers eligibility badge (from Kementan; recorded, never computed).
     *  Gates the price tier offered at agreement creation (F1 → F2). */
    subsidyStatus: subsidyStatus("subsidy_status").notNull().default("NonSubsidi"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("farmer_coop_id_idx").on(t.coopId), index("farmer_ktp_hash_idx").on(t.ktpHash)],
);

/* ────────────────────────── reference data ────────────────────────── */

/** Commodity master (GABAH / JAGUNG / KOPI ...). */
export const commodity = pgTable("commodity", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("kg"),
  /** current HPP decree (Inpres no.) */
  hppVersion: integer("hpp_version").notNull(),
});

/** Master Saprotan Catalog — SUPPLIER-OWNED data (Screen M). base_price_supplier
 *  is the PRINCIPAL, read-only to KMP; snapshotted into agreements at create. */
export const saprotanCatalog = pgTable(
  "saprotan_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    /** pupuk / benih / pestisida / alsintan */
    category: text("category").notNull(),
    /** operational region this base price applies to */
    region: text("region").notNull(),
    /** PRINCIPAL — supplier-set, smallest unit */
    basePriceSupplier: bigint("base_price_supplier", { mode: "bigint" }).notNull(),
    subsidiFlag: boolean("subsidi_flag").notNull().default(false),
    /** v4.0: price tier label — "subsidi" (HET ceiling) / "non_subsidi" (commercial). */
    priceTier: text("price_tier").notNull().default("non_subsidi"),
    /** subsidized ceiling price (HET) when price_tier=subsidi, smallest unit. */
    hetPrice: bigint("het_price", { mode: "bigint" }),
    /** true if selecting this item requires farmer subsidy_status = Terverifikasi. */
    erdkkGated: boolean("erdkk_gated").notNull().default(false),
    source: text("source"),
    /** availability signal for KMP requests; no numeric inventory ledger in MVP */
    stockStatus: stockStatus("stock_status").notNull().default("Tersedia"),
    unitLabel: text("unit_label").notNull().default("unit"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("saprotan_catalog_code_region_idx").on(t.code, t.region),
    index("saprotan_catalog_supplier_id_idx").on(t.supplierId),
  ],
);

/** HPP + reference market prices. HPP is the settlement anchor (decree-set);
 *  market price is display-only, never settlement. */
export const priceRef = pgTable(
  "price_ref",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commodityCode: text("commodity_code")
      .notNull()
      .references(() => commodity.code),
    /** smallest unit per kg */
    hpp: bigint("hpp", { mode: "bigint" }).notNull(),
    hppSource: text("hpp_source").notNull(),
    marketPriceKabupaten: bigint("market_price_kabupaten", { mode: "bigint" }),
    pihpsSource: text("pihps_source"),
    asOf: date("as_of").notNull(),
  },
  (t) => [index("price_ref_commodity_code_idx").on(t.commodityCode)],
);

/** Yield table backing the transparent estimator:
 *  expected_vol = plot_area_ha * avg_yield_t_per_ha(commodity, kabupaten).
 *  Formula + source always shown in UI. Never "AI prediction". */
export const yieldTable = pgTable(
  "yield_table",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commodityCode: text("commodity_code")
      .notNull()
      .references(() => commodity.code),
    kabupaten: text("kabupaten").notNull(),
    avgYieldTPerHa: numeric("avg_yield_t_per_ha", { precision: 6, scale: 2 }).notNull(),
    /** BPS / KATAM */
    source: text("source").notNull(),
    year: integer("year").notNull(),
  },
  (t) => [
    uniqueIndex("yield_table_commodity_kabupaten_year_idx").on(
      t.commodityCode,
      t.kabupaten,
      t.year,
    ),
  ],
);

/* ────────────────────────── agreements (chain mirror + detail) ────────────────────────── */

/** Off-chain agreement row. Chain is authoritative for money/volume/status;
 *  this row joins PII + line-item detail to the chain via onchain_id. */
export const agreement = pgTable(
  "agreement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** join key to AGREEMENT_ONCHAIN.id */
    onchainId: bigint("onchain_id", { mode: "bigint" }).unique(),
    coopId: uuid("coop_id")
      .notNull()
      .references(() => coop.id),
    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => farmer.id),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id),
    commodityCode: text("commodity_code")
      .notNull()
      .references(() => commodity.code),
    grade: text("grade").notNull(),
    moistureBps: integer("moisture_bps").notNull(),

    /* the four locked price components (mirror of chain) */
    basePriceSupplier: bigint("base_price_supplier", { mode: "bigint" }).notNull(),
    saprotanMarkupBps: integer("saprotan_markup_bps").notNull(),
    /** DERIVED on-chain = base * (10000 + markup_bps) / 10000 */
    inputDebt: bigint("input_debt", { mode: "bigint" }).notNull(),
    hppHandlingFeeBps: integer("hpp_handling_fee_bps").notNull(),

    expectedVolG: bigint("expected_vol_g", { mode: "bigint" }).notNull(),
    hppPerKg: bigint("hpp_per_kg", { mode: "bigint" }).notNull(),
    hppVersion: integer("hpp_version").notNull(),
    toleranceBps: integer("tolerance_bps").notNull(),

    /* mirrors of chain state (rebuildable from events) */
    status: agreementStatus("status").notNull().default("Created"),
    flag: flagReason("flag").notNull().default("None"),
    residuStatus: residuStatus("residu_status").notNull().default("Pending"),

    /** Off-chain-only estimate: expected harvest window start (drives "Panen
     *  Minggu Ini"). NOT carried by any on-chain event — written by the KMP
     *  create flow / seed, never the indexer. Nullable for legacy rows. */
    expectedHarvestDate: date("expected_harvest_date"),

    /** v4.0: which price tier the snapshotted base_price came from (mirror of chain). */
    subsidyTier: subsidyTier("subsidy_tier").notNull().default("Commercial"),
    /** v4.0: set when a funding request backs this agreement (nullable). */
    financierId: uuid("financier_id").references(() => financier.id),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("agreement_coop_id_idx").on(t.coopId),
    index("agreement_farmer_id_idx").on(t.farmerId),
    index("agreement_supplier_id_idx").on(t.supplierId),
    index("agreement_status_idx").on(t.status),
  ],
);

/** Input basket line items (off-chain detail; principal snapshot per line). */
export const agreementInput = pgTable(
  "agreement_input",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => agreement.id),
    catalogId: uuid("catalog_id")
      .notNull()
      .references(() => saprotanCatalog.id),
    qty: numeric("qty", { precision: 12, scale: 2 }).notNull(),
    /** principal snapshot at agreement creation, smallest unit */
    basePriceSupplier: bigint("base_price_supplier", { mode: "bigint" }).notNull(),
    lineTotalPrincipal: bigint("line_total_principal", { mode: "bigint" }).notNull(),
  },
  (t) => [index("agreement_input_agreement_id_idx").on(t.agreementId)],
);

/* ────────────────────────── delivery + settlement (chain mirror) ────────────────────────── */

export const delivery = pgTable(
  "delivery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => agreement.id),
    seq: integer("seq").notNull(),
    volumeG: bigint("volume_g", { mode: "bigint" }).notNull(),
    grade: text("grade").notNull(),
    moistureBps: integer("moisture_bps"),
    /** tx hash of the on-chain HarvestReceipt mint */
    receiptOnchainRef: text("receipt_onchain_ref"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull().defaultNow(),
    flag: flagReason("flag").notNull().default("None"),
  },
  (t) => [uniqueIndex("delivery_agreement_seq_idx").on(t.agreementId, t.seq)],
);

/** Three-way split settlement record (mirror of the Settled event).
 *  gross -> handling_cut (KMP) + debt_netted (splits into principal_to_supplier
 *  + coop_margin) + net_paid (farmer). */
export const settlement = pgTable(
  "settlement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Owning agreement. v3 settle() nets the delta across ALL unsettled
     *  deliveries, so a settlement keys on the agreement, not a single delivery. */
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => agreement.id),
    /** The latest delivery at settle time (context only; a settle may span
     *  several deliveries). Nullable because the link is informational. */
    deliveryId: uuid("delivery_id").references(() => delivery.id),
    gross: bigint("gross", { mode: "bigint" }).notNull(),
    /** KMP keeps */
    handlingCut: bigint("handling_cut", { mode: "bigint" }).notNull(),
    debtNetted: bigint("debt_netted", { mode: "bigint" }).notNull(),
    /** residu principal, owed back to supplier */
    principalToSupplier: bigint("principal_to_supplier", { mode: "bigint" }).notNull(),
    /** KMP keeps */
    coopMargin: bigint("coop_margin", { mode: "bigint" }).notNull(),
    /** cash out to farmer */
    netPaid: bigint("net_paid", { mode: "bigint" }).notNull(),
    /** volume settled by THIS settle call (per-settle delta). The Settled event
     *  carries the cumulative total; the indexer stores the delta = cumulative
     *  minus prior SUM so per-payment volume renders in the payment history. */
    settledVolG: bigint("settled_vol_g", { mode: "bigint" }).notNull(),
    /** Path A: bank / BRILink reference */
    rupiahRef: text("rupiah_ref"),
    settlementTxHash: text("settlement_tx_hash"),
    settledAt: timestamp("settled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("settlement_agreement_id_idx").on(t.agreementId),
    index("settlement_delivery_id_idx").on(t.deliveryId),
  ],
);

/* ────────────────────────── residu reconciliation ────────────────────────── */

/** KMP -> supplier principal remittance (off-chain rupiah, on-chain anchored).
 *  Proof of the manual bank transfer lives here; status mirrors chain. */
export const residuRemittance = pgTable(
  "residu_remittance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coopId: uuid("coop_id")
      .notNull()
      .references(() => coop.id),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id),
    agreementOnchainId: bigint("agreement_onchain_id", { mode: "bigint" }).notNull(),
    /** supplier money owed, smallest unit */
    principalAmount: bigint("principal_amount", { mode: "bigint" }).notNull(),
    /** manual transfer reference */
    bankRef: text("bank_ref"),
    /** uploaded transfer proof (Supabase Storage path) */
    proofUrl: text("proof_url"),
    status: residuStatus("status").notNull().default("Pending"),
    disputeReason: text("dispute_reason"),
    /** on-chain confirm/dispute tx */
    remittanceTxHash: text("remittance_tx_hash"),
    remittedAt: timestamp("remitted_at", { withTimezone: true }),
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
  },
  (t) => [
    index("residu_remittance_coop_id_idx").on(t.coopId),
    index("residu_remittance_supplier_id_idx").on(t.supplierId),
    index("residu_remittance_status_idx").on(t.status),
    index("residu_remittance_agreement_onchain_id_idx").on(t.agreementOnchainId),
  ],
);

/* ────────────────────────── reputation caches (indexer-synced) ────────────────────────── */

/** Farmer reputation cache — synced from ReputationUpdated events. */
export const reputationCache = pgTable("reputation_cache", {
  farmerId: uuid("farmer_id")
    .primaryKey()
    .references(() => farmer.id),
  deliveries: integer("deliveries").notNull().default(0),
  onTime: integer("on_time").notNull().default(0),
  totalSettledG: bigint("total_settled_g", { mode: "bigint" }).notNull().default(sql`0`),
  flags: integer("flags").notNull().default(0),
  forceMajeureEvents: integer("force_majeure_events").notNull().default(0),
  /** derived score for badges */
  score: integer("score").notNull().default(0),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

/** KMP reputation cache — synced from CoopReputationUpdated events.
 *  The residu-integrity trust signal supplier + Government + banks read. */
export const coopReputationCache = pgTable("coop_reputation_cache", {
  coopId: uuid("coop_id")
    .primaryKey()
    .references(() => coop.id),
  agreements: integer("agreements").notNull().default(0),
  settlements: integer("settlements").notNull().default(0),
  totalResiduPrincipal: bigint("total_residu_principal", { mode: "bigint" })
    .notNull()
    .default(sql`0`),
  totalResiduCleared: bigint("total_residu_cleared", { mode: "bigint" }).notNull().default(sql`0`),
  disputes: integer("disputes").notNull().default(0),
  /** dispute freeze indicator — humans resolve, never an auto-accusation */
  frozen: boolean("frozen").notNull().default(false),
  score: integer("score").notNull().default(0),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ────────────────────────── indexer ────────────────────────── */

/** Raw contract event log. Idempotency key: (tx_hash, event_index).
 *  Every read-model is rebuildable by replaying this table from genesis. */
export const eventLog = pgTable(
  "event_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    txHash: text("tx_hash").notNull(),
    eventIndex: integer("event_index").notNull(),
    /** AnnonaEventType from @annona/core */
    type: text("type").notNull(),
    ledger: integer("ledger").notNull(),
    ledgerTimestamp: timestamp("ledger_timestamp", { withTimezone: true }).notNull(),
    /** decoded event payload (bigints serialized as strings) */
    data: jsonb("data").notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("event_log_tx_hash_event_index_idx").on(t.txHash, t.eventIndex),
    index("event_log_type_idx").on(t.type),
    index("event_log_ledger_idx").on(t.ledger),
  ],
);

/* ────────────────────────── auth + logistics (v3.1 off-chain) ────────────── */

/** Email-login profile (MVP RBAC). id references auth.users. */
export const appUser = pgTable("app_user", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: appRole("role").notNull(),
  displayName: text("display_name").notNull(),
  coopId: uuid("coop_id").references(() => coop.id),
  /** set for role=supplier (input principal). */
  supplierId: uuid("supplier_id").references(() => supplier.id),
  /** set for role=financier. */
  financierId: uuid("financier_id").references(() => financier.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** KMP forwards stored harvest to gudang Agrinas. Off-chain for MVP; the
 *  Dikirim -> Diterima double gate is the designed v3.1 on-chain upgrade
 *  path (SMART-CONTRACT.md roadmap). */
export const harvestShipment = pgTable(
  "harvest_shipment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coopId: uuid("coop_id")
      .notNull()
      .references(() => coop.id),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id),
    commodityCode: text("commodity_code")
      .notNull()
      .references(() => commodity.code),
    status: shipmentStatus("status").notNull().default("Draft"),
    /** sender-declared total */
    // SQL-side default (drizzle-kit 0.31 cannot serialize a `0n` BigInt literal into its snapshot)
    totalVolumeG: bigint("total_volume_g", { mode: "bigint" }).notNull().default(sql`0`),
    /** receiver-confirmed total; null until supplier confirms */
    receivedVolumeG: bigint("received_volume_g", { mode: "bigint" }),
    discrepancyNote: text("discrepancy_note"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("harvest_shipment_coop_idx").on(t.coopId),
    index("harvest_shipment_supplier_idx").on(t.supplierId),
    index("harvest_shipment_status_idx").on(t.status),
  ],
);

/** Lot lines keep per-farmer traceability: which deliveries compose the
 *  shipment. Grade + kadar air per line; UI shows weighted-average moisture
 *  per grade-lot (standard grain-logistics practice). */
export const harvestShipmentLine = pgTable(
  "harvest_shipment_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => harvestShipment.id, { onDelete: "cascade" }),
    deliveryId: uuid("delivery_id").references(() => delivery.id),
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => agreement.id),
    farmerId: uuid("farmer_id")
      .notNull()
      .references(() => farmer.id),
    volumeG: bigint("volume_g", { mode: "bigint" }).notNull(),
    grade: text("grade").notNull(),
    moistureBps: integer("moisture_bps").notNull(),
  },
  (t) => [index("harvest_shipment_line_shipment_idx").on(t.shipmentId)],
);

/** Indexer poll cursor — single row per contract, so restarts resume
 *  from the last processed ledger instead of genesis. */
export const indexerCursor = pgTable("indexer_cursor", {
  contractId: text("contract_id").primaryKey(),
  lastLedger: integer("last_ledger").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ────────────────────────── v4.0 offtake financing (chain-mirror) ────────────────────────── */

/** Offtake-financing request header (mirrors on-chain `FundingRequest`).
 *  coverage_ratio + risk_badge are DERIVED (display). Rebuildable from the 5
 *  Funding* events. See ERD.md §C + SMART-CONTRACT.md §B. */
export const fundingRequest = pgTable(
  "funding_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** join key to FUNDING_REQUEST_ONCHAIN.id */
    onchainId: bigint("onchain_id", { mode: "bigint" }).unique(),
    coopId: uuid("coop_id")
      .notNull()
      .references(() => coop.id),
    financierId: uuid("financier_id")
      .notNull()
      .references(() => financier.id),
    /** hex sha-256 of the off-chain Bukti Offtake packet (agreement ids + receipts) */
    backingHash: text("backing_hash"),
    projectedSettlement: bigint("projected_settlement", { mode: "bigint" }).notNull().default(sql`0`),
    amountRequested: bigint("amount_requested", { mode: "bigint" }).notNull().default(sql`0`),
    amountApproved: bigint("amount_approved", { mode: "bigint" }).notNull().default(sql`0`),
    amountDisbursed: bigint("amount_disbursed", { mode: "bigint" }).notNull().default(sql`0`),
    amountReconciled: bigint("amount_reconciled", { mode: "bigint" }).notNull().default(sql`0`),
    /** derived = requested / projected_settlement (note: inverted, lower = safer) */
    coverageRatioBps: integer("coverage_ratio_bps"),
    riskBadge: text("risk_badge"),
    status: fundingStatus("status").notNull().default("Requested"),
    proofUrl: text("proof_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("funding_request_coop_idx").on(t.coopId),
    index("funding_request_financier_idx").on(t.financierId),
    index("funding_request_status_idx").on(t.status),
  ],
);

/** Off-chain backing detail whose hash is `backing_hash` on-chain (mirrors the
 *  agreement_input ↔ on-chain-snapshot relationship). */
export const fundingRequestLine = pgTable(
  "funding_request_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundingRequestId: uuid("funding_request_id")
      .notNull()
      .references(() => fundingRequest.id, { onDelete: "cascade" }),
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => agreement.id),
    /** kg_expected_or_delivered * hpp for this backing agreement, smallest unit */
    backingValue: bigint("backing_value", { mode: "bigint" }).notNull().default(sql`0`),
  },
  (t) => [index("funding_request_line_request_idx").on(t.fundingRequestId)],
);

/** Input payable ("Utang #1") — OFF-CHAIN trade payable the coop owes the
 *  supplier for stock drawn (tebus price). Accrues on SupplyDispatched, paid
 *  down by on-chain residu remittances (RemittanceCleared). Not multi-party
 *  money movement at accrual → off-chain, same test as saprotan_catalog.
 *  supplier_id FKs the `supplier` table (Phase 4b rename complete). */
export const supplierPayable = pgTable(
  "supplier_payable",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coopId: uuid("coop_id")
      .notNull()
      .references(() => coop.id),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => supplier.id),
    /** the dispatch (agreement) that accrued this payable */
    agreementOnchainId: bigint("agreement_onchain_id", { mode: "bigint" }),
    principalAccrued: bigint("principal_accrued", { mode: "bigint" }).notNull().default(sql`0`),
    principalSettled: bigint("principal_settled", { mode: "bigint" }).notNull().default(sql`0`),
    status: payableStatus("status").notNull().default("Outstanding"),
    accruedAt: timestamp("accrued_at", { withTimezone: true }).notNull().defaultNow(),
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
  },
  (t) => [
    index("supplier_payable_coop_idx").on(t.coopId),
    index("supplier_payable_supplier_idx").on(t.supplierId),
  ],
);

/* ────────────────────────── off-chain warehouse ledger ────────────────────────── */

/** KMP warehouse stock ledger (off-chain, catatan lokal). NOT a chain read-model:
 *  a simple in/out log the officer maintains for physical inventory tracking.
 *  category is either 'saprotan' (agricultural inputs) or 'hasil-panen' (harvested
 *  commodity before forwarding to the Agrinas warehouse). Qty fields are free-text
 *  so the officer can record human-readable units (karung, kg, kantong) without
 *  forcing a numeric schema. Persists to Postgres so data survives page refresh. */
export const warehouseStock = pgTable(
  "warehouse_stock",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coopId: uuid("coop_id")
      .notNull()
      .references(() => coop.id),
    itemName: text("item_name").notNull(),
    /** 'saprotan' | 'hasil-panen' */
    category: text("category").notNull(),
    inQty: text("in_qty").notNull().default(""),
    outQty: text("out_qty").notNull().default(""),
    balance: text("balance").notNull().default(""),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("warehouse_stock_coop_id_idx").on(t.coopId)],
);