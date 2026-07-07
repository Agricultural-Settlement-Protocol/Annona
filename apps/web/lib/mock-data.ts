/**
 * Mock data for the KMP dashboard. Shapes mirror docs/technical/ERD.md §1
 * (off-chain Postgres read-models) joined with on-chain mirrors, exactly what
 * the real API will serve from Drizzle + the indexer. Replace with @annona/sdk
 * calls once the indexer lands; keep the row shapes stable.
 *
 * Money: bigint smallest unit via rupiah() (never hand-written literals).
 * Volume: bigint grams via kgToGrams(). No PII beyond what the off-chain DB
 * would legitimately hold (names live off-chain only, per golden rule 1).
 */

import {
  type FlagReason,
  type ResiduStatus,
  type Status,
  computeSplitSettlement,
  deriveInputDebt,
  kgToGrams,
  rupiah,
} from "@annona/core";
import type { RepTier } from "@annona/ui";

// ─── Parties (ERD: AGRINAS, COOP) ───────────────────────────────────────────

export const MOCK_AGRINAS = {
  id: "agr-0001",
  name: "PT Agrinas Pangan Nusantara",
  walletAddress: "GAGRINAS7Y2K4XW3PJM5V6QN8RD9TB2CE4FH6JK8LM2NP4QR6ST8UV2W",
} as const;

export const MOCK_COOP = {
  id: "coop-0001",
  name: "KMP Sukamaju",
  kecamatan: "Sukamaju",
  kabupaten: "Cianjur",
  provinsi: "Jawa Barat",
  walletAddress: "GKMPSUKA3B5D7F9H2J4L6N8P2R4T6V8X3Z5B7D9F2H4J6L8N2P4R6T8V",
  /** Pre-funded on-site cash (display only, off-chain). */
  prefundedCashBalance: rupiah(48_000_000),
} as const;

// ─── Commodity + reference data (ERD: COMMODITY, PRICE_REF, YIELD_TABLE) ────

export interface MockCommodity {
  code: string;
  name: string;
  unit: string;
  hppVersion: number;
}

export const MOCK_COMMODITIES: MockCommodity[] = [
  { code: "GABAH", name: "Gabah Kering Panen", unit: "kg", hppVersion: 4 },
  { code: "JAGUNG", name: "Jagung Pipilan Kering", unit: "kg", hppVersion: 4 },
];

export interface MockPriceRef {
  commodityCode: string;
  hppPerKg: bigint;
  hppSource: string;
  marketPriceKabupaten: bigint;
  pihpsSource: string;
  asOf: string;
}

export const MOCK_PRICE_REFS: MockPriceRef[] = [
  {
    commodityCode: "GABAH",
    hppPerKg: rupiah(6_500),
    hppSource: "Inpres No. 4/2026",
    marketPriceKabupaten: rupiah(6_200),
    pihpsSource: "PIHPS Kab. Cianjur",
    asOf: "2026-06-28",
  },
  {
    commodityCode: "JAGUNG",
    hppPerKg: rupiah(5_500),
    hppSource: "Inpres No. 4/2026",
    marketPriceKabupaten: rupiah(5_100),
    pihpsSource: "PIHPS Kab. Cianjur",
    asOf: "2026-06-28",
  },
];

export interface MockYieldRow {
  commodityCode: string;
  kabupaten: string;
  avgYieldTPerHa: number;
  source: string;
  year: number;
}

export const MOCK_YIELD_TABLE: MockYieldRow[] = [
  { commodityCode: "GABAH", kabupaten: "Cianjur", avgYieldTPerHa: 5.6, source: "BPS", year: 2025 },
  {
    commodityCode: "JAGUNG",
    kabupaten: "Cianjur",
    avgYieldTPerHa: 5.2,
    source: "KATAM Balitbangtan",
    year: 2025,
  },
];

// ─── Saprotan catalog (ERD: SAPROTAN_CATALOG, Agrinas-owned) ────────────────

export interface MockCatalogItem {
  id: string;
  code: string;
  name: string;
  category: "pupuk" | "benih" | "pestisida" | "alsintan";
  region: string;
  /** PRINCIPAL per unit. Agrinas-set, read-only to KMP. */
  basePriceAgrinas: bigint;
  unitLabel: string;
  subsidiFlag: boolean;
  source: string;
}

export const MOCK_CATALOG: MockCatalogItem[] = [
  {
    id: "cat-urea",
    code: "UREA-50",
    name: "Pupuk Urea 50kg",
    category: "pupuk",
    region: "Jawa Barat",
    basePriceAgrinas: rupiah(560_000),
    unitLabel: "karung 50kg",
    subsidiFlag: true,
    source: "Pupuk Indonesia",
  },
  {
    id: "cat-npk",
    code: "NPK-PHONSKA-50",
    name: "NPK Phonska 50kg",
    category: "pupuk",
    region: "Jawa Barat",
    basePriceAgrinas: rupiah(640_000),
    unitLabel: "karung 50kg",
    subsidiFlag: true,
    source: "Pupuk Indonesia",
  },
  {
    id: "cat-inpari",
    code: "BENIH-INPARI32",
    name: "Benih Padi Inpari 32",
    category: "benih",
    region: "Jawa Barat",
    basePriceAgrinas: rupiah(120_000),
    unitLabel: "kantong 5kg",
    subsidiFlag: false,
    source: "Sang Hyang Seri",
  },
  {
    id: "cat-bisi",
    code: "BENIH-BISI18",
    name: "Benih Jagung BISI-18",
    category: "benih",
    region: "Jawa Barat",
    basePriceAgrinas: rupiah(155_000),
    unitLabel: "kantong 5kg",
    subsidiFlag: false,
    source: "BISI International",
  },
  {
    id: "cat-pest",
    code: "PES-REGENT",
    name: "Insektisida Regent 400ml",
    category: "pestisida",
    region: "Jawa Barat",
    basePriceAgrinas: rupiah(95_000),
    unitLabel: "botol 400ml",
    subsidiFlag: false,
    source: "BASF",
  },
];

// ─── Farmers (ERD: FARMER + REPUTATION_CACHE) ───────────────────────────────

