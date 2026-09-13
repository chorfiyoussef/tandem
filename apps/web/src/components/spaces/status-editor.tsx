"use client";

import { useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "@/components/icons";
import { toast } from "sonner";
import { PASTEL_COLORS, type PastelColor } from "@tandem/shared";
import { useWorkspace } from "@/components/workspace-provider";
import { useDeleteStatus, useStatuses, useUpsertStatus } from "@/lib/queries/workspace";
import { StatusDot } from "@/components/tasks/status-dot";
import { ColorSwatches, asPastel } from "@/components/common/pastel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import type { Space, Status, StatusCategory } from "@/lib/types";

const CATEGORY_LABEL: Record<StatusCategory, string> = { todo: "Not started", active: "In progress", done: "Done" };

export function StatusEditor({ space }: { space: Space }) {
  const { workspace, canEdit } = useWorkspace();
  const { data: all } = useStatuses(workspace.id);
  const upsert = useUpsertStatus(workspace.id);
  const del = useDeleteStatus(workspace.id);
  const statuses = (all ?? []).filter((s) => s.space_id === space.id).sort((a, b) => a.position - b.position);
  const [deleting, setDeleting] = useState<Status | null>(null);
  const [moveTo, setMoveTo] = useState<string>("");
  const [newName, setNewName] = useState("");

  const save = async (s: Status, patch: Partial<Status>) => {
    try {
      await upsert.mutateAsync({ ...s, ...patch });
    } catch {
      toast.error("Couldn't save the status.");
    }
  };

  const swap = async (i: number, j: number) => {
    const a = statuses[i];
    const b = statuses[j];
    if (!a || !b) return;
    await Promise.all([upsert.mutateAsync({ ...a, position: b.position }), upsert.mutateAsync({ ...b, position: a.position })]);
  };

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    const doneIndex = statuses.findIndex((s) => s.category === "done");
    const position = doneIndex > 0 ? (statuses[doneIndex - 1].position + statuses[doneIndex].position) / 2 : (statuses.at(-1)?.position ?? 0) + 1;
    try {
      await upsert.mutateAsync({ space_id: space.id, name, color: PASTEL_COLORS[(statuses.length + 1) % PASTEL_COLORS.length], category: "active", position });
      setNewName("");
    } catch {
      toast.error("Couldn't add the status.");
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-[14px] text-ink-2">
        Every list in <span className="font-medium text-ink">{space.name}</span> uses these statuses. Tasks in a “Done” status count as completed.
      </p>
      <ol className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-card">
        {statuses.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 px-3 py-2 hairline-b last:shadow-none">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" disabled={!canEdit} aria-label="Change color" className="flex size-7 items-center justify-center rounded-md hover:bg-muted">
                  <StatusDot color={s.color} category={s.category} size={16} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 shadow-float" align="start">
                <ColorSwatches value={asPastel(s.color)} onChange={(c: PastelColor) => save(s, { color: c })} />
              </PopoverContent>
            </Popover>
            <Input
              defaultValue={s.name}
              disabled={!canEdit}
              className="h-7 max-w-56 border-transparent bg-transparent px-1.5 hover:border-input"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== s.name) save(s, { name: v });
                else e.target.value = s.name;
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
            <Select value={s.category} disabled={!canEdit} onValueChange={(v) => save(s, { category: v as StatusCategory })}>
              <SelectTrigger size="sm" className="ml-auto w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABEL) as StatusCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canEdit ? (
              <div className="flex items-center">
                <Button variant="ghost" size="icon-xs" aria-label="Move up" disabled={i === 0} onClick={() => swap(i, i - 1)}>
                  <ArrowUpIcon />
                </Button>
                <Button variant="ghost" size="icon-xs" aria-label="Move down" disabled={i === statuses.length - 1} onClick={() => swap(i, i + 1)}>
                  <ArrowDownIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Delete status"
                  className="text-ink-3 hover:text-destructive"
                  disabled={statuses.length <= 1}
                  onClick={() => {
                    setDeleting(s);
                    setMoveTo(statuses.find((x) => x.id !== s.id)?.id ?? "");
                  }}
                >
                  <Trash2Icon />
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      {canEdit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="flex items-center gap-2"
        >
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New status name" className="max-w-56" />
          <Button type="submit" variant="outline" disabled={!newName.trim()}>
            <PlusIcon /> Add status
          </Button>
        </form>
      ) : null}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Tasks currently in this status will be moved to the status you pick below.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>Move tasks to</Label>
            <Select value={moveTo} onValueChange={setMoveTo}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses
                  .filter((s) => s.id !== deleting?.id)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!moveTo}
              onClick={async () => {
                if (!deleting || !moveTo) return;
                try {
                  await del.mutateAsync({ id: deleting.id, moveTo });
                  setDeleting(null);
                } catch {
                  toast.error("Couldn't delete the status.");
                }
              }}
            >
              Delete status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
