"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "@/components/icons";
import { toast } from "sonner";
import { PASTEL_COLORS, type PastelColor } from "@tandem/shared";
import { SettingsSection } from "./settings-shell";
import { useWorkspace } from "@/components/workspace-provider";
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from "@/lib/queries/workspace";
import { ColorSwatches, ColorDot, asPastel } from "@/components/common/pastel";
import { CategoryChip } from "@/components/tasks/category-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Category } from "@/lib/types";

export function CategoriesSettings() {
  const { workspace, canEdit } = useWorkspace();
  const { data: categories } = useCategories(workspace.id);
  const create = useCreateCategory(workspace.id);
  const update = useUpdateCategory(workspace.id);
  const del = useDeleteCategory(workspace.id);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<Category | null>(null);
  const list = categories ?? [];

  return (
    <SettingsSection
      title="Categories"
      description="A task has at most one category, like Bug, Feature or Design. Use them to group and filter a list. Tags stay free-form."
    >
      {canEdit ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            try {
              await create.mutateAsync({ name: name.trim(), color: PASTEL_COLORS[(list.length + 1) % PASTEL_COLORS.length] });
              setName("");
            } catch {
              toast.error("Couldn’t create the category. It may already exist.");
            }
          }}
          className="mb-4 flex max-w-md items-center gap-2"
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" />
          <Button type="submit" variant="outline" disabled={!name.trim()}>
            <PlusIcon /> Add
          </Button>
        </form>
      ) : null}
      {list.length === 0 ? <p className="text-[13px] text-ink-3">No categories yet.</p> : null}
      <ul className="flex max-w-md flex-col overflow-hidden rounded-xl bg-surface shadow-card empty:hidden">
        {list.map((c) => (
          <li key={c.id} className="flex items-center gap-2 px-3 py-1.5 hairline-b last:shadow-none">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" disabled={!canEdit} aria-label="Change color" className="flex size-7 items-center justify-center rounded-md hover:bg-muted">
                  <ColorDot color={c.color} className="size-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 shadow-float" align="start">
                <ColorSwatches value={asPastel(c.color)} onChange={(color: PastelColor) => update.mutate({ id: c.id, color })} />
              </PopoverContent>
            </Popover>
            <Input
              defaultValue={c.name}
              disabled={!canEdit}
              className="h-7 flex-1 border-transparent bg-transparent px-1.5 hover:border-input"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== c.name) update.mutate({ id: c.id, name: v });
                else e.target.value = c.name;
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
            <CategoryChip category={c} className="hidden sm:inline-flex" />
            {canEdit ? (
              <Button variant="ghost" size="icon-xs" className="text-ink-3 hover:text-destructive" aria-label="Delete category" onClick={() => setDeleting(c)}>
                <Trash2Icon />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Tasks in this category keep everything else; they just lose the category.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await del.mutateAsync(deleting.id);
                  setDeleting(null);
                } catch {
                  toast.error("Couldn’t delete the category.");
                }
              }}
            >
              Delete category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