export interface MockFarmer {
  id: string;
  name: string; // PII, off-chain only
  kecamatan: string;
  plotAreaHa: number;
  defaultCommodityCode: string;
  walletAddress: string;
  /** hex of BytesN<32>; the only farmer identity that touches chain */
  ktpHash: string;
  repTier: RepTier;
  reputation: {
    deliveries: number;
    onTime: number;
    totalSettledKg: number;
    flags: number;
    forceMajeureEvents: number;
  };
}

const gAddr = (seed: string) => `G${seed.toUpperCase().padEnd(55, "X").slice(0, 55)}`;
const hash32 = (seed: string) =>
  seed
    .repeat(16)
    .split("")
    .map((c) => (c.charCodeAt(0) % 16).toString(16))
    .join("")
    .slice(0, 64);

export const MOCK_FARMERS: MockFarmer[] = [
  {
    id: "frm-001",
    name: "Budi Santoso",
    kecamatan: "Sukamaju",
    plotAreaHa: 0.8,
    defaultCommodityCode: "GABAH",
    walletAddress: gAddr("BUDI7SANTOSO2K4M6P8R"),
    ktpHash: hash32("budi"),
    repTier: "tepercaya",
    reputation: {
      deliveries: 7,
      onTime: 7,
      totalSettledKg: 16_400,
      flags: 0,
      forceMajeureEvents: 0,
    },
  },
  {
    id: "frm-002",
    name: "Siti Aminah",
    kecamatan: "Sukamaju",
    plotAreaHa: 0.5,
    defaultCommodityCode: "GABAH",
    walletAddress: gAddr("SITI5AMINAH3L5N7Q9S"),
    ktpHash: hash32("siti"),
    repTier: "andal",
    reputation: {
      deliveries: 4,
      onTime: 4,
      totalSettledKg: 8_900,
      flags: 0,
      forceMajeureEvents: 0,
    },
  },
  {
    id: "frm-003",
    name: "Joko Priyanto",
    kecamatan: "Cibadak",
    plotAreaHa: 1.2,
    defaultCommodityCode: "GABAH",
    walletAddress: gAddr("JOKO9PRIYANTO4M6P8R2"),
    ktpHash: hash32("joko"),
    repTier: "andal",
    reputation: {
      deliveries: 5,
      onTime: 4,
      totalSettledKg: 12_100,
      flags: 1,
      forceMajeureEvents: 0,
    },
  },
  {
    id: "frm-004",
    name: "Rina Wulandari",
    kecamatan: "Sukamaju",
    plotAreaHa: 0.6,
    defaultCommodityCode: "JAGUNG",
    walletAddress: gAddr("RINA3WULANDARI5N7Q9S"),
    ktpHash: hash32("rina"),
    repTier: "baru",
    reputation: {
      deliveries: 1,
      onTime: 1,
      totalSettledKg: 2_800,
      flags: 0,
      forceMajeureEvents: 0,
    },
  },
  {
    id: "frm-005",
    name: "Ahmad Fauzi",
    kecamatan: "Cikembar",
    plotAreaHa: 1.0,
    defaultCommodityCode: "GABAH",
    walletAddress: gAddr("AHMAD7FAUZI6P8R2T4V"),
    ktpHash: hash32("ahmad"),
    repTier: "tepercaya",
    reputation: {
      deliveries: 8,
      onTime: 8,
      totalSettledKg: 21_600,
      flags: 0,
      forceMajeureEvents: 0,
    },
  },
  {
    id: "frm-006",
    name: "Dewi Lestari",
    kecamatan: "Cibadak",
    plotAreaHa: 0.4,
    defaultCommodityCode: "GABAH",
    walletAddress: gAddr("DEWI5LESTARI7Q9S3U5W"),
    ktpHash: hash32("dewi"),
    repTier: "baru",
    reputation: { deliveries: 0, onTime: 0, totalSettledKg: 0, flags: 0, forceMajeureEvents: 0 },
  },
  {
    id: "frm-007",
    name: "Hendra Gunawan",
    kecamatan: "Sukamaju",
    plotAreaHa: 0.9,
    defaultCommodityCode: "JAGUNG",
    walletAddress: gAddr("HENDRA9GUNAWAN8R2T4V"),
    ktpHash: hash32("hendra"),
    repTier: "andal",
    reputation: {
      deliveries: 3,
      onTime: 3,
      totalSettledKg: 9_400,
      flags: 0,
      forceMajeureEvents: 0,
    },
  },
  {
    id: "frm-008",
    name: "Sri Rahayu",
    kecamatan: "Cikembar",
    plotAreaHa: 0.7,
    defaultCommodityCode: "GABAH",
    walletAddress: gAddr("SRI3RAHAYU9S3U5W7Y"),
    ktpHash: hash32("sri"),
    repTier: "andal",
    reputation: {
      deliveries: 4,
      onTime: 3,
      totalSettledKg: 7_300,
      flags: 1,
      forceMajeureEvents: 0,
    },
  },
  {
    id: "frm-009",
    name: "Agus Salim",
    kecamatan: "Cibadak",
    plotAreaHa: 1.5,
    defaultCommodityCode: "GABAH",
    walletAddress: gAddr("AGUS7SALIM2T4V6X8Z"),
    ktpHash: hash32("agus"),
    repTier: "tepercaya",
    reputation: {
      deliveries: 9,
      onTime: 9,
      totalSettledKg: 28_800,
      flags: 0,
      forceMajeureEvents: 0,
    },
  },
  {
    id: "frm-010",
    name: "Maman Suryadi",
    kecamatan: "Sukamaju",
    plotAreaHa: 0.55,
    defaultCommodityCode: "GABAH",
    walletAddress: gAddr("MAMAN5SURYADI3U5W9Y"),
    ktpHash: hash32("maman"),
    repTier: "baru",
    reputation: {
      deliveries: 1,
      onTime: 0,
      totalSettledKg: 1_900,
      flags: 0,
      forceMajeureEvents: 1,
    },
  },
];

// ─── Agreements (ERD: AGREEMENT + on-chain mirror + AGREEMENT_INPUT) ────────

export interface MockAgreementInput {
  catalogId: string;
  qty: number;
  /** principal snapshot per unit at create time */
  basePriceAgrinas: bigint;
}

