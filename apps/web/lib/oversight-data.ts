/**
 * Oversight (Supplier operator + Pemerintah regulator) read-models.
 *
 * Imports KMP Sukamaju data from mock-data and extends it with 5 additional
 * fabricated koperasi so leaderboards, residu reconciliation, and regional
 * aggregates have realistic variety.
 *
 * Money: bigint smallest unit via rupiah().
 * Volume: number kg (off-chain read-model convenience; on-chain is grams).
 * NO "use client" here. Pages import this directly (they are "use client").
 * bigint never serialised through JSON.stringify — call formatRupiah first.
 */

import {
  MOCK_AGREEMENTS,
  MOCK_CATALOG,
  MOCK_RESIDU_LEDGER,
  MOCK_SHIPMENTS,
  type MockCatalogItem,
  type MockResiduRow,
  type MockShipment,
  type MockShipmentLine,
  aggregateSaprotanNeeds,
} from "@/lib/mock-data";
import type { ResiduStatus } from "@annona/core";
import { computeSplitSettlement, kgToGrams, rupiah } from "@annona/core";

// ─── CoopReputation shape (mirrors SMART-CONTRACT.md CoopReputation struct) ──

export interface CoopReputation {
  /** Perjanjian status == Settled */
  settledCount: number;
  /** Settled + Flagged + ForceMajeure (closed deals, any outcome) */
  closedCount: number;
  flaggedCount: number;
  forceMajeureCount: number;
  /** residu rows with status Cleared / all residu rows with any final status */
  residuClearedCount: number;
  residuTotalCount: number;
  /** Contract frozen indicator. Human-gated. Never automatic accusation. */
  frozen: boolean;
}

// ─── Coop profile (per-KMP row for leaderboard + residu desk) ────────────────

export interface MockCoopProfile {
  id: string;
  name: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  walletAddress: string;
  reputation: CoopReputation;
  // Aggregated financials (off-chain read-model)
  totalPrincipalOutstanding: bigint;
  totalSettledRp: bigint;
  totalProducedKg: number;
  residuPending: bigint;
  residuRemitted: bigint;
  residuCleared: bigint;
  activeAgreementCount: number;
  activeFarmerCount: number;
  flagQueue: number;
  // Derived
  settlementRatePct: number;
  residuCompliancePct: number;
}

// ─── Residu row extended with KMP identity (for Supplier reconciliation desk) ─

export interface OversightResiduRow extends MockResiduRow {
  coopId: string;
  coopName: string;
  farmerName: string;
  commodityCode: string;
  settledAt: string;
}

// ─── Supply dispatch request (Supplier sees aggregated KMP needs) ─────────────

export interface DispatchRequest {
  requestId: string;
  coopId: string;
  coopName: string;
  kabupaten: string;
  agreementIds: string[];
  items: { item: MockCatalogItem; qty: number; principal: bigint }[];
  grandTotal: bigint;
  /** Local state — flips to "Dikirim" after useMockTx dispatch action */
  status: "Menunggu" | "Dikirim";
}

// ─── KMP Sukamaju — built from live mock-data (agreements 1-12) ─────────────

function buildSukamajuProfile(): MockCoopProfile {
  const allAgms = MOCK_AGREEMENTS;
  const settled = allAgms.filter((a) => a.status === "Settled");
  const closed = allAgms.filter((a) =>
    ["Settled", "Flagged", "ForceMajeure"].includes(a.status),
  );
  const flagged = allAgms.filter((a) => a.status === "Flagged");
  const fm = allAgms.filter((a) => a.status === "ForceMajeure");
  const active = allAgms.filter((a) =>
    ["SupplyDispatched", "Active", "PartiallyDelivered", "Delivered"].includes(a.status),
  );

  const totalPrincipalOutstanding = active.reduce((s, a) => s + a.remainingDebt, 0n);
  const totalSettledRp = settled.reduce((s, a) => s + a.paidToFarmer, 0n);
  const totalProducedKg = settled.reduce((s, a) => s + Number(a.settledVolG / 1000n), 0);

  // Residu from live ledger
  const residuPending = MOCK_RESIDU_LEDGER.filter((r) => r.status === "Pending").reduce(
    (s, r) => s + r.principalAmount,
    0n,
  );
  const residuRemitted = MOCK_RESIDU_LEDGER.filter((r) => r.status === "Remitted").reduce(
    (s, r) => s + r.principalAmount,
    0n,
  );
  const residuCleared = MOCK_RESIDU_LEDGER.filter((r) => r.status === "Cleared").reduce(
    (s, r) => s + r.principalAmount,
    0n,
  );

  const closedCount = closed.length;
  const settledCount = settled.length;
  const settlementRatePct = closedCount === 0 ? 0 : Math.round((settledCount / closedCount) * 100);

  const residuTotal = MOCK_RESIDU_LEDGER.length;
  const residuClearedCount = MOCK_RESIDU_LEDGER.filter((r) => r.status === "Cleared").length;
  const residuCompliancePct =
    residuTotal === 0 ? 100 : Math.round((residuClearedCount / residuTotal) * 100);

  return {
    id: "coop-0001",
    name: "KMP Sukamaju",
    kecamatan: "Sukamaju",
    kabupaten: "Cianjur",
    provinsi: "Jawa Barat",
    walletAddress: "GKMPSUKA3B5D7F9H2J4L6N8P2R4T6V8X3Z5B7D9F2H4J6L8N2P4R6T8V",
    reputation: {
      settledCount,
      closedCount,
      flaggedCount: flagged.length,
      forceMajeureCount: fm.length,
      residuClearedCount,
      residuTotalCount: residuTotal,
      frozen: false,
    },
    totalPrincipalOutstanding,
    totalSettledRp,
    totalProducedKg,
    residuPending,
    residuRemitted,
    residuCleared,
    activeAgreementCount: active.length,
    activeFarmerCount: 7, // distinct active farmers from live data
    flagQueue: flagged.length,
    settlementRatePct,
    residuCompliancePct,
  };
}

