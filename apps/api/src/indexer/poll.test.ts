/**
 * DRIFT TRIPWIRE — the contract's `#[topic]` layout vs poll.ts's TOPIC_REGISTRY.
 *
 * Companion to packages/core/src/events.test.ts (which guards field NAMES).
 * This one guards the decode path, where two things can silently rot:
 *
 *  1. The topic SYMBOL (`topics = ["agreement_created"]`). If the contract
 *     renames it, the poller stops recognising the event entirely — it decodes
 *     nothing and the indexer just goes quiet. No error, no crash.
 *  2. Topic ORDER. Topics arrive as a positional array and poll.ts zips them
 *     against `topicFields` BY INDEX. Swap `id`/`farmer` in the Rust struct and
 *     every farmer address is silently written into the agreement-id field.
 *
 * Neither is visible to `tsc`. Both sides are parsed from source, so the test
 * cannot itself drift.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { nativeToScVal, xdr as sdkXdr } from "@stellar/stellar-sdk";
import { decodeEvent } from "./poll.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUST = resolve(HERE, "../../../../contracts/offtake-registry/src/events.rs");
const POLL = resolve(HERE, "poll.ts");

const snakeToCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());

interface TopicEntry {
  type: string;
  topicFields: string[];
}

/** topic symbol → { event name, ordered #[topic] field names (camelCased) }. */
function parseRustTopics(src: string): Map<string, TopicEntry> {
  const out = new Map<string, TopicEntry>();
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const symbol = lines[i]?.match(/^#\[contractevent\(topics = \["(\w+)"\]\)\]/)?.[1];
    if (!symbol) continue;
    const name = lines[i + 1]?.match(/^pub struct (\w+)/)?.[1];
    assert.ok(name, `#[contractevent] on line ${i + 1} is not followed by a pub struct`);
    const topicFields: string[] = [];
    let isTopic = false;
    for (let j = i + 2; j < lines.length; j++) {
      const raw = lines[j];
      if (raw === undefined || raw.startsWith("}")) break;
      const line = raw.trim();
      if (line === "#[topic]") {
        isTopic = true;
        continue;
      }
      const field = line.match(/^pub (\w+):/)?.[1];
      if (!field) continue;
      if (isTopic) topicFields.push(snakeToCamel(field));
      isTopic = false;
    }
    out.set(symbol, { type: name, topicFields });
  }
  return out;
}

/** TOPIC_REGISTRY entries, parsed from poll.ts source. */
function parsePollRegistry(src: string): Map<string, TopicEntry> {
  const block = src.match(/const TOPIC_REGISTRY[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1];
  assert.ok(block, "TOPIC_REGISTRY not found in poll.ts");
  const out = new Map<string, TopicEntry>();
  const entry = /(\w+):\s*\{\s*type:\s*"(\w+)",\s*topicFields:\s*\[([^\]]*)\]\s*\}/g;
  for (const m of block.matchAll(entry)) {
    // Guards, not `as string` casts: a cast would let a regex change silently
    // yield `undefined` entries and quietly weaken this tripwire.
    const [, symbol, type, rawFields] = m;
    if (!symbol || !type || rawFields === undefined) continue;
    const topicFields = [...rawFields.matchAll(/"(\w+)"/g)].flatMap((f) => (f[1] ? [f[1]] : []));
    out.set(symbol, { type, topicFields });
  }
  return out;
}

const rust = parseRustTopics(readFileSync(RUST, "utf8"));
const poll = parsePollRegistry(readFileSync(POLL, "utf8"));

test("the parsers found something (guards a silently-passing test)", () => {
  assert.ok(rust.size >= 19, `parsed only ${rust.size} Rust events — the parser is broken`);
  assert.equal(poll.size, rust.size, "TOPIC_REGISTRY and the contract disagree on how many events exist");
});

test("every emitted topic symbol is registered in the poller", () => {
  const unregistered = [...rust.keys()].filter((sym) => !poll.has(sym));
  const phantom = [...poll.keys()].filter((sym) => !rust.has(sym));
  assert.deepEqual(
    unregistered,
    [],
    "the contract emits these topic symbols but poll.ts ignores them (the indexer would go silently blind)",
  );
  assert.deepEqual(phantom, [], "poll.ts listens for these topic symbols but the contract never emits them");
});

