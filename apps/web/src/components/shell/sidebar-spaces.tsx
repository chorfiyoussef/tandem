"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon, MoreHorizontalIcon, PlusIcon, PinIcon, UnpinIcon, Trash2Icon, PencilIcon, ListIcon, LockIcon, SlidersHorizontalIcon } from "@/components/icons";
import { toast } from "sonner";
import { useWorkspace } from "@/components/workspace-provider";
import { useUi } from "@/stores/ui";
import { useSpaces, useLists, useFavorites, useToggleFavorite, useCreateList, useDeleteList, useDeleteSpace, useUpdateList } from "@/lib/queries/workspace";
import { SpaceIcon } from "@/components/common/space-icon";
import { asPastel } from "@/components/common/pastel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { List, Space } from "@/lib/types";
import { SpaceDialog } from "@/components/spaces/space-dialog";
import { InlineNameInput } from "@/components/common/inline-name-input";

export function SidebarSpaces({ onNavigate }: { onNavigate?: () => void }) {
  const { workspace, userId, canEdit } = useWorkspace();
  const { data: spaces, isPending: spacesPending } = useSpaces(workspace.id);
  const { data: lists } = useLists(workspace.id);
  const { data: favorites } = useFavorites(userId);
  const [spaceDialog, setSpaceDialog] = useState<{ open: boolean; space?: Space }>({ open: false });

  const favoriteLists = (lists ?? []).filter((l) => favorites?.includes(l.id));

  return (
    <div className="flex flex-col gap-4">
      {favoriteLists.length > 0 ? (
        <section>
          <SectionLabel>Pinned</SectionLabel>
          <div className="flex flex-col gap-px">
            {favoriteLists.map((l) => (
              <ListRow key={l.id} list={l} space={spaces?.find((s) => s.id === l.space_id)} onNavigate={onNavigate} indent={false} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between pr-0.5">
          <SectionLabel>Spaces</SectionLabel>
          {canEdit ? (
            <Button variant="ghost" size="icon-xs" className="text-ink-3 hover:text-ink" aria-label="New space" onClick={() => setSpaceDialog({ open: true })}>
              <PlusIcon />
            </Button>
          ) : null}
        </div>
        {spacesPending ? (
          <div className="flex flex-col gap-1.5 px-2 py-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {(spaces ?? []).map((space) => (
              <SpaceGroup
                key={space.id}
                space={space}
                lists={(lists ?? []).filter((l) => l.space_id === space.id)}
                onNavigate={onNavigate}
                onEdit={() => setSpaceDialog({ open: true, space })}
              />
            ))}
            {spaces && spaces.length === 0 && canEdit ? (
              <Button variant="ghost" size="sm" className="mx-2 mt-1 justify-start text-ink-2" onClick={() => setSpaceDialog({ open: true })}>
                <PlusIcon />
                New space
              </Button>
            ) : null}
          </div>
        )}
      </section>

      <SpaceDialog open={spaceDialog.open} space={spaceDialog.space} onOpenChange={(open) => setSpaceDialog((s) => ({ ...s, open }))} />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2 pb-1 text-[11px] font-medium text-ink-3">{children}</div>;
}

function SpaceGroup({
  space,
  lists,
  onNavigate,
  onEdit,
}: {
  space: Space;
  lists: List[];
  onNavigate?: () => void;
  onEdit: () => void;
}) {
  const { workspace, canEdit, isAdmin, href } = useWorkspace();
  const collapsed = useUi((s) => s.collapsedSpaces[space.id] ?? false);
  const toggleSpace = useUi((s) => s.toggleSpace);
  const pathname = usePathname();
  const createList = useCreateList(workspace.id);
  const deleteSpace = useDeleteSpace(workspace.id);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const color = asPastel(space.color);
  const active = pathname === href(`/s/${space.id}`);

  return (
    <div>
      <div
        className={cn(
          "group/space flex h-7 items-center gap-1 rounded-md pr-0.5 text-ink transition-colors hover:bg-sidebar-accent/70",
          active && "bg-sidebar-accent",
        )}
      >
        <button
          type="button"
          onClick={() => toggleSpace(space.id)}
          aria-label={collapsed ? "Expand space" : "Collapse space"}
          aria-expanded={!collapsed}
          className="flex size-5 shrink-0 items-center justify-center rounded text-ink-3 hover:text-ink"
        >
          <ChevronRightIcon className={cn("size-3.5 transition-transform duration-150", !collapsed && "rotate-90")} />
        </button>
        <Link href={href(`/s/${space.id}`)} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2 py-1 font-medium">
          <SpaceIcon name={space.icon} className={cn("size-[15px] shrink-0", `pastel-text-${color}`)} />
          <span className="truncate">{space.name}</span>
          {space.is_private ? <LockIcon className="size-3 shrink-0 text-ink-3" /> : null}
        </Link>
        {canEdit ? (
          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/space:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100">
            <Button variant="ghost" size="icon-xs" className="text-ink-3 hover:text-ink" aria-label="New list" onClick={() => { if (collapsed) toggleSpace(space.id); setAdding(true); }}>
              <PlusIcon />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" className="text-ink-3 hover:text-ink" aria-label="Space options">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onSelect={onEdit}>
                  <PencilIcon /> Edit space
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={href(`/s/${space.id}?tab=statuses`)}>
                    <SlidersHorizontalIcon /> Statuses
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAdding(true)}>
                  <ListIcon /> New list
                </DropdownMenuItem>
                {isAdmin ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                      <Trash2Icon /> Delete space
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="flex flex-col gap-px">
          {lists.map((l) => (
            <ListRow key={l.id} list={l} space={space} onNavigate={onNavigate} />
          ))}
          {adding ? (
            <InlineNameInput
              className="ml-7"
              placeholder="List name"
              onCancel={() => setAdding(false)}
              onSubmit={async (name) => {
                setAdding(false);
                try {
                  await createList.mutateAsync({ spaceId: space.id, name });
                } catch {
                  toast.error("Couldn't create the list.");
                }
              }}
            />
          ) : null}
          {lists.length === 0 && !adding ? (
            <p className="ml-7 py-1 text-[12px] text-ink-3">No lists yet</p>
          ) : null}
        </div>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{space.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Every list and task inside this space will be permanently deleted. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep space</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteSpace.mutateAsync(space.id);
                  toast.success("Space deleted");
                } catch {
                  toast.error("Couldn't delete the space.");
                }
              }}
            >
              Delete space
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ListRow({ list, space, onNavigate, indent = true }: { list: List; space?: Space; onNavigate?: () => void; indent?: boolean }) {
  const { workspace, userId, canEdit, href } = useWorkspace();
  const pathname = usePathname();
  const { data: favorites } = useFavorites(userId);
  const toggleFavorite = useToggleFavorite(userId);
  const deleteList = useDeleteList(workspace.id);
  const updateList = useUpdateList(workspace.id);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isFav = favorites?.includes(list.id) ?? false;
  const active = pathname === href(`/l/${list.id}`);
  const color = asPastel(list.color ?? space?.color);

  if (renaming) {
    return (
      <InlineNameInput
        className={indent ? "ml-7" : "ml-2"}
        defaultValue={list.name}
        onCancel={() => setRenaming(false)}
        onSubmit={async (name) => {
          setRenaming(false);
          if (name !== list.name) await updateList.mutateAsync({ id: list.id, name });
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "group/list flex h-7 items-center gap-1 rounded-md pr-0.5 transition-colors",
        active ? "bg-sidebar-accent text-ink" : "text-ink-2 hover:bg-sidebar-accent/70 hover:text-ink",
        indent ? "pl-7" : "pl-2",
      )}
    >
      <Link href={href(`/l/${list.id}`)} onClick={onNavigate} aria-current={active ? "page" : undefined} className="flex min-w-0 flex-1 items-center gap-2 py-1">
        {!indent ? <span className={cn("size-2 shrink-0 rounded-full", `pastel-dot-${color}`)} aria-hidden /> : null}
        <span className={cn("truncate", active && "font-medium")}>{list.name}</span>
      </Link>
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/list:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="text-ink-3 hover:text-ink" aria-label="List options">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onSelect={() => toggleFavorite.mutate({ listId: list.id, on: !isFav })}>
              {isFav ? <UnpinIcon /> : <PinIcon />}
              {isFav ? "Unpin from sidebar" : "Pin to sidebar"}
            </DropdownMenuItem>
            {canEdit ? (
              <>
                <DropdownMenuItem onSelect={() => setRenaming(true)}>
                  <PencilIcon /> Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2Icon /> Delete list
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{list.name}”?</AlertDialogTitle>
            <AlertDialogDescription>All tasks in this list will be permanently deleted. This can’t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep list</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteList.mutateAsync(list.id);
                  toast.success("List deleted");
                } catch {
                  toast.error("Couldn't delete the list.");
                }
              }}
            >
              Delete list
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
