/**
 * CHAIN SEED (BUILD-PLAN Phase 8) — the demo data is created by driving the REAL
 * deployed contract, then the indexer projects it into Postgres.
 *
 * Contrast with `seed.ts`, which SYNTHESIZES events in TypeScript and folds them
 * through `applyEvent`. That was the right pre-deploy stand-in, but it produces
 * agreements whose on-chain ids DO NOT EXIST on the contract — so once the web app
 * is wired live, every write button on a seeded agreement fails `NotFound`, and the
 * indexer (which upserts by `onchainId`) collides with the synthetic rows. The two
 * are mutually exclusive. This script is the live-mode replacement.
 *
 * It deliberately reuses the SAME pieces production uses, so seeding is also a
 * end-to-end test of them:
 *   - `apps/web/lib/invocations.ts` — the exact ScVal builders the UI signs with
 *   - `apps/api/src/indexer/{poll,handlers}.ts` — the exact decoder + reducer
 * Only the OFF-CHAIN rows (farmer PII, catalog, input baskets, funding backing
 * lines) are inserted directly; nothing that an event carries is ever hand-written.
 *
 * Run:  STELLAR_RPC_URL=... pnpm --filter @annona/scripts seed:chain
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import "dotenv/config";
import {
  Account,
  Asset,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  Operation,
  type Transaction,
  TransactionBuilder,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";
import { sql } from "drizzle-orm";
import { getDb, schema } from "../apps/api/src/db/client.js";
import { applyEvent } from "../apps/api/src/indexer/handlers.js";
import { decodeEvent } from "../apps/api/src/indexer/poll.js";
import { kgToGrams } from "@annona/core";
import {
  MOCK_AGREEMENTS,
  MOCK_DELIVERIES,
  MOCK_FARMERS,
  MOCK_RESIDU_LEDGER,
  MOCK_SETTLEMENTS,
} from "../apps/web/lib/mock-data.js";
import {
  acceptSupply,
  approveFunding,
  confirmRemittance,
  createAgreement,
  disburseFunding,
  dispatchSupply,
  flagRemittanceDispute,
  markForceMajeure,
  markResiduRemitted,
  reconcileFunding,
  recordDelivery,
  rejectFunding,
  requestFunding,
  settle,
} from "../apps/web/lib/invocations.js";
import { seedBaseRows, truncateAll } from "./lib/base-rows.js";

const db = getDb();

const RPC_URL = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const REGISTRY = process.env.OFFTAKE_REGISTRY_CONTRACT_ID;
if (!REGISTRY) throw new Error("seed-chain: OFFTAKE_REGISTRY_CONTRACT_ID is not set");

const server = new rpc.Server(RPC_URL);
const contract = new Contract(REGISTRY);
const R = (whole: number): bigint => BigInt(whole) * 10_000_000n; // rupiah -> 7dp

/** Secret for a `stellar keys` identity. The demo keys live in the CLI's keystore. */
function secretOf(name: string): Keypair {
  const s = execFileSync("stellar", ["keys", "show", name], { encoding: "utf8" }).trim();
  return Keypair.fromSecret(s);
}

const ADMIN = secretOf("annona-admin");
const COOP = secretOf("annona-coop");
// Legacy key name: this identity is the v4.0 SUPPLIER (input principal). "Agrinas"
// is now the non-signing warehouse operator. See fund-testnet.sh.
const SUPPLIER = secretOf("annona-agrinas");
const FINANCIER = secretOf("annona-financier");

/** Deterministic per-farmer keypair — re-running the seed reuses the same accounts
 *  (so Friendbot + trustline setup is idempotent and addresses stay stable). */
const farmerKp = (mockFarmerId: string): Keypair =>
  Keypair.fromRawEd25519Seed(createHash("sha256").update(`annona-farmer:${mockFarmerId}`).digest());

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry a public-RPC call on TRANSIENT failures only.
 *
 *  The seed fires ~80 sequential transactions at a free public node, which
 *  intermittently answers 503/429 or drops the connection. Those are worth
 *  retrying with backoff. A 404 (account not found) or a contract error is NOT —
 *  `ensureFarmerAccount` relies on getAccount THROWING for a missing account, so a
 *  blanket retry would both mask real errors and stall for a minute on every new
 *  farmer. Retry only on signals we can positively identify as transient. */
