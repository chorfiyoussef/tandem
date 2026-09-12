import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { setupSchema, slugify, suggestPrefix } from "@tandem/shared";
import { admin } from "../lib/supabase.js";

export const setup = new Hono();

async function needsSetup(): Promise<boolean> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new HTTPException(500, { message: "Couldn't reach Supabase Auth." });
  return data.users.length === 0;
}

setup.get("/status", async (c) => c.json({ needsSetup: await needsSetup() }));

/** First-run: create the owner account and their workspace. Only works while there are no users. */
setup.post("/", async (c) => {
  if (!(await needsSetup())) throw new HTTPException(403, { message: "Tandem is already set up. Sign in instead." });
  const body = setupSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) throw new HTTPException(400, { message: body.error.issues[0]?.message ?? "Check the form and try again." });
  const { email, password, fullName, workspaceName } = body.data;

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !created.user) throw new HTTPException(400, { message: error?.message ?? "Couldn't create the account." });

  // Create the workspace as that user so the RPC's auth.uid() is set.
  const { data: session, error: signInErr } = await admin.auth.signInWithPassword({ email, password });
  if (signInErr || !session.session) throw new HTTPException(500, { message: "Account created, but sign-in failed. Try signing in." });
  const { asUser } = await import("../lib/supabase.js");
  const userClient = asUser(session.session.access_token);
  let slug = slugify(workspaceName) || "team";
  const { data: ws, error: wsErr } = await userClient.rpc("create_workspace", { p_name: workspaceName, p_slug: slug, p_prefix: suggestPrefix(workspaceName) });
  if (wsErr) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const retry = await userClient.rpc("create_workspace", { p_name: workspaceName, p_slug: slug, p_prefix: suggestPrefix(workspaceName) });
    if (retry.error) throw new HTTPException(500, { message: "Account created, but the workspace couldn't be. Sign in to create one." });
    return c.json({ slug: retry.data.slug });
  }
  return c.json({ slug: ws.slug });
});
