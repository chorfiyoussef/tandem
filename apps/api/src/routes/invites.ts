import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { inviteSchema, inviteSignupSchema } from "@tandem/shared";
import { admin } from "../lib/supabase.js";
import { requireUser, requireWorkspaceAdmin } from "../lib/auth.js";
import { sendInviteEmail } from "../lib/email.js";
import { emailEnabled, env } from "../env.js";

export const invites = new Hono();

async function findUserByEmail(email: string) {
  // Profiles mirror auth.users and are indexed by email for us.
  const { data } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
  return data?.id ?? null;
}

/** Admin: create invites for one or more emails; emails them when SMTP is configured. */
invites.post("/", requireUser, async (c) => {
  const user = c.get("user");
  const body = inviteSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) throw new HTTPException(400, { message: body.error.issues[0]?.message ?? "Check the emails and try again." });
  const { workspaceId, emails, role } = body.data;
  await requireWorkspaceAdmin(user.id, workspaceId);

  const [{ data: ws }, { data: inviter }] = await Promise.all([
    admin.from("workspaces").select("name").eq("id", workspaceId).single(),
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!ws) throw new HTTPException(404, { message: "Workspace not found." });

  const results: { email: string; link: string; emailed: boolean; error?: string }[] = [];
  for (const raw of emails) {
    const email = raw.toLowerCase();
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      const { data: member } = await admin.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("user_id", existingUser).maybeSingle();
      if (member) {
        results.push({ email, link: "", emailed: false, error: "already a member" });
        continue;
      }
    }
    // Reuse a pending invite for the same email if one exists.
    const { data: pending } = await admin
      .from("workspace_invites")
      .select("*")
      .eq("workspace_id", workspaceId)
      .ilike("email", email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    let token = pending?.token;
    if (!token) {
      const { data: inv, error } = await admin
        .from("workspace_invites")
        .insert({ workspace_id: workspaceId, email, role, invited_by: user.id })
        .select("token")
        .single();
      if (error || !inv) {
        results.push({ email, link: "", emailed: false, error: "couldn't create invite" });
        continue;
      }
      token = inv.token;
    } else if (pending && pending.role !== role) {
      await admin.from("workspace_invites").update({ role }).eq("id", pending.id);
    }
    const link = `${env.APP_URL}/invite/${token}`;
    let emailed = false;
    if (emailEnabled) {
      try {
        emailed = await sendInviteEmail({ to: email, workspaceName: ws.name, inviterName: inviter?.full_name ?? null, link });
      } catch (err) {
        console.error("invite email failed", err);
      }
    }
    results.push({ email, link, emailed });
  }
  return c.json({ results });
});

/** Public: describe an invite so the invite page can render. */
invites.get("/:token", async (c) => {
  const token = c.req.param("token");
  const { data: inv } = await admin
    .from("workspace_invites")
    .select("email, role, accepted_at, expires_at, invited_by, workspaces(name, slug)")
    .eq("token", token)
    .maybeSingle();
  if (!inv) throw new HTTPException(404, { message: "This invite link isn't valid." });
  const workspace = inv.workspaces as unknown as { name: string; slug: string } | null;
  const { data: inviter } = inv.invited_by ? await admin.from("profiles").select("full_name").eq("id", inv.invited_by).maybeSingle() : { data: null };
  return c.json({
    workspace: { name: workspace?.name ?? "a workspace", slug: workspace?.slug ?? "" },
    email: inv.email,
    role: inv.role,
    invitedBy: inviter?.full_name ?? null,
    expired: new Date(inv.expires_at) < new Date(),
    accepted: !!inv.accepted_at,
    userExists: !!(await findUserByEmail(inv.email)),
  });
});

/** Public: create the account for an invited email (bypasses email confirmation and disabled sign-ups). */
invites.post("/:token/signup", async (c) => {
  const token = c.req.param("token");
  const body = inviteSignupSchema.safeParse({ ...(await c.req.json().catch(() => ({}))), token });
  if (!body.success) throw new HTTPException(400, { message: body.error.issues[0]?.message ?? "Check the form and try again." });
  const { data: inv } = await admin.from("workspace_invites").select("email, accepted_at, expires_at").eq("token", token).maybeSingle();
  if (!inv) throw new HTTPException(404, { message: "This invite link isn't valid." });
  if (inv.accepted_at) throw new HTTPException(400, { message: "This invite was already used." });
  if (new Date(inv.expires_at) < new Date()) throw new HTTPException(400, { message: "This invite has expired." });
  if (await findUserByEmail(inv.email)) throw new HTTPException(400, { message: "An account already exists for this email. Sign in instead." });

  const { error } = await admin.auth.admin.createUser({
    email: inv.email,
    password: body.data.password,
    email_confirm: true,
    user_metadata: { full_name: body.data.fullName },
  });
  if (error) throw new HTTPException(400, { message: error.message });
  return c.json({ ok: true });
});
