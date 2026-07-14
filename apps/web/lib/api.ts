/**
 * Web read client over the Annona REST API (apps/api). Single source for
 * fetching the off-chain read-models into the KMP dashboard. Isomorphic:
 * server components `await` these directly; client components go through
 * `useApi` (lib/use-api.ts).
 *
 * The API serializes bigint money/volume as decimal STRINGS (jsonSafe). We
 * parse them back to bigint here so the UI keeps its exact-integer money
 * discipline (never floats for money). Field names mirror the API responses,
 * NOT the mock-data `Mock*` shapes (they diverge: volumeG vs volumeKg, etc.).
 */
import type { FlagReason, ResiduStatus, Status, SubsidyTier } from "@annona/core";
import type { RepTier, SubsidyStatus } from "@annona/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`[api] ${path} -> ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** POST a JSON body. Surfaces the server's `error` message on non-2xx so the
 *  form can show why (e.g. a duplicate wallet). Used by the off-chain writes
 *  (farmer registry, saprotan catalog) that persist straight to Postgres. */
async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data?.error ? `${data.error}` : `[api] POST ${path} -> ${res.status}`);
  }
  return data as T;
}

/** PATCH a JSON body (partial update of an off-chain row). */
async function patchJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data?.error ? `${data.error}` : `[api] PATCH ${path} -> ${res.status}`);
  }
  return data as T;
}

/** Money/volume come off the wire as decimal strings; back to bigint. */
const big = (v: string): bigint => BigInt(v);

// ─── Types (mirror the API read-model DTOs) ─────────────────────────────────

export interface ApiAgreement {
  id: string;
  onchainId: bigint;
  farmerId: string;
  farmerName: string;
  commodityCode: string;
  subsidyTier: SubsidyTier;
  grade: string;
  moistureBps: number;
  basePriceSupplier: bigint;
  saprotanMarkupBps: number;
  inputDebt: bigint;
  hppHandlingFeeBps: number;
  hppPerKg: bigint;
  hppVersion: number;
  expectedVolG: bigint;
  expectedVolKg: number;
  deliveredVolG: bigint;
  settledVolG: bigint;
  toleranceBps: number;
  status: Status;
  flag: FlagReason;
  remainingDebt: bigint;
  paidToFarmer: bigint;
  coopHandlingAccrued: bigint;
  coopMarginAccrued: bigint;
  residuPrincipal: bigint;
  residuStatus: ResiduStatus;
  createdAt: string;
  createTxHash: string | null;
  expectedHarvestDate: string | null;
}

export interface ApiAgreementInput {
  id: string;
  agreementId: string;
  catalogId: string;
  qty: number;
  basePriceSupplier: bigint;
  lineTotalPrincipal: bigint;
}

export interface ApiDelivery {
  id: string;
  agreementId: string;
  seq: number;
  volumeG: bigint;
  grade: string;
  moistureBps: number | null;
  receiptOnchainRef: string | null;
  deliveredAt: string;
  flag: FlagReason;
}

export interface ApiAgreementDetail extends ApiAgreement {
  inputs: ApiAgreementInput[];
  deliveries: ApiDelivery[];
}

export interface ApiDeliveryRow {
  id: string;
  agreementId: string;
  agreementOnchainId: bigint;
  farmerId: string;
  farmerName: string;
  commodityCode: string;
  seq: number;
  volumeG: bigint;
  grade: string;
  moistureBps: number | null;
  receiptOnchainRef: string | null;
  deliveredAt: string;
  flag: FlagReason;
  paid: boolean;
}

export interface ApiFarmerReputation {
  deliveries: number;
  onTime: number;
  totalSettledKg: number;
  flags: number;
  forceMajeureEvents: number;
  score: number;
}

export interface ApiFarmer {
  id: string;
  coopId: string;
  name: string;
  ktpHash: string;
  walletAddress: string;
  plotAreaHa: string;
  defaultCommodityCode: string;
  kecamatan: string;
  kabupaten: string;
  /** Farmer e-RDKK subsidized-fertilizer verification status (off-chain, KMP-set). */
  subsidyStatus: SubsidyStatus;
  createdAt: string;
  repTier: RepTier;
  reputation: ApiFarmerReputation;
}

