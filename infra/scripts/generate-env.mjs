#!/usr/bin/env node
/**
 * Creates infra/.env from infra/.env.example with fresh secrets.
 *
 *   node scripts/generate-env.mjs --app tandem.example.com --supabase supabase.tandem.example.com --email you@example.com
 *
 * Re-running never overwrites an existing .env unless --force is passed.
 */
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const examplePath = join(here, "..", ".env.example");
const envPath = join(here, "..", ".env");

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]] : [])).filter((x) => x.length),
);

if (existsSync(envPath) && !args.force) {
  console.error(`${envPath} already exists. Pass --force to overwrite (this rotates every secret!).`);
  process.exit(1);
}

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const secret = (bytes = 32) => randomBytes(bytes).toString("hex");
const password = (bytes = 24) => randomBytes(bytes).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 32);

function signJwt(payload, key) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", key).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

const jwtSecret = secret(32);
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 60 * 60 * 24 * 365 * 10; // 10 years
const anonKey = signJwt({ role: "anon", iss: "supabase", iat, exp }, jwtSecret);
const serviceKey = signJwt({ role: "service_role", iss: "supabase", iat, exp }, jwtSecret);

const values = {
  APP_DOMAIN: typeof args.app === "string" ? args.app : undefined,
  SUPABASE_DOMAIN: typeof args.supabase === "string" ? args.supabase : undefined,
  ACME_EMAIL: typeof args.email === "string" ? args.email : undefined,
  POSTGRES_PASSWORD: password(),
  JWT_SECRET: jwtSecret,
  ANON_KEY: anonKey,
  SERVICE_ROLE_KEY: serviceKey,
  DASHBOARD_PASSWORD: password(),
  SECRET_KEY_BASE: secret(32),
  VAULT_ENC_KEY: password(24).slice(0, 32),
  PG_META_CRYPTO_KEY: password(24).slice(0, 32),
  REALTIME_DB_ENC_KEY: password(12).slice(0, 16),
  S3_PROTOCOL_ACCESS_KEY_ID: secret(16),
  S3_PROTOCOL_ACCESS_KEY_SECRET: secret(32),
  CRON_SECRET: secret(24),
};

if (values.APP_DOMAIN && values.SUPABASE_DOMAIN) {
  Object.assign(values, {
    SUPABASE_PUBLIC_URL: `https://${values.SUPABASE_DOMAIN}`,
    API_EXTERNAL_URL: `https://${values.SUPABASE_DOMAIN}/auth/v1`,
    SITE_URL: `https://${values.APP_DOMAIN}`,
    ADDITIONAL_REDIRECT_URLS: `https://${values.APP_DOMAIN}/auth/callback`,
    SMTP_FROM: `Tandem <tandem@${values.APP_DOMAIN}>`,
  });
}

let out = readFileSync(examplePath, "utf8");
for (const [key, value] of Object.entries(values)) {
  if (value === undefined) continue;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (!re.test(out)) throw new Error(`${key} missing from .env.example`);
  out = out.replace(re, `${key}=${value}`);
}
writeFileSync(envPath, out, { mode: 0o600 });

console.log(`Wrote ${envPath}`);
if (!values.APP_DOMAIN || !values.SUPABASE_DOMAIN || !values.ACME_EMAIL) {
  console.log("Now edit it and set APP_DOMAIN, SUPABASE_DOMAIN, ACME_EMAIL and the four URLs derived from them (and SMTP_* if you want email).");
}
console.log(`Studio login: ${/^DASHBOARD_USERNAME=(.*)$/m.exec(out)?.[1]} / ${values.DASHBOARD_PASSWORD}`);
