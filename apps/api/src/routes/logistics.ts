import { eq, inArray, isNotNull, notInArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, schema } from "../db/client.js";

/**
 * Logistics + derived warehouse (Screen F Gudang, Zone 2 + Screen Logistik).
 *
 * The gudang stock is DERIVED, not hand-kept:
 *   - Saprotan received  = SUM(agreement_input.qty) over accepted agreements.
 *   - Hasil panen in      = SUM(delivery.volume_g) per commodity.
 *   - Hasil panen out     = SUM(harvest_shipment_line.volume_g) per commodity
 *                           (i.e. what logistik forwarded to gudang Agrinas).
 *   - Balance             = in - out. So a logistik dispatch AUTO-REDUCES the
 *                           gudang harvest balance the moment the shipment lands.
 *
 * Shipments reuse the existing harvest_shipment(_line) ledger (off-chain, MVP).
 */

const json = (data: unknown) =>
  JSON.parse(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

// Agreements whose saprotan has been physically accepted (accept_supply fired),
// so the inputs are in the KMP warehouse.
const ACCEPTED = ["Active", "PartiallyDelivered", "Delivered", "Flagged", "Settled"] as const;

export const logisticsRoute = new Hono()
  // ── Derived warehouse summary (gudang zones) ──────────────────────────────
  .get("/summary", async (c) => {
    const db = getDb();

    // Saprotan received into the warehouse, grouped by catalog item.
    const saprotan = await db
      .select({
        name: schema.saprotanCatalog.name,
        category: schema.saprotanCatalog.category,
        unit: schema.saprotanCatalog.unitLabel,
        qty: sql<string>`coalesce(sum(${schema.agreementInput.qty}),0)`,
      })
      .from(schema.agreementInput)
      .innerJoin(schema.agreement, eq(schema.agreement.id, schema.agreementInput.agreementId))
      .innerJoin(
        schema.saprotanCatalog,
        eq(schema.saprotanCatalog.id, schema.agreementInput.catalogId),
      )
      .where(inArray(schema.agreement.status, [...ACCEPTED]))
      .groupBy(schema.saprotanCatalog.name, schema.saprotanCatalog.category, schema.saprotanCatalog.unitLabel);

    // Harvest received into the warehouse (all deliveries), per commodity.
    const received = await db
      .select({
        commodity: schema.agreement.commodityCode,
        g: sql<string>`coalesce(sum(${schema.delivery.volumeG}),0)`,
      })
      .from(schema.delivery)
      .innerJoin(schema.agreement, eq(schema.agreement.id, schema.delivery.agreementId))
      .groupBy(schema.agreement.commodityCode);

    // Harvest forwarded out to gudang Agrinas (shipment lines), per commodity.
    const forwarded = await db
      .select({
        commodity: schema.harvestShipment.commodityCode,
        g: sql<string>`coalesce(sum(${schema.harvestShipmentLine.volumeG}),0)`,
      })
      .from(schema.harvestShipmentLine)
      .innerJoin(
        schema.harvestShipment,
        eq(schema.harvestShipment.id, schema.harvestShipmentLine.shipmentId),
      )
      .groupBy(schema.harvestShipment.commodityCode);

    const fwdMap = new Map(forwarded.map((r) => [r.commodity, BigInt(r.g)]));
    const hasilPanen = received.map((r) => {
      const receivedG = BigInt(r.g);
      const forwardedG = fwdMap.get(r.commodity) ?? 0n;
      return {
        commodityCode: r.commodity,
        receivedG,
        forwardedG,
        balanceG: receivedG - forwardedG,
      };
    });
    // commodities that only appear in shipments (edge case) still surface.
    for (const [commodity, forwardedG] of fwdMap) {
      if (!hasilPanen.some((h) => h.commodityCode === commodity)) {
        hasilPanen.push({ commodityCode: commodity, receivedG: 0n, forwardedG, balanceG: -forwardedG });
      }
    }

    return c.json(json({ saprotan, hasilPanen }));
  })

  // ── Deliveries not yet forwarded (the logistik "stok siap kirim") ──────────
  .get("/unshipped", async (c) => {
    const db = getDb();
    const shipped = await db
      .select({ id: schema.harvestShipmentLine.deliveryId })
      .from(schema.harvestShipmentLine)
      .where(isNotNull(schema.harvestShipmentLine.deliveryId));
    const shippedIds = shipped.map((r) => r.id).filter((id): id is string => id != null);

    const rows = await db
      .select({
        id: schema.delivery.id,
        agreementId: schema.delivery.agreementId,
        agreementOnchainId: schema.agreement.onchainId,
        commodityCode: schema.agreement.commodityCode,
        farmerId: schema.agreement.farmerId,
        farmerName: schema.farmer.name,
        seq: schema.delivery.seq,
        volumeG: schema.delivery.volumeG,
        grade: schema.delivery.grade,
        moistureBps: schema.delivery.moistureBps,
        deliveredAt: schema.delivery.deliveredAt,
      })
      .from(schema.delivery)
      .innerJoin(schema.agreement, eq(schema.agreement.id, schema.delivery.agreementId))
      .innerJoin(schema.farmer, eq(schema.farmer.id, schema.agreement.farmerId))
      .where(shippedIds.length ? notInArray(schema.delivery.id, shippedIds) : undefined);

    return c.json({ items: json(rows) });
  })

  // ── Shipment history (logistik) ───────────────────────────────────────────
  .get("/shipments", async (c) => {
    const db = getDb();
    const shipments = await db
      .select()
      .from(schema.harvestShipment)
      .orderBy(sql`${schema.harvestShipment.createdAt} desc`);
    const ids = shipments.map((s) => s.id);
    const lines = ids.length
      ? await db
          .select()
          .from(schema.harvestShipmentLine)
          .where(inArray(schema.harvestShipmentLine.shipmentId, ids))
      : [];
    const linesByShipment = new Map<string, (typeof lines)[number][]>();
    for (const l of lines) {
      const arr = linesByShipment.get(l.shipmentId) ?? [];
      arr.push(l);
      linesByShipment.set(l.shipmentId, arr);
    }
    return c.json(
      json({ items: shipments.map((s) => ({ ...s, lines: linesByShipment.get(s.id) ?? [] })) }),
    );
  })

  // ── Create a shipment from selected deliveries (dispatch to gudang Agrinas) ─
  .post("/shipments", async (c) => {
    const body = (await c.req.json().catch(() => null)) as { deliveryIds?: unknown; note?: unknown } | null;
    const deliveryIds = Array.isArray(body?.deliveryIds)
      ? (body.deliveryIds.filter((x) => typeof x === "string") as string[])
      : [];
    if (deliveryIds.length === 0) {
      return c.json({ error: "Pilih minimal satu setoran untuk dikirim." }, 400);
    }
    const note = typeof body?.note === "string" ? body.note.trim() : null;

    const db = getDb();
    const deliveries = await db
      .select({
        id: schema.delivery.id,
        agreementId: schema.delivery.agreementId,
        commodityCode: schema.agreement.commodityCode,
        farmerId: schema.agreement.farmerId,
        volumeG: schema.delivery.volumeG,
        grade: schema.delivery.grade,
        moistureBps: schema.delivery.moistureBps,
      })
      .from(schema.delivery)
      .innerJoin(schema.agreement, eq(schema.agreement.id, schema.delivery.agreementId))
      .where(inArray(schema.delivery.id, deliveryIds));
    if (deliveries.length === 0) {
      return c.json({ error: "Setoran tidak ditemukan." }, 404);
    }

    // Guard: none of these deliveries may already be on a shipment.
    const already = await db
      .select({ id: schema.harvestShipmentLine.deliveryId })
      .from(schema.harvestShipmentLine)
      .where(inArray(schema.harvestShipmentLine.deliveryId, deliveryIds));
    if (already.length) {
      return c.json({ error: "Sebagian setoran sudah dikirim sebelumnya." }, 409);
    }

    const coop = (await db.select({ id: schema.coop.id }).from(schema.coop).limit(1))[0];
    const supplier = (await db.select({ id: schema.supplier.id }).from(schema.supplier).limit(1))[0];
    if (!coop || !supplier) {
      return c.json({ error: "Koperasi atau Supplier belum terkonfigurasi." }, 500);
    }

    const commodityCode = deliveries[0]?.commodityCode ?? "GABAH";
    const totalVolumeG = deliveries.reduce((s, d) => s + d.volumeG, 0n);
    const now = new Date();

    try {
      const [shipment] = await db
        .insert(schema.harvestShipment)
        .values({
          coopId: coop.id,
          supplierId: supplier.id,
          commodityCode,
          status: "Dikirim",
          totalVolumeG,
          discrepancyNote: note,
          sentAt: now,
        })
        .returning();
      if (!shipment) return c.json({ error: "Gagal mencatat pengiriman." }, 500);

      await db.insert(schema.harvestShipmentLine).values(
        deliveries.map((d) => ({
          shipmentId: shipment.id,
          deliveryId: d.id,
          agreementId: d.agreementId,
          farmerId: d.farmerId,
          volumeG: d.volumeG,
          grade: d.grade,
          moistureBps: d.moistureBps ?? 0,
        })),
      );
      return c.json(json(shipment), 201);
    } catch (e) {
      console.error("[logistics] POST /shipments:", e instanceof Error ? e.message : e);
      return c.json({ error: "Gagal mencatat pengiriman." }, 500);
    }
  })

  // ── Supplier confirms receipt (the second gate) ───────────────────────────
  .patch("/shipments/:id/receive", async (c) => {
    const id = c.req.param("id");
    const body = (await c.req.json().catch(() => null)) as {
      receivedVolumeG?: unknown;
      note?: unknown;
    } | null;

    const db = getDb();
    const existing = (
      await db
        .select({ id: schema.harvestShipment.id, totalVolumeG: schema.harvestShipment.totalVolumeG })
        .from(schema.harvestShipment)
        .where(eq(schema.harvestShipment.id, id))
        .limit(1)
    )[0];
    if (!existing) return c.json({ error: "not_found", id }, 404);

    const receivedVolumeG =
      typeof body?.receivedVolumeG === "string" || typeof body?.receivedVolumeG === "number"
        ? BigInt(body.receivedVolumeG)
        : existing.totalVolumeG;
    const note = typeof body?.note === "string" ? body.note.trim() : null;
    const status = receivedVolumeG === existing.totalVolumeG ? "Diterima" : "Selisih";

    const [updated] = await db
      .update(schema.harvestShipment)
      .set({ status, receivedVolumeG, discrepancyNote: note, receivedAt: new Date() })
      .where(eq(schema.harvestShipment.id, id))
      .returning();
    return c.json(json(updated));
  });