export interface ApiSettlement {
  id: string;
  agreementId: string;
  onchainId: bigint;
  farmerId: string;
  farmerName: string;
  commodityCode: string;
  grade: string;
  moistureBps: number;
  gross: bigint;
  handlingCut: bigint;
  debtNetted: bigint;
  principalToSupplier: bigint;
  coopMargin: bigint;
  netPaid: bigint;
  settledVolG: bigint;
  rupiahRef: string | null;
  txHash: string | null;
  settledAt: string;
}

export interface ApiResidu {
  id: string;
  agreementOnchainId: bigint;
  agreementId: string;
  farmerName: string;
  commodityCode: string;
  principalAmount: bigint;
  status: ResiduStatus;
  bankRef: string | null;
  disputeReason: string | null;
  txHash: string | null;
  remittedAt: string | null;
  clearedAt: string | null;
}

export interface ApiCoop {
  id: string;
  supplierId: string;
  name: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  walletAddress: string;
  prefundedCashBalance: bigint;
  createdAt: string;
}

export interface ApiSupplier {
  id: string;
  name: string;
  walletAddress: string;
  createdAt: string;
}

export interface ApiOverview {
  coopOverview: {
    outstandingDebt: bigint;
    activeAgreements: number;
    settlementRatePct: number;
    residuOwed: bigint;
  };
  harvestThisWeek: { rows: ApiAgreement[]; totalKg: number; totalValue: bigint };
  cashNeededThisWeek: bigint;
  inboundSupply: ApiAgreement[];
  supplyRequestRows: {
    agreement: ApiAgreement & { inputs: ApiAgreementInput[] };
    farmerId: string;
    farmerName: string;
    status: string;
  }[];
}

// ─── Parsers (raw JSON string-money -> typed bigint) ────────────────────────

type Raw<T> = { [K in keyof T]: T[K] extends bigint ? string : T[K] };

function parseAgreement(r: Raw<ApiAgreement>): ApiAgreement {
  return {
    ...r,
    onchainId: big(r.onchainId),
    basePriceSupplier: big(r.basePriceSupplier),
    inputDebt: big(r.inputDebt),
    hppPerKg: big(r.hppPerKg),
    expectedVolG: big(r.expectedVolG),
    deliveredVolG: big(r.deliveredVolG),
    settledVolG: big(r.settledVolG),
    remainingDebt: big(r.remainingDebt),
    paidToFarmer: big(r.paidToFarmer),
    coopHandlingAccrued: big(r.coopHandlingAccrued),
    coopMarginAccrued: big(r.coopMarginAccrued),
    residuPrincipal: big(r.residuPrincipal),
  };
}

function parseInput(r: Raw<ApiAgreementInput>): ApiAgreementInput {
  return {
    ...r,
    qty: Number(r.qty),
    basePriceSupplier: big(r.basePriceSupplier),
    lineTotalPrincipal: big(r.lineTotalPrincipal),
  };
}

function parseDelivery(r: Raw<ApiDelivery>): ApiDelivery {
  return { ...r, volumeG: big(r.volumeG) };
}

function parseSettlement(r: Raw<ApiSettlement>): ApiSettlement {
  return {
    ...r,
    onchainId: big(r.onchainId),
    gross: big(r.gross),
    handlingCut: big(r.handlingCut),
    debtNetted: big(r.debtNetted),
    principalToSupplier: big(r.principalToSupplier),
    coopMargin: big(r.coopMargin),
    netPaid: big(r.netPaid),
    settledVolG: big(r.settledVolG),
  };
}

function parseResidu(r: Raw<ApiResidu>): ApiResidu {
  return {
    ...r,
    agreementOnchainId: big(r.agreementOnchainId),
    principalAmount: big(r.principalAmount),
  };
}

// ─── Fetchers ───────────────────────────────────────────────────────────────

export async function fetchAgreements(): Promise<ApiAgreement[]> {
  const { items } = await getJSON<{ items: Raw<ApiAgreement>[] }>("/agreements");
  return items.map(parseAgreement);
}

export async function fetchAgreement(id: string): Promise<ApiAgreementDetail> {
  const r = await getJSON<
    Raw<ApiAgreement> & { inputs: Raw<ApiAgreementInput>[]; deliveries: Raw<ApiDelivery>[] }
  >(`/agreements/${id}`);
  return {
    ...parseAgreement(r),
    inputs: r.inputs.map(parseInput),
    deliveries: r.deliveries.map(parseDelivery),
  };
}

