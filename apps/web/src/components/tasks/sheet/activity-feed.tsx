"use client";

import { useActivity } from "@/lib/queries/task-details";
import { useMembers } from "@/lib/queries/workspace";
import { useWorkspace } from "@/components/workspace-provider";
import { UserAvatar, displayName } from "@/components/common/user-avatar";
import { formatRelative, formatDateTime, formatDue } from "@/lib/dates";
import { PRIORITY_META, type Priority } from "@tandem/shared";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ActivityRow, TaskRow } from "@/lib/types";

export function ActivityFeed({ task }: { task: TaskRow }) {
  const { workspace } = useWorkspace();
  const { data: activity, isPending } = useActivity(task.id);
  const { data: members } = useMembers(workspace.id);
  const nameOf = (id?: string | null) => displayName(members?.find((m) => m.user_id === id)?.profiles ?? null);

  if (isPending) return <p className="py-4 text-[13px] text-ink-3">Loading…</p>;
  if (!activity || activity.length === 0) return <p className="py-4 text-[14px] text-ink-3">Nothing has happened yet.</p>;

  return (
    <ol className="flex flex-col gap-2.5">
      {activity.map((a) => (
        <li key={a.id} className="flex items-start gap-2.5 text-[13.5px]">
          <UserAvatar user={a.profiles} size="sm" className="mt-0.5" />
          <span className="min-w-0 flex-1 text-ink-2">
            <span className="font-medium text-ink">{displayName(a.profiles)}</span> {describe(a, nameOf)}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <time dateTime={a.created_at} className="shrink-0 text-[12px] text-ink-3">
                {formatRelative(a.created_at)}
              </time>
            </TooltipTrigger>
            <TooltipContent>{formatDateTime(a.created_at)}</TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ol>
  );
}

function describe(a: ActivityRow, nameOf: (id?: string | null) => string): React.ReactNode {
  const p = (a.payload ?? {}) as Record<string, string | null | undefined>;
  const em = (v?: string | null) => <span className="font-medium text-ink">{v ?? "—"}</span>;
  switch (a.type) {
    case "task_created":
      return "created this task";
    case "status_changed":
      return (
        <>
          changed status from {em(p.from)} to {em(p.to)}
        </>
      );
    case "priority_changed":
      return (
        <>
          set priority to {em(PRIORITY_META[(p.to as Priority) ?? "none"]?.label ?? p.to)}
        </>
      );
    case "due_date_changed":
      return p.to ? <>set the due date to {em(formatDue(p.to))}</> : "removed the due date";
    case "assignee_added":
      return <>assigned {em(nameOf(p.user_id))}</>;
    case "assignee_removed":
      return <>unassigned {em(nameOf(p.user_id))}</>;
    case "comment_added":
      return "commented";
    case "attachment_added":
      return "added an attachment";
    case "task_moved":
      return "moved this task to another list";
    case "task_completed":
      return "completed this task";
    case "task_reopened":
      return "reopened this task";
    case "task_updated":
      if (p.field === "title") return <>renamed this task to {em(p.to)}</>;
      if (p.field === "category") return p.to ? <>set the category to {em(p.to)}</> : "removed the category";
      return "updated this task";
    default:
      return "updated this task";
  }
}