// ─── Five additional fabricated KMPs ─────────────────────────────────────────

const h = (s: string) => `G${s.toUpperCase().padEnd(55, "X").slice(0, 55)}`;

// Helper: fake settlement math for a synthetic profile
function syntheticProfile({
  id,
  name,
  kecamatan,
  kabupaten,
  provinsi,
  wallet,
  settledCount,
  closedCount,
  flaggedCount,
  forceMajeureCount,
  residuClearedCount,
  residuTotalCount,
  frozen,
  totalPrincipalOutstanding,
  totalSettledRp,
  totalProducedKg,
  residuPending,
  residuRemitted,
  residuCleared,
  activeAgreementCount,
  activeFarmerCount,
  flagQueue,
}: {
  id: string;
  name: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  wallet: string;
  settledCount: number;
  closedCount: number;
  flaggedCount: number;
  forceMajeureCount: number;
  residuClearedCount: number;
  residuTotalCount: number;
  frozen: boolean;
  totalPrincipalOutstanding: bigint;
  totalSettledRp: bigint;
  totalProducedKg: number;
  residuPending: bigint;
  residuRemitted: bigint;
  residuCleared: bigint;
  activeAgreementCount: number;
  activeFarmerCount: number;
  flagQueue: number;
}): MockCoopProfile {
  const settlementRatePct =
    closedCount === 0 ? 0 : Math.round((settledCount / closedCount) * 100);
  const residuCompliancePct =
    residuTotalCount === 0 ? 100 : Math.round((residuClearedCount / residuTotalCount) * 100);
  return {
    id,
    name,
    kecamatan,
    kabupaten,
    provinsi,
    walletAddress: h(wallet),
    reputation: {
      settledCount,
      closedCount,
      flaggedCount,
      forceMajeureCount,
      residuClearedCount,
      residuTotalCount,
      frozen,
    },
    totalPrincipalOutstanding,
    totalSettledRp,
    totalProducedKg,
    residuPending,
    residuRemitted,
    residuCleared,
    activeAgreementCount,
    activeFarmerCount,
    flagQueue,
    settlementRatePct,
    residuCompliancePct,
  };
}

/** KMP Mekarjaya, Subang — solid performer, high compliance */
const COOP_MEKARJAYA = syntheticProfile({
  id: "coop-0002",
  name: "KMP Mekarjaya",
  kecamatan: "Compreng",
  kabupaten: "Subang",
  provinsi: "Jawa Barat",
  wallet: "COOP0002MEKARJAYA",
  settledCount: 22,
  closedCount: 24,
  flaggedCount: 1,
  forceMajeureCount: 1,
  residuClearedCount: 20,
  residuTotalCount: 22,
  frozen: false,
  totalPrincipalOutstanding: rupiah(31_400_000),
  totalSettledRp: rupiah(189_600_000),
  totalProducedKg: 87_400,
  residuPending: rupiah(3_200_000),
  residuRemitted: rupiah(1_100_000),
  residuCleared: rupiah(76_400_000),
  activeAgreementCount: 9,
  activeFarmerCount: 12,
  flagQueue: 1,
});

/** KMP Tani Mandiri, Tasikmalaya — average, occasional flags */
const COOP_TANI_MANDIRI = syntheticProfile({
  id: "coop-0003",
  name: "KMP Tani Mandiri",
  kecamatan: "Manonjaya",
  kabupaten: "Tasikmalaya",
  provinsi: "Jawa Barat",
  wallet: "COOP0003TANIMANDIRI",
  settledCount: 14,
  closedCount: 20,
  flaggedCount: 4,
  forceMajeureCount: 2,
  residuClearedCount: 9,
  residuTotalCount: 14,
  frozen: false,
  totalPrincipalOutstanding: rupiah(19_800_000),
  totalSettledRp: rupiah(112_300_000),
  totalProducedKg: 51_600,
  residuPending: rupiah(6_700_000),
  residuRemitted: rupiah(2_400_000),
  residuCleared: rupiah(38_900_000),
  activeAgreementCount: 6,
  activeFarmerCount: 8,
  flagQueue: 3,
});

/** KMP Sumber Makmur, Brebes — below average, high flag rate */
const COOP_SUMBER_MAKMUR = syntheticProfile({
  id: "coop-0004",
  name: "KMP Sumber Makmur",
  kecamatan: "Wanasari",
  kabupaten: "Brebes",
  provinsi: "Jawa Tengah",
  wallet: "COOP0004SUMBERMAKMUR",
  settledCount: 9,
  closedCount: 17,
  flaggedCount: 6,
  forceMajeureCount: 2,
  residuClearedCount: 4,
  residuTotalCount: 9,
  frozen: false,
  totalPrincipalOutstanding: rupiah(24_300_000),
  totalSettledRp: rupiah(63_200_000),
  totalProducedKg: 29_800,
  residuPending: rupiah(9_400_000),
  residuRemitted: rupiah(3_100_000),
  residuCleared: rupiah(18_400_000),
  activeAgreementCount: 7,
  activeFarmerCount: 9,
  flagQueue: 5,
});

