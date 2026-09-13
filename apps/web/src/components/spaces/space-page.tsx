"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LockIcon, PencilIcon, PlusIcon } from "@/components/icons";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/page-header";
import { useWorkspace } from "@/components/workspace-provider";
import { useCreateList, useLists, useSpaces } from "@/lib/queries/workspace";
import { useWorkspaceTasks } from "@/lib/queries/tasks";
import { SpaceIcon } from "@/components/common/space-icon";
import { asPastel } from "@/components/common/pastel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InlineNameInput } from "@/components/common/inline-name-input";
import { SpaceDialog } from "./space-dialog";
import { StatusEditor } from "./status-editor";
import { cn } from "@/lib/utils";

export function SpacePage({ spaceId }: { spaceId: string }) {
  const { workspace, canEdit, href } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: spaces, isPending } = useSpaces(workspace.id);
  const { data: lists } = useLists(workspace.id);
  const { data: tasks } = useWorkspaceTasks(workspace.id);
  const createList = useCreateList(workspace.id);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const space = spaces?.find((s) => s.id === spaceId);
  const tab = searchParams.get("tab") === "statuses" ? "statuses" : "lists";
  const spaceLists = (lists ?? []).filter((l) => l.space_id === spaceId);

  if (!isPending && !space) {
    return (
      <>
        <PageHeader title="Space not found" />
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyTitle>This space doesn’t exist</EmptyTitle>
            <EmptyDescription>It may have been deleted, or it’s private and you’re not a member.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>
    );
  }

  const color = asPastel(space?.color);

  return (
    <>
      <PageHeader
        title={space?.name ?? <Skeleton className="h-4 w-32" />}
        icon={space ? <SpaceIcon name={space.icon} className={cn("size-4", `pastel-text-${color}`)} /> : null}
      >
        {space?.is_private ? (
          <span className="mr-2 flex items-center gap-1 text-[13px] text-ink-3">
            <LockIcon className="size-3" /> Private
          </span>
        ) : null}
        {canEdit && space ? (
          <Button variant="ghost" size="sm" className="text-ink-2" onClick={() => setEditing(true)}>
            <PencilIcon /> Edit
          </Button>
        ) : null}
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-5 md:px-6">
          <Tabs value={tab} onValueChange={(v) => router.replace(`${href(`/s/${spaceId}`)}${v === "statuses" ? "?tab=statuses" : ""}`)}>
            <TabsList variant="line" className="mb-5">
              <TabsTrigger value="lists">Lists</TabsTrigger>
              <TabsTrigger value="statuses">Statuses</TabsTrigger>
            </TabsList>

            <TabsContent value="lists">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {spaceLists.map((l) => {
                  const inList = (tasks ?? []).filter((t) => t.list_id === l.id && !t.parent_id);
                  const open = inList.filter((t) => !t.completed_at).length;
                  const done = inList.length - open;
                  return (
                    <Link
                      key={l.id}
                      href={href(`/l/${l.id}`)}
                      className="group flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card transition-shadow hover:shadow-float focus-visible:ring-3 focus-visible:ring-ring/40 outline-none"
                    >
                      <span className="text-[15px] font-medium">{l.name}</span>
                      <span className="flex items-center gap-3 text-[13px] text-ink-2">
                        <span className="tabular">{open} open</span>
                        {done > 0 ? <span className="tabular text-ink-3">{done} done</span> : null}
                      </span>
                      {inList.length > 0 ? (
                        <span className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <span className="block h-full rounded-full pastel-dot-mint" style={{ width: `${(done / inList.length) * 100}%` }} />
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
                {canEdit ? (
                  adding ? (
                    <div className="flex items-center rounded-xl bg-surface p-4 shadow-card">
                      <InlineNameInput
                        placeholder="List name"
                        className="w-full"
                        onCancel={() => setAdding(false)}
                        onSubmit={async (name) => {
                          setAdding(false);
                          try {
                            const l = await createList.mutateAsync({ spaceId, name });
                            router.push(href(`/l/${l.id}`));
                          } catch {
                            toast.error("Couldn't create the list.");
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdding(true)}
                      className="flex min-h-24 items-center justify-center gap-2 rounded-xl border border-dashed border-hairline-strong text-[14px] text-ink-2 transition-colors hover:bg-muted/50 hover:text-ink"
                    >
                      <PlusIcon className="size-4" /> New list
                    </button>
                  )
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="statuses">{space ? <StatusEditor space={space} /> : null}</TabsContent>
          </Tabs>
        </div>
      </div>

      <SpaceDialog open={editing} onOpenChange={setEditing} space={space} />
    </>
  );
}
