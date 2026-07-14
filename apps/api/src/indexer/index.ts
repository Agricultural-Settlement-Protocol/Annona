/**
 * Event indexer entrypoint. Polls Soroban RPC for the offtake-registry's
 * events, folds each through the shared applyEvent reducer (handlers.ts) into
 * the Postgres read-models, and advances a per-contract cursor so restarts
 * resume instead of replaying genesis. Idempotent: re-running never
 * double-counts (the eventLog guard in applyEvent).
 *
 * Config comes from scripts/artifacts.testnet.json (written by deploy.sh) and
 * SOROBAN_RPC_URL. Run standalone: `pnpm --filter @annona/api tsx src/indexer`.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { rpc } from "@stellar/stellar-sdk";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/client.js";
import { applyEvent } from "./handlers.js";
import { pollEvents } from "./poll.js";

interface Artifacts {
  network: string;
  registryId: string;
}

const POLL_INTERVAL_MS = Number(process.env.INDEXER_POLL_MS ?? 5000);

function loadArtifacts(): Artifacts {
  const path = fileURLToPath(
    new URL("../../../../scripts/artifacts.testnet.json", import.meta.url),
  );
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Artifacts;
  } catch {
    throw new Error(
      `indexer: ${path} not found. Deploy first (scripts/deploy.sh) so the registry id is available.`,
    );
  }
}

/** Read the resume ledger for a contract (0 = never indexed → start of RPC retention). */
async function getCursor(contractId: string): Promise<number> {
  const rows = await getDb()
    .select({ lastLedger: schema.indexerCursor.lastLedger })
    .from(schema.indexerCursor)
    .where(eq(schema.indexerCursor.contractId, contractId));
  return rows[0]?.lastLedger ?? 0;
}

async function setCursor(contractId: string, lastLedger: number): Promise<void> {
  await getDb()
    .insert(schema.indexerCursor)
    .values({ contractId, lastLedger, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.indexerCursor.contractId,
      set: { lastLedger, updatedAt: new Date() },
    });
}

/** How many ledgers back the FIRST run (empty cursor) scans. History is already
 *  projected by seed-chain, and testnet RPC only retains ~17k ledgers, so the
 *  default starts effectively at "now" and catches new writes forward. Set
 *  INDEXER_BACKFILL_LEDGERS higher (≤ ~17000) to backfill on a fresh DB. */
const BACKFILL_LEDGERS = Number(process.env.INDEXER_BACKFILL_LEDGERS ?? 10);

/** One poll → fold → advance-cursor cycle. Exported for tests / one-shot runs. */
export async function runOnce(server: rpc.Server, registryId: string): Promise<number> {
  const db = getDb();
  const cursor = await getCursor(registryId);
  const startLedger =
    cursor > 0
      ? cursor + 1
      : (await server.getLatestLedger()).sequence - Math.max(0, BACKFILL_LEDGERS);
  const page = await pollEvents(server, registryId, Math.max(startLedger, 1));

  let maxLedger = cursor;
  for (const event of page.events) {
    try {
      // DecodedEvent is structurally the typed EventEnvelope applyEvent expects.
      await applyEvent(db, event as unknown as Parameters<typeof applyEvent>[1]);
    } catch (err) {
      // A single bad/unresolvable event must not crash the whole loop. The most
      // common cause is a wallet the read-model doesn't know — i.e. the DB was
      // seeded by the SYNTHETIC seed.ts (placeholder wallets) instead of
      // seed-chain.ts (the real on-chain wallets these events reference). Log
      // once and keep going so the cursor still advances.
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[indexer] skipped ${event.type} @ ${event.txHash.slice(0, 8)}: ${msg} (is the DB seeded via \`pnpm seed:chain\`?)`,
      );
    }
    if (event.ledger > maxLedger) maxLedger = event.ledger;
  }
  // Advance to the RPC's latest processed ledger even when no events landed, so
  // the window keeps moving and we never re-scan an empty range.
  const advanceTo = Math.max(maxLedger, page.latestLedger);
  if (advanceTo > cursor) await setCursor(registryId, advanceTo);
  return page.events.length;
}

/** Resolve the registry id from env (preferred) or the deploy artifacts file. */
function resolveRegistryId(): string {
  return process.env.OFFTAKE_REGISTRY_CONTRACT_ID?.trim() || loadArtifacts().registryId;
}

async function main(): Promise<void> {
  const registryId = resolveRegistryId();
  const rpcUrl = process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
  const server = new rpc.Server(rpcUrl);

  // ── One-shot mode (`--once`): poll a single cycle and EXIT. This is the
  //    serverless / cron path — a scheduled job (GitHub Actions, Vercel Cron,
  //    Supabase pg_cron) invokes this every ~1 min, no always-on server needed. ──
  const once = process.argv.includes("--once");
  if (once) {
    console.log(`[indexer] one-shot poll of ${registryId} on ${rpcUrl}`);
    const n = await runOnce(server, registryId);
    console.log(`[indexer] folded ${n} event(s); exiting (--once)`);
    return;
  }

  // ── Loop mode (default): long-running. For local dev + the demo, and for a
  //    Railway/Render always-on worker later. ──
  console.log(`[indexer] polling ${registryId} on ${rpcUrl} every ${POLL_INTERVAL_MS}ms`);
  for (;;) {
    try {
      const n = await runOnce(server, registryId);
      if (n > 0) console.log(`[indexer] folded ${n} event(s)`);
    } catch (err) {
      console.error("[indexer] poll failed:", err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// Run only when invoked directly (not when imported by the API or tests).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[indexer] fatal:", err);
    process.exit(1);
  });
}
