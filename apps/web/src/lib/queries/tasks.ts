"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { qk } from "./keys";
import { TASK_SELECT, type Task, type TaskRow, type ProfileLite, type Tag } from "@/lib/types";
import type { TablesInsert, TablesUpdate } from "@tandem/shared/database";

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function useListTasks(listId: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.listTasks(listId ?? ""),
    enabled: !!listId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT)
        .eq("list_id", listId!)
        .is("parent_id", null)
        .is("archived_at", null)
        .order("position");
      if (error) throw error;
      return data as unknown as TaskRow[];
    },
  });
}

export function useTask(taskId: string | null | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.task(taskId ?? ""),
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select(TASK_SELECT).eq("id", taskId!).maybeSingle();
      if (error) throw error;
      return (data as unknown as TaskRow | null) ?? null;
    },
  });
}

export function useSubtasks(parentId: string | null | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: [...qk.task(parentId ?? ""), "subtasks"],
    enabled: !!parentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT)
        .eq("parent_id", parentId!)
        .is("archived_at", null)
        .order("position");
      if (error) throw error;
      return data as unknown as TaskRow[];
    },
  });
}

/** Tasks assigned to the current user across the workspace (Home). */
export function useMyTasks(workspaceId: string, userId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.myTasks(workspaceId, userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`${TASK_SELECT}, mine:task_assignees!inner(user_id)`)
        .eq("workspace_id", workspaceId)
        .eq("mine.user_id", userId)
        .is("archived_at", null)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("position");
      if (error) throw error;
      return data as unknown as TaskRow[];
    },
  });
}

/** All open tasks in the workspace (calendar, search fallbacks). */
export function useWorkspaceTasks(workspaceId: string, opts: { enabled?: boolean } = {}) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.workspaceTasks(workspaceId),
    enabled: opts.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT)
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("position");
      if (error) throw error;
      return data as unknown as TaskRow[];
    },
  });
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

function patchTaskEverywhere(qc: QueryClient, taskId: string, patch: Partial<TaskRow>) {
  qc.setQueriesData<TaskRow[] | TaskRow | null>({ queryKey: qk.tasks() }, (old) => {
    if (!old) return old;
    if (Array.isArray(old)) return old.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
    return old.id === taskId ? { ...old, ...patch } : old;
  });
}

function removeTaskEverywhere(qc: QueryClient, taskId: string) {
  qc.setQueriesData<TaskRow[] | TaskRow | null>({ queryKey: qk.tasks() }, (old) => {
    if (!old) return old;
    if (Array.isArray(old)) return old.filter((t) => t.id !== taskId);
    return old.id === taskId ? null : old;
  });
}

export function invalidateTasks(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: qk.tasks() });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type CreateTaskInput = Omit<TablesInsert<"tasks">, "workspace_id" | "number"> & {
  assigneeIds?: string[];
  tagIds?: string[];
};

export function useCreateTask() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assigneeIds = [], tagIds = [], ...input }: CreateTaskInput) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, number: 0, workspace_id: "00000000-0000-0000-0000-000000000000" })
        .select(TASK_SELECT)
        .single();
      if (error) throw error;
      const task = data as unknown as TaskRow;
      if (assigneeIds.length) {
        const { error: e } = await supabase
          .from("task_assignees")
          .insert(assigneeIds.map((user_id) => ({ task_id: task.id, user_id })));
        if (e) throw e;
      }
      if (tagIds.length) {
        const { error: e } = await supabase.from("task_tags").insert(tagIds.map((tag_id) => ({ task_id: task.id, tag_id })));
        if (e) throw e;
      }
      return task;
    },
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useUpdateTask() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<"tasks"> & { id: string }) => {
      const { data, error } = await supabase.from("tasks").update(patch).eq("id", id).select(TASK_SELECT).single();
      if (error) throw error;
      return data as unknown as TaskRow;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      patchTaskEverywhere(qc, id, patch as Partial<TaskRow>);
    },
    onSuccess: (task) => patchTaskEverywhere(qc, task.id, task),
    onError: () => invalidateTasks(qc),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useDeleteTask() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      removeTaskEverywhere(qc, id);
    },
    onSettled: () => invalidateTasks(qc),
  });
}

export function useSetAssignees() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task, userIds, members }: { task: TaskRow; userIds: string[]; members: ProfileLite[] }) => {
      const current = task.task_assignees.map((a) => a.user_id);
      const add = userIds.filter((id) => !current.includes(id));
      const remove = current.filter((id) => !userIds.includes(id));
      if (add.length) {
        const { error } = await supabase.from("task_assignees").insert(add.map((user_id) => ({ task_id: task.id, user_id })));
        if (error) throw error;
      }
      if (remove.length) {
        const { error } = await supabase.from("task_assignees").delete().eq("task_id", task.id).in("user_id", remove);
        if (error) throw error;
      }
      return members;
    },
    onMutate: async ({ task, userIds, members }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      patchTaskEverywhere(qc, task.id, {
        task_assignees: userIds.map((user_id) => ({ user_id, profiles: members.find((m) => m.id === user_id) ?? null })),
      });
    },
    onSettled: () => invalidateTasks(qc),
  });
}

export function useSetTags() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ task, tagIds }: { task: TaskRow; tagIds: string[]; tags: Tag[] }) => {
      const current = task.task_tags.map((t) => t.tag_id);
      const add = tagIds.filter((id) => !current.includes(id));
      const remove = current.filter((id) => !tagIds.includes(id));
      if (add.length) {
        const { error } = await supabase.from("task_tags").insert(add.map((tag_id) => ({ task_id: task.id, tag_id })));
        if (error) throw error;
      }
      if (remove.length) {
        const { error } = await supabase.from("task_tags").delete().eq("task_id", task.id).in("tag_id", remove);
        if (error) throw error;
      }
    },
    onMutate: async ({ task, tagIds, tags }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      patchTaskEverywhere(qc, task.id, {
        task_tags: tagIds.map((tag_id) => ({ tag_id, tags: tags.find((t) => t.id === tag_id) ?? null })),
      });
    },
    onSettled: () => invalidateTasks(qc),
  });
}

/** Reorder / move: update position (and optionally status or list) for one task. */
export function useMoveTask() {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; position: number; status_id?: string; list_id?: string; due_date?: string | null; category_id?: string | null }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.tasks() });
      patchTaskEverywhere(qc, id, patch as Partial<Task>);
    },
    onError: () => invalidateTasks(qc),
    onSettled: () => invalidateTasks(qc),
  });
}
