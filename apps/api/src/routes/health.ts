import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db/client.js";

/** Liveness + DB reachability. `db: "skipped"` when DATABASE_URL is unset
 *  (local dev without .env) so the service still reports ok. */
export const healthRoute = new Hono().get("/", async (c) => {
  const base = { status: "ok" as string, service: "annona-api", time: new Date().toISOString() };

  if (!process.env.DATABASE_URL) {
    return c.json({ ...base, db: "skipped" });
  }
  try {
    await getDb().execute(sql`select 1`);
    return c.json({ ...base, db: "ok" });
  } catch (err) {
    return c.json(
      { ...base, status: "degraded", db: "error", detail: (err as Error).message },
      503,
    );
  }
});
