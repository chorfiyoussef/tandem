"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheckIcon, InboxIcon, XIcon } from "@/components/icons";
import { PageHeader } from "@/components/shell/page-header";
import { useWorkspace } from "@/components/workspace-provider";
import { useDeleteNotification, useMarkRead, useNotifications } from "@/lib/queries/notifications";
import { UserAvatar, displayName } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatRelative } from "@/lib/dates";
import type { NotificationRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function InboxPage() {
  const { workspace, userId, href } = useWorkspace();
  const router = useRouter();
  const { data: notifications, isPending } = useNotifications(userId);
  const markRead = useMarkRead(userId);
  const remove = useDeleteNotification(userId);
  const [tab, setTab] = useState<"unread" | "all">("unread");

  const all = (notifications ?? []).filter((n) => n.workspace_id === workspace.id);
  const shown = tab === "unread" ? all.filter((n) => !n.read_at) : all;
  const unread = all.filter((n) => !n.read_at).length;

  const open = (n: NotificationRow) => {
    if (!n.read_at) markRead.mutate([n.id]);
    if (n.tasks) router.push(href(`/l/${n.tasks.list_id}?task=${n.tasks.id}`));
  };

  return (
    <>
      <PageHeader title="Inbox">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "unread" | "all")}>
          <TabsList>
            <TabsTrigger value="unread">
              Unread {unread > 0 ? <span className="tabular text-ink-3">{unread}</span> : null}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="ghost" size="sm" className="ml-1 text-ink-2" disabled={unread === 0} onClick={() => markRead.mutate("all")}>
          <CheckCheckIcon />
          <span className="hidden sm:inline">Mark all read</span>
        </Button>
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4 md:px-6">
          {isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : shown.length === 0 ? (
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="pastel-mint">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>{tab === "unread" ? "You're all caught up" : "Nothing here yet"}</EmptyTitle>
                <EmptyDescription>Assignments, mentions and comments on tasks you watch will show up here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ol className="flex flex-col">
              {shown.map((n) => (
                <li key={n.id} className="group/n relative">
                  <button
                    type="button"
                    onClick={() => open(n)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/60 hairline-b",
                      !n.read_at && "bg-action-soft/20",
                    )}
                  >
                    <span className={cn("mt-2 size-1.5 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-action")} aria-hidden />
                    <UserAvatar user={n.actor} size="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-ink">{describe(n)}</span>
                      {n.tasks ? (
                        <span className="mt-0.5 block truncate text-[12px] text-ink-2">
                          <span className="tabular text-ink-3">
                            {workspace.task_prefix}-{n.tasks.number}
                          </span>{" "}
                          {n.tasks.title}
                        </span>
                      ) : null}
                      {typeof n.payload === "object" && n.payload && "excerpt" in n.payload && (n.payload as { excerpt?: string }).excerpt ? (
                        <span className="mt-1 block truncate rounded-md bg-muted/70 px-2 py-1 text-[12px] text-ink-2">{(n.payload as { excerpt: string }).excerpt}</span>
                      ) : null}
                    </span>
                    <time className="shrink-0 text-[11px] text-ink-3">{formatRelative(n.created_at)}</time>
                  </button>
                  <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={() => remove.mutate(n.id)}
                    className="absolute right-2 top-2 rounded p-1 text-ink-3 opacity-0 hover:bg-muted hover:text-ink group-hover/n:opacity-100"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}

function describe(n: NotificationRow): React.ReactNode {
  const who = <span className="font-medium">{displayName(n.actor)}</span>;
  const p = (n.payload ?? {}) as Record<string, string | undefined>;
  switch (n.type) {
    case "assigned":
      return <>{who} assigned you a task</>;
    case "mentioned":
      return <>{who} mentioned you in a comment</>;
    case "commented":
      return <>{who} commented on a task you watch</>;
    case "status_changed":
      return (
        <>
          {who} moved a task to <span className="font-medium">{p.to}</span>
        </>
      );
    case "due_soon":
      return <>A task assigned to you is due {p.when ?? "soon"}</>;
    case "invited":
      return <>{who} invited you</>;
    default:
      return <>{who} updated a task</>;
  }
}
