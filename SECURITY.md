# Security

Tandem is meant to be self-hosted, so most of your security posture is the
Supabase stack and the server it runs on. `infra/` locks the firewall down to
22, 80 and 443 and disables SSH password login; keep it that way.

## Reporting a vulnerability

Email youssef@agaria.ai with the details. Please do not open a public issue
for security problems. You'll get a reply within a few days, and credit in the
release notes if you want it.

## Scope

- Row-level security policies in `supabase/migrations`
- The API in `apps/api` (invites, first-run setup, reminders)
- Authentication flows in `apps/web`
