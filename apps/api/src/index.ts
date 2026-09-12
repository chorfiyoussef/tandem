import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { Cron } from "croner";
import { env, emailEnabled } from "./env.js";
import { setup } from "./routes/setup.js";
import { invites } from "./routes/invites.js";
import { jobs } from "./routes/jobs.js";
import { runDueReminders } from "./jobs/due-reminders.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => (origin === env.APP_URL || origin?.startsWith("http://localhost") ? origin : env.APP_URL),
    allowHeaders: ["Authorization", "Content-Type", "X-Cron-Secret"],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    maxAge: 600,
  }),
);

app.get("/health", (c) => c.json({ ok: true, email: emailEnabled, version: process.env.npm_package_version ?? "dev" }));
app.route("/setup", setup);
app.route("/invites", invites);
app.route("/jobs", jobs);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "Something went wrong on the server." }, 500);
});

// Daily due-date reminders.
new Cron(`0 ${env.REMINDER_HOUR} * * *`, { timezone: env.REMINDER_TZ }, async () => {
  try {
    const r = await runDueReminders();
    console.log(`[reminders] ${r.day}: ${r.notifications} notifications, ${r.emails} emails`);
  } catch (err) {
    console.error("[reminders] failed", err);
  }
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Tandem API listening on http://localhost:${info.port} (email ${emailEnabled ? "on" : "off"})`);
});