export interface MockAgreement {
  id: string;
  onchainId: bigint;
  farmerId: string;
  commodityCode: string;
  grade: string;
  moistureBps: number;
  // four locked price variables
  basePriceAgrinas: bigint; // principal total (sum of inputs)
  saprotanMarkupBps: number;
  inputDebt: bigint; // derived
  hppHandlingFeeBps: number;
  hppPerKg: bigint;
  hppVersion: number;
  expectedVolKg: number;
  deliveredVolG: bigint;
  settledVolG: bigint;
  toleranceBps: number;
  status: Status;
  flag: FlagReason;
  // running money
  remainingDebt: bigint;
  paidToFarmer: bigint;
  coopHandlingAccrued: bigint;
  coopMarginAccrued: bigint;
  residuPrincipal: bigint;
  residuStatus: ResiduStatus;
  inputs: MockAgreementInput[];
  createdAt: string;
  createTxHash: string;
  /** ISO date of expected harvest window start (drives "Panen Minggu Ini") */
  expectedHarvestDate: string;
}

const txHash = (seed: string) => hash32(`tx${seed}`);

function makeAgreement(a: {
  n: number;
  farmerId: string;
  commodityCode: string;
  basePrincipal: bigint;
  markupBps?: number;
  handlingBps?: number;
  expectedVolKg: number;
  deliveredKg: number;
  settledKg: number;
  status: Status;
  flag?: FlagReason;
  residuStatus?: ResiduStatus;
  inputs: MockAgreementInput[];
  createdAt: string;
  expectedHarvestDate: string;
  grade?: string;
}): MockAgreement {
  const markupBps = a.markupBps ?? 1000;
  const handlingBps = a.handlingBps ?? 500;
  const inputDebt = deriveInputDebt(a.basePrincipal, markupBps);
  const hppPerKg =
    MOCK_PRICE_REFS.find((p) => p.commodityCode === a.commodityCode)?.hppPerKg ?? rupiah(6_500);
  const debtActive = a.status !== "Created" && a.status !== "SupplyDispatched";

  // Reproduce the settlement math for already-settled volume so every mock
  // number is internally consistent with computeSplitSettlement.
  let remainingDebt = debtActive ? inputDebt : 0n;
  let paidToFarmer = 0n;
  let coopHandlingAccrued = 0n;
  let coopMarginAccrued = 0n;
  let residuPrincipal = 0n;
  if (a.settledKg > 0) {
    const split = computeSplitSettlement({
      deliveredVolG: kgToGrams(a.settledKg),
      settledVolG: 0n,
      hppPerKg,
      remainingDebt: inputDebt,
      hppHandlingFeeBps: handlingBps,
      basePriceAgrinas: a.basePrincipal,
      inputDebt,
    });
    remainingDebt = inputDebt - split.debtPaid;
    paidToFarmer = split.netToFarmer;
    coopHandlingAccrued = split.handlingCut;
    coopMarginAccrued = split.coopMargin;
    residuPrincipal = split.principalToAgrinas;
  }

  return {
    id: `agm-${String(a.n).padStart(3, "0")}`,
    onchainId: BigInt(a.n),
    farmerId: a.farmerId,
    commodityCode: a.commodityCode,
    grade: a.grade ?? "B",
    moistureBps: 1400,
    basePriceAgrinas: a.basePrincipal,
    saprotanMarkupBps: markupBps,
    inputDebt,
    hppHandlingFeeBps: handlingBps,
    hppPerKg,
    hppVersion: 4,
    expectedVolKg: a.expectedVolKg,
    deliveredVolG: kgToGrams(a.deliveredKg),
    settledVolG: kgToGrams(a.settledKg),
    toleranceBps: 2000,
    status: a.status,
    flag: a.flag ?? "None",
    remainingDebt,
    paidToFarmer,
    coopHandlingAccrued,
    coopMarginAccrued,
    residuPrincipal,
    residuStatus: a.residuStatus ?? "Pending",
    inputs: a.inputs,
    createdAt: a.createdAt,
    createTxHash: txHash(`create${a.n}`),
    expectedHarvestDate: a.expectedHarvestDate,
  };
}

