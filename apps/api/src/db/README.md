# DB (Drizzle + Supabase/Postgres)

Off-chain store: farmer PII, plots, input catalog, yield tables, HPP cache,
read-models, reputation cache. Schema mirrors docs/technical/ERD.md.

PII (KTP raw, names, GPS) lives ONLY here. On-chain holds the KTP hash for
integrity verification (CLAUDE.md golden rule 1).

MVP status: schema + Drizzle client to add. Use `@annona/core` types as the contract.