/** KMP Maju Bersama, Magelang — problem KMP: frozen, many flags, low compliance */
const COOP_MAJU_BERSAMA = syntheticProfile({
  id: "coop-0005",
  name: "KMP Maju Bersama",
  kecamatan: "Srumbung",
  kabupaten: "Magelang",
  provinsi: "Jawa Tengah",
  wallet: "COOP0005MAJUBERSAMA",
  settledCount: 4,
  closedCount: 11,
  flaggedCount: 5,
  forceMajeureCount: 2,
  residuClearedCount: 1,
  residuTotalCount: 4,
  frozen: true,
  totalPrincipalOutstanding: rupiah(18_900_000),
  totalSettledRp: rupiah(29_600_000),
  totalProducedKg: 13_700,
  residuPending: rupiah(12_800_000),
  residuRemitted: rupiah(0),
  residuCleared: rupiah(4_100_000),
  activeAgreementCount: 5,
  activeFarmerCount: 6,
  flagQueue: 5,
});

/** KMP Karya Tani, Lombok Tengah — new, small, only 2 closed agreements */
const COOP_KARYA_TANI = syntheticProfile({
  id: "coop-0006",
  name: "KMP Karya Tani",
  kecamatan: "Praya",
  kabupaten: "Lombok Tengah",
  provinsi: "Nusa Tenggara Barat",
  wallet: "COOP0006KARYATANI",
  settledCount: 2,
  closedCount: 2,
  flaggedCount: 0,
  forceMajeureCount: 0,
  residuClearedCount: 2,
  residuTotalCount: 2,
  frozen: false,
  totalPrincipalOutstanding: rupiah(8_200_000),
  totalSettledRp: rupiah(17_400_000),
  totalProducedKg: 8_100,
  residuPending: rupiah(0),
  residuRemitted: rupiah(0),
  residuCleared: rupiah(6_800_000),
  activeAgreementCount: 3,
  activeFarmerCount: 4,
  flagQueue: 0,
});

// ─── Master coop list (Sukamaju from live data + 5 fabricated) ───────────────

export const MOCK_COOP_PROFILES: MockCoopProfile[] = [
  buildSukamajuProfile(),
  COOP_MEKARJAYA,
  COOP_TANI_MANDIRI,
  COOP_SUMBER_MAKMUR,
  COOP_MAJU_BERSAMA,
  COOP_KARYA_TANI,
];

// ─── Oversight residu ledger (KMP Sukamaju rows + synthetic rows) ─────────────

const SYNTH_HASH = (s: string) =>
  s
    .repeat(8)
    .split("")
    .map((c) => (c.charCodeAt(0) % 16).toString(16))
    .join("")
    .slice(0, 64);

function syntheticResiduRow({
  id,
  coopId,
  coopName,
  agreementId,
  farmerName,
  commodityCode,
  principalAmount,
  status,
  bankRef,
  remittedAt,
  clearedAt,
  settledAt,
}: {
  id: string;
  coopId: string;
  coopName: string;
  agreementId: string;
  farmerName: string;
  commodityCode: string;
  principalAmount: bigint;
  status: ResiduStatus;
  bankRef: string | null;
  remittedAt: string | null;
  clearedAt: string | null;
  settledAt: string;
}): OversightResiduRow {
  return {
    id,
    agreementId,
    coopId,
    coopName,
    farmerName,
    commodityCode,
    principalAmount,
    bankRef,
    status,
    remittedAt,
    clearedAt,
    settledAt,
    txHash: status !== "Pending" ? SYNTH_HASH(`rsd${id}`) : null,
  };
}

