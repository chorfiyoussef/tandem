import { admin } from "../lib/supabase.js";
import { sendDueDigest } from "../lib/email.js";
import { emailEnabled, env } from "../env.js";

function todayIn(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/**
 * Once a day: notify assignees about tasks due today or overdue.
 * In-app notifications are deduplicated per task per day via payload.day.
 */
export async function runDueReminders() {
  const day = todayIn(env.REMINDER_TZ);
  const { data: tasks, error } = await admin
    .from("tasks")
    .select("id, number, title, due_date, workspace_id, list_id, task_assignees(user_id), workspaces(slug)")
    .lte("due_date", day)
    .is("completed_at", null)
    .is("archived_at", null);
  if (error) throw error;

  const { data: existing } = await admin
    .from("notifications")
    .select("user_id, task_id")
    .eq("type", "due_soon")
    .contains("payload", { day });
  const seen = new Set((existing ?? []).map((n) => `${n.user_id}:${n.task_id}`));

  const perUser = new Map<string, { title: string; when: string; url: string }[]>();
  const inserts: { user_id: string; workspace_id: string; task_id: string; type: "due_soon"; payload: Record<string, string> }[] = [];

  for (const t of tasks ?? []) {
    const ws = t.workspaces as unknown as { slug: string } | null;
    const when = t.due_date === day ? "today" : "overdue";
    for (const a of t.task_assignees) {
      const key = `${a.user_id}:${t.id}`;
      if (seen.has(key)) continue;
      inserts.push({ user_id: a.user_id, workspace_id: t.workspace_id, task_id: t.id, type: "due_soon", payload: { title: t.title, when, day } });
      const list = perUser.get(a.user_id) ?? [];
      list.push({ title: t.title, when, url: `${env.APP_URL}/${ws?.slug}/t/${t.number}` });
      perUser.set(a.user_id, list);
    }
  }

  if (inserts.length) {
    const { error: insErr } = await admin.from("notifications").insert(inserts);
    if (insErr) throw insErr;
  }

  let emails = 0;
  if (emailEnabled && perUser.size) {
    const { data: profiles } = await admin.from("profiles").select("id, email, full_name").in("id", Array.from(perUser.keys()));
    for (const p of profiles ?? []) {
      const items = perUser.get(p.id);
      if (!items?.length || !p.email) continue;
      try {
        if (await sendDueDigest({ to: p.email, name: p.full_name, appUrl: env.APP_URL, items })) emails++;
      } catch (err) {
        console.error("digest email failed", err);
      }
    }
  }
  return { day, notifications: inserts.length, emails };
}
