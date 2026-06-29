import type { Agreement } from "@annona/core";
import { Hono } from "hono";

/**
 * Read endpoints over indexed agreement read-models.
 * MVP: returns empty / 501 until the indexer + DB are wired.
 * These also back @annona/sdk (the composability surface).
 */
export const agreementsRoute = new Hono()
  .get("/", (c) => {
    const items: Agreement[] = [];
    return c.json({ items, note: "indexer not wired yet (MVP skeleton)" });
  })
  .get("/:id", (c) => {
    const id = c.req.param("id");
    return c.json({ error: "not_implemented", id }, 501);
  });
