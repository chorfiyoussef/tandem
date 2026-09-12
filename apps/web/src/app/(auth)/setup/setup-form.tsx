"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard, FormError } from "@/components/common/auth-card";

export function SetupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ needsSetup: boolean }>("/setup/status", { auth: false })
      .then((s) => !s.needsSetup && router.replace("/login"))
      .catch(() => setError("The Tandem API isn't reachable. Start it and reload."));
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { slug } = await api<{ slug: string }>("/setup", {
        method: "POST",
        auth: false,
        json: { fullName, email: email.trim(), password, workspaceName },
      });
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace(`/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Set up Tandem" subtitle="Create the first account. You'll be the owner and can invite everyone else.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" autoComplete="name" required autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ws">Workspace name</Label>
          <Input id="ws" placeholder="Acme" required value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={busy} className="mt-1">
          {busy ? "Creating…" : "Create workspace"}
        </Button>
      </form>
    </AuthCard>
  );
}
