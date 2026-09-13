import nodemailer from "nodemailer";
import { emailEnabled, env } from "../env.js";

const transport = emailEnabled
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string);
}

function layout(title: string, body: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f7f7f9;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Inter,system-ui,sans-serif;color:#1d1d1f">
  <div style="max-width:480px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;box-shadow:0 0 0 1px rgba(0,0,0,.05)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
      <span style="display:inline-block;width:13px;height:13px;border-radius:50%;background:#8b8cf0"></span><span style="display:inline-block;width:13px;height:13px;border-radius:50%;background:#7ccdb0;margin-left:-5px"></span>
      <strong style="font-size:15px;letter-spacing:-.01em">Tandem</strong>
    </div>
    <h1 style="font-size:18px;margin:0 0 8px;letter-spacing:-.01em">${escapeHtml(title)}</h1>
    <div style="font-size:14px;line-height:1.5;color:#3a3a3c">${body}</div>
    ${cta ? `<a href="${cta.url}" style="display:inline-block;margin-top:20px;padding:10px 16px;border-radius:10px;background:#3b82f6;color:#fff;text-decoration:none;font-weight:600;font-size:14px">${escapeHtml(cta.label)}</a>` : ""}
  </div></body></html>`;
}

export async function sendInviteEmail(opts: { to: string; workspaceName: string; inviterName: string | null; link: string }) {
  if (!transport) return false;
  const who = opts.inviterName ? `${escapeHtml(opts.inviterName)} invited you` : "You've been invited";
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: opts.to,
    subject: `Join ${opts.workspaceName} on Tandem`,
    text: `${opts.inviterName ?? "Someone"} invited you to join ${opts.workspaceName} on Tandem.\n\nAccept the invite: ${opts.link}\n\nThis link expires in 14 days.`,
    html: layout(
      `Join ${opts.workspaceName}`,
      `<p>${who} to join <strong>${escapeHtml(opts.workspaceName)}</strong> on Tandem, the team's shared place for tasks.</p><p style="color:#6e6e73;font-size:12px">This link expires in 14 days.</p>`,
      { label: "Accept invite", url: opts.link },
    ),
  });
  return true;
}

export async function sendDueDigest(opts: { to: string; name: string | null; appUrl: string; items: { title: string; when: string; url: string }[] }) {
  if (!transport || opts.items.length === 0) return false;
  const rows = opts.items
    .map((i) => `<li style="margin:6px 0"><a href="${i.url}" style="color:#1d1d1f;text-decoration:none">${escapeHtml(i.title)}</a> <span style="color:#6e6e73">· ${escapeHtml(i.when)}</span></li>`)
    .join("");
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: opts.to,
    subject: opts.items.length === 1 ? "1 task is due" : `${opts.items.length} tasks are due`,
    text: opts.items.map((i) => `${i.title} (${i.when}) ${i.url}`).join("\n"),
    html: layout(`Good morning${opts.name ? `, ${opts.name.split(" ")[0]}` : ""}`, `<p>Here's what's due:</p><ul style="padding-left:18px">${rows}</ul>`, { label: "Open Tandem", url: opts.appUrl }),
  });
  return true;
}
