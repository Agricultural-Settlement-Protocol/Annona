/**
 * Typed builders for the six KMP-signed offtake-registry fns. Each returns an
 * `Invocation` (method + positional ScVal args) whose arg order EXACTLY matches
 * the Rust fn signature (minus `env`). Getting a ScVal type wrong here compiles
 * and lints clean but produces a wrong on-chain call, so lib/invocations.test.ts
 * round-trips every builder (scValToNative) as an offline guard.
 *
 * Contract signatures (contracts/offtake-registry/src/lib.rs):
 *   create_agreement(coop, farmer, agrinas, commodity, base_price_agrinas: i128,
 *     saprotan_markup_bps: u32, hpp_handling_fee_bps: u32, expected_vol_g: i128,
 *     hpp_per_kg: i128, tolerance_bps: u32, ktp_hash: BytesN<32>)
 *   accept_supply(coop, id: u64)
 *   record_delivery(coop, id: u64, volume_g: i128, grade: Symbol)
 *   settle(caller, id: u64)
 *   mark_force_majeure(coop, id: u64, reason: Symbol)
 *   mark_residu_remitted(coop, id: u64, ref_hash: BytesN<32>)
 */
import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";
import type { Invocation } from "./tx";

// ─── ScVal primitives (explicit types; never let nativeToScVal infer) ────────

const addr = (a: string): xdr.ScVal => Address.fromString(a).toScVal();
const i128 = (v: bigint): xdr.ScVal => nativeToScVal(v, { type: "i128" });
const u64 = (v: bigint): xdr.ScVal => nativeToScVal(v, { type: "u64" });
const u32 = (v: number): xdr.ScVal => nativeToScVal(v, { type: "u32" });
const sym = (s: string): xdr.ScVal => nativeToScVal(s, { type: "symbol" });

/** hex string (64 chars) -> ScBytes of exactly 32 bytes (Soroban BytesN<32>). */
function bytes32(hex: string): xdr.ScVal {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error(`bytes32 expects 32-byte hex (64 chars), got ${clean.length} chars`);
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  // js-xdr's scvBytes accepts a Uint8Array at runtime (see invocations.test.ts);
  // its .d.ts is narrowed to Buffer, so cast. Avoids depending on a global
  // Buffer polyfill in the browser.
  return xdr.ScVal.scvBytes(out as unknown as Buffer);
}

// ─── Commodity struct ────────────────────────────────────────────────────────

export interface CommodityArg {
  code: string; // Symbol, e.g. "GABAH"
  grade: string; // Symbol, e.g. "B" (estimate until first delivery)
  moistureBps: number; // u32
  hppVersion: number; // u32
}

/**
 * Build the Commodity #[contracttype] struct as an ScMap keyed by field-name
 * symbols. Soroban requires struct/map entries sorted by key, so we sort
 * explicitly. Built by hand (not nativeToScVal's struct `type` option, which
 * mangles the u32 fields — see lib/invocations.test.ts).
 */
function commodity(c: CommodityArg): xdr.ScVal {
  const fields: [string, xdr.ScVal][] = [
    ["code", sym(c.code)],
    ["grade", sym(c.grade)],
    ["moisture_bps", u32(c.moistureBps)],
    ["hpp_version", u32(c.hppVersion)],
  ];
  fields.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const entries = fields.map(
    ([k, v]) => new xdr.ScMapEntry({ key: sym(k), val: v }),
  );
  return xdr.ScVal.scvMap(entries);
}

// ─── Builders ────────────────────────────────────────────────────────────────

export interface CreateAgreementArgs {
  coop: string;
  farmer: string;
  agrinas: string;
  commodity: CommodityArg;
  basePriceAgrinas: bigint;
  saprotanMarkupBps: number;
  hppHandlingFeeBps: number;
  expectedVolG: bigint;
  hppPerKg: bigint;
  toleranceBps: number;
  ktpHashHex: string;
}

export function createAgreement(a: CreateAgreementArgs): Invocation {
  return {
    method: "create_agreement",
    args: [
      addr(a.coop),
      addr(a.farmer),
      addr(a.agrinas),
      commodity(a.commodity),
      i128(a.basePriceAgrinas),
      u32(a.saprotanMarkupBps),
      u32(a.hppHandlingFeeBps),
      i128(a.expectedVolG),
      i128(a.hppPerKg),
      u32(a.toleranceBps),
      bytes32(a.ktpHashHex),
    ],
  };
}

export function acceptSupply(coop: string, id: bigint): Invocation {
  return { method: "accept_supply", args: [addr(coop), u64(id)] };
}

export function recordDelivery(
  coop: string,
  id: bigint,
  volumeG: bigint,
  grade: string,
): Invocation {
  return { method: "record_delivery", args: [addr(coop), u64(id), i128(volumeG), sym(grade)] };
}

export function settle(caller: string, id: bigint): Invocation {
  return { method: "settle", args: [addr(caller), u64(id)] };
}

export function markForceMajeure(coop: string, id: bigint, reason: string): Invocation {
  return { method: "mark_force_majeure", args: [addr(coop), u64(id), sym(reason)] };
}

export function markResiduRemitted(coop: string, id: bigint, refHashHex: string): Invocation {
  return { method: "mark_residu_remitted", args: [addr(coop), u64(id), bytes32(refHashHex)] };
}
