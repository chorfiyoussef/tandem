import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { AppShell } from "@/components/shell/app-shell";
import type { MemberRole, Profile, Workspace } from "@/lib/types";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: workspace }, { data: profile }] = await Promise.all([
    supabase.from("workspaces").select("*").eq("slug", slug).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);
  if (!workspace || !profile) notFound();

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) notFound();

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspaces(id, name, slug, icon)")
    .eq("user_id", user.id);
  const workspaces = (memberships ?? [])
    .map((m) => m.workspaces as unknown as Pick<Workspace, "id" | "name" | "slug" | "icon"> | null)
    .filter((w): w is Pick<Workspace, "id" | "name" | "slug" | "icon"> => !!w);

  return (
    <WorkspaceProvider workspace={workspace as Workspace} role={membership.role as MemberRole} profile={profile as Profile}>
      <AppShell workspaces={workspaces}>{children}</AppShell>
    </WorkspaceProvider>
  );
}
