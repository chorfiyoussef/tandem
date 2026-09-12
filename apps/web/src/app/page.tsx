import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(slug)")
    .eq("user_id", user.id)
    .order("created_at");

  const slugs = (memberships ?? [])
    .map((m) => (m.workspaces as unknown as { slug: string } | null)?.slug)
    .filter((s): s is string => !!s);

  if (slugs.length === 0) redirect("/onboarding");

  const last = (await cookies()).get("tandem-ws")?.value;
  redirect(`/${last && slugs.includes(last) ? last : slugs[0]}`);
}
