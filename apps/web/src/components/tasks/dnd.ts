import { positionBetween } from "@tandem/shared";
import type { Status, TaskRow } from "@/lib/types";

export const NO_STATUS = "none";

/**
 * Group task ids by an arbitrary key (status, category…), preserving position
 * order. Tasks whose key isn't one of `ids` land in the NO_STATUS ("none")
 * group, which is dropped when empty unless `alwaysNone` is set.
 */
export function groupTasks(
  tasks: TaskRow[],
  ids: string[],
  keyOf: (t: TaskRow) => string | null,
  opts: { alwaysNone?: boolean } = {},
): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const id of ids) groups[id] = [];
  groups[NO_STATUS] = [];
  const sorted = [...tasks].sort((a, b) => a.position - b.position);
  for (const t of sorted) {
    const key = keyOf(t);
    (groups[key && key in groups ? key : NO_STATUS] ??= []).push(t.id);
  }
  if (!opts.alwaysNone && groups[NO_STATUS].length === 0) delete groups[NO_STATUS];
  return groups;
}

/** Group task ids by status id, preserving position order. */
export function groupByStatus(tasks: TaskRow[], statuses: Status[]): Record<string, string[]> {
  return groupTasks(tasks, statuses.map((s) => s.id), (t) => t.status_id);
}

export function findContainer(containers: Record<string, string[]>, id: string): string | undefined {
  if (id in containers) return id;
  return Object.keys(containers).find((key) => containers[key].includes(id));
}

/** Compute a fractional position for the item at `index` in `ids`, using its neighbours' current positions. */
export function positionAt(ids: string[], index: number, tasksById: Map<string, TaskRow>, movingId: string): number {
  const before = ids[index - 1] && ids[index - 1] !== movingId ? tasksById.get(ids[index - 1])?.position : undefined;
  const after = ids[index + 1] && ids[index + 1] !== movingId ? tasksById.get(ids[index + 1])?.position : undefined;
  return positionBetween(before ?? null, after ?? null);
}
