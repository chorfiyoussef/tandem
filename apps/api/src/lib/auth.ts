import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { admin } from "./supabase.js";

export type AuthUser = { id: string; email: string };

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
    token: string;
  }
}

/** Verifies the Supabase access token in the Authorization header. */
export async function requireUser(c: Context, next: Next) {
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HTTPException(401, { message: "Sign in to continue." });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HTTPException(401, { message: "Your session has expired. Sign in again." });
  c.set("user", { id: data.user.id, email: data.user.email ?? "" });
  c.set("token", token);
  await next();
}

export async function requireWorkspaceAdmin(userId: string, workspaceId: string) {
  const { data } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || (data.role !== "owner" && data.role !== "admin")) {
    throw new HTTPException(403, { message: "Only workspace admins can do that." });
  }
  return data.role;
}
