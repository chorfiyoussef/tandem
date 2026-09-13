"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@/components/icons";
import { useWorkspace } from "@/components/workspace-provider";
import { useSpaceStatuses } from "@/hooks/use-space-statuses";
import { useMoveTask } from "@/lib/queries/tasks";
import { useOpenTask } from "@/hooks/use-open-task";
import { useUi } from "@/stores/ui";
import { parseDate, toDateString } from "@/lib/dates";
import { StatusDot } from "./status-dot";
import { Button } from "@/components/ui/button";
import type { TaskRow as TaskRowType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CalendarView({ tasks, listId }: { tasks: TaskRowType[]; listId: string }) {
  const { canEdit } = useWorkspace();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [activeId, setActiveId] = useState<string | null>(null);
  const moveTask = useMoveTask();
  const openNewTask = useUi((s) => s.openNewTask);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }),
    [month],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, TaskRowType[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      (map.get(t.due_date) ?? map.set(t.due_date, []).get(t.due_date)!).push(t);
    }
    return map;
  }, [tasks]);
  const unscheduled = tasks.filter((t) => !t.due_date && !t.completed_at);
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : undefined;

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    const day = String(over.id);
    if (!task) return;
    const next = day === "unscheduled" ? null : day;
    if (task.due_date === next) return;
    moveTask.mutate({ id: task.id, position: task.position, due_date: next });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 px-4 py-2">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{format(month, "MMMM yyyy")}</h2>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
              Today
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => setMonth((m) => subMonths(m, 1))}>
              <ChevronLeftIcon />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRightIcon />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 px-4 text-[11px] font-medium text-ink-3">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-2 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-px overflow-y-auto bg-hairline px-4 pb-4 scrollbar-thin" style={{ backgroundClip: "content-box" }}>
          {days.map((day) => {
            const key = toDateString(day);
            const inMonth = isSameMonth(day, month);
            return (
              <DayCell
                key={key}
                id={key}
                day={day}
                muted={!inMonth}
                tasks={byDay.get(key) ?? []}
                listId={listId}
                onAdd={canEdit ? () => openNewTask({ listId, dueDate: key }) : undefined}
              />
            );
          })}
        </div>

        {unscheduled.length > 0 ? <UnscheduledTray tasks={unscheduled} listId={listId} /> : null}
      </div>
      <DragOverlay>{activeTask ? <Chip task={activeTask} listId={listId} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

function DayCell({ id, day, muted, tasks, listId, onAdd }: { id: string; day: Date; muted: boolean; tasks: TaskRowType[]; listId: string; onAdd?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const today = isToday(day);
  return (
    <div ref={setNodeRef} className={cn("group/day flex min-h-24 flex-col gap-1 bg-surface p-1.5 transition-colors", muted && "bg-canvas/60", isOver && "bg-action-soft/40")}>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-[12px] tabular",
            today ? "bg-action font-semibold text-action-foreground" : muted ? "text-ink-3" : "text-ink-2",
          )}
        >
          {format(day, "d")}
        </span>
        {onAdd ? (
          <button type="button" onClick={onAdd} aria-label={`Add task on ${format(day, "MMM d")}`} className="flex size-5 items-center justify-center rounded text-ink-3 opacity-0 hover:bg-muted group-hover/day:opacity-100">
            <PlusIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        {tasks.map((t) => (
          <Chip key={t.id} task={t} listId={listId} />
        ))}
      </div>
    </div>
  );
}

function UnscheduledTray({ tasks, listId }: { tasks: TaskRowType[]; listId: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: "unscheduled" });
  return (
    <div ref={setNodeRef} className={cn("flex items-center gap-2 overflow-x-auto px-4 py-2 hairline-t scrollbar-none", isOver && "bg-action-soft/40")}>
      <span className="shrink-0 text-[12px] text-ink-3">No date</span>
      {tasks.map((t) => (
        <Chip key={t.id} task={t} listId={listId} className="w-auto max-w-56 shrink-0" />
      ))}
    </div>
  );
}

function Chip({ task, listId, overlay, className }: { task: TaskRowType; listId: string; overlay?: boolean; className?: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: overlay });
  const { byId } = useSpaceStatuses(listId);
  const openTask = useOpenTask();
  const status = task.status_id ? byId.get(task.status_id) : undefined;
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={() => openTask(task.id)}
      className={cn(
        "flex h-6 w-full min-w-0 items-center gap-1.5 rounded-md bg-muted/70 px-1.5 text-left text-[12px] leading-none hover:bg-muted",
        task.completed_at && "text-ink-3 line-through",
        isDragging && "opacity-30",
        overlay && "w-40 bg-surface shadow-float",
        className,
      )}
    >
      <StatusDot color={status?.color} category={status?.category} size={10} />
      <span className="truncate">{task.title}</span>
    </button>
  );
}

export function tasksForDate(tasks: TaskRowType[], date: Date) {
  return tasks.filter((t) => {
    const d = parseDate(t.due_date);
    return d && isSameDay(d, date);
  });
}
