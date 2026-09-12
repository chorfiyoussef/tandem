"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { qk } from "./keys";
import type { Category, List, Member, Space, Status, Tag, WorkspaceInvite } from "@/lib/types";
import type { MemberRole, PastelColor } from "@tandem/shared";

export function useMembers(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.members(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("*, profiles(id, full_name, avatar_url, email)")
        .eq("workspace_id", workspaceId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Member[];
    },
    staleTime: 60_000,
  });
}

export function useSpaces(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.spaces(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spaces")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("position");
      if (error) throw error;
      return data as Space[];
    },
    staleTime: 60_000,
  });
}

export function useLists(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.lists(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lists")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("position");
      if (error) throw error;
      return data as List[];
    },
    staleTime: 60_000,
  });
}

/** All statuses in the workspace (across spaces), so pickers never wait. */
export function useStatuses(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.statuses(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("statuses")
        .select("*, spaces!inner(workspace_id)")
        .eq("spaces.workspace_id", workspaceId)
        .order("position");
      if (error) throw error;
      return (data ?? []).map((row) => {
        const { spaces, ...rest } = row;
        void spaces;
        return rest;
      }) as Status[];
    },
    staleTime: 60_000,
  });
}

export function useTags(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.tags(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*").eq("workspace_id", workspaceId).order("name");
      if (error) throw error;
      return data as Tag[];
    },
    staleTime: 60_000,
  });
}

export function useFavorites(userId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.favorites(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("list_id").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((f) => f.list_id);
    },
    staleTime: 60_000,
  });
}

export function useToggleFavorite(userId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, on }: { listId: string; on: boolean }) => {
      if (on) {
        const { error } = await supabase.from("favorites").insert({ user_id: userId, list_id: listId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favorites").delete().eq("user_id", userId).eq("list_id", listId);
        if (error) throw error;
      }
    },
    onMutate: async ({ listId, on }) => {
      await qc.cancelQueries({ queryKey: qk.favorites(userId) });
      const prev = qc.getQueryData<string[]>(qk.favorites(userId)) ?? [];
      qc.setQueryData<string[]>(qk.favorites(userId), on ? [...prev, listId] : prev.filter((id) => id !== listId));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(qk.favorites(userId), ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.favorites(userId) }),
  });
}

export function useInvites(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.invites(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_invites")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WorkspaceInvite[];
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateSpace(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color: PastelColor; icon?: string | null; isPrivate?: boolean }) => {
      const { data, error } = await supabase.rpc("create_space", {
        p_workspace: workspaceId,
        p_name: input.name,
        p_color: input.color,
        p_icon: input.icon ?? undefined,
        p_private: input.isPrivate ?? false,
      });
      if (error) throw error;
      return data as Space;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.spaces(workspaceId) });
      qc.invalidateQueries({ queryKey: qk.statuses(workspaceId) });
    },
  });
}

export function useUpdateSpace(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Space> & { id: string }) => {
      const { error } = await supabase.from("spaces").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.spaces(workspaceId) }),
  });
}

export function useDeleteSpace(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("spaces").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.spaces(workspaceId) });
      qc.invalidateQueries({ queryKey: qk.lists(workspaceId) });
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
  });
}

export function useCreateList(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { spaceId: string; name: string; position?: number }) => {
      const { data, error } = await supabase
        .from("lists")
        .insert({
          space_id: input.spaceId,
          workspace_id: workspaceId,
          name: input.name,
          position: input.position ?? Date.now() / 1000,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as List;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.lists(workspaceId) }),
  });
}

export function useUpdateList(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<List> & { id: string }) => {
      const { error } = await supabase.from("lists").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.lists(workspaceId) }),
  });
}

export function useDeleteList(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.lists(workspaceId) });
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
  });
}

export function useUpsertStatus(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Status> & { space_id: string; name: string }) => {
      const { data, error } = await supabase.from("statuses").upsert(input).select("*").single();
      if (error) throw error;
      return data as Status;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.statuses(workspaceId) }),
  });
}

export function useDeleteStatus(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, moveTo }: { id: string; moveTo: string }) => {
      const { error: e1 } = await supabase.from("tasks").update({ status_id: moveTo }).eq("status_id", id);
      if (e1) throw e1;
      const { error } = await supabase.from("statuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.statuses(workspaceId) });
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
  });
}

export function useCreateTag(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color: PastelColor }) => {
      const { data, error } = await supabase
        .from("tags")
        .insert({ workspace_id: workspaceId, name: input.name, color: input.color })
        .select("*")
        .single();
      if (error) throw error;
      return data as Tag;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tags(workspaceId) }),
  });
}

export function useUpdateTag(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Tag> & { id: string }) => {
      const { error } = await supabase.from("tags").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tags(workspaceId) });
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
  });
}

export function useDeleteTag(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.tags(workspaceId) });
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: MemberRole }) => {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.members(workspaceId) }),
  });
}

export function useRemoveMember(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.members(workspaceId) }),
  });
}

export function useRevokeInvite(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.invites(workspaceId) }),
  });
}

// ---------------------------------------------------------------------------
// Categories (one per task, workspace-wide)
// ---------------------------------------------------------------------------

export function useCategories(workspaceId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.categories(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("position")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 60_000,
  });
}

export function useCreateCategory(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color: PastelColor; icon?: string | null }) => {
      const { data, error } = await supabase
        .from("categories")
        .insert({ workspace_id: workspaceId, name: input.name, color: input.color, icon: input.icon ?? null, position: Date.now() / 1000 })
        .select("*")
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.categories(workspaceId) }),
  });
}

export function useUpdateCategory(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Category> & { id: string }) => {
      const { error } = await supabase.from("categories").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.categories(workspaceId) });
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
  });
}

export function useDeleteCategory(workspaceId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.categories(workspaceId) });
      qc.invalidateQueries({ queryKey: qk.tasks() });
    },
  });
}
