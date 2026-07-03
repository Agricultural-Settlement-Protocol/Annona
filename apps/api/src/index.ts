import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { agreementsRoute } from "./routes/agreements.js";
import { farmersRoute } from "./routes/farmers.js";
import { healthRoute } from "./routes/health.js";
import { referenceRoute } from "./routes/reference.js";

/**
 * Annona API (abstraction layer).
 * Hosts: REST endpoints (also back @annona/sdk), the event indexer,
 * the Path-A settlement orchestrator, and the AI assistant.
 * See docs/technical/ARCHITECTURE.md section 2.
 *
 * MVP: skeleton. Wire indexer + settlement + ai after contract deploy.
 */
const app = new Hono();

app.route("/health", healthRoute);
app.route("/agreements", agreementsRoute);
app.route("/farmers", farmersRoute);
app.route("/reference", referenceRoute);

app.get("/", (c) => c.json({ name: "annona-api", status: "ok" }));

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[annona-api] listening on http://localhost:${info.port}`);
});

export type AppType = typeof app;
