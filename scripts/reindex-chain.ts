/**
 * REINDEX (recovery tool): rebuild Postgres as a pure projection of the LIVE
 * deployed contract — WITHOUT driving any new transactions.
 *
 * When to use: the read-model has drifted from the chain (e.g. the synthetic
 * `seed.ts` was re-run after deploy — its fabricated on-chain ids collide with
 * the real ones and every write button starts failing NothingToSettle /
 * NotFound). `seed-chain.ts` fixes that too, but it needs the supplier +
 * financier secrets from the deployer's `stellar keys` store. This script only
 * needs PUBLIC addresses (read from the chain itself) + the deterministic
 * farmer keys, so any machine with DB access can run it.
 *
 * It reuses the SAME production pieces the indexer uses (decodeEvent +
 * applyEvent), the same base-row inserts as the seeds, and finishes by setting
 * the indexer cursor to the latest scanned ledger so a live indexer resumes
 * forward instead of re-scanning.
 *
 * Constraint: the contract's events must still be within the RPC's retention
 * window (~7 days on testnet). Past that, only a fresh `seed-chain.ts` run (on
 * the machine with the keys) can rebuild demo state.
 *
 * Run:  pnpm --filter @annona/scripts reindex:chain
 */
import { createHash } from "node:crypto";
import "dotenv/config";
import {
  Account,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";
import { sql } from "drizzle-orm";
import { getDb, schema } from "../apps/api/src/db/client.js";
import { applyEvent } from "../apps/api/src/indexer/handlers.js";
import { decodeEvent } from "../apps/api/src/indexer/poll.js";
import { MOCK_AGREEMENTS } from "../apps/web/lib/mock-data.js";
import { seedBaseRows, truncateAll } from "./lib/base-rows.js";

const db = getDb();

const RPC_URL = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const REGISTRY =
  process.env.OFFTAKE_REGISTRY_CONTRACT_ID ??
  "CC5NZIW5OYPYQYQOW2T6GAYDBLHBBZHG6BHYCQQH3FPM5OZEC7WJCQHQ";

const server = new rpc.Server(RPC_URL);
const contract = new Contract(REGISTRY);

/** Same derivation as seed-chain.ts — farmer wallets are deterministic. */
const farmerKp = (mockFarmerId: string): Keypair =>
  Keypair.fromRawEd25519Seed(createHash("sha256").update(`annona-farmer:${mockFarmerId}`).digest());

/** Read-only contract call via simulation (no signature, no fee). */
async function simRead(method: string, id: bigint): Promise<Record<string, unknown> | null> {
  const src = new Account("GBMZSJUV7BB24XPLX4ABUQTYK5SB6EZK5QUQ5JQELSB5AKZ76KXPVWDU", "0");
  const tx = new TransactionBuilder(src, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(contract.call(method, nativeToScVal(id, { type: "u64" })))
    .setTimeout(60)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim) || !sim.result) return null;
  return scValToNative(sim.result.retval) as Record<string, unknown>;
}

/** Replay every retained event through the PRODUCTION decoder+reducer.
 *
 *  getEvents scans a BOUNDED ledger chunk per call: a request starting far in
 *  the past can return zero events WITH a continuation cursor. So an empty
 *  page does not mean "done" — only an absent cursor does. (This is why the
 *  ledger-stepping loop in seed-chain.ts worked there — it starts at "now" —
 *  but returns 0 events when replaying from the retention floor.) */
async function project(fromLedger: number): Promise<{ total: number; lastLedger: number }> {
  const filters = [{ type: "contract" as const, contractIds: [REGISTRY] }];
  let total = 0;
  let lastLedger = fromLedger;
  let start = fromLedger;
  for (let page = 0; page < 10_000; page++) {
    const res = await server.getEvents({ startLedger: start, filters, limit: 200 });
    for (const [i, raw] of res.events.entries()) {
      const decoded = decodeEvent(raw, i);
      if (!decoded) continue;
      // biome-ignore lint/suspicious/noExplicitAny: DecodedEvent is the AnyEnvelope shape by construction.
      await applyEvent(db, decoded as any);
      total++;
    }
    const last = res.events[res.events.length - 1];
    if (last) lastLedger = last.ledger;

    // An empty page is NOT "done": the server scans a bounded ledger chunk per
    // call and hands back a continuation cursor. Its first half is a TOID whose
    // upper 32 bits are the last ledger scanned — resume from the ledger after
    // it (staying in plain startLedger mode, which every RPC accepts).
    let next: number;
    if (last) {
      next = last.ledger + 1;
    } else if (res.cursor) {
      next = Number(BigInt(res.cursor.split("-")[0] ?? "0") >> 32n) + 1;
    } else {
      break;
    }
    if (next > res.latestLedger) break;
    console.log(`[reindex]   scanned to ledger ${next - 1} (${total} events so far)`);
    start = next;
  }
  return { total, lastLedger };
}