/** The demo book. One agreement per lifecycle stage so every screen has data. */
export const MOCK_AGREEMENTS: MockAgreement[] = [
  // 1 — Budi: SETTLED, the worked example. Base 2M + 10% = debt 2.2M, HPP 6500,
  // handling 5%, 2.600kg delivered of 2.650 expected (98.1%, clean).
  // gross 16.9M, handling 845k, debt netted 2.2M, net to farmer 13.855M,
  // residu principal 2M (Pending remittance), coop margin 200k.
  makeAgreement({
    n: 1,
    farmerId: "frm-001",
    commodityCode: "GABAH",
    basePrincipal: rupiah(2_000_000),
    expectedVolKg: 2_650,
    deliveredKg: 2_600,
    settledKg: 2_600,
    status: "Settled",
    residuStatus: "Pending",
    inputs: [
      { catalogId: "cat-urea", qty: 2, basePriceAgrinas: rupiah(560_000) },
      { catalogId: "cat-npk", qty: 1, basePriceAgrinas: rupiah(640_000) },
      { catalogId: "cat-inpari", qty: 2, basePriceAgrinas: rupiah(120_000) },
    ],
    createdAt: "2026-03-02",
    expectedHarvestDate: "2026-06-25",
    grade: "A",
  }),
  // 2 — Siti: ACTIVE, harvest due this week (powers "Panen Minggu Ini").
  makeAgreement({
    n: 2,
    farmerId: "frm-002",
    commodityCode: "GABAH",
    basePrincipal: rupiah(1_240_000),
    expectedVolKg: 2_800,
    deliveredKg: 0,
    settledKg: 0,
    status: "Active",
    inputs: [
      { catalogId: "cat-urea", qty: 1, basePriceAgrinas: rupiah(560_000) },
      { catalogId: "cat-npk", qty: 1, basePriceAgrinas: rupiah(640_000) },
      { catalogId: "cat-pest", qty: 1, basePriceAgrinas: rupiah(95_000) },
    ],
    createdAt: "2026-03-15",
    expectedHarvestDate: "2026-07-06",
  }),
  // 3 — Joko: PARTIALLY DELIVERED, staged settlement in progress.
  makeAgreement({
    n: 3,
    farmerId: "frm-003",
    commodityCode: "GABAH",
    basePrincipal: rupiah(2_960_000),
    expectedVolKg: 6_700,
    deliveredKg: 2_400,
    settledKg: 2_400,
    status: "PartiallyDelivered",
    inputs: [
      { catalogId: "cat-urea", qty: 3, basePriceAgrinas: rupiah(560_000) },
      { catalogId: "cat-npk", qty: 2, basePriceAgrinas: rupiah(640_000) },
    ],
    createdAt: "2026-03-10",
    expectedHarvestDate: "2026-07-04",
  }),
  // 4 — Rina: SUPPLY DISPATCHED, cargo in transit awaiting KMP acceptance
  // (powers the inbound-supply strip + Screen F accept flow).
  makeAgreement({
    n: 4,
    farmerId: "frm-004",
    commodityCode: "JAGUNG",
    basePrincipal: rupiah(870_000),
    expectedVolKg: 3_100,
    deliveredKg: 0,
    settledKg: 0,
    status: "SupplyDispatched",
    inputs: [
      { catalogId: "cat-bisi", qty: 2, basePriceAgrinas: rupiah(155_000) },
      { catalogId: "cat-urea", qty: 1, basePriceAgrinas: rupiah(560_000) },
    ],
    createdAt: "2026-06-27",
    expectedHarvestDate: "2026-10-15",
  }),
  // 5 — Ahmad: DELIVERED in full, awaiting settle (Screen D happy path).
  makeAgreement({
    n: 5,
    farmerId: "frm-005",
    commodityCode: "GABAH",
    basePrincipal: rupiah(2_480_000),
    expectedVolKg: 5_600,
    deliveredKg: 5_540,
    settledKg: 0,
    status: "Delivered",
    inputs: [
      { catalogId: "cat-urea", qty: 2, basePriceAgrinas: rupiah(560_000) },
      { catalogId: "cat-npk", qty: 2, basePriceAgrinas: rupiah(640_000) },
      { catalogId: "cat-pest", qty: 1, basePriceAgrinas: rupiah(95_000) },
    ],
    createdAt: "2026-03-05",
    expectedHarvestDate: "2026-06-30",
    grade: "A",
  }),
  // 6 — Dewi: CREATED, waiting for Agrinas dispatch (bulk request queue).
  makeAgreement({
    n: 6,
    farmerId: "frm-006",
    commodityCode: "GABAH",
    basePrincipal: rupiah(800_000),
    expectedVolKg: 2_200,
    deliveredKg: 0,
    settledKg: 0,
    status: "Created",
    inputs: [
      { catalogId: "cat-urea", qty: 1, basePriceAgrinas: rupiah(560_000) },
      { catalogId: "cat-inpari", qty: 2, basePriceAgrinas: rupiah(120_000) },
    ],
    createdAt: "2026-07-01",
    expectedHarvestDate: "2026-10-20",
  }),
  // 7 — Hendra: SETTLED (jagung), residu REMITTED awaiting Agrinas verify.
  makeAgreement({
    n: 7,
    farmerId: "frm-007",
    commodityCode: "JAGUNG",
    basePrincipal: rupiah(1_430_000),
    expectedVolKg: 4_600,
    deliveredKg: 4_580,
    settledKg: 4_580,
    status: "Settled",
    residuStatus: "Remitted",
    inputs: [
      { catalogId: "cat-bisi", qty: 3, basePriceAgrinas: rupiah(155_000) },
      { catalogId: "cat-urea", qty: 1, basePriceAgrinas: rupiah(560_000) },
      { catalogId: "cat-npk", qty: 1, basePriceAgrinas: rupiah(640_000) },
    ],
    createdAt: "2026-02-20",
    expectedHarvestDate: "2026-06-18",
    grade: "A",
  }),
  // 8 — Sri: FLAGGED, delivered 45% of expected (PartialDelivery band; a
  // human reviews, never an automatic accusation).
  makeAgreement({
    n: 8,
    farmerId: "frm-008",
    commodityCode: "GABAH",
    basePrincipal: rupiah(1_760_000),
    expectedVolKg: 3_900,
    deliveredKg: 1_750,
    settledKg: 1_750,
    status: "Flagged",
    flag: "PartialDelivery",
    inputs: [
      { catalogId: "cat-urea", qty: 2, basePriceAgrinas: rupiah(560_000) },
      { catalogId: "cat-npk", qty: 1, basePriceAgrinas: rupiah(640_000) },
    ],
    createdAt: "2026-03-08",
    expectedHarvestDate: "2026-06-22",
    grade: "C",
  }),
  // 9 — Agus: SETTLED, residu CLEARED (the fully happy end state).
  makeAgreement({
    n: 9,
    farmerId: "frm-009",
    commodityCode: "GABAH",
    basePrincipal: rupiah(3_680_000),
    expectedVolKg: 8_400,
    deliveredKg: 8_400,
    settledKg: 8_400,
    status: "Settled",
    residuStatus: "Cleared",
    inputs: [
      { catalogId: "cat-urea", qty: 4, basePriceAgrinas: rupiah(560_000) },
      { catalogId: "cat-npk", qty: 2, basePriceAgrinas: rupiah(640_000) },
      { catalogId: "cat-inpari", qty: 1, basePriceAgrinas: rupiah(120_000) },
      { catalogId: "cat-pest", qty: 1, basePriceAgrinas: rupiah(95_000) },
    ],
    createdAt: "2026-02-12",
    expectedHarvestDate: "2026-06-10",
    grade: "A",
  }),
  // 10 — Maman: FORCE MAJEURE (banjir), no penalty, debt restructured off-chain.
  makeAgreement({
    n: 10,
    farmerId: "frm-010",
    commodityCode: "GABAH",
    basePrincipal: rupiah(920_000),
    expectedVolKg: 2_450,
    deliveredKg: 0,
    settledKg: 0,
    status: "ForceMajeure",
    inputs: [
      { catalogId: "cat-urea", qty: 1, basePriceAgrinas: rupiah(560_000) },
      { catalogId: "cat-inpari", qty: 3, basePriceAgrinas: rupiah(120_000) },
    ],
    createdAt: "2026-03-12",
    expectedHarvestDate: "2026-06-28",
  }),
  // 11 — Budi, next season: CREATED draft, feeds the bulk request queue.
  makeAgreement({
    n: 11,
    farmerId: "frm-001",
    commodityCode: "GABAH",
    basePrincipal: rupiah(1_880_000),
    expectedVolKg: 2_650,
    deliveredKg: 0,
    settledKg: 0,
    status: "Created",
    inputs: [
      { catalogId: "cat-urea", qty: 2, basePriceAgrinas: rupiah(560_000) },
      { catalogId: "cat-npk", qty: 1, basePriceAgrinas: rupiah(640_000) },
      { catalogId: "cat-inpari", qty: 1, basePriceAgrinas: rupiah(120_000) },
    ],
    createdAt: "2026-07-02",
    expectedHarvestDate: "2026-10-25",
  }),
  // 12 — Agus, next season: CREATED draft, feeds the bulk request queue.
  makeAgreement({
    n: 12,
    farmerId: "frm-009",
    commodityCode: "GABAH",
    basePrincipal: rupiah(3_040_000),
    expectedVolKg: 8_400,
    deliveredKg: 0,
    settledKg: 0,
    status: "Created",
    inputs: [
      { catalogId: "cat-urea", qty: 3, basePriceAgrinas: rupiah(560_000) },
      { catalogId: "cat-npk", qty: 2, basePriceAgrinas: rupiah(640_000) },
      { catalogId: "cat-pest", qty: 1, basePriceAgrinas: rupiah(95_000) },
    ],
    createdAt: "2026-07-03",
    expectedHarvestDate: "2026-10-28",
  }),
];

