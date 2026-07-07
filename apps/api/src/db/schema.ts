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

export const residuStatus = pgEnum("residu_status", [
  "Pending",
  "Remitted",
  "Cleared",
  "Disputed",
]);

export const stockStatus = pgEnum("stock_status", ["Tersedia", "Menipis", "Habis"]);

export const appRole = pgEnum("app_role", ["kmp", "agrinas", "pemerintah"]);

export const shipmentStatus = pgEnum("shipment_status", [
  "Draft",
  "Dikirim",
  "Diterima",
  "Selisih",
]);

/* ────────────────────────── parties ────────────────────────── */

/** PT Agrinas Pangan Nusantara — the operator. Owns the master catalog,
 *  dispatches logistics, verifies residu remittance. */
export const agrinas = pgTable("agrinas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Stellar G-address (operator signing wallet) */
  walletAddress: text("wallet_address").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** KMP (Koperasi Mitra Petani) — the pre-funded on-site cash agent.
 *  KDMP is the flagship instance. */
export const coop = pgTable(
  "coop",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agrinasId: uuid("agrinas_id")
      .notNull()
      .references(() => agrinas.id),
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
  (t) => [index("coop_agrinas_id_idx").on(t.agrinasId)],
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("farmer_coop_id_idx").on(t.coopId),
    index("farmer_ktp_hash_idx").on(t.ktpHash),
  ],
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

/** Master Saprotan Catalog — AGRINAS-OWNED data (Screen M). base_price_agrinas
 *  is the PRINCIPAL, read-only to KMP; snapshotted into agreements at create. */
export const saprotanCatalog = pgTable(
  "saprotan_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agrinasId: uuid("agrinas_id")
      .notNull()
      .references(() => agrinas.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    /** pupuk / benih / pestisida / alsintan */
    category: text("category").notNull(),
    /** operational region this base price applies to */
    region: text("region").notNull(),
    /** PRINCIPAL — Agrinas-set, smallest unit */
    basePriceAgrinas: bigint("base_price_agrinas", { mode: "bigint" }).notNull(),
    subsidiFlag: boolean("subsidi_flag").notNull().default(false),
    source: text("source"),
    /** availability signal for KMP requests; no numeric inventory ledger in MVP */
    stockStatus: stockStatus("stock_status").notNull().default("Tersedia"),
    unitLabel: text("unit_label").notNull().default("unit"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("saprotan_catalog_code_region_idx").on(t.code, t.region),
    index("saprotan_catalog_agrinas_id_idx").on(t.agrinasId),
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
    agrinasId: uuid("agrinas_id")
      .notNull()
      .references(() => agrinas.id),
    commodityCode: text("commodity_code")
      .notNull()
      .references(() => commodity.code),
    grade: text("grade").notNull(),
    moistureBps: integer("moisture_bps").notNull(),

    /* the four locked price components (mirror of chain) */
    basePriceAgrinas: bigint("base_price_agrinas", { mode: "bigint" }).notNull(),
    saprotanMarkupBps: integer("saprotan_markup_bps").notNull(),
    /** DERIVED on-chain = base * (10000 + markup_bps) / 10000 */
    inputDebt: bigint("input_debt", { mode: "bigint" }).notNull(),
    hppHandlingFeeBps: integer("hpp_handling_fee_bps").notNull(),

    expectedVolG: bigint("expected_vol_g", { mode: "bigint" }).notNull(),
    hppPerKg: bigint("hpp_per_kg", { mode: "bigint" }).notNull(),
    hppVersion: integer("hpp_version").notNull(),
    toleranceBps: integer("tolerance_bps").notNull(),

    /** Off-chain harvest window estimate captured at creation. Not derivable
     *  from any chain event; powers mv_upcoming_harvest. Never a settlement
     *  input. (Read-model gap fix, 2026-07-07.) */
    expectedHarvestDate: date("expected_harvest_date"),

    /* mirrors of chain state (rebuildable from events) */
    status: agreementStatus("status").notNull().default("Created"),
    flag: flagReason("flag").notNull().default("None"),
    residuStatus: residuStatus("residu_status").notNull().default("Pending"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("agreement_coop_id_idx").on(t.coopId),
    index("agreement_farmer_id_idx").on(t.farmerId),
    index("agreement_agrinas_id_idx").on(t.agrinasId),
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
    basePriceAgrinas: bigint("base_price_agrinas", { mode: "bigint" }).notNull(),
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
 *  gross -> handling_cut (KMP) + debt_netted (splits into principal_to_agrinas
 *  + coop_margin) + net_paid (farmer). */
export const settlement = pgTable(
  "settlement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => delivery.id),
    gross: bigint("gross", { mode: "bigint" }).notNull(),
    /** KMP keeps */
    handlingCut: bigint("handling_cut", { mode: "bigint" }).notNull(),
    debtNetted: bigint("debt_netted", { mode: "bigint" }).notNull(),
    /** residu principal, owed back to Agrinas */
    principalToAgrinas: bigint("principal_to_agrinas", { mode: "bigint" }).notNull(),
    /** KMP keeps */
    coopMargin: bigint("coop_margin", { mode: "bigint" }).notNull(),
    /** cash out to farmer */
    netPaid: bigint("net_paid", { mode: "bigint" }).notNull(),
    /** Path A: bank / BRILink reference */
    rupiahRef: text("rupiah_ref"),
    settlementTxHash: text("settlement_tx_hash"),
    settledAt: timestamp("settled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("settlement_delivery_id_idx").on(t.deliveryId)],
);

/* ────────────────────────── residu reconciliation ────────────────────────── */

/** KMP -> Agrinas principal remittance (off-chain rupiah, on-chain anchored).
 *  Proof of the manual bank transfer lives here; status mirrors chain. */
export const residuRemittance = pgTable(
  "residu_remittance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coopId: uuid("coop_id")
      .notNull()
      .references(() => coop.id),
    agrinasId: uuid("agrinas_id")
      .notNull()
      .references(() => agrinas.id),
    agreementOnchainId: bigint("agreement_onchain_id", { mode: "bigint" }).notNull(),
    /** Agrinas money owed, smallest unit */
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
    index("residu_remittance_agrinas_id_idx").on(t.agrinasId),
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
 *  The residu-integrity trust signal Agrinas + Government + banks read. */
export const coopReputationCache = pgTable("coop_reputation_cache", {
  coopId: uuid("coop_id")
    .primaryKey()
    .references(() => coop.id),
  agreements: integer("agreements").notNull().default(0),
  settlements: integer("settlements").notNull().default(0),
  totalResiduPrincipal: bigint("total_residu_principal", { mode: "bigint" }).notNull().default(sql`0`),
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
  agrinasId: uuid("agrinas_id").references(() => agrinas.id),
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
    agrinasId: uuid("agrinas_id")
      .notNull()
      .references(() => agrinas.id),
    commodityCode: text("commodity_code")
      .notNull()
      .references(() => commodity.code),
    status: shipmentStatus("status").notNull().default("Draft"),
    /** sender-declared total */
    totalVolumeG: bigint("total_volume_g", { mode: "bigint" }).notNull().default(0n),
    /** receiver-confirmed total; null until Agrinas confirms */
    receivedVolumeG: bigint("received_volume_g", { mode: "bigint" }),
    discrepancyNote: text("discrepancy_note"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("harvest_shipment_coop_idx").on(t.coopId),
    index("harvest_shipment_agrinas_idx").on(t.agrinasId),
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