/** Re-link Supabase Auth users to their dashboard roles (truncateAll wipes
 *  app_user; without this every login lands on "belum memiliki peran"). */
async function linkAppUsers(financierId: string | null): Promise<void> {
  const coopId =
    (await db.select({ id: schema.coop.id }).from(schema.coop).limit(1))[0]?.id ?? null;
  const supplierId =
    (await db.select({ id: schema.supplier.id }).from(schema.supplier).limit(1))[0]?.id ?? null;

  const accounts = [
    { email: "kmp@annona.id", role: "kmp", name: "Pengurus KMP Sukamaju", coop: coopId, agr: null as string | null, fin: null as string | null },
    { email: "pupukindonesia@annona.id", role: "supplier", name: "Operator Supplier", coop: null, agr: supplierId, fin: null },
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
}

async function main(): Promise<void> {
  console.log(`[reindex] registry ${REGISTRY} via ${RPC_URL}`);

  // Party addresses come from the chain itself — no secrets needed.
  const agr0 = await simRead("get_agreement", 0n);
  if (!agr0) throw new Error("reindex: get_agreement(0) failed — nothing deployed to project?");
  const coopWallet = agr0.coop as string;
  const supplierWallet = agr0.supplier as string;
  const funding0 = await simRead("get_funding", 0n);
  const financierWallet = (funding0?.financier as string | undefined) ?? null;

  console.log(`[reindex] coop ${coopWallet}`);
  console.log(`[reindex] supplier ${supplierWallet}`);
  console.log(`[reindex] financier ${financierWallet ?? "(no funding on chain)"}`);

  console.log("[reindex] truncating read-models...");
  await truncateAll(db, sql);

  console.log("[reindex] inserting off-chain base rows (real wallets)...");
  const { catalogIdMap } = await seedBaseRows(db, {
    supplierWallet,
    coopWallet,
    farmerWallet: (mockId) => farmerKp(mockId).publicKey(),
  });

  let financierId: string | null = null;
  if (financierWallet) {
    const rows = await db
      .insert(schema.financier)
      .values({
        name: "LPDB Koperasi",
        walletAddress: financierWallet,
        poolBalance: 500_000_000n * 10_000_000n,
      })
      .returning({ id: schema.financier.id });
    financierId = rows[0]?.id ?? null;
  }

  // Full retention window: earlier-than-deploy is harmless (contract filter),
  // and the eventLog guard in applyEvent makes re-application idempotent.
  const health = (await (
    await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
    })
  ).json()) as { result?: { oldestLedger?: number } };
  const oldest = health.result?.oldestLedger;
  if (!oldest) throw new Error("reindex: getHealth returned no oldestLedger");

  console.log(`[reindex] projecting events from ledger ${oldest}...`);
  const { total, lastLedger } = await project(oldest);
  console.log(`[reindex] projected ${total} events (last ledger ${lastLedger})`);
  if (total === 0) {
    throw new Error(
      "reindex: no events found in the retention window — the chain history has aged out; run seed-chain.ts on the deployer machine instead",
    );
  }

  // Off-chain-only detail no event carries: harvest date + the saprotan basket.
  // seed-chain drives MOCK_AGREEMENTS in order, so mock index i == on-chain id i.
  for (const [i, a] of MOCK_AGREEMENTS.entries()) {
    const rows = await db
      .select({ id: schema.agreement.id })
      .from(schema.agreement)
      .where(sql`${schema.agreement.onchainId} = ${BigInt(i)}`);
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

  console.log("[reindex] re-linking app_user roles...");
  await linkAppUsers(financierId);

  // Let a live indexer resume FORWARD from here instead of re-scanning.
  await db
    .insert(schema.indexerCursor)
    .values({ contractId: REGISTRY, lastLedger, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.indexerCursor.contractId,
      set: { lastLedger, updatedAt: new Date() },
    });

  console.log("[reindex] done. Postgres is now a projection of the live chain.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[reindex] failed:", err);
  process.exit(1);
});
