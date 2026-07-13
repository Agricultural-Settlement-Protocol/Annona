/**
 * DRIFT TRIPWIRE (Golden Rule 5) — the contract's emitted events vs `events.ts`.
 *
 * WHY THIS EXISTS: a wrong-but-consistent wire field name TYPECHECKS PERFECTLY.
 * If `AgreementCreatedData` says `basePriceSupplier` while the contract emits
 * `base_price`, every package still compiles, every test still passes, and the
 * field silently arrives `undefined` from a real chain event — a bug that only
 * surfaces after deploy. That exact drift reached a branch once (see the
 * 2026-07-13 merge entry in CLAUDE.md) and was caught by hand. This catches it
 * in CI instead.
 *
 * Both sides are parsed FROM SOURCE (the Rust `#[contractevent]` structs and the
 * TS interfaces), so there is no hand-maintained third list that can itself drift.
 * Field NAMES are the contract; types are not compared (Address→string,
 * i128→bigint etc. are legitimate representation choices).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUST = resolve(HERE, "../../../contracts/offtake-registry/src/events.rs");
const TS = resolve(HERE, "events.ts");

const snakeToCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());

interface RustEvent {
  fields: string[];
  topics: string[];
}

/** Every `#[contractevent]` struct: name → { fields (camelCased), topics (in order) }. */
function parseRustEvents(src: string): Map<string, RustEvent> {
  const out = new Map<string, RustEvent>();
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]?.startsWith("#[contractevent")) continue;
    const name = lines[i + 1]?.match(/^pub struct (\w+)/)?.[1];
    assert.ok(name, `#[contractevent] on line ${i + 1} is not followed by a pub struct`);
    const fields: string[] = [];
    const topics: string[] = [];
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
      const camel = snakeToCamel(field);
      fields.push(camel);
      if (isTopic) topics.push(camel);
      isTopic = false;
    }
    out.set(name, { fields, topics });
  }
  return out;
}

/** Every `export interface <Name>Data { … }`: name (sans suffix) → field names. */
function parseTsEventData(src: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const name = lines[i]?.match(/^export interface (\w+)Data \{/)?.[1];
    if (!name) continue;
    const fields: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const raw = lines[j];
      if (raw === undefined || raw.startsWith("}")) break;
      const line = raw.trim();
      // skip comments (/** … */, //) — only `name: type;` lines are fields
      if (line.startsWith("*") || line.startsWith("/")) continue;
      const field = line.match(/^(\w+)\??:/)?.[1];
      if (field) fields.push(field);
    }
    out.set(name, fields);
  }
  return out;
}

/** The `AnnonaEventType` string-union members. */
function parseEventTypeUnion(src: string): string[] {
  const block = src.match(/export type AnnonaEventType =([\s\S]*?);/)?.[1];
  assert.ok(block, "AnnonaEventType union not found in events.ts");
  // flatMap-as-guard, not `as string`: a cast would silently admit `undefined`
  // into the list if this regex ever lost its capture group.
  return [...block.matchAll(/"(\w+)"/g)].flatMap((m) => (m[1] ? [m[1]] : []));
}

const rust = parseRustEvents(readFileSync(RUST, "utf8"));
const tsSrc = readFileSync(TS, "utf8");
const ts = parseTsEventData(tsSrc);
const union = parseEventTypeUnion(tsSrc);

test("the parsers actually found something (guards a silently-passing test)", () => {
  assert.ok(rust.size >= 19, `parsed only ${rust.size} Rust events — the parser is broken`);
  assert.ok(ts.size >= 19, `parsed only ${ts.size} TS *Data interfaces — the parser is broken`);
});

test("every contract event has a TS *Data interface, and vice versa", () => {
  const missingInTs = [...rust.keys()].filter((n) => !ts.has(n));
  const extraInTs = [...ts.keys()].filter((n) => !rust.has(n));
  assert.deepEqual(missingInTs, [], "the contract emits these events but packages/core has no *Data type");
  assert.deepEqual(extraInTs, [], "packages/core declares these *Data types but the contract emits no such event");
});

test("every contract event is a member of the AnnonaEventType union", () => {
  const missing = [...rust.keys()].filter((n) => !union.includes(n));
  const extra = union.filter((n) => !rust.has(n));
  assert.deepEqual(missing, [], "contract events absent from AnnonaEventType");
  assert.deepEqual(extra, [], "AnnonaEventType members the contract never emits");
});

for (const [name, { fields }] of rust) {
  test(`${name}: TS field set matches the contract's emitted fields exactly`, () => {
    const tsFields = ts.get(name);
    assert.ok(tsFields, `no ${name}Data interface in packages/core`);
    // Compare as SETS: the value map is keyed by name, so declaration order is free.
    // (Topic ORDER does matter — asserted in apps/api/src/indexer/poll.test.ts.)
    assert.deepEqual(
      [...tsFields].sort(),
      [...fields].sort(),
      `${name} drifted. Contract (camelCased): [${fields.join(", ")}] — packages/core: [${tsFields.join(", ")}]`,
    );
  });
}
