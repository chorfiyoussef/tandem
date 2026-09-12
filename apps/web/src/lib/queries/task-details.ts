"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { qk } from "./keys";
import { invalidateTasks } from "./tasks";
import type { ActivityRow, Attachment, ChecklistItem, CommentRow } from "@/lib/types";
import type { Json } from "@tandem/shared/database";

export function useComments(taskId: string | null | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.comments(taskId ?? ""),
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles(id, full_name, avatar_url, email)")
        .eq("task_id", taskId!)
        .order("created_at");
      if (error) throw error;
      return data as unknown as CommentRow[];
    },
  });
}

export function useAddComment(taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { workspaceId: string; authorId: string; body: Json; bodyText: string }) => {
      const { error } = await supabase.from("comments").insert({
        task_id: taskId,
        workspace_id: input.workspaceId,
        author_id: input.authorId,
        body: input.body,
        body_text: input.bodyText,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.comments(taskId) });
      qc.invalidateQueries({ queryKey: qk.activity(taskId) });
      invalidateTasks(qc);
    },
  });
}

export function useDeleteComment(taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.comments(taskId) });
      invalidateTasks(qc);
    },
  });
}

export function useActivity(taskId: string | null | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.activity(taskId ?? ""),
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity")
        .select("*, profiles(id, full_name, avatar_url, email)")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as ActivityRow[];
    },
  });
}

export function useChecklist(taskId: string | null | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.checklist(taskId ?? ""),
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase.from("checklist_items").select("*").eq("task_id", taskId!).order("position");
      if (error) throw error;
      return data as ChecklistItem[];
    },
  });
}

export function useChecklistMutations(taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.checklist(taskId) });
    invalidateTasks(qc);
  };
  const add = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("checklist_items").insert({ task_id: taskId, title, position: Date.now() / 1000 });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("checklist_items").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: qk.checklist(taskId) });
      qc.setQueryData<ChecklistItem[]>(qk.checklist(taskId), (old) => old?.map((i) => (i.id === id ? { ...i, done } : i)));
    },
    onSettled: refresh,
  });
  const rename = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("checklist_items").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checklist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.checklist(taskId) });
      qc.setQueryData<ChecklistItem[]>(qk.checklist(taskId), (old) => old?.filter((i) => i.id !== id));
    },
    onSettled: refresh,
  });
  return { add, toggle, rename, remove };
}

export function useAttachments(taskId: string | null | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.attachments(taskId ?? ""),
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase.from("attachments").select("*").eq("task_id", taskId!).order("created_at");
      if (error) throw error;
      return data as Attachment[];
    },
  });
}

export function useUploadAttachment(taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, workspaceId, userId }: { file: File; workspaceId: string; userId: string }) => {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${workspaceId}/${taskId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("attachments").insert({
        task_id: taskId,
        workspace_id: workspaceId,
        uploaded_by: userId,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.attachments(taskId) });
      invalidateTasks(qc);
    },
  });
}

export function useDeleteAttachment(taskId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Attachment) => {
      await supabase.storage.from("attachments").remove([a.storage_path]);
      const { error } = await supabase.from("attachments").delete().eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.attachments(taskId) });
      invalidateTasks(qc);
    },
  });
}

export async function attachmentUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage.from("attachments").createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}
