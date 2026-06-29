import { Hono } from "hono";

export const healthRoute = new Hono().get("/", (c) =>
  c.json({ status: "ok", service: "annona-api", time: new Date().toISOString() }),
);
