import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config. Flow (see src/db/README.md):
 * 1. edit src/db/schema.ts
 * 2. `pnpm db:generate` -> SQL lands in ./drizzle
 * 3. copy into a Supabase migration (`supabase migration new`) + `supabase db push`
 *
 * dbCredentials uses DIRECT_URL (session pooler, port 5432) because DDL and
 * introspection need session mode; the app runtime uses DATABASE_URL
 * (transaction pooler, 6543) instead.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: fails fast at CLI start if unset
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
