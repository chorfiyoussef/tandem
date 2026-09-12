/** Pastel palette names stored in the database (spaces, statuses, tags). */
export const PASTEL_COLORS = [
  "gray",
  "rose",
  "peach",
  "butter",
  "mint",
  "aqua",
  "sky",
  "lavender",
  "blush",
] as const;
export type PastelColor = (typeof PASTEL_COLORS)[number];

export const PASTEL_LABELS: Record<PastelColor, string> = {
  gray: "Gray",
  rose: "Rose",
  peach: "Peach",
  butter: "Butter",
  mint: "Mint",
  aqua: "Aqua",
  sky: "Sky",
  lavender: "Lavender",
  blush: "Blush",
};

export const PRIORITIES = ["none", "low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_META: Record<Priority, { label: string; rank: number }> = {
  urgent: { label: "Urgent", rank: 4 },
  high: { label: "High", rank: 3 },
  normal: { label: "Normal", rank: 2 },
  low: { label: "Low", rank: 1 },
  none: { label: "No priority", rank: 0 },
};

export const ROLES = ["owner", "admin", "member", "guest"] as const;
export type MemberRole = (typeof ROLES)[number];

export const ROLE_META: Record<MemberRole, { label: string; description: string }> = {
  owner: { label: "Owner", description: "Full control, including deleting the workspace." },
  admin: { label: "Admin", description: "Manage members, spaces and settings." },
  member: { label: "Member", description: "Create and edit work in every space they can see." },
  guest: { label: "Guest", description: "View and comment on the spaces they are added to." },
};

export const STATUS_CATEGORIES = ["todo", "active", "done"] as const;
export type StatusCategory = (typeof STATUS_CATEGORIES)[number];

export const VIEW_TYPES = ["list", "board", "calendar"] as const;
export type ViewType = (typeof VIEW_TYPES)[number];

export const SPACE_ICONS = [
  "sparkles", "layers", "rocket", "palette", "code", "megaphone", "briefcase",
  "book-open", "heart", "flask-conical", "users", "compass", "leaf", "coffee",
] as const;
export type SpaceIcon = (typeof SPACE_ICONS)[number];

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
