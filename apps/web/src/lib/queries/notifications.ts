"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { qk } from "./keys";
import type { NotificationRow } from "@/lib/types";

export function useNotifications(userId: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: qk.notifications(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, actor:profiles!notifications_actor_id_fkey(id, full_name, avatar_url, email), tasks(id, number, title, list_id)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as NotificationRow[];
    },
    staleTime: 15_000,
  });
}

export function useMarkRead(userId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[] | "all") => {
      if (ids === "all") {
        const { error } = await supabase.rpc("mark_all_notifications_read");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
        if (error) throw error;
      }
    },
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: qk.notifications(userId) });
      const now = new Date().toISOString();
      qc.setQueryData<NotificationRow[]>(qk.notifications(userId), (old) =>
        old?.map((n) => (ids === "all" || ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notifications(userId) }),
  });
}

export function useDeleteNotification(userId: string) {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.notifications(userId) });
      qc.setQueryData<NotificationRow[]>(qk.notifications(userId), (old) => old?.filter((n) => n.id !== id));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notifications(userId) }),
  });
}
