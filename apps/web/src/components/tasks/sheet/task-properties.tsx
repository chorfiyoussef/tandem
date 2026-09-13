"use client";

import { StatusPicker } from "../pickers/status-picker";
import { AssigneePicker } from "../pickers/assignee-picker";
import { PriorityPicker } from "../pickers/priority-picker";
import { DueDatePicker } from "../pickers/due-date-picker";
import { TagPicker } from "../pickers/tag-picker";
import { ListPicker } from "../pickers/list-picker";
import { CategoryPicker } from "../pickers/category-picker";
import { RecurrencePicker } from "../pickers/recurrence-picker";
import type { TaskRow } from "@/lib/types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-start gap-3">
      <span className="w-[84px] shrink-0 pt-1.5 text-[13px] text-ink-3">{label}</span>
      <div className="-ml-1.5 min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function TaskProperties({ task, disabled }: { task: TaskRow; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-1 @lg:grid-cols-2">
      <Row label="Status">
        <StatusPicker task={task} listId={task.list_id} disabled={disabled} />
      </Row>
      <Row label="Assignees">
        <AssigneePicker task={task} disabled={disabled} />
      </Row>
      <Row label="Priority">
        <PriorityPicker task={task} disabled={disabled} />
      </Row>
      <Row label="Due date">
        <DueDatePicker task={task} disabled={disabled} />
      </Row>
      <Row label="Repeat">
        <RecurrencePicker task={task} disabled={disabled} />
      </Row>
      <Row label="Category">
        <CategoryPicker task={task} disabled={disabled} />
      </Row>
      <Row label="Tags">
        <TagPicker task={task} disabled={disabled} />
      </Row>
      <Row label="List">
        <ListPicker task={task} disabled={disabled} />
      </Row>
    </div>
  );
}
