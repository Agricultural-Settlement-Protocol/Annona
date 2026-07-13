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
    const symbol = m[1] as string;
    const type = m[2] as string;
    const topicFields = [...(m[3] as string).matchAll(/"(\w+)"/g)].map((f) => f[1] as string);
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