// ─── Deliveries (ERD: DELIVERY) ─────────────────────────────────────────────

export interface MockDelivery {
  id: string;
  agreementId: string;
  seq: number;
  volumeKg: number;
  grade: string;
  moistureBps: number;
  receiptTxHash: string;
  deliveredAt: string;
  flag: FlagReason;
}

export const MOCK_DELIVERIES: MockDelivery[] = [
  {
    id: "dlv-001",
    agreementId: "agm-001",
    seq: 1,
    volumeKg: 2_600,
    grade: "A",
    moistureBps: 1350,
    receiptTxHash: txHash("dlv1"),
    deliveredAt: "2026-06-26",
    flag: "None",
  },
  {
    id: "dlv-002",
    agreementId: "agm-003",
    seq: 1,
    volumeKg: 2_400,
    grade: "B",
    moistureBps: 1420,
    receiptTxHash: txHash("dlv2"),
    deliveredAt: "2026-06-29",
    flag: "None",
  },
  {
    id: "dlv-003",
    agreementId: "agm-005",
    seq: 1,
    volumeKg: 3_100,
    grade: "A",
    moistureBps: 1380,
    receiptTxHash: txHash("dlv3"),
    deliveredAt: "2026-06-30",
    flag: "None",
  },
  {
    id: "dlv-004",
    agreementId: "agm-005",
    seq: 2,
    volumeKg: 2_440,
    grade: "A",
    moistureBps: 1400,
    receiptTxHash: txHash("dlv4"),
    deliveredAt: "2026-07-01",
    flag: "None",
  },
  {
    id: "dlv-005",
    agreementId: "agm-007",
    seq: 1,
    volumeKg: 4_580,
    grade: "A",
    moistureBps: 1300,
    receiptTxHash: txHash("dlv5"),
    deliveredAt: "2026-06-19",
    flag: "None",
  },
  {
    id: "dlv-006",
    agreementId: "agm-008",
    seq: 1,
    volumeKg: 1_750,
    grade: "C",
    moistureBps: 1550,
    receiptTxHash: txHash("dlv6"),
    deliveredAt: "2026-06-23",
    flag: "PartialDelivery",
  },
  {
    id: "dlv-007",
    agreementId: "agm-009",
    seq: 1,
    volumeKg: 8_400,
    grade: "A",
    moistureBps: 1320,
    receiptTxHash: txHash("dlv7"),
    deliveredAt: "2026-06-11",
    flag: "None",
  },
];

// ─── Settlements (ERD: SETTLEMENT, three-way split rows) ────────────────────

export interface MockSettlement {
  id: string;
  agreementId: string;
  gross: bigint;
  handlingCut: bigint;
  debtNetted: bigint;
  principalToAgrinas: bigint;
  coopMargin: bigint;
  netPaid: bigint;
  settledVolKg: number;
  rupiahRef: string;
  txHash: string;
  settledAt: string;
}

function settlementFor(agreementId: string, id: string, when: string, bankRef: string) {
  const a = MOCK_AGREEMENTS.find((x) => x.id === agreementId);
  if (!a) throw new Error(`unknown agreement ${agreementId}`);
  const split = computeSplitSettlement({
    deliveredVolG: a.settledVolG,
    settledVolG: 0n,
    hppPerKg: a.hppPerKg,
    remainingDebt: a.inputDebt,
    hppHandlingFeeBps: a.hppHandlingFeeBps,
    basePriceAgrinas: a.basePriceAgrinas,
    inputDebt: a.inputDebt,
  });
  return {
    id,
    agreementId,
    gross: split.grossSmallest,
    handlingCut: split.handlingCut,
    debtNetted: split.debtPaid,
    principalToAgrinas: split.principalToAgrinas,
    coopMargin: split.coopMargin,
    netPaid: split.netToFarmer,
    settledVolKg: Number(a.settledVolG / 1000n),
    rupiahRef: bankRef,
    txHash: txHash(`settle${id}`),
    settledAt: when,
  } satisfies MockSettlement;
}

export const MOCK_SETTLEMENTS: MockSettlement[] = [
  settlementFor("agm-001", "stl-001", "2026-06-27", "BRI-20260627-0412"),
  settlementFor("agm-003", "stl-002", "2026-06-30", "BRILink-20260630-118"),
  settlementFor("agm-007", "stl-003", "2026-06-20", "BRI-20260620-0287"),
  settlementFor("agm-008", "stl-004", "2026-06-24", "BRILink-20260624-093"),
  settlementFor("agm-009", "stl-005", "2026-06-12", "BRI-20260612-0165"),
];

// ─── Residu remittance ledger (ERD: RESIDU_REMITTANCE) ──────────────────────