export const OVERSIGHT_RESIDU_ROWS: OversightResiduRow[] = [
  // KMP Sukamaju rows (from live mock data)
  {
    id: "rsd-001",
    agreementId: "agm-001",
    coopId: "coop-0001",
    coopName: "KMP Sukamaju",
    farmerName: "Budi Santoso",
    commodityCode: "GABAH",
    principalAmount: rupiah(2_000_000),
    bankRef: null,
    status: "Pending",
    remittedAt: null,
    clearedAt: null,
    settledAt: "2026-06-27",
    txHash: null,
  },
  {
    id: "rsd-002",
    agreementId: "agm-007",
    coopId: "coop-0001",
    coopName: "KMP Sukamaju",
    farmerName: "Hendra Gunawan",
    commodityCode: "JAGUNG",
    principalAmount: rupiah(1_430_000),
    bankRef: "BCA-20260622-771",
    status: "Remitted",
    remittedAt: "2026-06-22",
    clearedAt: null,
    settledAt: "2026-06-20",
    txHash: SYNTH_HASH("rsd002"),
  },
  {
    id: "rsd-003",
    agreementId: "agm-009",
    coopId: "coop-0001",
    coopName: "KMP Sukamaju",
    farmerName: "Agus Salim",
    commodityCode: "GABAH",
    principalAmount: rupiah(3_680_000),
    bankRef: "BCA-20260614-402",
    status: "Cleared",
    remittedAt: "2026-06-14",
    clearedAt: "2026-06-15",
    settledAt: "2026-06-12",
    txHash: SYNTH_HASH("rsd003"),
  },
  // KMP Mekarjaya rows
  syntheticResiduRow({
    id: "rsd-mj-001",
    coopId: "coop-0002",
    coopName: "KMP Mekarjaya",
    agreementId: "agm-mj-001",
    farmerName: "Ujang Permana",
    commodityCode: "GABAH",
    principalAmount: rupiah(3_200_000),
    status: "Pending",
    bankRef: null,
    remittedAt: null,
    clearedAt: null,
    settledAt: "2026-07-02",
  }),
  syntheticResiduRow({
    id: "rsd-mj-002",
    coopId: "coop-0002",
    coopName: "KMP Mekarjaya",
    agreementId: "agm-mj-002",
    farmerName: "Yayan Sudrajat",
    commodityCode: "GABAH",
    principalAmount: rupiah(1_100_000),
    status: "Remitted",
    bankRef: "BNI-20260628-334",
    remittedAt: "2026-06-28",
    clearedAt: null,
    settledAt: "2026-06-25",
  }),
  syntheticResiduRow({
    id: "rsd-mj-003",
    coopId: "coop-0002",
    coopName: "KMP Mekarjaya",
    agreementId: "agm-mj-003",
    farmerName: "Dede Sucipto",
    commodityCode: "GABAH",
    principalAmount: rupiah(5_600_000),
    status: "Cleared",
    bankRef: "BNI-20260620-098",
    remittedAt: "2026-06-20",
    clearedAt: "2026-06-21",
    settledAt: "2026-06-18",
  }),
  // KMP Tani Mandiri rows
  syntheticResiduRow({
    id: "rsd-tm-001",
    coopId: "coop-0003",
    coopName: "KMP Tani Mandiri",
    agreementId: "agm-tm-001",
    farmerName: "Ade Koswara",
    commodityCode: "GABAH",
    principalAmount: rupiah(4_200_000),
    status: "Pending",
    bankRef: null,
    remittedAt: null,
    clearedAt: null,
    settledAt: "2026-06-30",
  }),
  syntheticResiduRow({
    id: "rsd-tm-002",
    coopId: "coop-0003",
    coopName: "KMP Tani Mandiri",
    agreementId: "agm-tm-002",
    farmerName: "Tati Rohayati",
    commodityCode: "JAGUNG",
    principalAmount: rupiah(2_500_000),
    status: "Remitted",
    bankRef: "MANDIRI-20260626-541",
    remittedAt: "2026-06-26",
    clearedAt: null,
    settledAt: "2026-06-24",
  }),
  syntheticResiduRow({
    id: "rsd-tm-003",
    coopId: "coop-0003",
    coopName: "KMP Tani Mandiri",
    agreementId: "agm-tm-003",
    farmerName: "Endang Suhedar",
    commodityCode: "GABAH",
    principalAmount: rupiah(3_100_000),
    status: "Cleared",
    bankRef: "MANDIRI-20260610-221",
    remittedAt: "2026-06-10",
    clearedAt: "2026-06-11",
    settledAt: "2026-06-08",
  }),
  // KMP Sumber Makmur rows (below-average compliance)
  syntheticResiduRow({
    id: "rsd-sm-001",
    coopId: "coop-0004",
    coopName: "KMP Sumber Makmur",
    agreementId: "agm-sm-001",
    farmerName: "Warto Supriyadi",
    commodityCode: "GABAH",
    principalAmount: rupiah(5_600_000),
    status: "Pending",
    bankRef: null,
    remittedAt: null,
    clearedAt: null,
    settledAt: "2026-06-29",
  }),
  syntheticResiduRow({
    id: "rsd-sm-002",
    coopId: "coop-0004",
    coopName: "KMP Sumber Makmur",
    agreementId: "agm-sm-002",
    farmerName: "Munah Ningsih",
    commodityCode: "GABAH",
    principalAmount: rupiah(3_800_000),
    status: "Pending",
    bankRef: null,
    remittedAt: null,
    clearedAt: null,
    settledAt: "2026-06-27",
  }),
  syntheticResiduRow({
    id: "rsd-sm-003",
    coopId: "coop-0004",
    coopName: "KMP Sumber Makmur",
    agreementId: "agm-sm-003",
    farmerName: "Slamet Widodo",
    commodityCode: "GABAH",
    principalAmount: rupiah(3_100_000),
    status: "Remitted",
    bankRef: "BRI-20260618-009",
    remittedAt: "2026-06-18",
    clearedAt: null,
    settledAt: "2026-06-15",
  }),
  // KMP Maju Bersama rows (frozen, worst compliance)
  syntheticResiduRow({
    id: "rsd-mb-001",
    coopId: "coop-0005",
    coopName: "KMP Maju Bersama",
    agreementId: "agm-mb-001",
    farmerName: "Sarno Hadiyanto",
    commodityCode: "GABAH",
    principalAmount: rupiah(7_200_000),
    status: "Pending",
    bankRef: null,
    remittedAt: null,
    clearedAt: null,
    settledAt: "2026-06-20",
  }),
  syntheticResiduRow({
    id: "rsd-mb-002",
    coopId: "coop-0005",
    coopName: "KMP Maju Bersama",
    agreementId: "agm-mb-002",
    farmerName: "Parno Siswanto",
    commodityCode: "JAGUNG",
    principalAmount: rupiah(5_600_000),
    status: "Pending",
    bankRef: null,
    remittedAt: null,
    clearedAt: null,
    settledAt: "2026-06-18",
  }),
  syntheticResiduRow({
    id: "rsd-mb-003",
    coopId: "coop-0005",
    coopName: "KMP Maju Bersama",
    agreementId: "agm-mb-003",
    farmerName: "Karto Mujiono",
    commodityCode: "GABAH",
    principalAmount: rupiah(4_100_000),
    status: "Cleared",
    bankRef: "BRI-20260605-017",
    remittedAt: "2026-06-05",
    clearedAt: "2026-06-06",
    settledAt: "2026-06-03",
  }),
  // KMP Karya Tani rows (new, fully compliant)
  syntheticResiduRow({
    id: "rsd-kt-001",
    coopId: "coop-0006",
    coopName: "KMP Karya Tani",
    agreementId: "agm-kt-001",
    farmerName: "Lalu Hendra",
    commodityCode: "GABAH",
    principalAmount: rupiah(3_400_000),
    status: "Cleared",
    bankRef: "BNI-20260625-882",
    remittedAt: "2026-06-25",
    clearedAt: "2026-06-26",
    settledAt: "2026-06-23",
  }),
  syntheticResiduRow({
    id: "rsd-kt-002",
    coopId: "coop-0006",
    coopName: "KMP Karya Tani",
    agreementId: "agm-kt-002",
    farmerName: "Baiq Sari",
    commodityCode: "GABAH",
    principalAmount: rupiah(3_400_000),
    status: "Cleared",
    bankRef: "BNI-20260620-771",
    remittedAt: "2026-06-20",
    clearedAt: "2026-06-21",
    settledAt: "2026-06-18",
  }),
];

