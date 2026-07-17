/**
 * Seamless (server-signed) write path — no Freighter anywhere.
 *
 *   GET  /tx/signer   -> which address will sign for MY role (or that the
 *                        role's server key is not configured yet)
 *   POST /tx/execute  -> { method, argsXdr: base64[] } signed with the
 *                        caller-role's service key and submitted
 *
 * Authorization model: the Supabase session proves WHO clicks; the app_user
 * role picks WHICH service key signs; METHOD_ROLE below is the whitelist of
 * what each role may invoke (mirrors the contract's own party binding — a
 * mismatch would fail on-chain anyway with Unauthorized, this just fails it
 * earlier with a clearer message). The contract itself then enforces
 * caller == the agreement/funding's stored party address.
 *
 * SUPPLIER_SERVICE_SECRET / FINANCIER_SERVICE_SECRET are OPTIONAL: without
 * them the kmp dashboard is fully seamless and supplier/financier writes
 * report "signer not configured" instead of silently failing. Fill the env,
 * restart, done — no code change.
 */
import { Keypair } from "@stellar/stellar-sdk";
import { Hono } from "hono";
import { getServiceSecretForRole } from "../config/env.js";
import { type AuthedEnv, requireAnyRole } from "../middleware/auth.js";
import {
  TxExecutionError,
  decodeScVal,
  executeContractCall,
} from "../services/tx-executor.js";

/** Contract method -> the app_user role whose key must sign it. */
const METHOD_ROLE: Record<string, "kmp" | "supplier" | "financier"> = {
  // KMP (coop-signed)
  create_agreement: "kmp",
  accept_supply: "kmp",
  record_delivery: "kmp",
  settle: "kmp",
  mark_force_majeure: "kmp",
  mark_residu_remitted: "kmp",
  request_funding: "kmp",
  reconcile_funding: "kmp",
  // Supplier-signed
  dispatch_supply: "supplier",
  confirm_remittance: "supplier",
  flag_remittance_dispute: "supplier",
  // Financier-signed
  approve_funding: "financier",
  reject_funding: "financier",
  disburse_funding: "financier",
};

const MAX_ARGS = 16;

export const txRoute = new Hono<AuthedEnv>()
  .get("/signer", requireAnyRole, (c) => {
    const role = c.get("role");
    const secret = getServiceSecretForRole(role);
    if (!secret) {
      return c.json({ role, configured: false, address: null });
    }
    return c.json({ role, configured: true, address: Keypair.fromSecret(secret).publicKey() });
  })
  .post("/execute", requireAnyRole, async (c) => {
    const role = c.get("role");
    const body = await c.req.json().catch(() => null);
    const method = body?.method;
    const argsXdr = body?.argsXdr;

    if (typeof method !== "string" || !Array.isArray(argsXdr)) {
      return c.json({ error: "method (string) and argsXdr (string[]) are required" }, 400);
    }
    if (argsXdr.length > MAX_ARGS || argsXdr.some((a: unknown) => typeof a !== "string")) {
      return c.json({ error: "argsXdr must be an array of base64 strings" }, 400);
    }

    const requiredRole = METHOD_ROLE[method];
    if (!requiredRole) {
      return c.json({ error: `Unknown or non-invocable method: ${method}` }, 400);
    }
    if (role !== requiredRole) {
      return c.json(
        { error: `Forbidden: ${method} is a ${requiredRole} action (your role: ${role})` },
        403,
      );
    }

    const secret = getServiceSecretForRole(role);
    if (!secret) {
      return c.json(
        {
          error: `Penandatangan server untuk peran ${role} belum dikonfigurasi. Isi ${
            role === "supplier" ? "SUPPLIER_SERVICE_SECRET" : "FINANCIER_SERVICE_SECRET"
          } di env API.`,
        },
        503,
      );
    }

    try {
      const args = (argsXdr as string[]).map((a, i) => decodeScVal(a, i));
      const result = await executeContractCall(method, args, secret);
      return c.json({ ok: true, hash: result.hash, ledger: result.ledger });
    } catch (err) {
      if (err instanceof TxExecutionError) {
        return c.json({ ok: false, error: err.message }, 502);
      }
      return c.json(
        { ok: false, error: err instanceof Error ? err.message : "Transaction failed" },
        500,
      );
    }
  });
