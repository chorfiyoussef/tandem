"use client";

import { forwardRef } from "react";
import { GripVerticalIcon, MessageSquareIcon, CheckSquareIcon, PaperclipIcon, CornerDownRightIcon, CalendarIcon, UserPlusIcon, RepeatIcon } from "@/components/icons";
import { parseRecurrence, recurrenceShort } from "@/lib/recurrence";
import { useWorkspace } from "@/components/workspace-provider";
import { CompleteCheck } from "./complete-check";
import { TagChip } from "./tag-chip";
import { CategoryChip } from "./category-chip";
import { DueLabel } from "./due-label";
import { PriorityIcon } from "./priority-icon";
import { StatusDot } from "./status-dot";
import { AssigneeLabel, AssigneePicker } from "./pickers/assignee-picker";
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

/**
 * A task as a small floating card: the title line on top, everything else
 * (category, tags, assignee, due date, counts) on a second line.
 */
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
  const hasAssignees = task.task_assignees.length > 0;
  const recurrence = parseRecurrence(task.recurrence);

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
        "group/row relative flex flex-col gap-1 rounded-lg bg-surface py-2 pl-1 pr-3 text-[13px] shadow-card outline-none transition-shadow",
        "hover:shadow-float focus-visible:ring-3 focus-visible:ring-ring/40",
        dragging && "opacity-30",
        overlay && "shadow-float",
        className,
      )}
      data-task-id={task.id}
    >
      {/* Line 1: check, number, title, priority */}
      <div className="flex items-center gap-2">
        <div className="flex w-4 shrink-0 items-center justify-center self-stretch">
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

        <span className="hidden shrink-0 tabular text-[11.5px] text-ink-3 sm:inline">
          {workspace.task_prefix}-{task.number}
        </span>

        <span className={cn("min-w-0 flex-1 truncate font-medium", done && "font-normal text-ink-3 line-through decoration-hairline-strong")}>{task.title}</span>

        {showStatus && status ? (
          <StatusPicker
            task={task}
            listId={task.list_id}
            disabled={!canEdit}
            trigger={
              <button type="button" className={cn("flex h-5 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[11px] font-medium", `pastel-${status.color}`)} onClick={(e) => e.stopPropagation()}>
                <StatusDot color={status.color} category={status.category} size={9} />
                {status.name}
              </button>
            }
          />
        ) : null}

        <PriorityPicker
          task={task}
          disabled={!canEdit}
          trigger={
            <button
              type="button"
              className={cn("flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-muted", task.priority === "none" && "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100")}
              onClick={(e) => e.stopPropagation()}
              aria-label="Set priority"
            >
              <PriorityIcon priority={task.priority} />
            </button>
          }
        />
      </div>

      {/* Line 2: where it lives, who, when */}
      <div className="flex min-h-6 items-center gap-1.5 pl-[calc(1rem+0.5rem+1rem+0.5rem)] text-[12px] text-ink-2">
        {task.categories ? <CategoryChip category={task.categories} /> : null}
        {tags.slice(0, 3).map((t) => (
          <TagChip key={t.id} name={t.name} color={t.color} />
        ))}
        {tags.length > 3 ? <span className="text-[11px] text-ink-3">+{tags.length - 3}</span> : null}
        {listName ? <span className="max-w-32 truncate text-ink-3">{listName}</span> : null}

        <span className="ml-auto flex min-w-0 shrink-0 items-center gap-2.5">
          {recurrence ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-3" title="Repeats">
              <RepeatIcon className="size-3" />
              {recurrenceShort(recurrence)}
            </span>
          ) : null}
          {subTotal > 0 ? (
            <span className="tabular text-[11px] text-ink-3" title="Subtasks">
              {subDone}/{subTotal}
            </span>
          ) : null}
          {checkTotal > 0 ? (
            <span className="inline-flex items-center gap-0.5 tabular text-[11px] text-ink-3" title="Checklist">
              <CheckSquareIcon className="size-3" />
              {checkDone}/{checkTotal}
            </span>
          ) : null}
          {comments > 0 ? (
            <span className="inline-flex items-center gap-0.5 tabular text-[11px] text-ink-3" title="Comments">
              <MessageSquareIcon className="size-3" />
              {comments}
            </span>
          ) : null}
          {attachments > 0 ? (
            <span className="inline-flex items-center gap-0.5 tabular text-[11px] text-ink-3" title="Attachments">
              <PaperclipIcon className="size-3" />
              {attachments}
            </span>
          ) : null}

          <DueDatePicker
            task={task}
            align="end"
            disabled={!canEdit}
            trigger={
              <button
                type="button"
                className={cn("flex h-6 items-center gap-1 rounded-md px-1.5 hover:bg-muted", !task.due_date && "text-ink-3 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100")}
                onClick={(e) => e.stopPropagation()}
                aria-label="Set due date"
              >
                {task.due_date ? (
                  <DueLabel date={task.due_date} completed={done} />
                ) : (
                  <>
                    <CalendarIcon className="size-3.5" />
                    Date
                  </>
                )}
              </button>
            }
          />

          <AssigneePicker
            task={task}
            compact
            disabled={!canEdit}
            trigger={
              <button
                type="button"
                className={cn("flex h-6 min-w-0 max-w-44 items-center gap-1 rounded-md px-1.5 hover:bg-muted", !hasAssignees && "text-ink-3 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100")}
                onClick={(e) => e.stopPropagation()}
                aria-label="Assign"
              >
                {hasAssignees ? (
                  <AssigneeLabel users={task.task_assignees.map((a) => a.profiles)} />
                ) : (
                  <>
                    <UserPlusIcon className="size-3.5" />
                    Assign
                  </>
                )}
              </button>
            }
          />
        </span>
      </div>
    </div>
  );
});
