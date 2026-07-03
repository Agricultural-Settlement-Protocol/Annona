# DB (Drizzle + Supabase/Postgres)

Off-chain store: farmer PII, plots, Agrinas saprotan catalog, yield tables,
HPP cache, agreement/delivery/settlement mirrors, residu remittances,
reputation caches, and the indexer event log. Schema mirrors
`docs/technical/ERD.md` (v3.0 multi-party model).

PII (KTP raw, names, GPS) lives ONLY here. On-chain holds the KTP hash for
integrity verification (CLAUDE.md golden rule 1). For any money/volume/status
value, **on-chain wins**; these rows are caches rebuildable from `event_log`.

## Files

| File | What |
|---|---|
| `schema.ts` | Drizzle schema, single source for the off-chain model |
| `client.ts` | `db` instance (postgres.js, transaction pooler, `prepare: false`) |
| `../../drizzle.config.ts` | drizzle-kit config (`out: ./drizzle`) |
| `../../drizzle/` | generated SQL (input for Supabase migrations) |
| `/supabase/migrations/` | THE migration history that gets applied (`db push`) |

## Workflow (schema change)

```bash
# 1. edit src/db/schema.ts
# 2. generate SQL from the diff
pnpm --filter @annona/api db:generate --name <change_name>
# 3. wrap it in a Supabase migration (repo root)
supabase migration new <change_name>
#    copy drizzle/<n>_<change_name>.sql in, strip `--> statement-breakpoint`,
#    add RLS `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for any NEW table
# 4. apply + verify
supabase db push
supabase db advisors --linked
supabase db query --linked "<sanity select>"
```

One migration history (Supabase's). Drizzle stays the typed schema + client;
its `drizzle/` output is an intermediate, never applied directly.

## Connections

- Runtime (`client.ts`): `DATABASE_URL` = **transaction pooler** (port 6543),
  needs `prepare: false` (already set).
- drizzle-kit / scripts: `DIRECT_URL` = **session pooler** (port 5432).
- Both URLs in `.env` (copy from `.env.example`, fill the DB password from
  the Supabase dashboard).

## Security

- RLS enabled on ALL tables with no policies = deny-all for `anon` /
  `authenticated`. The Hono API connects as the table owner (not subject to
  RLS); browsers never query this schema directly.
- If the Data API is ever used, add scoped policies first.

## Conventions

- Money `bigint` smallest unit (rupiah-cents), volume `bigint` grams,
  percentages integer bps. Never floats. Never `numeric` for money.
- Indexer idempotency: `event_log` unique `(tx_hash, event_index)`;
  `indexer_cursor` resumes polling from the last ledger.
- Enums (`agreement_status`, `flag_reason`, `residu_status`) mirror
  `@annona/core` / the Soroban contract 1:1. Change them together.

## Gotchas (learned)

- drizzle-kit cannot serialize `0n` literals in `.default()` — use
  `.default(sql\`0\`)` for bigint defaults.
- `supabase db query` defaults to `--local`; use `--linked` for the remote.
