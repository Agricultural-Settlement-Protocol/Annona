/**
 * Auth gate for admin-key-signed write routes (currently: POST
 * /settlements/execute). The only auth in this repo is Supabase email +
 * password with role looked up from `app_user` (see apps/web/lib/supabase.ts)
 * — this middleware reuses that exact scheme server-side instead of
 * introducing a second one.
 *
 * Verification calls Supabase's own GoTrue endpoint (`/auth/v1/user`) with
 * the caller's bearer token, which is the same check `supabase-js`'s
 * `auth.getUser(token)` performs — done via a plain fetch so apps/api does
 * not need the full supabase-js client for one read. The role lookup then
 * goes through our existing Postgres connection (service-level, bypasses
 * RLS by design: this IS the service).
 *
 * settle() is a KMP (coop) action — the contract requires
 * `caller == agreement.coop || admin`, and the service key IS the coop's
 * key (see utils/stellar.ts) — so only role "kmp" may trigger it. Rate
 * limiting / finer-grained authz (e.g. per-coop scoping) is deferred.
 */
import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { getSupabaseAuthConfig } from "../config/env.js";
import { getDb, schema } from "../db/client.js";

async function verifySupabaseToken(token: string): Promise<{ id: string } | null> {
  const { url, anonKey } = getSupabaseAuthConfig();
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string };
  return user.id ? { id: user.id } : null;
}

export async function requireKmpAuth(c: Context, next: Next) {
  const header = c.req.header("Authorization") ?? c.req.header("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return c.json({ error: "Unauthorized: missing bearer token" }, 401);
  }

  let user: { id: string } | null;
  try {
    user = await verifySupabaseToken(token);
  } catch (err) {
    // Misconfigured server (missing SUPABASE_URL/SUPABASE_ANON_KEY) or GoTrue
    // unreachable — surface a real message instead of a bare 500 the UI can't act on.
    return c.json(
      { error: `Auth backend unavailable: ${err instanceof Error ? err.message : String(err)}` },
      500,
    );
  }
  if (!user) {
    return c.json({ error: "Unauthorized: invalid or expired session" }, 401);
  }

  const [profile] = await getDb()
    .select({ role: schema.appUser.role })
    .from(schema.appUser)
    .where(eq(schema.appUser.id, user.id))
    .limit(1);

  if (profile?.role !== "kmp") {
    return c.json({ error: "Forbidden: settlement execution is a KMP-only action" }, 403);
  }

  await next();
}
