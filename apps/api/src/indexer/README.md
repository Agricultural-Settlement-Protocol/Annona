# Indexer

Polls Soroban RPC `getEvents` for the offtake-registry contract, decodes each
event (`poll.ts` → the shared `@annona/core` `EventEnvelope`), and folds it into
the Postgres read-models via `applyEvent` (`handlers.ts`). This is the bridge
**chain → DB → dashboards**: the UI reads Postgres, never the chain directly.

- **Idempotent:** every event keyed by `(txHash, eventIndex)` in `event_log`, so
  re-running never double-counts.
- **Cursor:** a per-contract resume point in `indexer_cursor` — restarts continue
  instead of replaying genesis.
- **Robust:** an event that can't resolve (e.g. references a wallet the DB
  doesn't know) is skipped with a warning, never crashes the loop.

## Run

```bash
# Loop (local dev + demo + always-on worker): polls every INDEXER_POLL_MS (5s)
pnpm --filter @annona/api indexer

# One-shot (serverless / cron): one poll cycle, then exit
pnpm --filter @annona/api indexer:once
```

Env (from `apps/api/.env`): `DATABASE_URL`, `OFFTAKE_REGISTRY_CONTRACT_ID`
(else read from `scripts/artifacts.testnet.json`), `SOROBAN_RPC_URL`.
`INDEXER_BACKFILL_LEDGERS` (default 10) sets how far back the FIRST run scans;
subsequent runs resume from the cursor.

## Deployment options (no always-on backend required)

1. **Local loop (demo):** `pnpm --filter @annona/api indexer` in a terminal —
   real-time; a chain write shows in the dashboard within seconds.
2. **Serverless cron:** `.github/workflows/indexer.yml` runs `indexer:once` every
   ~5 min (GitHub's minimum). No server to host. ~5 min freshness.
3. **Always-on worker:** deploy `apps/api` to Railway/Render and run
   `pnpm indexer`. Real-time, ~$5/mo.

## Seeding note (important)

The indexer resolves parties by **wallet address**, so the DB must be seeded by
`pnpm --filter @annona/scripts seed:chain` (drives the REAL contract with the
real wallets) — NOT the synthetic `seed` (placeholder wallets), which the
indexer's live events won't match. The two seeds are mutually exclusive.