export interface MockResiduRow {
  id: string;
  agreementId: string;
  principalAmount: bigint;
  bankRef: string | null;
  status: ResiduStatus;
  remittedAt: string | null;
  clearedAt: string | null;
  txHash: string | null;
}

export const MOCK_RESIDU_LEDGER: MockResiduRow[] = [
  {
    id: "rsd-001",
    agreementId: "agm-001",
    principalAmount: rupiah(2_000_000),
    bankRef: null,
    status: "Pending",
    remittedAt: null,
    clearedAt: null,
    txHash: null,
  },
  {
    id: "rsd-002",
    agreementId: "agm-007",
    principalAmount: rupiah(1_430_000),
    bankRef: "BCA-20260622-771",
    status: "Remitted",
    remittedAt: "2026-06-22",
    clearedAt: null,
    txHash: txHash("residu7"),
  },
  {
    id: "rsd-003",
    agreementId: "agm-009",
    principalAmount: rupiah(3_680_000),
    bankRef: "BCA-20260614-402",
    status: "Cleared",
    remittedAt: "2026-06-14",
    clearedAt: "2026-06-15",
    txHash: txHash("residu9"),
  },
];

// ─── Activity feed (indexer event_log, newest first) ────────────────────────

export interface MockActivity {
  id: string;
  /** Bahasa, plain, no em dashes */
  text: string;
  detail?: string;
  kind:
    | "created"
    | "dispatched"
    | "accepted"
    | "delivery"
    | "settled"
    | "flagged"
    | "residu"
    | "forceMajeure";
  txHash: string;
  at: string; // relative label for demo ("2 jam lalu")
}

export const MOCK_ACTIVITY: MockActivity[] = [
  {
    id: "act-1",
    text: "Perjanjian #6 dibuat untuk Dewi Lestari",
    detail: "Menunggu pengiriman saprotan dari Agrinas",
    kind: "created",
    txHash: txHash("create6"),
    at: "2 jam lalu",
  },
  {
    id: "act-2",
    text: "Setoran panen 2.440 kg diterima dari Ahmad Fauzi",
    detail: "Perjanjian #5, setoran ke-2, grade A",
    kind: "delivery",
    txHash: txHash("dlv4"),
    at: "5 jam lalu",
  },
  {
    id: "act-3",
    text: "Agrinas mengirim saprotan untuk Rina Wulandari",
    detail: "Perjanjian #4, menunggu konfirmasi penerimaan",
    kind: "dispatched",
    txHash: txHash("dispatch4"),
    at: "1 hari lalu",
  },
  {
    id: "act-4",
    text: "Pembayaran Joko Priyanto tahap 1 selesai",
    detail: "2.400 kg, bertahap, utang dilunasi lebih dulu",
    kind: "settled",
    txHash: txHash("settlestl-002"),
    at: "3 hari lalu",
  },
  {
    id: "act-5",
    text: "Pembayaran Budi Santoso selesai, terima Rp13.855.000",
    detail: "Split otomatis: petani, residu Agrinas, margin KMP",
    kind: "settled",
    txHash: txHash("settlestl-001"),
    at: "6 hari lalu",
  },
  {
    id: "act-6",
    text: "Perjanjian #8 ditandai Perlu Ditinjau",
    detail: "Setoran 45% dari perkiraan, menunggu peninjauan petugas",
    kind: "flagged",
    txHash: txHash("flag8"),
    at: "1 minggu lalu",
  },
  {
    id: "act-7",
    text: "Residu pokok Hendra Gunawan disetor ke Agrinas",
    detail: "Rp1.430.000, menunggu verifikasi Agrinas",
    kind: "residu",
    txHash: txHash("residu7"),
    at: "1 minggu lalu",
  },
  {
    id: "act-8",
    text: "Gagal panen dikonfirmasi untuk Maman Suryadi",
    detail: "Banjir, tanpa penalti reputasi, utang direstrukturisasi",
    kind: "forceMajeure",
    txHash: txHash("fm10"),
    at: "2 minggu lalu",
  },
];

// ─── Off-chain stock (Screen F, labeled off-chain) ──────────────────────────

export interface MockStockRow {
  id: string;
  itemName: string;
  category: "saprotan" | "hasil-panen";
  inQty: string;
  outQty: string;
  balance: string;
  note: string;
}

export const MOCK_STOCK: MockStockRow[] = [
  {
    id: "stk-1",
    itemName: "Pupuk Urea 50kg",
    category: "saprotan",
    inQty: "18 karung",
    outQty: "16 karung",
    balance: "2 karung",
    note: "Sisa buffer gudang",
  },
  {
    id: "stk-2",
    itemName: "NPK Phonska 50kg",
    category: "saprotan",
    inQty: "10 karung",
    outQty: "9 karung",
    balance: "1 karung",
    note: "Tersalur ke petani aktif",
  },
  {
    id: "stk-3",
    itemName: "Benih Padi Inpari 32",
    category: "saprotan",
    inQty: "8 kantong",
    outQty: "8 kantong",
    balance: "0",
    note: "Habis tersalur",
  },
  {
    id: "stk-4",
    itemName: "Gabah Kering Panen",
    category: "hasil-panen",
    inQty: "19.150 kg",
    outQty: "16.400 kg",
    balance: "2.750 kg",
    note: "Diteruskan ke gudang Agrinas bertahap",
  },
  {
    id: "stk-5",
    itemName: "Jagung Pipilan",
    category: "hasil-panen",
    inQty: "4.580 kg",
    outQty: "4.580 kg",
    balance: "0",
    note: "Terkirim penuh ke gudang Agrinas",
  },
];

// ─── Selectors / aggregates (what read-model views would serve) ─────────────

export const getFarmer = (id: string) => MOCK_FARMERS.find((f) => f.id === id);
export const getAgreement = (id: string) => MOCK_AGREEMENTS.find((a) => a.id === id);
export const getCatalogItem = (id: string) => MOCK_CATALOG.find((c) => c.id === id);
export const agreementsOfFarmer = (farmerId: string) =>
  MOCK_AGREEMENTS.filter((a) => a.farmerId === farmerId);
export const deliveriesOfAgreement = (agreementId: string) =>
  MOCK_DELIVERIES.filter((d) => d.agreementId === agreementId);
