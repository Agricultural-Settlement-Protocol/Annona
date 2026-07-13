import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";
import { jsonSafe } from "../lib/read-model.js";

/**
 * Financier (Pemodal) read surfaces — Offtake Financing Approval Desk + Portfolio.
 *
 * All read-only (chain is source of truth; the indexer writes the rows). Money
 * is smallest-unit bigint, serialized as string via jsonSafe. Coverage ratio is
 * DERIVED (requested / projected_settlement); note it is inverted vs the
 * conventional sense — LOWER = safer (per SMART-CONTRACT §B).
 */

const REQUEST_COLUMNS = {
  id: schema.fundingRequest.id,
  onchainId: schema.fundingRequest.onchainId,
  coopId: schema.fundingRequest.coopId,
  coopName: schema.coop.name,
  financierId: schema.fundingRequest.financierId,
  financierName: schema.financier.name,
  backingHash: schema.fundingRequest.backingHash,
  projectedSettlement: schema.fundingRequest.projectedSettlement,
  amountRequested: schema.fundingRequest.amountRequested,
  amountApproved: schema.fundingRequest.amountApproved,
  amountDisbursed: schema.fundingRequest.amountDisbursed,
  amountReconciled: schema.fundingRequest.amountReconciled,
  coverageRatioBps: schema.fundingRequest.coverageRatioBps,
  riskBadge: schema.fundingRequest.riskBadge,
  status: schema.fundingRequest.status,
  proofUrl: schema.fundingRequest.proofUrl,
  createdAt: schema.fundingRequest.createdAt,
} as const;

function baseQuery() {
  return getDb()
    .select(REQUEST_COLUMNS)
    .from(schema.fundingRequest)
    .innerJoin(schema.financier, eq(schema.fundingRequest.financierId, schema.financier.id))
    .innerJoin(schema.coop, eq(schema.fundingRequest.coopId, schema.coop.id));
}

export const financierRoute = new Hono()
  /** Dashboard aggregates for the financier home. */
  .get("/overview", async (c) => {
    const rows = await baseQuery();
    const num = (v: unknown) => BigInt((v as string | null) ?? "0");
    let requested = 0n;
    let disbursed = 0n;
    let reconciled = 0n;
    let outstanding = 0n; // disbursed - reconciled, over active advances
    let pendingCount = 0;
    for (const r of rows) {
      requested += num(r.amountRequested);
      disbursed += num(r.amountDisbursed);
      reconciled += num(r.amountReconciled);
      if (r.status === "Requested") pendingCount += 1;
      if (r.status === "Disbursed") outstanding += num(r.amountDisbursed) - num(r.amountReconciled);
    }
    const financierRows = await getDb().select().from(schema.financier).limit(1);
    return c.json(
      jsonSafe({
        financier: financierRows[0] ?? null,
        totals: {
          requestCount: rows.length,
          pendingCount,
          totalRequested: requested,
          totalDisbursed: disbursed,
          totalReconciled: reconciled,
          outstanding,
        },
      }),
    );
  })

  /** Approval desk: requests awaiting a decision (status = Requested). */
  .get("/queue", async (c) => {
    const rows = await baseQuery()
      .where(eq(schema.fundingRequest.status, "Requested"))
      .orderBy(desc(schema.fundingRequest.createdAt));
    return c.json({ items: jsonSafe(rows) });
  })

  /** Portfolio: everything that left the queue (approved / disbursed / reconciled / rejected). */
  .get("/portfolio", async (c) => {
    const rows = await baseQuery()
      .where(
        inArray(schema.fundingRequest.status, ["Approved", "Disbursed", "Reconciled", "Rejected"]),
      )
      .orderBy(desc(schema.fundingRequest.createdAt));
    return c.json({ items: jsonSafe(rows) });
  })

  /** Full history (queue + portfolio), newest first. */
  .get("/", async (c) => {
    const rows = await baseQuery().orderBy(desc(schema.fundingRequest.createdAt));
    return c.json({ items: jsonSafe(rows) });
  })

  /** Request detail + backing agreement lines (the proof packet). */
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const rows = await baseQuery().where(eq(schema.fundingRequest.id, id)).limit(1);
    const request = rows[0];
    if (!request) return c.json({ error: "not found" }, 404);
    const lines = await getDb()
      .select({
        id: schema.fundingRequestLine.id,
        agreementId: schema.fundingRequestLine.agreementId,
        agreementOnchainId: schema.agreement.onchainId,
        farmerName: schema.farmer.name,
        commodityCode: schema.agreement.commodityCode,
        status: schema.agreement.status,
        backingValue: schema.fundingRequestLine.backingValue,
      })
      .from(schema.fundingRequestLine)
      .innerJoin(schema.agreement, eq(schema.fundingRequestLine.agreementId, schema.agreement.id))
      .leftJoin(schema.farmer, eq(schema.agreement.farmerId, schema.farmer.id))
      .where(eq(schema.fundingRequestLine.fundingRequestId, id));
    return c.json(jsonSafe({ request, lines }));
  });
