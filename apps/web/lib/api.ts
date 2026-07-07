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
import type { FlagReason, ResiduStatus, Status } from "@annona/core";
import type { RepTier } from "@annona/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`[api] ${path} -> ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
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
  grade: string;
  moistureBps: number;
  basePriceAgrinas: bigint;
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
  basePriceAgrinas: bigint;
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
  principalToAgrinas: bigint;
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
  agrinasId: string;
  name: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  walletAddress: string;
  prefundedCashBalance: bigint;
  createdAt: string;
}

export interface ApiAgrinas {
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
    agreement: ApiAgreement;
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
    basePriceAgrinas: big(r.basePriceAgrinas),
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
    basePriceAgrinas: big(r.basePriceAgrinas),
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
    principalToAgrinas: big(r.principalToAgrinas),
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

export async function fetchFarmers(): Promise<ApiFarmer[]> {
  const { items } = await getJSON<{ items: ApiFarmer[] }>("/farmers");
  return items;
}

export async function fetchSettlements(): Promise<ApiSettlement[]> {
  const { items } = await getJSON<{ items: Raw<ApiSettlement>[] }>("/settlements");
  return items.map(parseSettlement);
}

export async function fetchResidu(): Promise<ApiResidu[]> {
  const { items } = await getJSON<{ items: Raw<ApiResidu>[] }>("/residu");
  return items.map(parseResidu);
}

export async function fetchCoop(): Promise<{ coop: ApiCoop; agrinas: ApiAgrinas }> {
  const r = await getJSON<{ coop: Raw<ApiCoop>; agrinas: ApiAgrinas }>("/coop");
  return {
    coop: { ...r.coop, prefundedCashBalance: big(r.coop.prefundedCashBalance) },
    agrinas: r.agrinas,
  };
}

export async function fetchOverview(): Promise<ApiOverview> {
  const r = await getJSON<{
    coopOverview: { outstandingDebt: string; activeAgreements: number; settlementRatePct: number; residuOwed: string };
    harvestThisWeek: { rows: Raw<ApiAgreement>[]; totalKg: number; totalValue: string };
    cashNeededThisWeek: string;
    inboundSupply: Raw<ApiAgreement>[];
    supplyRequestRows: { agreement: Raw<ApiAgreement>; farmerId: string; farmerName: string; status: string }[];
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
      agreement: parseAgreement(row.agreement),
    })),
  };
}

export interface ApiCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  basePriceAgrinas: bigint;
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
    basePriceAgrinas: big(r.basePriceAgrinas),
    source: r.source,
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

/** Build an id -> farmer lookup (fills the kecamatan/wallet the agreement list omits). */
export function farmerMap(farmers: ApiFarmer[]): Map<string, ApiFarmer> {
  return new Map(farmers.map((f) => [f.id, f]));
}