function isTransient(err: unknown): boolean {
  const e = err as {
    isAxiosError?: boolean;
    response?: { status?: number };
    status?: number;
  };
  // An AxiosError with NO response never reached the server: DNS/TCP/TLS/abort.
  // The underlying code (ETIMEDOUT etc.) is buried arbitrarily deep in the cause
  // chain and is often not surfaced at all, so keying on `err.code` misses it —
  // which is exactly how the first version of this retry let a network blip through.
  if (e?.isAxiosError && e.response === undefined) return true;
  const status = e?.response?.status ?? e?.status;
  if (status !== undefined && (status >= 500 || status === 429)) return true;
  // Walk the cause chain for a recognisable network errno.
  const NET = new Set([
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "EAI_AGAIN",
    "ENOTFOUND",
    "EPIPE",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_SOCKET",
  ]);
  for (let cur: unknown = err, depth = 0; cur && depth < 8; depth++) {
    const c = (cur as { code?: string }).code;
    if (c && NET.has(c)) return true;
    if (cur instanceof AggregateError && cur.errors.some((x) => NET.has((x as { code?: string })?.code ?? "")))
      return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}

/** Retry a public-RPC call on TRANSIENT failures only. A 404 (account not found)
 *  or a contract error must NOT be retried: `ensureFarmerAccount` relies on
 *  getAccount THROWING for a missing account, and a blanket retry would both mask
 *  real errors and stall a minute on every new farmer. */
async function rpcRetry<T>(label: string, fn: () => Promise<T>, tries = 7): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isTransient(err)) throw err; // real error — surface it
      const wait = Math.min(1000 * 2 ** i, 15_000);
      console.warn(`  [retry] ${label} (${i + 1}/${tries}) after ${wait}ms`);
      await sleep(wait);
    }
  }
  throw new Error(`${label}: gave up after ${tries} attempts: ${String(last)}`);
}

/* ─────────────────────────── chain plumbing ─────────────────────────── */

/** Submit one contract invocation, signed by `signer`, and wait for the result. */
async function invoke(
  signer: Keypair,
  inv: { method: string; args: ReturnType<typeof createAgreement>["args"] },
): Promise<unknown> {
  const account = await rpcRetry("getAccount", () => server.getAccount(signer.publicKey()));
  const built = new TransactionBuilder(account, {
    fee: "2000000", // generous: Soroban resource fees dwarf BASE_FEE
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(inv.method, ...inv.args))
    .setTimeout(60)
    .build();

  // prepareTransaction simulates + attaches the SorobanData/auth footprint. For
  // disburse_funding this is what captures the financier's nested token.transfer
  // authorization (the sub-invocation), which a naive build would omit.
  const prepared = await rpcRetry("prepareTransaction", () => server.prepareTransaction(built));
  prepared.sign(signer);

  const sent = await rpcRetry("sendTransaction", () => server.sendTransaction(prepared));
  if (sent.status === "ERROR") {
    throw new Error(`${inv.method}: submit failed: ${JSON.stringify(sent.errorResult)}`);
  }
  for (let i = 0; i < 40; i++) {
    const got = await rpcRetry("getTransaction", () => server.getTransaction(sent.hash));
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return got.returnValue ? scValToNative(got.returnValue) : undefined;
    }
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`${inv.method} FAILED: ${JSON.stringify(got.resultXdr)}`);
    }
    await sleep(1000);
  }
  throw new Error(`${inv.method}: timed out waiting for ${sent.hash}`);
}

/** Submit a signed classic tx and wait. Returns false if it failed (which we treat
 *  as "already in the desired state" for the idempotent setup ops below). */
async function submitClassic(tx: Transaction): Promise<boolean> {
  const sent = await rpcRetry("sendTransaction", () => server.sendTransaction(tx));
  if (sent.status === "ERROR") return false;
  for (let i = 0; i < 30; i++) {
    const got = await rpcRetry("getTransaction", () => server.getTransaction(sent.hash));
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) return true;
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) return false;
    await sleep(1000);
  }
  return false;
}

/** Create + dIDR-trustline a farmer account. Idempotent.
 *
 *  Funded from ADMIN via createAccount rather than Friendbot: this host is IPv4-only
 *  and Node's happy-eyeballs against Friendbot times out, but more importantly the
 *  seed shouldn't depend on an external faucet's rate limits to be reproducible. */
async function ensureFarmerAccount(kp: Keypair): Promise<void> {
  const addr = kp.publicKey();
  const didr = new Asset("dIDR", ADMIN.publicKey());

  let account: Account | null = null;
  try {
    account = await server.getAccount(addr);
  } catch {
    const adminAcct = await rpcRetry("getAccount(admin)", () => server.getAccount(ADMIN.publicKey()));
    const create = new TransactionBuilder(adminAcct, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.createAccount({ destination: addr, startingBalance: "5" }))
      .setTimeout(60)
      .build();
    create.sign(ADMIN);
    if (!(await submitClassic(create))) throw new Error(`could not create account ${addr}`);
    account = await rpcRetry("getAccount(farmer)", () => server.getAccount(addr));
  }

  // Trustline is NOT optional: settle() transfers dIDR (a SAC over a CLASSIC asset)
  // to the farmer, and a classic account cannot receive it without one.
  const trust = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: didr }))
    .setTimeout(60)
    .build();
  trust.sign(kp);
  await submitClassic(trust); // a failure here means the trustline already exists
}