export const settlementsOfAgreement = (agreementId: string) =>
  MOCK_SETTLEMENTS.filter((s) => s.agreementId === agreementId);
export const residuOfAgreement = (agreementId: string) =>
  MOCK_RESIDU_LEDGER.find((r) => r.agreementId === agreementId);

const DEBT_ACTIVE: Status[] = ["Active", "PartiallyDelivered", "Delivered", "Flagged"];

/** mv_coop_exposure equivalents for Screen A hero cards. */
export function coopOverview() {
  const outstandingDebt = MOCK_AGREEMENTS.filter((a) => DEBT_ACTIVE.includes(a.status)).reduce(
    (sum, a) => sum + a.remainingDebt,
    0n,
  );
  const activeAgreements = MOCK_AGREEMENTS.filter((a) =>
    ["SupplyDispatched", "Active", "PartiallyDelivered", "Delivered"].includes(a.status),
  ).length;
  const settledCount = MOCK_AGREEMENTS.filter((a) => a.status === "Settled").length;
  const closedCount = MOCK_AGREEMENTS.filter((a) =>
    ["Settled", "Flagged", "ForceMajeure"].includes(a.status),
  ).length;
  const settlementRatePct = closedCount === 0 ? 0 : Math.round((settledCount / closedCount) * 100);
  const residuOwed = MOCK_RESIDU_LEDGER.filter((r) => r.status !== "Cleared").reduce(
    (sum, r) => sum + r.principalAmount,
    0n,
  );
  return { outstandingDebt, activeAgreements, settlementRatePct, residuOwed };
}

/** mv_upcoming_harvest: agreements whose harvest window falls this week. */
export function harvestThisWeek() {
  const rows = MOCK_AGREEMENTS.filter(
    (a) =>
      ["Active", "PartiallyDelivered"].includes(a.status) &&
      a.expectedHarvestDate >= "2026-07-01" &&
      a.expectedHarvestDate <= "2026-07-08",
  );
  const totalKg = rows.reduce(
    (sum, a) => sum + (a.expectedVolKg - Number(a.deliveredVolG / 1000n)),
    0,
  );
  const totalValue = rows.reduce(
    (sum, a) => sum + BigInt(a.expectedVolKg - Number(a.deliveredVolG / 1000n)) * a.hppPerKg,
    0n,
  );
  return { rows, totalKg, totalValue };
}

/** Cash the KMP must have ready this week: expected net payouts to farmers. */
export function cashNeededThisWeek() {
  const { rows } = harvestThisWeek();
  return rows.reduce((sum, a) => {
    const remainingKg = a.expectedVolKg - Number(a.deliveredVolG / 1000n);
    const split = computeSplitSettlement({
      deliveredVolG: kgToGrams(remainingKg),
      settledVolG: 0n,
      hppPerKg: a.hppPerKg,
      remainingDebt: a.remainingDebt,
      hppHandlingFeeBps: a.hppHandlingFeeBps,
      basePriceAgrinas: a.basePriceAgrinas,
      inputDebt: a.inputDebt,
    });
    return sum + split.netToFarmer;
  }, 0n);
}

/** mv_inbound_supply: dispatched cargo awaiting KMP acceptance. */
export const inboundSupply = () => MOCK_AGREEMENTS.filter((a) => a.status === "SupplyDispatched");

export function formatKg(kg: number): string {
  return `${kg.toLocaleString("id-ID")} kg`;
}

export const shortAddr = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

/** Latest recorded delivery of an agreement (actual grade/moisture source).
 *  Before the first delivery, grade/moisture on the agreement are ESTIMATES. */
export function latestDeliveryOfAgreement(agreementId: string): MockDelivery | undefined {
  const rows = deliveriesOfAgreement(agreementId);
  return rows.length ? rows[rows.length - 1] : undefined;
}

// ─── Supply request queue (mv_bulk_request_queue equivalents, Screen: Permintaan) ──

export type SupplyRequestStatus = "Draft" | "Terkirim" | "Dikirim" | "Diterima";

export interface SupplyRequestRow {
  agreement: MockAgreement;
  farmer: MockFarmer;
  /** Draft = Created not yet submitted to Agrinas; Terkirim = submitted, waiting
   *  dispatch; Dikirim = SupplyDispatched; Diterima = accepted (Active or later). */
  status: SupplyRequestStatus;
}

/** Agreements relevant to the saprotan request pipeline. Created rows start as
 *  Draft; the page's local state flips them to Terkirim after the bulk submit. */
export function supplyRequestRows(): SupplyRequestRow[] {
  const relevant: Status[] = ["Created", "SupplyDispatched", "Active", "PartiallyDelivered"];
  return MOCK_AGREEMENTS.filter((a) => relevant.includes(a.status))
    .map((a): SupplyRequestRow | null => {
      const farmer = getFarmer(a.farmerId);
      if (!farmer) return null;
      const status: SupplyRequestStatus =
        a.status === "Created" ? "Draft" : a.status === "SupplyDispatched" ? "Dikirim" : "Diterima";
      return { agreement: a, farmer, status };
    })
    .filter((r): r is SupplyRequestRow => r !== null);
}

/** Aggregate saprotan quantities + principal across agreements (the bulk
 *  request Agrinas reads regionally). */
export function aggregateSaprotanNeeds(agreements: MockAgreement[]) {
  const byItem = new Map<string, { item: MockCatalogItem; qty: number; principal: bigint }>();
  for (const a of agreements) {
    for (const line of a.inputs) {
      const item = getCatalogItem(line.catalogId);
      if (!item) continue;
      const cur = byItem.get(item.id) ?? { item, qty: 0, principal: 0n };
      cur.qty += line.qty;
      cur.principal += BigInt(line.qty) * line.basePriceAgrinas;
      byItem.set(item.id, cur);
    }
  }
  return [...byItem.values()];
}

// ─── Payment history (Screen: Pembayaran) ───────────────────────────────────

export interface PaymentHistoryRow {
  settlement: MockSettlement;
  agreement: MockAgreement;
  farmer: MockFarmer;
  /** actual measurement from the delivery the payment covers (latest at settle) */
  grade: string;
  moistureBps: number;
}

