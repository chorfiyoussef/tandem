"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Switch } from "@/components/ui/switch";
import { useUi } from "@/stores/ui";
import { useWorkspace } from "@/components/workspace-provider";
import { useLists } from "@/lib/queries/workspace";
import { useCreateTask } from "@/lib/queries/tasks";
import { useSpaceStatuses } from "@/hooks/use-space-statuses";
import { useOpenTask } from "@/hooks/use-open-task";
import { ListPicker } from "./pickers/list-picker";
import { StatusPicker } from "./pickers/status-picker";
import { AssigneePicker } from "./pickers/assignee-picker";
import { PriorityPicker } from "./pickers/priority-picker";
import { DueDatePicker } from "./pickers/due-date-picker";
import { TagPicker } from "./pickers/tag-picker";
import { CategoryPicker } from "./pickers/category-picker";
import { RecurrencePicker } from "./pickers/recurrence-picker";
import type { Recurrence } from "@/lib/recurrence";
import type { Priority } from "@tandem/shared";

export function NewTaskDialog() {
  const open = useUi((s) => s.newTaskOpen);
  const close = useUi((s) => s.closeNewTask);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="top-[18%] translate-y-0 gap-0 p-0 sm:max-w-xl" showCloseButton={false} onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">New task</DialogTitle>
        <DialogDescription className="sr-only">Create a task.</DialogDescription>
        {/* Mounted only while open, so every field starts fresh. */}
        <NewTaskForm onDone={close} />
      </DialogContent>
    </Dialog>
  );
}

function NewTaskForm({ onDone }: { onDone: () => void }) {
  const defaults = useUi((s) => s.newTaskDefaults);
  const lastListId = useUi((s) => s.lastListId);
  const { workspace } = useWorkspace();
  const { data: lists } = useLists(workspace.id);
  const createTask = useCreateTask();
  const openTask = useOpenTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listId, setListId] = useState<string | null>(defaults.listId ?? lastListId ?? null);
  const [statusId, setStatusId] = useState<string | null>(defaults.statusId ?? null);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>("none");
  const [dueDate, setDueDate] = useState<string | null>(defaults.dueDate ?? null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(defaults.categoryId ?? null);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const [createMore, setCreateMore] = useState(false);

  const effectiveListId = listId ?? lists?.[0]?.id ?? null;
  const { statuses } = useSpaceStatuses(effectiveListId);
  // A status from another space is ignored; the first status of the target space applies.
  const effectiveStatus = (statusId && statuses.some((s) => s.id === statusId) ? statusId : statuses[0]?.id) ?? null;

  async function submit() {
    const t = title.trim();
    if (!t || !effectiveListId) return;
    try {
      const task = await createTask.mutateAsync({
        list_id: effectiveListId,
        title: t,
        status_id: effectiveStatus,
        priority,
        category_id: categoryId,
        recurrence,
        due_date: dueDate,
        description_text: description.trim() || null,
        description: description.trim() ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: description.trim() }] }] } : null,
        parent_id: defaults.parentId ?? null,
        assigneeIds: assignees,
        tagIds,
      });
      toast.success("Task added", { action: { label: "Open", onClick: () => openTask(task.id) } });
      if (createMore) {
        setTitle("");
        setDescription("");
      } else {
        onDone();
      }
    } catch {
      toast.error("Couldn't create the task.");
    }
  }

  return (
    <div
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      }}
    >
      <div className="flex flex-col gap-3 px-5 pt-4">
        <div className="flex items-center gap-2 text-[13px] text-ink-2">
          <span>New task in</span>
          <ListPicker value={effectiveListId} onChange={setListId} className="h-6 px-1 text-[13px]" />
        </div>
        <textarea
          autoFocus
          value={title}
          rows={1}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Task name"
          className="w-full resize-none bg-transparent text-[20px] font-semibold tracking-[-0.01em] outline-none placeholder:text-ink-3"
        />
        <textarea
          value={description}
          rows={2}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details… (optional)"
          className="w-full resize-none bg-transparent text-[14.5px] outline-none placeholder:text-ink-3"
        />
        <div className="-ml-1.5 flex flex-wrap items-center gap-1 pb-3">
          {effectiveListId ? <StatusPicker listId={effectiveListId} value={effectiveStatus} onChange={(s) => setStatusId(s.id)} /> : null}
          <AssigneePicker value={assignees} onChange={setAssignees} />
          <PriorityPicker value={priority} onChange={setPriority} />
          <DueDatePicker value={dueDate} onChange={setDueDate} />
          <RecurrencePicker value={recurrence} onChange={setRecurrence} />
          <CategoryPicker value={categoryId} onChange={setCategoryId} />
          <TagPicker value={tagIds} onChange={setTagIds} />
        </div>
      </div>
      <div className="flex items-center gap-3 px-5 py-3 hairline-t">
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <Switch checked={createMore} onCheckedChange={setCreateMore} size="sm" />
          Create more
        </label>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!title.trim() || !effectiveListId || createTask.isPending}>
            Create task
            <Kbd className="bg-white/20 text-white">⌘↵</Kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
