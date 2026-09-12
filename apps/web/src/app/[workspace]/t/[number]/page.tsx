import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TaskPermalink({ params }: { params: Promise<{ workspace: string; number: string }> }) {
  const { workspace: slug, number } = await params;
  const supabase = await createClient();
  const { data: ws } = await supabase.from("workspaces").select("id").eq("slug", slug).maybeSingle();
  if (!ws) notFound();
  const { data: task } = await supabase.from("tasks").select("id, list_id").eq("workspace_id", ws.id).eq("number", Number(number)).maybeSingle();
  if (!task) notFound();
  redirect(`/${slug}/l/${task.list_id}?task=${task.id}`);
}
