# Indexer

Polls Soroban RPC `getEvents` for the offtake-registry contract, parses events
(see `@annona/core` event types), and writes read-models to Postgres.

- Idempotency: key every event by `(txHash, eventIndex)`.
- Read-models built: `mv_coop_exposure`, `mv_upcoming_harvest`, `mv_flag_queue`,
  `mv_coop_leaderboard`, `mv_commodity_dist`, `reputation_cache` (see ERD.md section 4).
- Rebuildable: replay from genesis if the DB is lost.

MVP status: not wired. Build after contract deploy.
