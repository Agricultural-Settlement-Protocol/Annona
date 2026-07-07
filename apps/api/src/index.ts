import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { agreementsRoute } from "./routes/agreements.js";
import { farmersRoute } from "./routes/farmers.js";
import { healthRoute } from "./routes/health.js";
import { coopRoute, overviewRoute } from "./routes/overview.js";
import { referenceRoute } from "./routes/reference.js";
import { residuRoute } from "./routes/residu.js";
import { settlementsRoute } from "./routes/settlements.js";

/**
 * Annona API (abstraction layer).
 * Hosts: REST endpoints (also back @annona/sdk), the event indexer,
 * the Path-A settlement orchestrator, and the AI assistant.
 * See docs/technical/ARCHITECTURE.md section 2.
 *
 * MVP: skeleton. Wire indexer + settlement + ai after contract deploy.
 */
const app = new Hono();

// Browser reads come from the web app on another origin (:3000 -> :8787).
// Read-only API; permissive CORS is fine for the testnet MVP.
app.use("*", cors());

app.route("/health", healthRoute);
app.route("/agreements", agreementsRoute);
app.route("/farmers", farmersRoute);
app.route("/reference", referenceRoute);
app.route("/overview", overviewRoute);
app.route("/coop", coopRoute);
app.route("/settlements", settlementsRoute);
app.route("/residu", residuRoute);

app.get("/", (c) => c.json({ name: "annona-api", status: "ok" }));

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[annona-api] listening on http://localhost:${info.port}`);
});

export type AppType = typeof app;
