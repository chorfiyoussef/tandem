"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AuthCard, FormError } from "@/components/common/auth-card";

type InviteInfo = {
  workspace: { name: string; slug: string };
  email: string;
  invitedBy: string | null;
  expired: boolean;
  accepted: boolean;
  userExists: boolean;
};

export function InviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null | undefined>(undefined);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<InviteInfo>(`/invites/${token}`, { auth: false })
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : "This invite link isn't valid."));
    createClient()
      .auth.getUser()
      .then(({ data }) => setSessionEmail(data.user?.email ?? null));
  }, [token]);

  async function accept() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
    if (error) throw error;
    router.replace(`/${data.slug}`);
    router.refresh();
  }

  async function join() {
    setBusy(true);
    setError(null);
    try {
      await accept();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join the workspace.");
      setBusy(false);
    }
  }

  async function signInAndJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: info.email, password });
      if (error) throw new Error("That password doesn't match.");
      await accept();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.");
      setBusy(false);
    }
  }

  async function signUpAndJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/invites/${token}/signup`, { method: "POST", auth: false, json: { token, fullName, password } });
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: info.email, password });
      if (error) throw error;
      await accept();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your account.");
      setBusy(false);
    }
  }

  if (!info && !error) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (!info) return <AuthCard title="This invite isn't valid">{<FormError message={error} />}</AuthCard>;
  if (info.accepted) return <AuthCard title="This invite was already used" subtitle="Ask an admin for a new one if you still need access." />;
  if (info.expired) return <AuthCard title="This invite has expired" subtitle="Ask an admin to send a fresh one." />;

  const title = `Join ${info.workspace.name}`;
  const subtitle = info.invitedBy ? `${info.invitedBy} invited ${info.email}.` : `Invitation for ${info.email}.`;

  // Already signed in as the invitee
  if (sessionEmail && sessionEmail.toLowerCase() === info.email.toLowerCase()) {
    return (
      <AuthCard title={title} subtitle={subtitle}>
        <FormError message={error} />
        <Button size="lg" className="w-full" onClick={join} disabled={busy}>
          {busy ? "Joining…" : `Join ${info.workspace.name}`}
        </Button>
      </AuthCard>
    );
  }

  // Signed in as someone else
  if (sessionEmail) {
    return (
      <AuthCard title={title} subtitle={`You're signed in as ${sessionEmail}, but this invite is for ${info.email}.`}>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={async () => {
            await createClient().auth.signOut();
            setSessionEmail(null);
          }}
        >
          Switch account
        </Button>
      </AuthCard>
    );
  }

  if (info.userExists) {
    return (
      <AuthCard title={title} subtitle={subtitle}>
        <form onSubmit={signInAndJoin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={info.email} readOnly className="text-ink-2" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <FormError message={error} />
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Joining…" : "Sign in and join"}
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={title} subtitle={subtitle}>
      <form onSubmit={signUpAndJoin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" autoComplete="name" required autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={info.email} readOnly className="text-ink-2" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Choose a password</Label>
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Creating account…" : "Create account and join"}
        </Button>
      </form>
    </AuthCard>
  );
}