const ktpHash = (farmerId: string) =>
  createHash("sha256").update(`ktp:${farmerId}`).digest("hex");
const backingHash = (label: string) =>
  createHash("sha256").update(`backing:${label}`).digest("hex");

/* ─────────────────────────── the seed ─────────────────────────── */

async function driveAgreement(a: (typeof MOCK_AGREEMENTS)[number]): Promise<bigint> {
  const kp = farmerKp(a.farmerId);

  const id = (await invoke(
    COOP,
    createAgreement({
      coop: COOP.publicKey(),
      farmer: kp.publicKey(),
      supplier: SUPPLIER.publicKey(),
      commodity: {
        code: a.commodityCode,
        grade: a.grade,
        moistureBps: a.moistureBps,
        hppVersion: a.hppVersion,
      },
      // Demo spread: every 3rd agreement priced at HET (subsidized).
      subsidyTier: Number(a.onchainId) % 3 === 0 ? "Subsidized" : "Commercial",
      basePriceSupplier: a.basePriceSupplier,
      saprotanMarkupBps: a.saprotanMarkupBps,
      hppHandlingFeeBps: a.hppHandlingFeeBps,
      expectedVolG: kgToGrams(a.expectedVolKg),
      hppPerKg: a.hppPerKg,
      toleranceBps: a.toleranceBps,
      ktpHashHex: ktpHash(a.farmerId),
    }),
  )) as bigint;

  const at = (...s: string[]) => s.includes(a.status);
  const beyondCreated = !at("Created");
  const beyondDispatched = !at("Created", "SupplyDispatched");

  if (beyondCreated) await invoke(SUPPLIER, dispatchSupply(SUPPLIER.publicKey(), id));
  if (beyondDispatched) await invoke(COOP, acceptSupply(COOP.publicKey(), id));

  // Deliveries, then settle. Interleaving delivery→settle reproduces the STAGED
  // settlement demo: settle() drains whatever is delivered-but-unsettled, so one
  // settle per delivery yields one settlement row per delivery.
  const deliveries = MOCK_DELIVERIES.filter((d) => d.agreementId === a.id).sort(
    (x, y) => x.seq - y.seq,
  );
  const willSettle = MOCK_SETTLEMENTS.some((s) => s.agreementId === a.id);
  for (const d of deliveries) {
    await invoke(COOP, recordDelivery(COOP.publicKey(), id, kgToGrams(d.volumeKg), d.grade));
    if (willSettle) await invoke(COOP, settle(COOP.publicKey(), id));
  }

  if (a.status === "ForceMajeure")
    await invoke(COOP, markForceMajeure(COOP.publicKey(), id, "FORCE_MAJEURE"));

  // Residu: the coop anchors the rupiah remittance, the SUPPLIER confirms/disputes.
  const residu = MOCK_RESIDU_LEDGER.find((r) => r.agreementId === a.id);
  if (residu && residu.status !== "Pending") {
    await invoke(COOP, markResiduRemitted(COOP.publicKey(), id, backingHash(`residu:${id}`)));
    if (residu.status === "Cleared")
      await invoke(SUPPLIER, confirmRemittance(SUPPLIER.publicKey(), id));
    if (residu.status === "Disputed")
      await invoke(SUPPLIER, flagRemittanceDispute(SUPPLIER.publicKey(), id, "MISMATCH"));
  }
  return id;
}

/** The offtake-financing lifecycle, on-chain. disburse_funding moves REAL dIDR
 *  from the financier to the coop — the demo's second visible money movement. */
async function driveFunding(): Promise<void> {
  // (target status, requested, approved, projected)
  const plan: [string, number, number, number][] = [
    ["Requested", 30_000_000, 0, 52_000_000],
    ["Approved", 40_000_000, 35_000_000, 61_000_000],
    ["Disbursed", 25_000_000, 25_000_000, 44_000_000],
    ["Reconciled", 20_000_000, 20_000_000, 41_000_000],
    ["Rejected", 55_000_000, 0, 58_000_000], // 94% coverage -> Tinggi -> declined
  ];

  for (const [target, req, appr, proj] of plan) {
    const id = (await invoke(
      COOP,
      requestFunding({
        coop: COOP.publicKey(),
        financier: FINANCIER.publicKey(),
        backingHash: backingHash(`funding:${target}:${req}`),
        projectedSettlement: R(proj),
        amountRequested: R(req),
      }),
    )) as bigint;

    // "Requested" means AWAITING the financier — it must stay pending, with no
    // approve call at all. Approving it with amount 0 is what the contract (rightly)
    // rejects as InvalidAmount: a zero approval is not a state, it is a bad input.
    if (target === "Requested") continue;

    if (target === "Rejected") {
      await invoke(FINANCIER, rejectFunding(FINANCIER.publicKey(), id, "COVERAGE_TOO_HIGH"));
      continue;
    }
    await invoke(FINANCIER, approveFunding(FINANCIER.publicKey(), id, R(appr)));
    if (target === "Disbursed" || target === "Reconciled")
      await invoke(FINANCIER, disburseFunding(FINANCIER.publicKey(), id));
    if (target === "Reconciled")
      await invoke(COOP, reconcileFunding(COOP.publicKey(), id, R(appr)));
  }
}

