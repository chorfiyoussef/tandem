import { z } from "zod";
import { PASTEL_COLORS, PRIORITIES, ROLES, STATUS_CATEGORIES } from "./constants";

export const slugSchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes.");

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Give your workspace a name.").max(80),
  slug: slugSchema,
  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,5}$/, "1–5 letters, like TDM.")
    .default("T"),
});

export const inviteSchema = z.object({
  workspaceId: z.string().uuid(),
  emails: z.array(z.string().trim().email()).min(1).max(20),
  role: z.enum(ROLES).default("member"),
});

export const inviteSignupSchema = z.object({
  token: z.string().min(10),
  fullName: z.string().trim().min(1).max(80),
  password: z.string().min(8, "Use at least 8 characters."),
});

export const setupSchema = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1).max(80),
  password: z.string().min(8, "Use at least 8 characters."),
  workspaceName: z.string().trim().min(1).max(80),
});

export const taskCreateSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().trim().min(1).max(500),
  statusId: z.string().uuid().nullable().optional(),
  priority: z.enum(PRIORITIES).default("none"),
  dueDate: z.string().date().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const statusSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.enum(PASTEL_COLORS),
  category: z.enum(STATUS_CATEGORIES),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type InviteSignupInput = z.infer<typeof inviteSignupSchema>;
export type SetupInput = z.infer<typeof setupSchema>;
