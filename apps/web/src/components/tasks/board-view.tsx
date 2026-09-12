"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PlusIcon, MessageSquareIcon, CheckSquareIcon, RepeatIcon } from "@/components/icons";
import { parseRecurrence, recurrenceShort } from "@/lib/recurrence";
import { useWorkspace } from "@/components/workspace-provider";
import { useSpaceStatuses } from "@/hooks/use-space-statuses";
import { useMoveTask } from "@/lib/queries/tasks";
import { useOpenTask } from "@/hooks/use-open-task";
import { useUi } from "@/stores/ui";
import { StatusDot } from "./status-dot";
import { TagChip } from "./tag-chip";
import { CategoryChip } from "./category-chip";
import { DueLabel } from "./due-label";
import { PriorityIcon } from "./priority-icon";
import { AssigneeLabel } from "./pickers/assignee-picker";
import { NO_STATUS, findContainer, groupByStatus, positionAt } from "./dnd";
import { asPastel } from "@/components/common/pastel";
import { Button } from "@/components/ui/button";
import type { TaskRow as TaskRowType } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Prefer whatever the pointer is actually inside (a row/card, or an empty
 * group), and only fall back to geometry when the pointer is outside every
 * droppable. Pure closestCorners never picks tall, mostly-empty containers.
 */
const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCorners(args);
};

export function BoardView({ tasks, listId }: { tasks: TaskRowType[]; listId: string }) {
  const { canEdit } = useWorkspace();
  const { statuses } = useSpaceStatuses(listId);
  const moveTask = useMoveTask();
  const openNewTask = useUi((s) => s.openNewTask);
  const [dragState, setDragState] = useState<Record<string, string[]> | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const derived = useMemo(() => groupByStatus(tasks, statuses), [tasks, statuses]);
  const containers = dragState ?? derived;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const from = findContainer(containers, String(active.id));
    const to = findContainer(containers, String(over.id));
    if (!from || !to || from === to) return;
    setDragState((state) => {
      const prev = state ?? derived;
      const fromItems = prev[from].filter((id) => id !== active.id);
      const toItems = [...prev[to]];
      const overIndex = toItems.indexOf(String(over.id));
      let insertAt = toItems.length;
      if (overIndex >= 0) {
        const translated = active.rect.current.translated;
        const below = translated && translated.top > over.rect.top + over.rect.height / 2;
        insertAt = overIndex + (below ? 1 : 0);
      }
      toItems.splice(insertAt, 0, String(active.id));
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const id = String(active.id);
    const container = findContainer(containers, id);
    if (!over || !container) {
      setActiveId(null);
      setDragState(null);
      return;
    }
    let items = containers[container];
    const overIndex = items.indexOf(String(over.id));
    const activeIndex = items.indexOf(id);
    if (overIndex >= 0 && activeIndex >= 0 && overIndex !== activeIndex) {
      items = arrayMove(items, activeIndex, overIndex);
      setDragState({ ...containers, [container]: items });
    }
    const position = positionAt(items, items.indexOf(id), tasksById, id);
    const task = tasksById.get(id);
    const statusChanged = container !== NO_STATUS && task?.status_id !== container;
    moveTask
      .mutateAsync({ id, position, ...(statusChanged ? { status_id: container } : {}) })
      .catch(() => {})
      .finally(() => setDragState(null));
    setActiveId(null);
  }

  const activeTask = activeId ? tasksById.get(activeId) : undefined;
  const columns = [...statuses.map((s) => ({ id: s.id, status: s })), ...(containers[NO_STATUS] ? [{ id: NO_STATUS, status: undefined }] : [])];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={(e: DragStartEvent) => { setActiveId(String(e.active.id)); setDragState(derived); }}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => { setActiveId(null); setDragState(null); }}
    >
      <div className="flex h-full gap-3 overflow-x-auto px-4 pb-4 pt-3 scrollbar-thin">
        {columns.map(({ id, status }) => (
          <Column
            key={id}
            id={id}
            name={status?.name ?? "No status"}
            color={status?.color}
            category={status?.category}
            ids={containers[id] ?? []}
            tasksById={tasksById}
            onAdd={canEdit && status ? () => openNewTask({ listId, statusId: status.id }) : undefined}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {activeTask ? <Card task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  id,
  name,
  color,
  category,
  ids,
  tasksById,
  onAdd,
}: {
  id: string;
  name: string;
  color?: string | null;
  category?: "todo" | "active" | "done";
  ids: string[];
  tasksById: Map<string, TaskRowType>;
  onAdd?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section className="flex h-full w-[272px] shrink-0 flex-col">
      <header className="flex h-8 items-center gap-2 px-1">
        <StatusDot color={color} category={category} />
        <span className="text-[13px] font-medium">{name}</span>
        <span className="tabular text-[12px] text-ink-3">{ids.length}</span>
        {onAdd ? (
          <Button variant="ghost" size="icon-xs" className="ml-auto text-ink-3" aria-label={`Add task to ${name}`} onClick={onAdd}>
            <PlusIcon />
          </Button>
        ) : null}
      </header>
      <div
        ref={setNodeRef}
        className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl p-2 transition-shadow scrollbar-thin", `pastel-wash-${asPastel(color)}`, isOver && "ring-2 ring-action/30")}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {ids.map((tid) => {
            const t = tasksById.get(tid);
            return t ? <SortableCard key={tid} task={t} /> : null;
          })}
        </SortableContext>
        {ids.length === 0 && !isOver ? <p className="py-6 text-center text-[12px] text-ink-3">Drop tasks here</p> : null}
      </div>
    </section>
  );
}

