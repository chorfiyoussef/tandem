"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ColorSwatches, asPastel } from "@/components/common/pastel";
import { SpaceIcon, SPACE_ICON_NAMES } from "@/components/common/space-icon";
import { useWorkspace } from "@/components/workspace-provider";
import { useCreateSpace, useUpdateSpace } from "@/lib/queries/workspace";
import type { Space } from "@/lib/types";
import type { PastelColor } from "@tandem/shared";
import { cn } from "@/lib/utils";

export function SpaceDialog({ open, onOpenChange, space }: { open: boolean; onOpenChange: (open: boolean) => void; space?: Space }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {/* Mounted only while open, so the form re-initialises from `space` every time. */}
        <SpaceForm key={space?.id ?? "new"} space={space} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SpaceForm({ space, onDone }: { space?: Space; onDone: () => void }) {
  const { workspace, isAdmin } = useWorkspace();
  const createSpace = useCreateSpace(workspace.id);
  const updateSpace = useUpdateSpace(workspace.id);
  const [name, setName] = useState(space?.name ?? "");
  const [color, setColor] = useState<PastelColor>(asPastel(space?.color ?? "lavender"));
  const [icon, setIcon] = useState<string>(space?.icon ?? "squares-four");
  const [isPrivate, setIsPrivate] = useState(space?.is_private ?? false);
  const busy = createSpace.isPending || updateSpace.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (space) {
        await updateSpace.mutateAsync({ id: space.id, name: name.trim(), color, icon, is_private: isPrivate });
      } else {
        await createSpace.mutateAsync({ name: name.trim(), color, icon, isPrivate });
      }
      onDone();
    } catch {
      toast.error(space ? "Couldn't save the space." : "Couldn't create the space.");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>{space ? "Edit space" : "New space"}</DialogTitle>
        <DialogDescription>Spaces group related lists and share one set of statuses.</DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-3">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", `pastel-${color}`)}>
          <SpaceIcon name={icon} className="size-5" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="space-name">Name</Label>
          <Input id="space-name" autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Marketing" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Color</Label>
        <ColorSwatches value={color} onChange={setColor} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Icon</Label>
        <div className="flex flex-wrap gap-1">
          {SPACE_ICON_NAMES.map((n) => (
            <button
              key={n}
              type="button"
              aria-label={n}
              aria-pressed={icon === n}
              onClick={() => setIcon(n)}
              className={cn("flex size-7 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-muted", icon === n && `pastel-${color}`)}
            >
              <SpaceIcon name={n} className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {isAdmin || !space ? (
        <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
          <span>
            <span className="block text-[14px] font-medium">Private space</span>
            <span className="block text-[13px] text-ink-2">Only admins and people you add can see it.</span>
          </span>
          <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
        </label>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || !name.trim()}>
          {space ? "Save changes" : "Create space"}
        </Button>
      </DialogFooter>
    </form>
  );
}
