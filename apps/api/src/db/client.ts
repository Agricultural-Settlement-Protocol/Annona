/**
 * Drizzle client over postgres.js -> Supabase.
 *
 * Connection rules (Supabase + postgres.js):
 * - Runtime uses the TRANSACTION pooler (port 6543): scales, but does not
 *   support prepared statements -> `prepare: false` is REQUIRED.
 * - Migrations / one-off scripts use the SESSION pooler (port 5432) via
 *   DIRECT_URL instead (see drizzle.config.ts).
 * - Keep the pool small: the API is a single long-lived Node process, not
 *   serverless. Postgres connections cost 1-3MB each.
 *
 * Lazy singleton: the connection is only created on first use, so routes
 * that never touch the DB (and `pnpm dev` without a .env) keep working.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let instance: Db | undefined;

export function getDb(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Copy apps/api/.env.example to .env and fill it in.",
      );
    }
    const client = postgres(url, {
      prepare: false, // transaction-mode pooler does not support prepared statements
      max: 10,
    });
    instance = drizzle(client, { schema });
  }
  return instance;
}

export { schema };