// ─── Supply dispatch requests (Supplier sees Created agreements per KMP) ──────

/** Build dispatch requests from KMP Sukamaju's Created agreements (live data)
 *  plus synthetic Created rows for the other KMPs. */
export function buildDispatchRequests(): DispatchRequest[] {
  // KMP Sukamaju: group Created agreements from live data
  const sukamajuCreated = MOCK_AGREEMENTS.filter((a) => a.status === "Created");
  const sukamajuAgg = aggregateSaprotanNeeds(sukamajuCreated);
  const sukamajuTotal = sukamajuAgg.reduce((s, a) => s + a.principal, 0n);

  const requests: DispatchRequest[] = [];

  if (sukamajuCreated.length > 0) {
    requests.push({
      requestId: "req-coop-0001",
      coopId: "coop-0001",
      coopName: "KMP Sukamaju",
      kabupaten: "Cianjur",
      agreementIds: sukamajuCreated.map((a) => a.id),
      items: sukamajuAgg,
      grandTotal: sukamajuTotal,
      status: "Menunggu",
    });
  }

  // Synthetic requests for other KMPs. Catalog entries are defined at module
  // scope in mock-data; fail loudly if the fixture ever shrinks.
  const [catUrea, catNpk, catInpari, catBisi] = MOCK_CATALOG;
  if (!catUrea || !catNpk || !catInpari || !catBisi) {
    throw new Error("MOCK_CATALOG must contain at least 4 items");
  }

  const mekarjayaItems: DispatchRequest["items"] = [
    { item: catUrea, qty: 6, principal: catUrea.basePriceSupplier * 6n },
    { item: catNpk, qty: 4, principal: catNpk.basePriceSupplier * 4n },
    { item: catInpari, qty: 3, principal: catInpari.basePriceSupplier * 3n },
  ];
  requests.push({
    requestId: "req-coop-0002",
    coopId: "coop-0002",
    coopName: "KMP Mekarjaya",
    kabupaten: "Subang",
    agreementIds: ["agm-mj-new-1", "agm-mj-new-2"],
    items: mekarjayaItems,
    grandTotal: mekarjayaItems.reduce((s, i) => s + i.principal, 0n),
    status: "Menunggu",
  });

  const taniMandiriItems: DispatchRequest["items"] = [
    { item: catUrea, qty: 4, principal: catUrea.basePriceSupplier * 4n },
    { item: catBisi, qty: 5, principal: catBisi.basePriceSupplier * 5n },
  ];
  requests.push({
    requestId: "req-coop-0003",
    coopId: "coop-0003",
    coopName: "KMP Tani Mandiri",
    kabupaten: "Tasikmalaya",
    agreementIds: ["agm-tm-new-1"],
    items: taniMandiriItems,
    grandTotal: taniMandiriItems.reduce((s, i) => s + i.principal, 0n),
    status: "Menunggu",
  });

  return requests;
}

// ─── Protocol-wide aggregate metrics ─────────────────────────────────────────

export function protocolMetrics() {
  const coops = MOCK_COOP_PROFILES;

  const totalPrincipalOutstanding = coops.reduce(
    (s, c) => s + c.totalPrincipalOutstanding,
    0n,
  );
  const totalSettledRp = coops.reduce((s, c) => s + c.totalSettledRp, 0n);
  const totalProducedKg = coops.reduce((s, c) => s + c.totalProducedKg, 0);
  const residuPending = coops.reduce((s, c) => s + c.residuPending, 0n);
  const residuRemitted = coops.reduce((s, c) => s + c.residuRemitted, 0n);
  const residuCleared = coops.reduce((s, c) => s + c.residuCleared, 0n);
  const totalActiveAgreements = coops.reduce((s, c) => s + c.activeAgreementCount, 0);
  const totalFlags = coops.reduce((s, c) => s + c.flagQueue, 0);
  const frozenCoops = coops.filter((c) => c.reputation.frozen).length;
  const bermasalahCoops = coops.filter((c) => c.settlementRatePct < 50).length;

  const allClosed = coops.reduce((s, c) => s + c.reputation.closedCount, 0);
  const allSettled = coops.reduce((s, c) => s + c.reputation.settledCount, 0);
  const overallSettlementRatePct =
    allClosed === 0 ? 0 : Math.round((allSettled / allClosed) * 100);

  const allResiduTotal = coops.reduce((s, c) => s + c.reputation.residuTotalCount, 0);
  const allResiduCleared = coops.reduce((s, c) => s + c.reputation.residuClearedCount, 0);
  const overallResiduCompliancePct =
    allResiduTotal === 0 ? 100 : Math.round((allResiduCleared / allResiduTotal) * 100);

  return {
    totalPrincipalOutstanding,
    totalSettledRp,
    totalProducedKg,
    residuPending,
    residuRemitted,
    residuCleared,
    totalActiveAgreements,
    totalFlags,
    frozenCoops,
    bermasalahCoops,
    overallSettlementRatePct,
    overallResiduCompliancePct,
  };
}

