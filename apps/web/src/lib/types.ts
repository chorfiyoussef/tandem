import type { Tables, Enums } from "@tandem/shared/database";

export type Profile = Tables<"profiles">;
export type Workspace = Tables<"workspaces">;
export type WorkspaceMember = Tables<"workspace_members">;
export type WorkspaceInvite = Tables<"workspace_invites">;
export type Space = Tables<"spaces">;
export type Status = Tables<"statuses">;
export type List = Tables<"lists">;
export type Tag = Tables<"tags">;
export type Category = Tables<"categories">;
export type Task = Tables<"tasks">;
export type Comment = Tables<"comments">;
export type Attachment = Tables<"attachments">;
export type Activity = Tables<"activity">;
export type Notification = Tables<"notifications">;
export type ChecklistItem = Tables<"checklist_items">;

export type MemberRole = Enums<"member_role">;
export type TaskPriority = Enums<"task_priority">;
export type StatusCategory = Enums<"status_category">;

export type ProfileLite = Pick<Profile, "id" | "full_name" | "avatar_url" | "email">;

export type Member = WorkspaceMember & { profiles: ProfileLite };

/** A task with everything a row or card needs to render. */
export type TaskRow = Task & {
  categories: Category | null;
  task_assignees: { user_id: string; profiles: ProfileLite | null }[];
  task_tags: { tag_id: string; tags: Tag | null }[];
  subtasks: { id: string; completed_at: string | null }[];
  checklist_items: { id: string; done: boolean }[];
  comments: { count: number }[];
  attachments: { count: number }[];
};

export type CommentRow = Comment & { profiles: ProfileLite | null };
export type ActivityRow = Activity & { profiles: ProfileLite | null };
export type NotificationRow = Notification & {
  actor: ProfileLite | null;
  tasks: { id: string; number: number; title: string; list_id: string } | null;
};

export const TASK_SELECT = `*,
  categories(*),
  task_assignees(user_id, profiles!task_assignees_user_id_fkey(id, full_name, avatar_url, email)),
  task_tags(tag_id, tags(id, name, color, workspace_id, created_at)),
  subtasks:tasks!parent_id(id, completed_at),
  checklist_items(id, done),
  comments(count),
  attachments(count)`;