for (const [symbol, { type, topicFields }] of rust) {
  test(`${symbol}: poller maps it to ${type} with topics in the contract's exact order`, () => {
    const got = poll.get(symbol);
    assert.ok(got, `topic "${symbol}" missing from TOPIC_REGISTRY`);
    assert.equal(got.type, type, `topic "${symbol}" decodes to the wrong event type`);
    // ORDER-SENSITIVE on purpose: topics are zipped positionally in poll.ts.
    assert.deepEqual(
      got.topicFields,
      topicFields,
      `topic order drifted for ${type} — values would land in the wrong fields. ` +
        `Contract: [${topicFields.join(", ")}] — poll.ts: [${got.topicFields.join(", ")}]`,
    );
  });
}

/* ────────────────────── unit-enum decode (live-chain regression) ──────────────────────
 * Caught on the 2026-07-13 testnet deploy: a Soroban #[contracttype] unit enum is
 * encoded as a 1-element VEC of the variant symbol, so scValToNative returns
 * ["Subsidized"], not "Subsidized". The reducer writes subsidyTier straight into a
 * Postgres enum column, so the array would have blown up (or corrupted) every live
 * AgreementCreated. The SEED never hit it — it synthesizes events in TS with the
 * string already correct, so only a real chain event exposes the vec encoding.
 * Symbol-typed fields (ForceMajeure.reason) are plain strings and must NOT be touched.
 */
const sym = (s: string) => sdkXdr.ScVal.scvSymbol(s);
const FARMER = "GCQ4HV75LRP3SL4SHRM6KJTEET3VC2ESGALZEV5FZ7ALGHPZ6HAOFHCE";
const COOP = "GB52CZEWENJGENADNZKVK5HFY3NKBI2Y47GCGTCGVJF2L6YHTMBXTRVL";

/** Build a raw RPC event the way the chain actually encodes it. */
function rawEvent(topicName: string, topics: sdkXdr.ScVal[], body: Record<string, sdkXdr.ScVal>) {
  const entries = Object.keys(body)
    .sort() // Soroban requires map keys sorted by symbol
    .map((k) => new sdkXdr.ScMapEntry({ key: sym(k), val: body[k] as sdkXdr.ScVal }));
  return {
    topic: [sym(topicName), ...topics],
    value: sdkXdr.ScVal.scvMap(entries),
    txHash: "abc",
    ledger: 1,
    ledgerClosedAt: "2026-07-13T00:00:00Z",
  } as unknown as Parameters<typeof decodeEvent>[0];
}

test("a unit-variant enum (SubsidyTier) decodes to a bare string, not a 1-element array", () => {
  const ev = rawEvent(
    "agreement_created",
    [nativeToScVal(1n, { type: "u64" }), nativeToScVal(FARMER, { type: "address" }), nativeToScVal(COOP, { type: "address" })],
    {
      // exactly how the chain encodes `subsidy_tier: SubsidyTier` — a vec of the variant
      subsidy_tier: sdkXdr.ScVal.scvVec([sym("Subsidized")]),
      base_price: nativeToScVal(20000000000000n, { type: "i128" }),
    },
  );
  const d = decodeEvent(ev, 0);
  assert.ok(d);
  assert.equal(d.data.subsidyTier, "Subsidized", "SubsidyTier must be unwrapped to a bare string");
  assert.equal(typeof d.data.subsidyTier, "string");
  assert.equal(d.data.basePrice, 20000000000000n, "the wire field is `base_price` → `basePrice`");
});

test("a Symbol-typed field (ForceMajeure.reason) is left alone by the enum unwrap", () => {
  const ev = rawEvent("force_majeure", [nativeToScVal(1n, { type: "u64" })], { reason: sym("BANJIR") });
  const d = decodeEvent(ev, 0);
  assert.ok(d);
  assert.equal(d.data.reason, "BANJIR");
});