// ─── Regional production data (Pemerintah view) ──────────────────────────────

export interface RegionalRow {
  kabupaten: string;
  provinsi: string;
  activeFarmers: number;
  totalKg: number;
  avgYieldTPerHa: number;
  settlementRate: number;
  successfulHarvestCount: number;
  failedHarvestCount: number;
}

export const REGIONAL_DATA: RegionalRow[] = [
  {
    kabupaten: "Cianjur",
    provinsi: "Jawa Barat",
    activeFarmers: 7,
    totalKg: 0, // computed from live data below
    avgYieldTPerHa: 5.6,
    settlementRate: 0, // from Sukamaju
    successfulHarvestCount: 0,
    failedHarvestCount: 0,
  },
  {
    kabupaten: "Subang",
    provinsi: "Jawa Barat",
    activeFarmers: 12,
    totalKg: 87_400,
    avgYieldTPerHa: 5.8,
    settlementRate: 92,
    successfulHarvestCount: 22,
    failedHarvestCount: 2,
  },
  {
    kabupaten: "Tasikmalaya",
    provinsi: "Jawa Barat",
    activeFarmers: 8,
    totalKg: 51_600,
    avgYieldTPerHa: 5.1,
    settlementRate: 70,
    successfulHarvestCount: 14,
    failedHarvestCount: 6,
  },
  {
    kabupaten: "Brebes",
    provinsi: "Jawa Tengah",
    activeFarmers: 9,
    totalKg: 29_800,
    avgYieldTPerHa: 4.8,
    settlementRate: 53,
    successfulHarvestCount: 9,
    failedHarvestCount: 8,
  },
  {
    kabupaten: "Magelang",
    provinsi: "Jawa Tengah",
    activeFarmers: 6,
    totalKg: 13_700,
    avgYieldTPerHa: 4.2,
    settlementRate: 36,
    successfulHarvestCount: 4,
    failedHarvestCount: 7,
  },
  {
    kabupaten: "Lombok Tengah",
    provinsi: "NTB",
    activeFarmers: 4,
    totalKg: 8_100,
    avgYieldTPerHa: 4.6,
    settlementRate: 100,
    successfulHarvestCount: 2,
    failedHarvestCount: 0,
  },
];

/** Fill Cianjur from live data */
export function buildRegionalData(): RegionalRow[] {
  // MOCK_COOP_PROFILES[0] is always KMP Sukamaju (defined above).
  const sukamaju = MOCK_COOP_PROFILES[0];
  if (!sukamaju) throw new Error("MOCK_COOP_PROFILES must not be empty");
  const rows = REGIONAL_DATA.map((r) => {
    if (r.kabupaten === "Cianjur") {
      return {
        ...r,
        totalKg: sukamaju.totalProducedKg,
        settlementRate: sukamaju.settlementRatePct,
        successfulHarvestCount: sukamaju.reputation.settledCount,
        failedHarvestCount:
          sukamaju.reputation.flaggedCount + sukamaju.reputation.forceMajeureCount,
      };
    }
    return r;
  });
  return rows;
}

// ─── Flag queue for Pemerintah review ────────────────────────────────────────

export interface FlagQueueItem {
  id: string;
  coopId: string;
  coopName: string;
  farmerName: string;
  reason: "PartialDelivery" | "Suspected" | "ForceMajeure" | "Warning";
  agreementId: string;
  deliveredPct: number;
  expectedKg: number;
  deliveredKg: number;
  flaggedAt: string;
  /** Pemerintah-only local checkbox — purely local, no chain write */
  reviewed: boolean;
}

export const FLAG_QUEUE_ITEMS: FlagQueueItem[] = [
  {
    id: "fq-001",
    coopId: "coop-0001",
    coopName: "KMP Sukamaju",
    farmerName: "Sri Rahayu",
    reason: "PartialDelivery",
    agreementId: "agm-008",
    deliveredPct: 45,
    expectedKg: 3_900,
    deliveredKg: 1_750,
    flaggedAt: "2026-06-24",
    reviewed: false,
  },
  {
    id: "fq-002",
    coopId: "coop-0003",
    coopName: "KMP Tani Mandiri",
    farmerName: "Ade Koswara",
    reason: "Suspected",
    agreementId: "agm-tm-flag-1",
    deliveredPct: 28,
    expectedKg: 4_200,
    deliveredKg: 1_180,
    flaggedAt: "2026-06-26",
    reviewed: false,
  },
  {
    id: "fq-003",
    coopId: "coop-0004",
    coopName: "KMP Sumber Makmur",
    farmerName: "Warto Supriyadi",
    reason: "Warning",
    agreementId: "agm-sm-flag-1",
    deliveredPct: 82,
    expectedKg: 3_100,
    deliveredKg: 2_540,
    flaggedAt: "2026-06-27",
    reviewed: false,
  },
  {
    id: "fq-004",
    coopId: "coop-0004",
    coopName: "KMP Sumber Makmur",
    farmerName: "Munah Ningsih",
    reason: "PartialDelivery",
    agreementId: "agm-sm-flag-2",
    deliveredPct: 51,
    expectedKg: 2_800,
    deliveredKg: 1_430,
    flaggedAt: "2026-06-28",
    reviewed: false,
  },
  {
    id: "fq-005",
    coopId: "coop-0005",
    coopName: "KMP Maju Bersama",
    farmerName: "Sarno Hadiyanto",
    reason: "ForceMajeure",
    agreementId: "agm-mb-flag-1",
    deliveredPct: 0,
    expectedKg: 5_200,
    deliveredKg: 0,
    flaggedAt: "2026-06-20",
    reviewed: false,
  },
  {
    id: "fq-006",
    coopId: "coop-0005",
    coopName: "KMP Maju Bersama",
    farmerName: "Parno Siswanto",
    reason: "Suspected",
    agreementId: "agm-mb-flag-2",
    deliveredPct: 22,
    expectedKg: 4_800,
    deliveredKg: 1_060,
    flaggedAt: "2026-06-22",
    reviewed: false,
  },
];

