import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { env } from "../env.js";
import { runDueReminders } from "../jobs/due-reminders.js";

export const jobs = new Hono();

/** Manually trigger the daily reminder job (protected by CRON_SECRET). */
jobs.post("/due-reminders", async (c) => {
  const secret = c.req.header("x-cron-secret") ?? c.req.query("secret");
  if (!env.CRON_SECRET || secret !== env.CRON_SECRET) throw new HTTPException(401, { message: "Missing or invalid CRON_SECRET." });
  const result = await runDueReminders();
  return c.json(result);
});
