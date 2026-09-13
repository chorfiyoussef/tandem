"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SettingsSection } from "./settings-shell";
import { useWorkspace } from "@/components/workspace-provider";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileSettings() {
  const { profile } = useWorkspace();
  const router = useRouter();
  const [name, setName] = useState(profile.full_name ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", profile.id);
    setBusy(false);
    if (error) return toast.error("Couldn't save your name.");
    toast.success("Saved");
    router.refresh();
  }

  async function uploadAvatar(file: File) {
    if (file.size > 2 * 1024 * 1024) return toast.error("Choose an image under 2 MB.");
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${profile.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) return toast.error("Couldn't upload the image.");
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    if (error) return toast.error("Couldn't save the image.");
    toast.success("Photo updated");
    router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPassword("");
    toast.success("Password updated");
  }

  return (
    <>
      <SettingsSection title="Profile" description="How you appear to your teammates.">
        <div className="flex items-center gap-4">
          <UserAvatar user={profile} size="xl" />
          <div className="flex flex-col gap-1">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              Change photo
            </Button>
            <p className="text-[13px] text-ink-3">PNG or JPG, under 2 MB.</p>
          </div>
        </div>
        <form onSubmit={saveName} className="mt-5 flex max-w-md flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full-name">Name</Label>
            <Input id="full-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <p className="text-[14px] text-ink-2">{profile.email}</p>
          </div>
          <div>
            <Button type="submit" disabled={busy || name.trim() === (profile.full_name ?? "") || !name.trim()}>
              Save changes
            </Button>
          </div>
        </form>
      </SettingsSection>

      <SettingsSection title="Password">
        <form onSubmit={changePassword} className="flex max-w-md flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <Button type="submit" variant="outline" disabled={busy || password.length < 8}>
              Update password
            </Button>
          </div>
        </form>
      </SettingsSection>
    </>
  );
}