export async function fetchDeliveries(): Promise<ApiDeliveryRow[]> {
  const { items } = await getJSON<{ items: (Raw<ApiDeliveryRow> & Record<string, unknown>)[] }>(
    "/deliveries",
  );
  return items.map((r) => ({
    ...(r as unknown as ApiDeliveryRow),
    agreementOnchainId: big(r.agreementOnchainId),
    volumeG: big(r.volumeG),
  }));
}

export async function fetchFarmers(): Promise<ApiFarmer[]> {
  const { items } = await getJSON<{ items: ApiFarmer[] }>("/farmers");
  return items;
}

/** Off-chain farmer registration (Screen B). PII (raw KTP, name) lives only in
 *  Postgres; the server computes ktp_hash. No wallet/chain needed — persists so
 *  the row survives a refresh (unlike the old demo-local register). */
export interface CreateFarmerInput {
  name: string;
  ktpRaw: string;
  walletAddress?: string;
  plotAreaHa: number;
  defaultCommodityCode: string;
  kecamatan: string;
  subsidyStatus: SubsidyStatus;
}
export async function createFarmer(input: CreateFarmerInput): Promise<ApiFarmer> {
  return postJSON<ApiFarmer>("/farmers", input);
}

export async function fetchSettlements(): Promise<ApiSettlement[]> {
  const { items } = await getJSON<{ items: Raw<ApiSettlement>[] }>("/settlements");
  return items.map(parseSettlement);
}

export async function fetchResidu(): Promise<ApiResidu[]> {
  const { items } = await getJSON<{ items: Raw<ApiResidu>[] }>("/residu");
  return items.map(parseResidu);
}

export async function fetchCoop(): Promise<{ coop: ApiCoop; supplier: ApiSupplier }> {
  const r = await getJSON<{ coop: Raw<ApiCoop>; supplier: ApiSupplier }>("/coop");
  return {
    coop: { ...r.coop, prefundedCashBalance: big(r.coop.prefundedCashBalance) },
    supplier: r.supplier,
  };
}

/** Off-chain edit of the coop profile identity fields (Screen Pengaturan). */
export interface UpdateCoopInput {
  name?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
}
export async function updateCoop(
  patch: UpdateCoopInput,
): Promise<{ coop: ApiCoop; supplier: ApiSupplier }> {
  const r = await patchJSON<{ coop: Raw<ApiCoop>; supplier: ApiSupplier }>("/coop", patch);
  return {
    coop: { ...r.coop, prefundedCashBalance: big(r.coop.prefundedCashBalance) },
    supplier: r.supplier,
  };
}

export async function fetchOverview(): Promise<ApiOverview> {
  const r = await getJSON<{
    coopOverview: { outstandingDebt: string; activeAgreements: number; settlementRatePct: number; residuOwed: string };
    harvestThisWeek: { rows: Raw<ApiAgreement>[]; totalKg: number; totalValue: string };
    cashNeededThisWeek: string;
    inboundSupply: Raw<ApiAgreement>[];
    supplyRequestRows: {
      agreement: Raw<ApiAgreement> & { inputs: Raw<ApiAgreementInput>[] };
      farmerId: string;
      farmerName: string;
      status: string;
    }[];
  }>("/overview");
  return {
    coopOverview: {
      outstandingDebt: big(r.coopOverview.outstandingDebt),
      activeAgreements: r.coopOverview.activeAgreements,
      settlementRatePct: r.coopOverview.settlementRatePct,
      residuOwed: big(r.coopOverview.residuOwed),
    },
    harvestThisWeek: {
      rows: r.harvestThisWeek.rows.map(parseAgreement),
      totalKg: r.harvestThisWeek.totalKg,
      totalValue: big(r.harvestThisWeek.totalValue),
    },
    cashNeededThisWeek: big(r.cashNeededThisWeek),
    inboundSupply: r.inboundSupply.map(parseAgreement),
    supplyRequestRows: r.supplyRequestRows.map((row) => ({
      ...row,
      agreement: { ...parseAgreement(row.agreement), inputs: row.agreement.inputs.map(parseInput) },
    })),
  };
}

