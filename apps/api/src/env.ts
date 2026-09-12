import { z } from "zod";

// Load .env in development; production passes real environment variables.
try {
  process.loadEnvFile(".env");
} catch {
  /* no .env file: rely on the environment */
}

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Tandem <tandem@localhost>"),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  CRON_SECRET: z.string().optional(),
  /** IANA timezone used for daily reminders (e.g. Europe/Berlin). */
  REMINDER_TZ: z.string().default("UTC"),
  /** Hour of day (0-23) in REMINDER_TZ to send due reminders. */
  REMINDER_HOUR: z.coerce.number().min(0).max(23).default(8),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:\n" + JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export const emailEnabled = !!env.SMTP_HOST;
