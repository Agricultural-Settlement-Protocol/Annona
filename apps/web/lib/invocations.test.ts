/**
 * Offline ScVal round-trip guard for the KMP invocation builders. No chain
 * needed: each builder's ScVal args are decoded with scValToNative and checked
 * against the inputs, catching the class of bug (wrong ScVal type / arg order /
 * struct field name) that typecheck + lint cannot. Run: from apps/web,
 *   ../../scripts/node_modules/.bin/tsx --test lib/invocations.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  Account,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  StrKey,
  TransactionBuilder,
  scValToNative,
} from "@stellar/stellar-sdk";
import type { Transaction } from "@stellar/stellar-sdk";
import {
  acceptSupply,
  approveFunding,
  confirmRemittance,
  createAgreement,
  disburseFunding,
  dispatchSupply,
  flagRemittanceDispute,
  markForceMajeure,
  markResiduRemitted,
  reconcileFunding,
  recordDelivery,
  rejectFunding,
  requestFunding,
  settle,
} from "./invocations";

// Valid strkey addresses are hard to hand-write; mint them with the SDK.
const coop = Keypair.random().publicKey();
const farmer = Keypair.random().publicKey();
const supplier = Keypair.random().publicKey();
const KTP = "a".repeat(64); // 32-byte hex

test("create_agreement: 12 args, correct order + types", () => {
  const inv = createAgreement({
    coop,
    farmer,
    supplier,
    commodity: { code: "GABAH", grade: "B", moistureBps: 1400, hppVersion: 4 },
    subsidyTier: "Subsidized",
    basePriceSupplier: 2_000_000_0000000n,
    saprotanMarkupBps: 1000,
    hppHandlingFeeBps: 500,
    expectedVolG: 2_600_000n,
    hppPerKg: 6_500_0000000n,
    toleranceBps: 2000,
    ktpHashHex: KTP,
  });
  assert.equal(inv.method, "create_agreement");
  assert.equal(inv.args.length, 12);

  const [a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11] = inv.args.map((v) => scValToNative(v));
  assert.equal(a0, coop);
  assert.equal(a1, farmer);
  assert.equal(a2, supplier);
  assert.deepEqual(a3, { code: "GABAH", grade: "B", moisture_bps: 1400, hpp_version: 4 });
  // SubsidyTier is a unit ENUM: a 1-element vec, NOT a bare Symbol. This
  // assertion previously said `"Subsidized"` and was itself encoding the bug.
  assert.deepEqual(a4, ["Subsidized"]);
  assert.equal(a5, 2_000_000_0000000n);
  assert.equal(a6, 1000);
  assert.equal(a7, 500);
  assert.equal(a8, 2_600_000n);
  assert.equal(a9, 6_500_0000000n);
  assert.equal(a10, 2000);
  assert.equal(Buffer.from(a11).toString("hex"), KTP);
});

test("accept_supply: (coop, u64 id)", () => {
  const inv = acceptSupply(coop, 7n);
  assert.equal(inv.method, "accept_supply");
  const [c, id] = inv.args.map((v) => scValToNative(v));
  assert.equal(c, coop);
  assert.equal(id, 7n);
});

test("record_delivery: (coop, id, i128 volume_g, symbol grade)", () => {
  const inv = recordDelivery(coop, 3n, 1_000_000n, "A");
  const [c, id, vol, grade] = inv.args.map((v) => scValToNative(v));
  assert.equal(c, coop);
  assert.equal(id, 3n);
  assert.equal(vol, 1_000_000n);
  assert.equal(grade, "A");
});

test("settle: (caller, u64 id)", () => {
  const inv = settle(coop, 42n);
  const [c, id] = inv.args.map((v) => scValToNative(v));
  assert.equal(c, coop);
  assert.equal(id, 42n);
});

test("mark_force_majeure: (coop, id, symbol reason)", () => {
  const inv = markForceMajeure(coop, 9n, "BANJIR");
  const [c, id, reason] = inv.args.map((v) => scValToNative(v));
  assert.equal(c, coop);
  assert.equal(id, 9n);
  assert.equal(reason, "BANJIR");
});

test("mark_residu_remitted: (coop, id, BytesN<32> ref_hash)", () => {
  const ref = "b".repeat(64);
  const inv = markResiduRemitted(coop, 5n, ref);
  const [c, id, hash] = inv.args.map((v) => scValToNative(v));
  assert.equal(c, coop);
  assert.equal(id, 5n);
  assert.equal(Buffer.from(hash).toString("hex"), ref);
});

test("bytes32 rejects wrong-length hex", () => {
  assert.throws(() => markResiduRemitted(coop, 1n, "abc"));
});

// Exercises the REAL-mode encode path that demo mode skips and lib/tx.ts runs:
// Contract.call(method, ...ScVals) -> TransactionBuilder -> XDR serialization.
// This is the Buffer-heavy code (Address/nativeToScVal/scvMap/XDR write) that
// only fires post-deploy, so proving it round-trips offline pre-empts a
// silent encode failure on first live signing.
test("create_agreement builds a valid invokeHostFunction tx envelope", () => {
  const contractId = StrKey.encodeContract(Buffer.alloc(32, 7));
  const contract = new Contract(contractId);
  const source = new Account(coop, "0");
  const inv = createAgreement({
    coop,
    farmer,
    supplier,
    commodity: { code: "GABAH", grade: "B", moistureBps: 1400, hppVersion: 4 },
    subsidyTier: "Subsidized",
    basePriceSupplier: 2_000_000_0000000n,
    saprotanMarkupBps: 1000,
    hppHandlingFeeBps: 500,
    expectedVolG: 2_600_000n,
    hppPerKg: 6_500_0000000n,
    toleranceBps: 2000,
    ktpHashHex: KTP,
  });

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(inv.method, ...inv.args))
    .setTimeout(180)
    .build();

  const xdr = tx.toXDR();
  assert.ok(xdr.length > 0);
  // Re-parse to prove the envelope is well-formed (full XDR round-trip).
  const reparsed = TransactionBuilder.fromXDR(xdr, Networks.TESTNET) as Transaction;
  assert.equal(reparsed.operations.length, 1);
  assert.equal(reparsed.operations[0]?.type, "invokeHostFunction");
});

// ─── Funding (KMP) ───────────────────────────────────────────────────────────

test("request_funding: (coop, financier, bytes32, i128, i128)", () => {
  const inv = requestFunding({
    coop,
    financier: supplier,
    backingHash: KTP,
    projectedSettlement: 10_000_000_0000000n,
    amountRequested: 8_000_000_0000000n,
  });
  assert.equal(inv.method, "request_funding");
  assert.equal(inv.args.length, 5);
  const [c, f, h, ps, ar] = inv.args.map((v) => scValToNative(v));
  assert.equal(c, coop);
  assert.equal(f, supplier);
  assert.equal(Buffer.from(h).toString("hex"), KTP);
  assert.equal(ps, 10_000_000_0000000n);
  assert.equal(ar, 8_000_000_0000000n);
});

test("reconcile_funding: (coop, u64, i128)", () => {
  const inv = reconcileFunding(coop, 1n, 2_000_000_0000000n);
  assert.equal(inv.method, "reconcile_funding");
  const [c, id, pc] = inv.args.map((v) => scValToNative(v));
  assert.equal(c, coop);
  assert.equal(id, 1n);
  assert.equal(pc, 2_000_000_0000000n);
});

// ─── Funding (Financier) ─────────────────────────────────────────────────────

test("approve_funding: (financier, u64, i128)", () => {
  const inv = approveFunding(supplier, 1n, 8_000_000_0000000n);
  assert.equal(inv.method, "approve_funding");
  const [f, id, amt] = inv.args.map((v) => scValToNative(v));
  assert.equal(f, supplier);
  assert.equal(id, 1n);
  assert.equal(amt, 8_000_000_0000000n);
});

test("reject_funding: (financier, u64, symbol reason)", () => {
  const inv = rejectFunding(supplier, 2n, "RISIKO_TINGGI");
  assert.equal(inv.method, "reject_funding");
  const [f, id, reason] = inv.args.map((v) => scValToNative(v));
  assert.equal(f, supplier);
  assert.equal(id, 2n);
  assert.equal(reason, "RISIKO_TINGGI");
});

test("disburse_funding: (financier, u64) — highest-risk encode path", () => {
  const inv = disburseFunding(supplier, 1n);
  assert.equal(inv.method, "disburse_funding");
  const [f, id] = inv.args.map((v) => scValToNative(v));
  assert.equal(f, supplier);
  assert.equal(id, 1n);
});

// ─── Supply (Supplier) ───────────────────────────────────────────────────────

test("dispatch_supply: (supplier, u64)", () => {
  const inv = dispatchSupply(supplier, 5n);
  assert.equal(inv.method, "dispatch_supply");
  const [s, id] = inv.args.map((v) => scValToNative(v));
  assert.equal(s, supplier);
  assert.equal(id, 5n);
});

test("confirm_remittance: (supplier, u64)", () => {
  const inv = confirmRemittance(supplier, 5n);
  assert.equal(inv.method, "confirm_remittance");
  const [s, id] = inv.args.map((v) => scValToNative(v));
  assert.equal(s, supplier);
  assert.equal(id, 5n);
});

test("flag_remittance_dispute: (supplier, u64, symbol reason)", () => {
  const inv = flagRemittanceDispute(supplier, 7n, "SALDO_TIDAK_COCOK");
  assert.equal(inv.method, "flag_remittance_dispute");
  const [s, id, reason] = inv.args.map((v) => scValToNative(v));
  assert.equal(s, supplier);
  assert.equal(id, 7n);
  assert.equal(reason, "SALDO_TIDAK_COCOK");
});

/* ── SubsidyTier is a UNIT ENUM, not a Symbol (live-chain regression) ──────────
 * Caught by simulating against the deployed v4.0 contract on 2026-07-13: passing
 * `Subsidized` as a bare Symbol makes the contract TRAP with
 * `WasmVm, InvalidAction / UnreachableCodeReached` while unmarshalling the arg,
 * so EVERY create_agreement from the UI would have failed post-deploy.
 * A round-trip test cannot catch this by itself — it checks our encoder against
 * ITSELF, never against the contract's expected arg type. Hence this asserts the
 * concrete XDR shape: a 1-element vec holding the variant symbol.
 */
test("create_agreement encodes subsidy_tier as a unit ENUM (scvVec[symbol]), not a bare Symbol", () => {
  const inv = createAgreement({
    coop,
    farmer,
    supplier,
    commodity: { code: "GABAH", grade: "A", moistureBps: 1400, hppVersion: 1 },
    subsidyTier: "Subsidized",
    basePriceSupplier: 20_000_000_000_000n,
    saprotanMarkupBps: 1000,
    hppHandlingFeeBps: 500,
    expectedVolG: 2_600_000n,
    hppPerKg: 65_000_000n,
    toleranceBps: 200,
    ktpHashHex: KTP,
  });

  const tier = inv.args[4];
  assert.ok(tier, "arg[4] must be subsidy_tier");
  // The concrete XDR shape is the whole point: scvSymbol here makes the deployed
  // contract trap, and scValToNative alone would not make the difference obvious.
  assert.equal(tier.switch().name, "scvVec", "a unit enum is vec-encoded, not a symbol");
  const vec = tier.vec();
  assert.ok(vec);
  assert.equal(vec.length, 1, "exactly one element: the variant name");
  assert.equal(vec[0]?.switch().name, "scvSymbol");
  assert.deepEqual(scValToNative(tier), ["Subsidized"]);
});
