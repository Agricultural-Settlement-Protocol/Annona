import type { AnnonaEventType } from "@annona/core";
/**
 * Soroban RPC → EventEnvelope decoder. Polls `getEvents` for the registry
 * contract and turns each raw contract event into the SAME @annona/core
 * EventEnvelope the seed synthesizes, so both feed the identical applyEvent
 * reducer (handlers.ts).
 *
 * Event wire shape (see contracts/offtake-registry/src/events.rs):
 *   topic[0]      = event-name Symbol ("agreement_created", "settled", ...)
 *   topic[1..]    = the #[topic] fields in declared order (id, addresses)
 *   value (Map)   = the remaining named fields (snake_case), bigint for i128
 * We merge the indexed topics + the value map, deep-camelCase the keys, and
 * stamp the envelope metadata (txHash, eventIndex, ledger, timestamp).
 */
import { type rpc, scValToNative, type xdr } from "@stellar/stellar-sdk";

/** topic[0] symbol → (event type, ordered #[topic] field names after the name). */
const TOPIC_REGISTRY: Record<string, { type: AnnonaEventType; topicFields: string[] }> = {
  agreement_created: { type: "AgreementCreated", topicFields: ["id", "farmer", "coop"] },
  dispatched: { type: "SupplyDispatched", topicFields: ["id", "supplier"] },
  accepted: { type: "SupplyAccepted", topicFields: ["id", "coop"] },
  delivery: { type: "DeliveryRecorded", topicFields: ["id"] },
  receipt: { type: "HarvestReceiptMinted", topicFields: ["id", "farmer"] },
  settled: { type: "Settled", topicFields: ["id", "farmer"] },
  flagged: { type: "Flagged", topicFields: ["id"] },
  force_majeure: { type: "ForceMajeure", topicFields: ["id"] },
  residu_remitted: { type: "ResiduRemitted", topicFields: ["id", "coop"] },
  remittance_cleared: { type: "RemittanceCleared", topicFields: ["id", "coop"] },
  remittance_disputed: { type: "RemittanceDisputed", topicFields: ["id", "coop"] },
  remittance_resolved: { type: "RemittanceResolved", topicFields: ["id", "coop"] },
  reputation: { type: "ReputationUpdated", topicFields: ["farmer"] },
  coop_reputation: { type: "CoopReputationUpdated", topicFields: ["coop"] },
  // ── offtake financing (§B). Value-map keys (financier, amounts, backing_hash)
  //    auto-camelCase through deepCamel; only the #[topic] fields are listed here. ──
  funding_requested: { type: "FundingRequested", topicFields: ["id", "coop"] },
  funding_approved: { type: "FundingApproved", topicFields: ["id", "financier"] },
  funding_rejected: { type: "FundingRejected", topicFields: ["id", "financier"] },
  funding_disbursed: { type: "FundingDisbursed", topicFields: ["id", "financier"] },
  funding_reconciled: { type: "FundingReconciled", topicFields: ["id", "coop"] },
};

const SNAKE = /_([a-z0-9])/g;
function toCamel(key: string): string {
  return key.replace(SNAKE, (_m, c: string) => c.toUpperCase());
}

/** Deep camelCase object keys (the value Map + nested structs like commodity).
 *  Leaves scalars (bigint/string/number) untouched. */
function deepCamel(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepCamel);
  if (value && typeof value === "object" && !(value instanceof Uint8Array)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[toCamel(k)] = deepCamel(v);
    }
    return out;
  }
  return value;
}

/** Decoded event ready for applyEvent (the exact EventEnvelope shape). */
export interface DecodedEvent {
  type: AnnonaEventType;
  txHash: string;
  eventIndex: number;
  ledger: number;
  timestamp: number;
  data: Record<string, unknown>;
}

/** Decode one raw RPC event. Returns null for events with an unknown topic[0]
 *  (defensive — a future contract event we don't model yet). */
export function decodeEvent(raw: rpc.Api.EventResponse, eventIndex: number): DecodedEvent | null {
  const topics = raw.topic as xdr.ScVal[];
  const nameTopic = topics[0];
  if (!nameTopic) return null;
  const name = scValToNative(nameTopic) as string;
  const entry = TOPIC_REGISTRY[name];
  if (!entry) return null;

  // Merge non-name topics (indexed fields) with the value Map (the rest).
  const data: Record<string, unknown> = {};
  entry.topicFields.forEach((field, i) => {
    const t = topics[i + 1];
    if (t) data[field] = scValToNative(t);
  });
  const body = deepCamel(scValToNative(raw.value)) as Record<string, unknown>;
  Object.assign(data, body);

  return {
    type: entry.type,
    txHash: raw.txHash,
    eventIndex,
    ledger: raw.ledger,
    timestamp: Math.floor(new Date(raw.ledgerClosedAt).getTime() / 1000),
    data,
  };
}

/** One page of decoded events + the ledger to resume from next poll. */
export interface EventPage {
  events: DecodedEvent[];
  latestLedger: number;
  cursor?: string;
}

/** Poll the registry contract's events from `startLedger` forward. */
export async function pollEvents(
  server: rpc.Server,
  registryId: string,
  startLedger: number,
): Promise<EventPage> {
  const res = await server.getEvents({
    startLedger,
    filters: [{ type: "contract", contractIds: [registryId] }],
  });
  const events: DecodedEvent[] = [];
  res.events.forEach((raw, i) => {
    const decoded = decodeEvent(raw, i);
    if (decoded) events.push(decoded);
  });
  return { events, latestLedger: res.latestLedger, cursor: res.cursor };
}
