import { Hono } from "hono";
import { getDb } from "../db/client.js";
import { getAgreementDetail, jsonSafe, listAgreements } from "../lib/read-model.js";

/**
 * Agreement reads over the indexed read-models. Running money is DERIVED by SUM
 * over settlement/delivery rows (see lib/read-model.ts). Output mirrors
 * `apps/web/lib/mock-data.ts` MockAgreement; bigints cross the wire as strings.
 */
export const agreementsRoute = new Hono()
  .get("/", async (c) => {
    const items = await listAgreements(getDb());
    return c.json({ items: jsonSafe(items) });
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const detail = await getAgreementDetail(getDb(), id);
    if (!detail) return c.json({ error: "not_found", id }, 404);
    return c.json(jsonSafe(detail));
  });
