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
import { ChevronRightIcon, PlusIcon } from "@/components/icons";
import { useWorkspace } from "@/components/workspace-provider";
import { useSpaceStatuses } from "@/hooks/use-space-statuses";
import { useCategories } from "@/lib/queries/workspace";
import { useMoveTask } from "@/lib/queries/tasks";
import { useUi, type ListGroupBy } from "@/stores/ui";
import { TaskRow } from "./task-row";
import { StatusDot } from "./status-dot";
import { ColorDot, asPastel } from "@/components/common/pastel";
import { InlineTaskComposer } from "./inline-task-composer";
import { NO_STATUS, findContainer, groupTasks, positionAt } from "./dnd";
import { Button } from "@/components/ui/button";
import type { StatusCategory, TaskRow as TaskRowType } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Prefer whatever the pointer is actually inside (a row, or an empty group),
 * and only fall back to geometry when the pointer is outside every droppable.
 * Pure closestCorners never picks tall, mostly-empty containers.
 */
const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCorners(args);
};

type GroupDef = { id: string; name: string; color?: string | null; category?: StatusCategory | null; kind: ListGroupBy };

export function ListView({ tasks, listId, groupBy = "status" }: { tasks: TaskRowType[]; listId: string; groupBy?: ListGroupBy }) {
  const { workspace, canEdit } = useWorkspace();
  const { statuses } = useSpaceStatuses(listId);
  const { data: categories } = useCategories(workspace.id);
  const moveTask = useMoveTask();
  const [dragState, setDragState] = useState<Record<string, string[]> | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const groups = useMemo<GroupDef[]>(
    () =>
      groupBy === "status"
        ? statuses.map((s) => ({ id: s.id, name: s.name, color: s.color, category: s.category, kind: "status" as const }))
        : (categories ?? []).map((c) => ({ id: c.id, name: c.name, color: c.color, kind: "category" as const })),
    [groupBy, statuses, categories],
  );
  const derived = useMemo(
    () =>
      groupTasks(
        tasks,
        groups.map((g) => g.id),
        (t) => (groupBy === "status" ? t.status_id : t.category_id),
        { alwaysNone: groupBy === "category" },
      ),
    [tasks, groups, groupBy],
  );
  const containers = dragState ?? derived;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setDragState(derived);
  }

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
    const target = container === NO_STATUS ? null : container;
    const patch =
      groupBy === "status"
        ? target && task?.status_id !== target
          ? { status_id: target }
          : {}
        : (task?.category_id ?? null) !== target
          ? { category_id: target }
          : {};
    moveTask
      .mutateAsync({ id, position, ...patch })
      .catch(() => {})
      .finally(() => setDragState(null));
    setActiveId(null);
  }

  const activeTask = activeId ? tasksById.get(activeId) : undefined;
  const groupKeys = [...groups.map((g) => g.id), ...(containers[NO_STATUS] ? [NO_STATUS] : [])];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setDragState(null);
      }}
    >
      <div className="flex flex-col pb-24 pt-3">
        {groupKeys.map((key) => {
          const def = groups.find((g) => g.id === key);
          return (
            <Group
              key={`${groupBy}:${key}`}
              id={key}
              listId={listId}
              groupBy={groupBy}
              name={def?.name ?? (groupBy === "status" ? "No status" : "No category")}
              color={def?.color}
              category={def?.category}
              ids={containers[key] ?? []}
              tasksById={tasksById}
              canEdit={canEdit}
              defaultCollapsed={def?.category === "done"}
            />
          );
        })}
        {groupBy === "category" && groups.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-ink-3">No categories yet. Create them from a task’s Category field or in Settings › Categories.</p>
        ) : null}
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {activeTask ? <TaskRow task={activeTask} overlay className="w-[min(720px,90vw)]" /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Group({
  id,
  listId,
  groupBy,
  name,
  color,
  category,
  ids,
  tasksById,
  canEdit,
  defaultCollapsed,
}: {
  id: string;
  listId: string;
  groupBy: ListGroupBy;
  name: string;
  color?: string | null;
  category?: StatusCategory | null;
  ids: string[];
  tasksById: Map<string, TaskRowType>;
  canEdit: boolean;
  defaultCollapsed?: boolean;
}) {
  const key = `${listId}:${groupBy}:${id}`;
  const stored = useUi((s) => s.collapsedGroups[key]);
  const toggleGroup = useUi((s) => s.toggleGroup);
  const collapsed = stored ?? (defaultCollapsed && ids.length > 0) ?? false;
  const [composing, setComposing] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id });
  const isNone = id === NO_STATUS;
  const canCompose = canEdit && (groupBy === "category" || !isNone);

  return (
    <section
      ref={setNodeRef}
      className={cn("mx-3 mb-3 flex flex-col rounded-xl p-2 transition-shadow", `pastel-wash-${asPastel(color)}`, isOver && "ring-2 ring-action/30")}
    >
      <header className="group/head flex h-8 items-center gap-2 px-1.5">
        <button
          type="button"
          onClick={() => toggleGroup(key)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${name}` : `Collapse ${name}`}
          className="flex size-5 items-center justify-center rounded text-ink-3 hover:text-ink"
        >
          <ChevronRightIcon className={cn("size-3.5 transition-transform duration-150", !collapsed && "rotate-90")} />
        </button>
        {groupBy === "status" ? (
          <StatusDot color={color} category={category} />
        ) : isNone ? (
          <span className="size-2.5 shrink-0 rounded-full" style={{ boxShadow: "inset 0 0 0 1.5px var(--hairline-strong)" }} aria-hidden />
        ) : (
          <ColorDot color={color} />
        )}
        <span className={cn("text-[13px] font-medium", isNone ? "text-ink-2" : "text-ink")}>{name}</span>
        <span className="tabular text-[12px] text-ink-3">{ids.length}</span>
        {canCompose ? (
          <Button
            variant="ghost"
            size="icon-xs"
            className="ml-auto text-ink-3 opacity-0 transition-opacity group-hover/head:opacity-100 focus-visible:opacity-100"
            aria-label={`Add task to ${name}`}
            onClick={() => {
              if (collapsed) toggleGroup(key);
              setComposing(true);
            }}
          >
            <PlusIcon />
          </Button>
        ) : null}
      </header>

      {!collapsed ? (
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="flex min-h-2 flex-col gap-1.5">
            {ids.map((tid) => {
              const t = tasksById.get(tid);
              return t ? <SortableRow key={tid} task={t} /> : null;
            })}
          </div>
        </SortableContext>
      ) : null}

      {!collapsed && canCompose ? (
        <InlineTaskComposer
          listId={listId}
          statusId={groupBy === "status" ? id : null}
          categoryId={groupBy === "category" && !isNone ? id : null}
          autoOpen={composing}
          onClose={() => setComposing(false)}
          tone="surface"
          className="pt-1.5"
          key={composing ? "open" : "closed"}
        />
      ) : null}
    </section>
  );
}

function SortableRow({ task }: { task: TaskRowType }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style: React.CSSProperties = { transform: CSS.Translate.toString(transform), transition };
  return <TaskRow ref={setNodeRef} task={task} style={style} dragging={isDragging} dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>} />;
}
