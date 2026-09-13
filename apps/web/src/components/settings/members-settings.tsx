"use client";

import { useState } from "react";
import { CopyIcon, MailIcon, Trash2Icon, XIcon } from "@/components/icons";
import { toast } from "sonner";
import { ROLE_META, ROLES, type MemberRole } from "@tandem/shared";
import { SettingsSection } from "./settings-shell";
import { useWorkspace } from "@/components/workspace-provider";
import { useInvites, useMembers, useRemoveMember, useRevokeInvite, useUpdateMemberRole } from "@/lib/queries/workspace";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/queries/keys";
import { api } from "@/lib/api";
import { UserAvatar, displayName } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatRelative } from "@/lib/dates";
import type { Member } from "@/lib/types";

type InviteResult = { email: string; link: string; emailed: boolean; error?: string };

export function MembersSettings() {
  const { workspace, userId, isAdmin, role } = useWorkspace();
  const { data: members } = useMembers(workspace.id);
  const { data: invites } = useInvites(workspace.id);
  const updateRole = useUpdateMemberRole(workspace.id);
  const removeMember = useRemoveMember(workspace.id);
  const revoke = useRevokeInvite(workspace.id);
  const qc = useQueryClient();
  const [emails, setEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<InviteResult[]>([]);
  const [removing, setRemoving] = useState<Member | null>(null);

  async function sendInvites(e: React.FormEvent) {
    e.preventDefault();
    const list = emails.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return;
    setBusy(true);
    try {
      const res = await api<{ results: InviteResult[] }>("/invites", { method: "POST", json: { workspaceId: workspace.id, emails: list, role: inviteRole } });
      setResults(res.results);
      setEmails("");
      qc.invalidateQueries({ queryKey: qk.invites(workspace.id) });
      const emailed = res.results.filter((r) => r.emailed).length;
      if (emailed) toast.success(emailed === 1 ? "Invite emailed" : `${emailed} invites emailed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send invites.");
    } finally {
      setBusy(false);
    }
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Link copied");
  };

  const canChange = (m: Member) => isAdmin && m.user_id !== userId && !(m.role === "owner" && role !== "owner");

  return (
    <>
      <SettingsSection title="Members" description={`${members?.length ?? 0} people in ${workspace.name}.`}>
        <ul className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-card">
          {(members ?? []).map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 px-3 py-2.5 hairline-b last:shadow-none">
              <UserAvatar user={m.profiles} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">
                  {displayName(m.profiles)}
                  {m.user_id === userId ? <span className="font-normal text-ink-3"> (you)</span> : null}
                </p>
                <p className="truncate text-[13px] text-ink-2">{m.profiles.email}</p>
              </div>
              {canChange(m) ? (
                <Select value={m.role} onValueChange={(v) => updateRole.mutate({ userId: m.user_id, role: v as MemberRole })}>
                  <SelectTrigger size="sm" className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.filter((r) => r !== "owner" || role === "owner").map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_META[r].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="w-28 text-right text-[13px] text-ink-2">{ROLE_META[m.role as MemberRole].label}</span>
              )}
              {canChange(m) ? (
                <Button variant="ghost" size="icon-sm" className="text-ink-3 hover:text-destructive" aria-label="Remove member" onClick={() => setRemoving(m)}>
                  <Trash2Icon />
                </Button>
              ) : (
                <span className="size-7" />
              )}
            </li>
          ))}
        </ul>
      </SettingsSection>

      {isAdmin ? (
        <SettingsSection title="Invite people" description="Enter one or more email addresses. Each person gets their own link.">
          <form onSubmit={sendInvites} className="flex max-w-lg flex-col gap-3">
            <Textarea value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="ana@company.com, ben@company.com" rows={2} />
            <div className="flex items-center gap-2">
              <Label className="text-ink-2">Join as</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MemberRole)}>
                <SelectTrigger size="sm" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.filter((r) => r !== "owner").map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_META[r].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" className="ml-auto" disabled={busy || !emails.trim()}>
                <MailIcon /> Send invites
              </Button>
            </div>
            <p className="text-[13px] text-ink-3">{ROLE_META[inviteRole].description}</p>
          </form>

          {results.length > 0 ? (
            <ul className="mt-4 flex max-w-lg flex-col gap-2">
              {results.map((r) => (
                <li key={r.email} className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{r.email}</span>
                    <span className="text-ink-2"> — {r.error ? r.error : r.emailed ? "invite emailed" : "share this link"}</span>
                  </span>
                  {r.link ? (
                    <Button size="xs" variant="outline" onClick={() => copy(r.link)}>
                      <CopyIcon /> Copy link
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {invites && invites.length > 0 ? (
            <div className="mt-6">
              <h3 className="mb-2 text-[14px] font-medium">Pending invites</h3>
              <ul className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-card">
                {invites.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-3 py-2 text-[14px] hairline-b last:shadow-none">
                    <span className="min-w-0 flex-1 truncate">{i.email}</span>
                    <span className="text-[13px] text-ink-3">{ROLE_META[i.role as MemberRole].label}</span>
                    <span className="text-[13px] text-ink-3">{formatRelative(i.created_at)}</span>
                    <Button size="icon-xs" variant="ghost" aria-label="Copy invite link" onClick={() => copy(`${window.location.origin}/invite/${i.token}`)}>
                      <CopyIcon />
                    </Button>
                    <Button size="icon-xs" variant="ghost" className="text-ink-3 hover:text-destructive" aria-label="Revoke invite" onClick={() => revoke.mutate(i.id)}>
                      <XIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </SettingsSection>
      ) : null}

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {displayName(removing?.profiles)}?</AlertDialogTitle>
            <AlertDialogDescription>They lose access to this workspace right away. Their tasks and comments stay.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (!removing) return;
                try {
                  await removeMember.mutateAsync(removing.user_id);
                  setRemoving(null);
                } catch {
                  toast.error("Couldn't remove the member.");
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
