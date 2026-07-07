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
  createAgreement,
  markForceMajeure,
  markResiduRemitted,
  recordDelivery,
  settle,
} from "./invocations";

// Valid strkey addresses are hard to hand-write; mint them with the SDK.
const coop = Keypair.random().publicKey();
const farmer = Keypair.random().publicKey();
const agrinas = Keypair.random().publicKey();
const KTP = "a".repeat(64); // 32-byte hex

test("create_agreement: 11 args, correct order + types", () => {
  const inv = createAgreement({
    coop,
    farmer,
    agrinas,
    commodity: { code: "GABAH", grade: "B", moistureBps: 1400, hppVersion: 4 },
    basePriceAgrinas: 2_000_000_0000000n,
    saprotanMarkupBps: 1000,
    hppHandlingFeeBps: 500,
    expectedVolG: 2_600_000n,
    hppPerKg: 6_500_0000000n,
    toleranceBps: 2000,
    ktpHashHex: KTP,
  });
  assert.equal(inv.method, "create_agreement");
  assert.equal(inv.args.length, 11);

  const [a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10] = inv.args.map((v) => scValToNative(v));
  assert.equal(a0, coop);
  assert.equal(a1, farmer);
  assert.equal(a2, agrinas);
  assert.deepEqual(a3, { code: "GABAH", grade: "B", moisture_bps: 1400, hpp_version: 4 });
  assert.equal(a4, 2_000_000_0000000n);
  assert.equal(a5, 1000);
  assert.equal(a6, 500);
  assert.equal(a7, 2_600_000n);
  assert.equal(a8, 6_500_0000000n);
  assert.equal(a9, 2000);
  assert.equal(Buffer.from(a10).toString("hex"), KTP);
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
    agrinas,
    commodity: { code: "GABAH", grade: "B", moistureBps: 1400, hppVersion: 4 },
    basePriceAgrinas: 2_000_000_0000000n,
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
