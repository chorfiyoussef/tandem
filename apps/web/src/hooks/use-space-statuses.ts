"use client";

import { useMemo } from "react";
import { useWorkspace } from "@/components/workspace-provider";
import { useLists, useStatuses } from "@/lib/queries/workspace";
import type { Status } from "@/lib/types";

/** Statuses that apply to a given list (through its space), sorted by position. */
export function useSpaceStatuses(listId: string | null | undefined) {
  const { workspace } = useWorkspace();
  const { data: lists } = useLists(workspace.id);
  const { data: statuses } = useStatuses(workspace.id);
  return useMemo(() => {
    const spaceId = lists?.find((l) => l.id === listId)?.space_id;
    const forSpace = (statuses ?? []).filter((s) => s.space_id === spaceId).sort((a, b) => a.position - b.position);
    const firstTodo = forSpace.find((s) => s.category === "todo") ?? forSpace[0];
    const firstDone = forSpace.find((s) => s.category === "done");
    return { spaceId, statuses: forSpace as Status[], firstTodo, firstDone, byId: new Map(forSpace.map((s) => [s.id, s])) };
  }, [lists, statuses, listId]);
}
