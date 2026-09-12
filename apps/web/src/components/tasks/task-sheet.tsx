"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRightIcon, CopyIcon, EyeIcon, EyeOffIcon, LinkIcon, MoreHorizontalIcon, Trash2Icon, XIcon, ArrowUpLeftIcon } from "@/components/icons";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/components/workspace-provider";
import { useOpenTask } from "@/hooks/use-open-task";
import { useDeleteTask, useTask } from "@/lib/queries/tasks";
import { useLists, useSpaces } from "@/lib/queries/workspace";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SpaceIcon } from "@/components/common/space-icon";
import { asPastel } from "@/components/common/pastel";
import { TaskTitle } from "./sheet/task-title";
import { TaskProperties } from "./sheet/task-properties";
import { TaskDescription } from "./sheet/task-description";
import { Subtasks } from "./sheet/subtasks";
import { Checklist } from "./sheet/checklist";
import { Attachments } from "./sheet/attachments";
import { CommentComposer, CommentList } from "./sheet/comments";
import { ActivityFeed } from "./sheet/activity-feed";
import { CompleteCheck } from "./complete-check";
import type { TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskSheet() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("task");
  const openTask = useOpenTask();
  const { data: task, isPending } = useTask(taskId);

  return (
    <Sheet open={!!taskId} onOpenChange={(o) => !o && openTask(null)}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 border-0 bg-surface p-0 shadow-sheet data-[side=right]:sm:max-w-[680px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          // Let Escape finish what it started (blur an input, close a picker)
          // before it closes the whole panel.
          const el = document.activeElement as HTMLElement | null;
          if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
            e.preventDefault();
            el.blur();
          }
        }}
      >
        <SheetTitle className="sr-only">{task?.title ?? "Task"}</SheetTitle>
        <SheetDescription className="sr-only">Task details</SheetDescription>
        {task ? (
          <TaskSheetBody key={task.id} task={task} />
        ) : isPending ? (
          <div className="flex flex-col gap-4 p-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-[14px] font-medium">This task isn’t available.</p>
            <p className="text-[13px] text-ink-2">It may have been deleted, or you don’t have access.</p>
            <Button variant="outline" className="mt-2" onClick={() => openTask(null)}>
              Close
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TaskSheetBody({ task }: { task: TaskRow }) {
  const { workspace, userId, canEdit, href } = useWorkspace();
  const openTask = useOpenTask();
  const deleteTask = useDeleteTask();
  const { data: lists } = useLists(workspace.id);
  const { data: spaces } = useSpaces(workspace.id);
  const { data: parent } = useTask(task.parent_id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const list = lists?.find((l) => l.id === task.list_id);
  const space = spaces?.find((s) => s.id === list?.space_id);
  const ref = `${workspace.task_prefix}-${task.number}`;
  const permalink = typeof window !== "undefined" ? `${window.location.origin}${href(`/t/${task.number}`)}` : "";

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };

  const { watching, toggleWatch } = useWatch(task.id, userId);

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-1 px-3 hairline-b">
        <nav className="flex min-w-0 flex-1 items-center gap-1 text-[12px] text-ink-2">
          {space ? (
            <Link href={href(`/s/${space.id}`)} className="flex items-center gap-1.5 truncate rounded px-1 py-0.5 hover:bg-muted hover:text-ink">
              <SpaceIcon name={space.icon} className={cn("size-3.5", `pastel-text-${asPastel(space.color)}`)} />
              {space.name}
            </Link>
          ) : null}
          {list ? (
            <>
              <ChevronRightIcon className="size-3 shrink-0 text-ink-3" />
              <Link href={href(`/l/${list.id}`)} className="truncate rounded px-1 py-0.5 hover:bg-muted hover:text-ink">
                {list.name}
              </Link>
            </>
          ) : null}
          <ChevronRightIcon className="size-3 shrink-0 text-ink-3" />
          <button type="button" onClick={() => copy(ref, "Task ID")} className="tabular rounded px-1 py-0.5 hover:bg-muted hover:text-ink" title="Copy task ID">
            {ref}
          </button>
        </nav>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className={cn("text-ink-3", watching && "text-ink")} aria-pressed={watching} onClick={toggleWatch} aria-label={watching ? "Stop watching" : "Watch"}>
              {watching ? <EyeIcon /> : <EyeOffIcon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{watching ? "You get notified about changes" : "Watch this task"}</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-ink-3" aria-label="More">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => copy(permalink, "Link")}>
              <LinkIcon /> Copy link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => copy(ref, "Task ID")}>
              <CopyIcon /> Copy ID
            </DropdownMenuItem>
            {canEdit ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2Icon /> Delete task
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon-sm" className="text-ink-3" onClick={() => openTask(null)} aria-label="Close">
          <XIcon />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin @container">
        <div className="flex flex-col gap-6 px-6 pb-6 pt-5">
          {parent ? (
            <button type="button" onClick={() => openTask(parent.id)} className="-mb-3 flex w-fit items-center gap-1.5 rounded px-1 py-0.5 text-[12px] text-ink-2 hover:bg-muted hover:text-ink">
              <ArrowUpLeftIcon className="size-3.5" />
              <span className="truncate">{parent.title}</span>
            </button>
          ) : null}
          <div className="flex items-start gap-3">
            <CompleteCheck task={task} size={22} className="mt-1" />
            <div className="min-w-0 flex-1">
              <TaskTitle task={task} disabled={!canEdit} />
            </div>
          </div>

          <TaskProperties task={task} disabled={!canEdit} />

          <TaskDescription task={task} disabled={!canEdit} />

          <Subtasks task={task} />
          <Checklist task={task} />
          <Attachments task={task} />

          <Tabs defaultValue="comments" className="mt-2">
            <TabsList variant="line" className="mb-3">
              <TabsTrigger value="comments">
                Comments
                {task.comments?.[0]?.count ? <span className="tabular text-ink-3">{task.comments[0].count}</span> : null}
              </TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="comments">
              <CommentList task={task} />
            </TabsContent>
            <TabsContent value="activity">
              <ActivityFeed task={task} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {canEdit ? <CommentComposer task={task} /> : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              “{task.title}” and its subtasks, comments and attachments will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep task</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                openTask(null);
                try {
                  await deleteTask.mutateAsync(task.id);
                  toast.success("Task deleted");
                } catch {
                  toast.error("Couldn't delete the task.");
                }
              }}
            >
              Delete task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function useWatch(taskId: string, userId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const key = ["watch", taskId, userId];
  const { data: watching } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await supabase.from("task_watchers").select("task_id").eq("task_id", taskId).eq("user_id", userId).maybeSingle();
      return !!data;
    },
  });
  const toggleWatch = async () => {
    const next = !watching;
    qc.setQueryData(key, next);
    if (next) await supabase.from("task_watchers").insert({ task_id: taskId, user_id: userId });
    else await supabase.from("task_watchers").delete().eq("task_id", taskId).eq("user_id", userId);
    qc.invalidateQueries({ queryKey: key });
  };
  return { watching: !!watching, toggleWatch };
}
