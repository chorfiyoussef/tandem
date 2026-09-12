"use client";

import { createContext, useContext, useMemo } from "react";
import type { MemberRole, Profile, Workspace } from "@/lib/types";
import { useWorkspaceRealtime } from "@/lib/realtime";

export type WorkspaceContextValue = {
  workspace: Workspace;
  role: MemberRole;
  profile: Profile;
  userId: string;
  isAdmin: boolean;
  canEdit: boolean;
  /** Build a workspace-relative href. */
  href: (path?: string) => string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  workspace,
  role,
  profile,
  children,
}: {
  workspace: Workspace;
  role: MemberRole;
  profile: Profile;
  children: React.ReactNode;
}) {
  useWorkspaceRealtime(workspace.id, profile.id);
  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspace,
      role,
      profile,
      userId: profile.id,
      isAdmin: role === "owner" || role === "admin",
      canEdit: role !== "guest",
      href: (path = "") => `/${workspace.slug}${path ? (path.startsWith("/") ? path : `/${path}`) : ""}`,
    }),
    [workspace, role, profile],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside a WorkspaceProvider");
  return ctx;
}