function SortableCard({ task }: { task: TaskRowType }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} {...attributes} {...listeners} className={cn(isDragging && "opacity-30")}>
      <Card task={task} />
    </div>
  );
}

export function Card({ task, overlay }: { task: TaskRowType; overlay?: boolean }) {
  const { workspace } = useWorkspace();
  const openTask = useOpenTask();
  const done = !!task.completed_at;
  const tags = task.task_tags.map((t) => t.tags).filter((t): t is NonNullable<typeof t> => !!t);
  const subTotal = task.subtasks?.length ?? 0;
  const subDone = task.subtasks?.filter((s) => s.completed_at).length ?? 0;
  const comments = task.comments?.[0]?.count ?? 0;
  const checkTotal = task.checklist_items?.length ?? 0;
  const checkDone = task.checklist_items?.filter((c) => c.done).length ?? 0;
  const recurrence = parseRecurrence(task.recurrence);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openTask(task.id)}
      onKeyDown={(e) => e.key === "Enter" && openTask(task.id)}
      className={cn(
        "flex cursor-default flex-col gap-2 rounded-lg bg-surface p-3 text-[13px] shadow-card outline-none transition-shadow hover:shadow-float focus-visible:ring-3 focus-visible:ring-ring/40",
        overlay && "w-[256px] rotate-1 shadow-float",
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn("min-w-0 flex-1 leading-snug", done && "text-ink-3 line-through")}>{task.title}</span>
        {task.priority !== "none" ? <PriorityIcon priority={task.priority} className="mt-0.5" /> : null}
      </div>
      {tags.length > 0 || task.categories ? (
        <div className="flex flex-wrap gap-1">
          {task.categories ? <CategoryChip category={task.categories} /> : null}
          {tags.map((t) => (
            <TagChip key={t.id} name={t.name} color={t.color} />
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-2 text-[11px] text-ink-3">
        <span className="tabular">
          {workspace.task_prefix}-{task.number}
        </span>
        {subTotal > 0 ? (
          <span className="tabular">
            {subDone}/{subTotal}
          </span>
        ) : null}
        {checkTotal > 0 ? (
          <span className="inline-flex items-center gap-0.5 tabular">
            <CheckSquareIcon className="size-3" />
            {checkDone}/{checkTotal}
          </span>
        ) : null}
        {comments > 0 ? (
          <span className="inline-flex items-center gap-0.5 tabular">
            <MessageSquareIcon className="size-3" />
            {comments}
          </span>
        ) : null}
        {recurrence ? (
          <span className="inline-flex items-center gap-0.5" title="Repeats">
            <RepeatIcon className="size-3" />
            {recurrenceShort(recurrence)}
          </span>
        ) : null}
        <span className="ml-auto flex min-w-0 items-center gap-2">
          <DueLabel date={task.due_date} completed={done} className="text-[11px]" />
          <AssigneeLabel users={task.task_assignees.map((a) => a.profiles)} size="xs" compact />
        </span>
      </div>
    </div>
  );
}