export interface ApiCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  basePriceSupplier: bigint;
  source: string;
}

export interface ApiPriceRef {
  commodityCode: string;
  hpp: bigint;
  hppSource: string;
  asOf: string;
}

export async function fetchCatalog(): Promise<ApiCatalogItem[]> {
  const { items } = await getJSON<{ items: (Raw<ApiCatalogItem> & Record<string, unknown>)[] }>(
    "/reference/catalog",
  );
  return items.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category,
    basePriceSupplier: big(r.basePriceSupplier),
    source: r.source,
  }));
}

export interface ApiYieldRow {
  commodityCode: string;
  kabupaten: string;
  avgYieldTPerHa: number;
  source: string;
  year: number;
}

export async function fetchYield(): Promise<ApiYieldRow[]> {
  const { items } = await getJSON<{ items: (Record<string, unknown> & { year: number })[] }>(
    "/reference/yield",
  );
  return items.map((r) => ({
    commodityCode: String(r.commodityCode),
    kabupaten: String(r.kabupaten),
    avgYieldTPerHa: Number(r.avgYieldTPerHa),
    source: String(r.source),
    year: Number(r.year),
  }));
}

export async function fetchHpp(): Promise<ApiPriceRef[]> {
  const { items } = await getJSON<{ items: (Raw<ApiPriceRef> & Record<string, unknown>)[] }>(
    "/reference/hpp",
  );
  return items.map((r) => ({
    commodityCode: r.commodityCode,
    hpp: big(r.hpp),
    hppSource: r.hppSource,
    asOf: r.asOf,
  }));
}

// ─── Subsidy / e-RDKK distribution ──────────────────────────────────────────

export interface ApiSubsidyTierRow {
  tier: "Subsidized" | "Commercial";
  count: number;
  projectedValue: bigint;
}

export interface ApiFarmerSubsidyStatus {
  status: string;
  count: number;
}

export interface ApiHetCatalogItem {
  id: string;
  name: string;
  priceTier: string | null;
  hetPrice: string | null;
  erdkkGated: boolean | null;
}

export interface ApiSubsidyDistribution {
  byTier: ApiSubsidyTierRow[];
  subsidizedAgreementCount: number;
  commercialAgreementCount: number;
  byFarmerStatus: ApiFarmerSubsidyStatus[];
  hetCatalog: ApiHetCatalogItem[];
}

export async function fetchSubsidyDistribution(): Promise<ApiSubsidyDistribution> {
  const r = await getJSON<{
    byTier: { tier: string; count: number; projectedValue: string }[];
    subsidizedAgreementCount: number;
    commercialAgreementCount: number;
    byFarmerStatus: { status: string; count: number }[];
    hetCatalog: { id: string; name: string; priceTier: string | null; hetPrice: string | null; erdkkGated: boolean | null }[];
  }>("/subsidy/distribution");
  return {
    ...r,
    byTier: r.byTier.map((t) => ({
      tier: t.tier as "Subsidized" | "Commercial",
      count: t.count,
      projectedValue: big(t.projectedValue),
    })),
  };
}

/** Build an id -> farmer lookup (fills the kecamatan/wallet the agreement list omits). */
export function farmerMap(farmers: ApiFarmer[]): Map<string, ApiFarmer> {
  return new Map(farmers.map((f) => [f.id, f]));
}

// ─── Financier types ─────────────────────────────────────────────────────────

export type FundingStatus = "Requested" | "Approved" | "Rejected" | "Disbursed" | "Reconciled";
export type RiskBadge = "Rendah" | "Sedang" | "Tinggi";

export interface ApiFundingRequestRow {
  id: string;
  onchainId: string;
  coopId: string;
  coopName: string;
  financierId: string;
  financierName: string;
  backingHash: string;
  projectedSettlement: bigint;
  amountRequested: bigint;
  amountApproved: bigint;
  amountDisbursed: bigint;
  amountReconciled: bigint;
  coverageRatioBps: number;
  riskBadge: RiskBadge;
  status: FundingStatus;
  proofUrl: string | null;
  createdAt: string;
}

export interface ApiBackingLine {
  id: string;
  agreementId: string;
  agreementOnchainId: bigint;
  farmerName: string;
  commodityCode: string;
  status: string;
  backingValue: bigint;
}

