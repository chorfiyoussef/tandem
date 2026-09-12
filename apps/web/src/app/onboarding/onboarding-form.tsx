"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify, suggestPrefix } from "@tandem/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, FormError } from "@/components/common/auth-card";

export function OnboardingForm({ pendingInvites }: { pendingInvites: { token: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_workspace", {
      p_name: name.trim(),
      p_slug: slug,
      p_prefix: suggestPrefix(name),
    });
    if (error) {
      setError(error.message.includes("duplicate") ? "That URL is taken. Try another." : error.message);
      setBusy(false);
      return;
    }
    router.replace(`/${data.slug}`);
    router.refresh();
  }

  async function join(token: string) {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.replace(`/${data.slug}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {pendingInvites.length > 0 ? (
        <AuthCard title="You've been invited" subtitle="Join a workspace your teammates already set up.">
          <div className="flex flex-col gap-2">
            {pendingInvites.map((i) => (
              <Button key={i.token} size="lg" variant="outline" className="justify-between" onClick={() => join(i.token)} disabled={busy}>
                <span>{i.name}</span>
                <span className="text-ink-2">Join</span>
              </Button>
            ))}
          </div>
        </AuthCard>
      ) : null}

      <AuthCard title={pendingInvites.length ? "Or start your own" : "Create your workspace"} subtitle="A workspace holds your team's spaces, lists and tasks.">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Workspace name</Label>
            <Input id="name" placeholder="Acme" required autoFocus value={name} onChange={(e) => onNameChange(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">URL</Label>
            <div className="flex h-8 items-center rounded-lg border border-input px-2.5 text-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
              <span className="text-ink-3">/</span>
              <input
                id="slug"
                className="min-w-0 flex-1 bg-transparent outline-none"
                value={slug}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
              />
            </div>
          </div>
          <FormError message={error} />
          <Button type="submit" size="lg" disabled={busy || !name.trim() || !slug}>
            {busy ? "Creating…" : "Create workspace"}
          </Button>
        </form>
      </AuthCard>
    </div>
  );
}
