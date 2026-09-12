import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoMark, Wordmark } from "@/components/brand";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Create a workspace" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invites } = await supabase
    .from("workspace_invites")
    .select("token, workspaces(name)")
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  const pending = (invites ?? []).map((i) => ({
    token: i.token,
    name: (i.workspaces as unknown as { name: string } | null)?.name ?? "a workspace",
  }));

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <LogoMark size={32} />
        <Wordmark className="text-lg" />
      </div>
      <div className="w-full max-w-[380px]">
        <OnboardingForm pendingInvites={pending} />
      </div>
    </div>
  );
}