// ─── Commodity distribution (for pemerintah bar chart) ───────────────────────

export const COMMODITY_DIST = [
  { code: "GABAH", name: "Gabah Kering Panen", kgTotal: 205_100, pct: 79 },
  { code: "JAGUNG", name: "Jagung Pipilan Kering", kgTotal: 54_100, pct: 21 },
];

// ─── Editable base price snapshot (Supplier catalog control) ──────────────────

/** Wraps MOCK_CATALOG with a mutable price layer for the Katalog & Logistik UI.
 *  The real system would write to the Supplier admin API; here it is local state. */
export type EditableCatalogRow = MockCatalogItem & {
  proposedPrice: bigint | null;
};

export function buildEditableCatalog(): EditableCatalogRow[] {
  return MOCK_CATALOG.map((item) => ({ ...item, proposedPrice: null }));
}

// ─── Supplier activity feed ────────────────────────────────────────────────────

export interface AgrinarActivity {
  id: string;
  text: string;
  kind: "dispatch" | "remittance" | "cleared" | "dispute" | "created" | "frozen";
  coopName: string;
  txHash: string | null;
  at: string;
}

// ─── Dispatch history (saprotan logistik desk) ────────────────────────────────

export interface DispatchHistoryItem {
  name: string;
  code: string;
  qty: number;
  unitLabel: string;
  principal: bigint;
}

export interface DispatchHistoryRow {
  id: string;
  coopId: string;
  coopName: string;
  kabupaten: string;
  dispatchedAt: string;
  itemCount: number;
  totalPokok: bigint;
  /** Dikirim = dispatched but awaiting KMP accept_supply; Diterima = KMP accepted */
  status: "Dikirim" | "Diterima";
  txHash: string;
  items: DispatchHistoryItem[];
  acceptedAt: string | null;
}

export const DISPATCH_HISTORY: DispatchHistoryRow[] = [
  {
    id: "dsp-h-001",
    coopId: "coop-0001",
    coopName: "KMP Sukamaju",
    kabupaten: "Cianjur",
    dispatchedAt: "2026-07-01",
    itemCount: 2,
    totalPokok: rupiah(3_360_000),
    status: "Diterima",
    txHash: SYNTH_HASH("dsph001"),
    acceptedAt: "2026-07-02",
    items: [
      { name: "Pupuk Urea 50kg", code: "UREA-50", qty: 4, unitLabel: "karung 50kg", principal: rupiah(2_240_000) },
      { name: "Insektisida Regent 400ml", code: "PES-REGENT", qty: 4, unitLabel: "botol 400ml", principal: rupiah(380_000) },
    ],
  },
  {
    id: "dsp-h-002",
    coopId: "coop-0002",
    coopName: "KMP Mekarjaya",
    kabupaten: "Subang",
    dispatchedAt: "2026-06-28",
    itemCount: 3,
    totalPokok: rupiah(6_600_000),
    status: "Diterima",
    txHash: SYNTH_HASH("dsph002"),
    acceptedAt: "2026-06-29",
    items: [
      { name: "Pupuk Urea 50kg", code: "UREA-50", qty: 5, unitLabel: "karung 50kg", principal: rupiah(2_800_000) },
      { name: "NPK Phonska 50kg", code: "NPK-PHONSKA-50", qty: 3, unitLabel: "karung 50kg", principal: rupiah(1_920_000) },
      { name: "Benih Padi Inpari 32", code: "BENIH-INPARI32", qty: 16, unitLabel: "kantong 5kg", principal: rupiah(1_920_000) },
    ],
  },
  {
    id: "dsp-h-003",
    coopId: "coop-0003",
    coopName: "KMP Tani Mandiri",
    kabupaten: "Tasikmalaya",
    dispatchedAt: "2026-07-03",
    itemCount: 2,
    totalPokok: rupiah(4_600_000),
    status: "Dikirim",
    txHash: SYNTH_HASH("dsph003"),
    acceptedAt: null,
    items: [
      { name: "Pupuk Urea 50kg", code: "UREA-50", qty: 5, unitLabel: "karung 50kg", principal: rupiah(2_800_000) },
      { name: "Benih Jagung BISI-18", code: "BENIH-BISI18", qty: 12, unitLabel: "kantong 5kg", principal: rupiah(1_860_000) },
    ],
  },
];

// ─── Oversight shipments (penerimaan desk) ────────────────────────────────────
// Extends MOCK_SHIPMENTS (KMP Sukamaju) with synthetic rows from other KMPs.

export interface OversightShipment extends MockShipment {
  coopId: string;
}

function makeShipmentLine(overrides: Partial<MockShipmentLine> & { id: string; deliveryId: string; agreementId: string; farmerId: string; volumeKg: number; grade: string; moistureBps: number }): MockShipmentLine {
  return overrides as MockShipmentLine;
}

