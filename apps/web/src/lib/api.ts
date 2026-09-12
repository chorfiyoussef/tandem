"use client";

import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Call the Tandem API (Hono). Attaches the current Supabase access token. */
export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { json, auth = true, headers, ...rest } = init;
  const h = new Headers(headers);
  if (json !== undefined) h.set("Content-Type", "application/json");
  if (auth) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) h.set("Authorization", `Bearer ${session.access_token}`);
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: h,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(data) ?? res.statusText ?? "Request failed");
  }
  return data as T;
}

function errorMessage(data: unknown): string | null {
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error: unknown }).error;
    return typeof e === "string" ? e : JSON.stringify(e);
  }
  return null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
