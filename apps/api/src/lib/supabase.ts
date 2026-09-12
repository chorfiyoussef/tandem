import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tandem/shared/database";
import { env } from "../env.js";

/** Service-role client: bypasses RLS. Only use after checking permissions yourself. */
export const admin: SupabaseClient<Database> = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** A client acting as the given user (RLS applies). */
export function asUser(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
