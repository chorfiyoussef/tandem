"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { qk } from "./queries/keys";

/**
 * One realtime channel per workspace. Any change to tasks, assignees, tags,
 * comments, lists, spaces or statuses invalidates the matching queries so
 * every open view stays current without polling.
 */
export function useWorkspaceRealtime(workspaceId: string, userId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const pending = new Set<string>();

    const flush = () => {
      timer = null;
      const keys = Array.from(pending);
      pending.clear();
      for (const key of keys) {
        switch (key) {
          case "tasks":
            qc.invalidateQueries({ queryKey: qk.tasks() });
            break;
          case "comments":
            qc.invalidateQueries({ queryKey: ["comments"] });
            qc.invalidateQueries({ queryKey: ["activity"] });
            break;
          case "checklist":
            qc.invalidateQueries({ queryKey: ["checklist"] });
            qc.invalidateQueries({ queryKey: qk.tasks() });
            break;
          case "lists":
            qc.invalidateQueries({ queryKey: qk.lists(workspaceId) });
            break;
          case "spaces":
            qc.invalidateQueries({ queryKey: qk.spaces(workspaceId) });
            break;
          case "statuses":
            qc.invalidateQueries({ queryKey: qk.statuses(workspaceId) });
            break;
          case "categories":
            qc.invalidateQueries({ queryKey: qk.categories(workspaceId) });
            qc.invalidateQueries({ queryKey: qk.tasks() });
            break;
          case "notifications":
            qc.invalidateQueries({ queryKey: qk.notifications(userId) });
            break;
        }
      }
    };
    const schedule = (key: string) => {
      pending.add(key);
      if (!timer) timer = setTimeout(flush, 250);
    };

    const channel = supabase
      .channel(`workspace:${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `workspace_id=eq.${workspaceId}` }, () => schedule("tasks"))
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignees" }, () => schedule("tasks"))
      .on("postgres_changes", { event: "*", schema: "public", table: "task_tags" }, () => schedule("tasks"))
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist_items" }, () => schedule("checklist"))
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `workspace_id=eq.${workspaceId}` }, () => schedule("comments"))
      .on("postgres_changes", { event: "*", schema: "public", table: "lists", filter: `workspace_id=eq.${workspaceId}` }, () => schedule("lists"))
      .on("postgres_changes", { event: "*", schema: "public", table: "spaces", filter: `workspace_id=eq.${workspaceId}` }, () => schedule("spaces"))
      .on("postgres_changes", { event: "*", schema: "public", table: "statuses" }, () => schedule("statuses"))
      .on("postgres_changes", { event: "*", schema: "public", table: "categories", filter: `workspace_id=eq.${workspaceId}` }, () => schedule("categories"))
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => schedule("notifications"))
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [qc, workspaceId, userId]);
}
