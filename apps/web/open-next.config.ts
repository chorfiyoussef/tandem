import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Runs the Next.js app on Cloudflare Workers. Everything is dynamic (per-user,
// behind auth), so no incremental cache / R2 is configured.
export default defineCloudflareConfig({});
