"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SettingsSection } from "./settings-shell";
import { useWorkspace } from "@/components/workspace-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function GeneralSettings() {
  const { workspace, isAdmin, role } = useWorkspace();
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [prefix, setPrefix] = useState(workspace.task_prefix);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const dirty = name.trim() !== workspace.name || prefix !== workspace.task_prefix;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("workspaces").update({ name: name.trim(), task_prefix: prefix.toUpperCase() }).eq("id", workspace.id);
    setBusy(false);
    if (error) return toast.error(error.message.includes("task_prefix") ? "Prefix must be 1–5 letters." : "Couldn't save changes.");
    toast.success("Saved");
    router.refresh();
  }

  async function deleteWorkspace() {
    const supabase = createClient();
    const { error } = await supabase.from("workspaces").delete().eq("id", workspace.id);
    if (error) return toast.error("Couldn't delete the workspace.");
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      <SettingsSection title="Workspace" description="How your workspace appears to everyone in it.">
        <form onSubmit={save} className="flex max-w-md flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ws-name">Name</Label>
            <Input id="ws-name" value={name} disabled={!isAdmin} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ws-prefix">Task prefix</Label>
            <Input id="ws-prefix" value={prefix} disabled={!isAdmin} maxLength={5} className="w-28 uppercase" onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} />
            <p className="text-[12px] text-ink-3">
              Tasks are numbered like <span className="tabular">{prefix || "T"}-42</span>.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>URL</Label>
            <p className="text-[13px] text-ink-2">/{workspace.slug}</p>
          </div>
          {isAdmin ? (
            <div>
              <Button type="submit" disabled={!dirty || busy || !name.trim() || !prefix}>
                Save changes
              </Button>
            </div>
          ) : null}
        </form>
      </SettingsSection>

      {role === "owner" ? (
        <SettingsSection title="Delete workspace" description="Permanently removes every space, list, task and comment. There is no undo." danger>
          <AlertDialog onOpenChange={(o) => !o && setConfirm("")}>
            <Button variant="destructive" asChild>
              <AlertDialogTriggerButton />
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{workspace.name}”?</AlertDialogTitle>
                <AlertDialogDescription>Type the workspace name to confirm. Everyone will lose access immediately.</AlertDialogDescription>
              </AlertDialogHeader>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={workspace.name} aria-label="Confirm workspace name" />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" disabled={confirm !== workspace.name} onClick={deleteWorkspace}>
                  Delete workspace
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SettingsSection>
      ) : null}
    </>
  );
}

import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
function AlertDialogTriggerButton() {
  return (
    <AlertDialogTrigger asChild>
      <button type="button">Delete workspace…</button>
    </AlertDialogTrigger>
  );
}