const OVERSIGHT_SYNTH: OversightShipment[] = [
  // KMP Mekarjaya — Dikirim (awaiting confirmation)
  {
    id: "shp-mj-001",
    ref: "SHP-2026-004",
    coopId: "coop-0002",
    coopName: "KMP Mekarjaya",
    supplierId: "agr-0001",
    supplierName: "Gudang Agrinas Subang",
    commodityCode: "GABAH",
    status: "Dikirim",
    totalVolumeKg: 6_200,
    receivedVolumeKg: null,
    discrepancyNote: null,
    sentAt: "2026-07-04",
    receivedAt: null,
    createdAt: "2026-07-04",
    lines: [
      makeShipmentLine({ id: "shl-mj-001", deliveryId: "dlv-mj-001", agreementId: "agm-mj-001", farmerId: "frm-mj-001", volumeKg: 3_800, grade: "A", moistureBps: 1300 }),
      makeShipmentLine({ id: "shl-mj-002", deliveryId: "dlv-mj-002", agreementId: "agm-mj-002", farmerId: "frm-mj-002", volumeKg: 2_400, grade: "B", moistureBps: 1420 }),
    ],
  },
  // KMP Tani Mandiri — Dikirim
  {
    id: "shp-tm-001",
    ref: "SHP-2026-005",
    coopId: "coop-0003",
    coopName: "KMP Tani Mandiri",
    supplierId: "agr-0001",
    supplierName: "Gudang Agrinas Tasikmalaya",
    commodityCode: "GABAH",
    status: "Dikirim",
    totalVolumeKg: 3_900,
    receivedVolumeKg: null,
    discrepancyNote: null,
    sentAt: "2026-07-06",
    receivedAt: null,
    createdAt: "2026-07-06",
    lines: [
      makeShipmentLine({ id: "shl-tm-001", deliveryId: "dlv-tm-001", agreementId: "agm-tm-001", farmerId: "frm-tm-001", volumeKg: 3_900, grade: "A", moistureBps: 1280 }),
    ],
  },
  // KMP Sumber Makmur — Selisih (discrepancy)
  {
    id: "shp-sm-001",
    ref: "SHP-2026-006",
    coopId: "coop-0004",
    coopName: "KMP Sumber Makmur",
    supplierId: "agr-0001",
    supplierName: "Gudang Agrinas Brebes",
    commodityCode: "GABAH",
    status: "Selisih",
    totalVolumeKg: 5_100,
    receivedVolumeKg: 4_650,
    discrepancyNote: "Selisih 450 kg, melebihi toleransi susut timbang normal. Perlu konfirmasi ulang dari KMP.",
    sentAt: "2026-06-30",
    receivedAt: "2026-07-01",
    createdAt: "2026-06-30",
    lines: [
      makeShipmentLine({ id: "shl-sm-001", deliveryId: "dlv-sm-001", agreementId: "agm-sm-001", farmerId: "frm-sm-001", volumeKg: 3_000, grade: "A", moistureBps: 1350 }),
      makeShipmentLine({ id: "shl-sm-002", deliveryId: "dlv-sm-002", agreementId: "agm-sm-002", farmerId: "frm-sm-002", volumeKg: 2_100, grade: "B", moistureBps: 1480 }),
    ],
  },
];

/** All shipments visible on the penerimaan desk: KMP Sukamaju (from mock-data) + multi-KMP synthetics. */
export const OVERSIGHT_SHIPMENTS: OversightShipment[] = [
  ...MOCK_SHIPMENTS.map((s) => ({ ...s, coopId: "coop-0001" })),
  ...OVERSIGHT_SYNTH,
];

export const SUPPLIER_ACTIVITY: AgrinarActivity[] = [
  {
    id: "aact-1",
    text: "Residu Rp2.000.000 dari KMP Sukamaju menunggu verifikasi remitansi",
    kind: "remittance",
    coopName: "KMP Sukamaju",
    txHash: null,
    at: "2 jam lalu",
  },
  {
    id: "aact-2",
    text: "Permintaan saprotan baru dari KMP Mekarjaya, 3 item, Rp7.616.000",
    kind: "created",
    coopName: "KMP Mekarjaya",
    txHash: SYNTH_HASH("aact2"),
    at: "5 jam lalu",
  },
  {
    id: "aact-3",
    text: "Residu Rp1.430.000 KMP Sukamaju: remitansi dikonfirmasi menunggu verifikasi",
    kind: "remittance",
    coopName: "KMP Sukamaju",
    txHash: SYNTH_HASH("aact3"),
    at: "1 hari lalu",
  },
  {
    id: "aact-4",
    text: "Residu KMP Mekarjaya Rp5.600.000 diverifikasi dan dinyatakan Terverifikasi",
    kind: "cleared",
    coopName: "KMP Mekarjaya",
    txHash: SYNTH_HASH("aact4"),
    at: "2 hari lalu",
  },
  {
    id: "aact-5",
    text: "Reputasi on-chain KMP Maju Bersama dibekukan karena residu belum dibayar",
    kind: "frozen",
    coopName: "KMP Maju Bersama",
    txHash: SYNTH_HASH("aact5"),
    at: "3 hari lalu",
  },
  {
    id: "aact-6",
    text: "Pengiriman saprotan ke KMP Sukamaju #4 berhasil: Rina Wulandari",
    kind: "dispatch",
    coopName: "KMP Sukamaju",
    txHash: SYNTH_HASH("aact6"),
    at: "4 hari lalu",
  },
  {
    id: "aact-7",
    text: "Sengketa residu diajukan ke KMP Sumber Makmur: selisih Rp400.000",
    kind: "dispute",
    coopName: "KMP Sumber Makmur",
    txHash: SYNTH_HASH("aact7"),
    at: "1 minggu lalu",
  },
];