/** Replay every event the contract emitted, through the PRODUCTION decoder+reducer. */
async function project(fromLedger: number): Promise<number> {
  let start = fromLedger;
  let total = 0;
  for (;;) {
    const res = await rpcRetry("getEvents", () => server.getEvents({
      startLedger: start,
      filters: [{ type: "contract", contractIds: [REGISTRY as string] }],
      limit: 200,
    }));
    if (res.events.length === 0) break;
    for (const [i, raw] of res.events.entries()) {
      const decoded = decodeEvent(raw, i);
      if (!decoded) continue;
      // biome-ignore lint/suspicious/noExplicitAny: DecodedEvent is the AnyEnvelope shape by construction.
      await applyEvent(db, decoded as any);
      total++;
    }
    const last = res.events[res.events.length - 1];
    if (!last) break;
    if (last.ledger >= res.latestLedger) break;
    start = last.ledger + 1;
  }
  return total;
}

async function main(): Promise<void> {
  console.log(`[chain-seed] registry ${REGISTRY} via ${RPC_URL}`);
  const startLedger = (await rpcRetry("getLatestLedger", () => server.getLatestLedger())).sequence;

  console.log(`[chain-seed] preparing ${MOCK_FARMERS.length} farmer accounts (fund + trustline)...`);
  for (const f of MOCK_FARMERS) await ensureFarmerAccount(farmerKp(f.id));

  console.log("[chain-seed] truncating read-models...");
  await truncateAll(db, sql);

  console.log("[chain-seed] inserting off-chain base rows (real wallets)...");
  const { catalogIdMap } = await seedBaseRows(db, {
    supplierWallet: SUPPLIER.publicKey(),
    coopWallet: COOP.publicKey(),
    farmerWallet: (mockId) => farmerKp(mockId).publicKey(),
  });

  // The financier row must carry the REAL wallet: the reducer resolves funding
  // events by address (financierIdByAddr), so a placeholder strkey would orphan
  // every FundingRequested the chain emits.
  await db.insert(schema.financier).values({
    name: "LPDB Koperasi",
    walletAddress: FINANCIER.publicKey(),
    poolBalance: R(500_000_000),
  });

  console.log(`[chain-seed] driving ${MOCK_AGREEMENTS.length} agreements on-chain...`);
  const idByMock = new Map<string, bigint>();
  for (const a of MOCK_AGREEMENTS) {
    const id = await driveAgreement(a);
    idByMock.set(a.id, id);
    console.log(`  ${a.id} -> on-chain id ${id} (${a.status})`);
  }

  console.log("[chain-seed] driving the offtake-financing lifecycle on-chain...");
  await driveFunding();

  console.log("[chain-seed] projecting chain events through the production indexer...");
  const n = await project(startLedger);
  console.log(`[chain-seed] projected ${n} events`);

  // Off-chain-only detail no event carries: harvest date + the saprotan basket.
  for (const a of MOCK_AGREEMENTS) {
    const oid = idByMock.get(a.id);
    if (oid === undefined) continue;
    const rows = await db
      .select({ id: schema.agreement.id })
      .from(schema.agreement)
      .where(sql`${schema.agreement.onchainId} = ${oid}`);
    const uuid = rows[0]?.id;
    if (!uuid) continue;
    await db
      .update(schema.agreement)
      .set({ expectedHarvestDate: a.expectedHarvestDate })
      .where(sql`${schema.agreement.id} = ${uuid}`);
    if (a.inputs.length > 0) {
      await db.insert(schema.agreementInput).values(
        a.inputs.map((inp) => ({
          agreementId: uuid,
          catalogId: catalogIdMap.get(inp.catalogId) as string,
          qty: String(inp.qty),
          basePriceSupplier: inp.basePriceSupplier,
          lineTotalPrincipal: inp.basePriceSupplier * BigInt(inp.qty),
        })),
      );
    }
  }

  console.log("[chain-seed] done. Postgres is now a projection of the live chain.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[chain-seed] failed:", err);
  process.exit(1);
});
