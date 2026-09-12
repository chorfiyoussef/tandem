"use client";

import { forwardRef } from "react";
import { GripVerticalIcon, MessageSquareIcon, CheckSquareIcon, PaperclipIcon, CornerDownRightIcon } from "@/components/icons";
import { useWorkspace } from "@/components/workspace-provider";
import { CompleteCheck } from "./complete-check";
import { TagChip } from "./tag-chip";
import { CategoryChip } from "./category-chip";
import { DueLabel } from "./due-label";
import { PriorityIcon } from "./priority-icon";
import { StatusDot } from "./status-dot";
import { AssigneeAvatars, AssigneePicker } from "./pickers/assignee-picker";
import { DueDatePicker } from "./pickers/due-date-picker";
import { PriorityPicker } from "./pickers/priority-picker";
import { StatusPicker } from "./pickers/status-picker";
import { useSpaceStatuses } from "@/hooks/use-space-statuses";
import { useOpenTask } from "@/hooks/use-open-task";
import type { TaskRow as TaskRowType } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TaskRowProps = {
  task: TaskRowType;
  /** Show the status pill (for views that aren't grouped by status). */
  showStatus?: boolean;
  /** Show which list the task belongs to (Home, search). */
  listName?: string;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragging?: boolean;
  overlay?: boolean;
  className?: string;
  style?: React.CSSProperties;
  depth?: number;
};

export const TaskRow = forwardRef<HTMLDivElement, TaskRowProps>(function TaskRow(
  { task, showStatus, listName, dragHandleProps, dragging, overlay, className, style, depth = 0 },
  ref,
) {
  const { workspace, canEdit } = useWorkspace();
  const { byId } = useSpaceStatuses(task.list_id);
  const openTask = useOpenTask();
  const status = task.status_id ? byId.get(task.status_id) : undefined;
  const done = !!task.completed_at;
  const subDone = task.subtasks?.filter((s) => s.completed_at).length ?? 0;
  const subTotal = task.subtasks?.length ?? 0;
  const checkDone = task.checklist_items?.filter((c) => c.done).length ?? 0;
  const checkTotal = task.checklist_items?.length ?? 0;
  const comments = task.comments?.[0]?.count ?? 0;
  const attachments = task.attachments?.[0]?.count ?? 0;
  const tags = task.task_tags.map((t) => t.tags).filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <div
      ref={ref}
      style={style}
      role="button"
      tabIndex={0}
      onClick={() => openTask(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) openTask(task.id);
      }}
      className={cn(
        "group/row relative flex h-9 items-center gap-2 pr-3 text-[13px] outline-none transition-colors",
        "hairline-b hover:bg-muted/50 focus-visible:bg-muted/60",
        dragging && "opacity-30",
        overlay && "rounded-lg bg-surface shadow-float",
        className,
      )}
      data-task-id={task.id}
    >
      <div className="flex w-5 shrink-0 items-center justify-center self-stretch">
        {dragHandleProps && canEdit ? (
          <button
            type="button"
            aria-label="Drag to reorder"
            {...dragHandleProps}
            className="flex h-full w-full cursor-grab items-center justify-center text-ink-3 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVerticalIcon className="size-3.5" />
          </button>
        ) : null}
      </div>

      {depth > 0 ? <CornerDownRightIcon className="size-3.5 shrink-0 text-ink-3" style={{ marginLeft: (depth - 1) * 20 }} /> : null}

      <CompleteCheck task={task} />

      <span className="hidden w-14 shrink-0 tabular text-[12px] text-ink-3 sm:inline">
        {workspace.task_prefix}-{task.number}
      </span>

      <span className={cn("min-w-0 flex-1 truncate", done && "text-ink-3 line-through decoration-hairline-strong")}>
        {task.title}
      </span>

      {listName ? <span className="hidden max-w-32 truncate text-[12px] text-ink-3 lg:inline">{listName}</span> : null}

      {task.categories ? <CategoryChip category={task.categories} className="hidden md:inline-flex" /> : null}

      {showStatus && status ? (
        <StatusPicker
          task={task}
          listId={task.list_id}
          disabled={!canEdit}
          trigger={
            <button type="button" className={cn("hidden h-6 items-center gap-1.5 rounded-md px-1.5 text-[12px] text-ink-2 hover:bg-muted md:flex", `pastel-${status.color}`)} onClick={(e) => e.stopPropagation()}>
              <StatusDot color={status.color} category={status.category} size={10} />
              {status.name}
            </button>
          }
        />
      ) : null}

      <span className="hidden items-center gap-2 text-[11px] text-ink-3 md:flex">
        {subTotal > 0 ? (
          <span className="tabular" title="Subtasks">
            {subDone}/{subTotal}
          </span>
        ) : null}
        {checkTotal > 0 ? (
          <span className="inline-flex items-center gap-0.5 tabular" title="Checklist">
            <CheckSquareIcon className="size-3" />
            {checkDone}/{checkTotal}
          </span>
        ) : null}
        {comments > 0 ? (
          <span className="inline-flex items-center gap-0.5 tabular" title="Comments">
            <MessageSquareIcon className="size-3" />
            {comments}
          </span>
        ) : null}
        {attachments > 0 ? (
          <span className="inline-flex items-center gap-0.5 tabular" title="Attachments">
            <PaperclipIcon className="size-3" />
            {attachments}
          </span>
        ) : null}
      </span>

      {tags.length > 0 ? (
        <span className="hidden items-center gap-1 lg:flex">
          {tags.slice(0, 2).map((t) => (
            <TagChip key={t.id} name={t.name} color={t.color} />
          ))}
          {tags.length > 2 ? <span className="text-[11px] text-ink-3">+{tags.length - 2}</span> : null}
        </span>
      ) : null}

      <span className="flex w-16 shrink-0 items-center justify-end">
        <AssigneePicker
          task={task}
          compact
          disabled={!canEdit}
          trigger={
            <button type="button" className={cn("flex h-7 items-center rounded-md px-1 hover:bg-muted", task.task_assignees.length === 0 && "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100")} onClick={(e) => e.stopPropagation()} aria-label="Assign">
              {task.task_assignees.length > 0 ? (
                <AssigneeAvatars users={task.task_assignees.map((a) => a.profiles)} />
              ) : (
                <span className="flex size-5 items-center justify-center rounded-full text-ink-3" style={{ boxShadow: "inset 0 0 0 1px var(--hairline-strong)" }}>
                  +
                </span>
              )}
            </button>
          }
        />
      </span>

      <span className="flex w-20 shrink-0 items-center justify-end">
        <DueDatePicker
          task={task}
          align="end"
          disabled={!canEdit}
          trigger={
            <button type="button" className={cn("flex h-7 items-center rounded-md px-1.5 hover:bg-muted", !task.due_date && "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100")} onClick={(e) => e.stopPropagation()} aria-label="Set due date">
              {task.due_date ? <DueLabel date={task.due_date} completed={done} /> : <span className="text-[12px] text-ink-3">Date</span>}
            </button>
          }
        />
      </span>

      <span className="flex w-6 shrink-0 items-center justify-end">
        <PriorityPicker
          task={task}
          disabled={!canEdit}
          trigger={
            <button type="button" className={cn("flex size-6 items-center justify-center rounded-md hover:bg-muted", task.priority === "none" && "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100")} onClick={(e) => e.stopPropagation()} aria-label="Set priority">
              <PriorityIcon priority={task.priority} />
            </button>
          }
        />
      </span>
    </div>
  );
});