// ─── Payable (Utang ke Supplier) ─────────────────────────────────────────────

export interface ApiPayableOverview {
  totals: {
    count: number;
    totalAccrued: bigint;
    totalSettled: bigint;
    totalOutstanding: bigint;
    byStatus: Record<string, number>;
  };
}

export async function fetchPayableOverview(): Promise<ApiPayableOverview> {
  const r = await getJSON<{
    totals: {
      count: number;
      totalAccrued: string;
      totalSettled: string;
      totalOutstanding: string;
      byStatus: Record<string, number>;
    };
  }>("/payable/overview");
  return {
    totals: {
      count: r.totals.count,
      totalAccrued: big(r.totals.totalAccrued),
      totalSettled: big(r.totals.totalSettled),
      totalOutstanding: big(r.totals.totalOutstanding),
      byStatus: r.totals.byStatus,
    },
  };
}

export interface ApiFinancierOverview {
  financier: {
    id: string;
    name: string;
    walletAddress: string;
    poolBalance: bigint;
    createdAt: string;
  };
  totals: {
    requestCount: number;
    pendingCount: number;
    totalRequested: bigint;
    totalDisbursed: bigint;
    totalReconciled: bigint;
    outstanding: bigint;
  };
}

type RawFundingRow = {
  [K in keyof ApiFundingRequestRow]: ApiFundingRequestRow[K] extends bigint ? string : ApiFundingRequestRow[K];
};

function parseFundingRow(r: RawFundingRow): ApiFundingRequestRow {
  return {
    ...r,
    projectedSettlement: big(r.projectedSettlement),
    amountRequested: big(r.amountRequested),
    amountApproved: big(r.amountApproved),
    amountDisbursed: big(r.amountDisbursed),
    amountReconciled: big(r.amountReconciled),
  };
}

function parseBackingLine(r: Record<string, unknown>): ApiBackingLine {
  return {
    id: String(r.id),
    agreementId: String(r.agreementId),
    agreementOnchainId: big(String(r.agreementOnchainId)),
    farmerName: String(r.farmerName),
    commodityCode: String(r.commodityCode),
    status: String(r.status),
    backingValue: big(String(r.backingValue)),
  };
}

export async function fetchFinancierOverview(): Promise<ApiFinancierOverview> {
  const r = await getJSON<{
    financier: {
      id: string;
      name: string;
      walletAddress: string;
      poolBalance: string;
      createdAt: string;
    };
    totals: {
      requestCount: number;
      pendingCount: number;
      totalRequested: string;
      totalDisbursed: string;
      totalReconciled: string;
      outstanding: string;
    };
  }>("/financier/overview");
  return {
    financier: {
      ...r.financier,
      poolBalance: big(r.financier.poolBalance),
    },
    totals: {
      requestCount: r.totals.requestCount,
      pendingCount: r.totals.pendingCount,
      totalRequested: big(r.totals.totalRequested),
      totalDisbursed: big(r.totals.totalDisbursed),
      totalReconciled: big(r.totals.totalReconciled),
      outstanding: big(r.totals.outstanding),
    },
  };
}

export async function fetchFinancierQueue(): Promise<ApiFundingRequestRow[]> {
  const { items } = await getJSON<{ items: RawFundingRow[] }>("/financier/queue");
  return items.map(parseFundingRow);
}

export async function fetchFinancierPortfolio(): Promise<ApiFundingRequestRow[]> {
  const { items } = await getJSON<{ items: RawFundingRow[] }>("/financier/portfolio");
  return items.map(parseFundingRow);
}

export async function fetchFinancierAll(): Promise<ApiFundingRequestRow[]> {
  const { items } = await getJSON<{ items: RawFundingRow[] }>("/financier");
  return items.map(parseFundingRow);
}

export async function fetchFinancierDetail(
  id: string,
): Promise<{ request: ApiFundingRequestRow; lines: ApiBackingLine[] }> {
  const r = await getJSON<{
    request: RawFundingRow;
    lines: Record<string, unknown>[];
  }>(`/financier/${id}`);
  return {
    request: parseFundingRow(r.request),
    lines: r.lines.map(parseBackingLine),
  };
}