export function paymentHistoryRows(): PaymentHistoryRow[] {
  return MOCK_SETTLEMENTS.map((s) => {
    const agreement = getAgreement(s.agreementId);
    const farmer = agreement ? getFarmer(agreement.farmerId) : undefined;
    if (!agreement || !farmer) return null;
    const delivery = latestDeliveryOfAgreement(s.agreementId);
    return {
      settlement: s,
      agreement,
      farmer,
      grade: delivery?.grade ?? agreement.grade,
      moistureBps: delivery?.moistureBps ?? agreement.moistureBps,
    };
  })
    .filter((r): r is PaymentHistoryRow => r !== null)
    .sort((a, b) => (a.settlement.settledAt < b.settlement.settledAt ? 1 : -1));
}

// ─── Delivery history (Screen: Setor Panen) ─────────────────────────────────

export interface DeliveryHistoryRow {
  delivery: MockDelivery;
  agreement: MockAgreement;
  farmer: MockFarmer;
  /** has this delivered volume been paid out yet? (staged settlement aware) */
  paid: boolean;
}

// ─── Card-grid selectors (Setor + Pembayaran pages) ─────────────────────────

/** Agreements currently open for new deposits: Active or PartiallyDelivered. */
export function depositPendingAgreements(): Array<{
  agreement: MockAgreement;
  farmer: MockFarmer;
}> {
  const eligible: Status[] = ["Active", "PartiallyDelivered"];
  return MOCK_AGREEMENTS.filter((a) => eligible.includes(a.status))
    .map((a) => {
      const farmer = getFarmer(a.farmerId);
      if (!farmer) return null;
      return { agreement: a, farmer };
    })
    .filter((r): r is { agreement: MockAgreement; farmer: MockFarmer } => r !== null);
}

/** Agreements whose deposit window is closed: Delivered, Flagged, Settled, ForceMajeure. */
export function depositCompletedAgreements(): Array<{
  agreement: MockAgreement;
  farmer: MockFarmer;
}> {
  const complete: Status[] = ["Delivered", "Flagged", "Settled", "ForceMajeure"];
  return MOCK_AGREEMENTS.filter((a) => complete.includes(a.status))
    .map((a) => {
      const farmer = getFarmer(a.farmerId);
      if (!farmer) return null;
      return { agreement: a, farmer };
    })
    .filter((r): r is { agreement: MockAgreement; farmer: MockFarmer } => r !== null);
}

/** Agreements with unsettled delivered volume: the payment queue. */
export function paymentPendingAgreements(): Array<{
  agreement: MockAgreement;
  farmer: MockFarmer;
}> {
  const eligible: Status[] = ["Delivered", "PartiallyDelivered", "Flagged"];
  return MOCK_AGREEMENTS.filter(
    (a) => eligible.includes(a.status) && a.deliveredVolG > a.settledVolG,
  )
    .map((a) => {
      const farmer = getFarmer(a.farmerId);
      if (!farmer) return null;
      return { agreement: a, farmer };
    })
    .filter((r): r is { agreement: MockAgreement; farmer: MockFarmer } => r !== null);
}

/** Settled agreements for the "Sudah Dibayar / Lunas" section. */
export function paymentSettledAgreements(): Array<{
  agreement: MockAgreement;
  farmer: MockFarmer;
  residu: MockResiduRow | undefined;
}> {
  return MOCK_AGREEMENTS.filter((a) => a.status === "Settled")
    .map((a) => {
      const farmer = getFarmer(a.farmerId);
      if (!farmer) return null;
      return { agreement: a, farmer, residu: residuOfAgreement(a.id) };
    })
    .filter(
      (
        r,
      ): r is { agreement: MockAgreement; farmer: MockFarmer; residu: MockResiduRow | undefined } =>
        r !== null,
    );
}

/** Summary stats for the Setor Panen page header. */
export function setorStats() {
  const menunggu = MOCK_AGREEMENTS.filter((a) =>
    (["Active", "PartiallyDelivered"] as Status[]).includes(a.status),
  ).length;
  const totalSetorKg = MOCK_DELIVERIES.reduce((sum, d) => sum + d.volumeKg, 0);
  const selesai = MOCK_AGREEMENTS.filter((a) =>
    (["Delivered", "Flagged", "Settled", "ForceMajeure"] as Status[]).includes(a.status),
  ).length;
  const totalAgreements = MOCK_AGREEMENTS.length;
  return { menunggu, totalSetorKg, selesai, totalAgreements };
}

/** Summary stats for the Pembayaran page header. */
export function pembayaranStats() {
  const eligible: Status[] = ["Delivered", "PartiallyDelivered", "Flagged"];
  const payable = MOCK_AGREEMENTS.filter(
    (a) => eligible.includes(a.status) && a.deliveredVolG > a.settledVolG,
  );
  const totalBelumDibayarRp = payable.reduce((sum, a) => {
    const unsettledKg = (a.deliveredVolG - a.settledVolG) / 1000n;
    return sum + unsettledKg * a.hppPerKg;
  }, 0n);
  const residuPending = MOCK_RESIDU_LEDGER.filter((r) => r.status === "Pending").reduce(
    (sum, r) => sum + r.principalAmount,
    0n,
  );
  const sudahLunas = MOCK_AGREEMENTS.filter((a) => a.status === "Settled").length;
  return { totalBelumDibayarRp, residuPending, sudahLunas };
}

export function deliveryHistoryRows(): DeliveryHistoryRow[] {
  return MOCK_DELIVERIES.map((d) => {
    const agreement = getAgreement(d.agreementId);
    const farmer = agreement ? getFarmer(agreement.farmerId) : undefined;
    if (!agreement || !farmer) return null;
    // paid if the agreement's settled volume already covers this delivery's
    // cumulative position (sum of volumes up to and including this seq)
    const cumulativeKg = deliveriesOfAgreement(d.agreementId)
      .filter((x) => x.seq <= d.seq)
      .reduce((sum, x) => sum + x.volumeKg, 0);
    const paid = Number(agreement.settledVolG / 1000n) >= cumulativeKg;
    return { delivery: d, agreement, farmer, paid };
  })
    .filter((r): r is DeliveryHistoryRow => r !== null)
    .sort((a, b) => (a.delivery.deliveredAt < b.delivery.deliveredAt ? 1 : -1));
}
