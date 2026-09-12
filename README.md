# Tandem

A calm, self-hosted task manager for small teams. Think of it as the 20% of
ClickUp a team actually uses, with none of the noise: spaces, lists, tasks,
subtasks, comments, a board, a calendar, and an inbox. Runs entirely on your
own Hetzner box on top of open-source Supabase.

```
Workspace  ›  Space  ›  List  ›  Task  ›  Subtask
```

## What's inside

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js 16 app (App Router, Tailwind v4, shadcn/ui). The whole UI. |
| `apps/api` | Small Hono (Node) service for things that need the Supabase service role: first-run setup, invites, invite sign-up, daily due-date reminders, optional email. |
| `packages/shared` | Types, zod schemas and constants shared by web and api (generated DB types live here). |
| `supabase/` | Database migrations (schema, RLS policies, triggers, RPCs) and local CLI config. |
| `infra/` | Production Docker Compose (Supabase + Tandem + Caddy), deploy scripts, backups. |

Everything the browser does goes straight to Supabase (PostgREST, Auth,
Realtime, Storage) and is protected by row-level security. The API is only
used for privileged operations.

## Features

- **Home**: everything assigned to you, grouped by Overdue / Today / Tomorrow / This week / Later.
- **List view** grouped by status with inline add, drag to reorder or change status.
- **Board** (kanban) and **Calendar** (drag to reschedule) views per list.
- **Task panel**: title, status, assignees, priority, due date, category, tags, list; rich-text description; subtasks; checklist; attachments; comments with @mentions; full activity log.
- **Categories**: one per task (Bug, Feature, Design…), workspace-wide, with colours. Filter any view by category, or group the list view by category and drag tasks between groups. **Tags** stay free-form and multi-valued.
- **Inbox**: assignments, mentions, comments on tasks you watch, status changes, daily due reminders.
- **Realtime**: every open view updates when a teammate changes something.
- **Search / command palette** (`⌘K`), keyboard shortcuts (`C` new task, `G H` home, `G I` inbox).
- **Spaces** with their own statuses and colours; private spaces; pinned lists in the sidebar.
- **Members & invites** with owner / admin / member / guest roles; invite links work with or without email.
- Light and dark appearance; works on phones. Icons are Phosphor, the web family closest to SF Symbols.

## Local development

Prerequisites: Node 22+, pnpm (via corepack), Docker Desktop, the
[Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
corepack enable && corepack prepare pnpm@10.15.0 --activate
pnpm install

# 1. Start local Supabase (Postgres, Auth, Storage, Studio…) and apply migrations
pnpm db:start
supabase status            # copy the anon key + URL into apps/web/.env.local and apps/api/.env

# 2. Run the web app and the API
pnpm dev                   # web on :3000, api on :4000
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and `apps/api/.env.example`
to `apps/api/.env`; both are pre-filled for the local Supabase instance. The
first visit to http://localhost:3000 shows the **Set up Tandem** screen; create
the first account and workspace there.

Useful commands:

```bash
pnpm db:reset              # drop + re-apply migrations (wipes local data)
pnpm db:types              # regenerate packages/shared/src/database.types.ts
pnpm db:migration <name>   # create a new migration file
pnpm typecheck && pnpm lint
```

Local mail (invites, password resets) lands in Mailpit: http://127.0.0.1:54324.

## Deploying to Hetzner

One VM (a CX32 / 4 GB is plenty for a team) running Docker Compose with:
Postgres, Auth, PostgREST, Realtime, Storage, Studio, Envoy (the Supabase
API gateway), the Tandem web app, the Tandem API and Caddy for HTTPS.

You need two DNS records pointing at the server: `APP_DOMAIN`
(e.g. `tandem.example.com`) and `SUPABASE_DOMAIN`
(e.g. `supabase.tandem.example.com`).

```bash
# On the server (Ubuntu 22.04/24.04), once:
curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/infra/scripts/bootstrap-server.sh | bash

# On your machine, once: create the production env with fresh secrets and copy it up
cd infra
node scripts/generate-env.mjs --app tandem.example.com --supabase supabase.tandem.example.com --email you@example.com
scp .env root@<server-ip>:/opt/tandem/infra/.env   # (edit SMTP_* first if you want email)

# Every deploy:
./infra/scripts/deploy.sh root@<server-ip>
```

`deploy.sh` rsyncs the repo, builds the images on the server, starts
everything, and applies any new migrations. Open `https://tandem.example.com`
and complete the first-run setup. Supabase Studio is at
`https://supabase.tandem.example.com` behind the `DASHBOARD_USERNAME` /
`DASHBOARD_PASSWORD` from `infra/.env`.

See [`infra/README.md`](infra/README.md) for backups, restores, updating
Supabase images, and troubleshooting.

## How access works

- Public sign-up is off in production. The first account is created on the
  `/setup` screen (only available while the database has no users); everyone
  else joins through an invite link created in **Settings › Members**.
- Roles: **owner** (everything, incl. deleting the workspace), **admin**
  (members, spaces, settings), **member** (create and edit work), **guest**
  (view and comment only).
- All data access is enforced in Postgres with row-level security, so even the
  Supabase REST API can't leak a workspace to someone who isn't a member.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `⌘K` or `/` | Search and commands |
| `C` | New task |
| `⌘\` | Toggle sidebar |
| `G` then `H` / `I` / `S` | Go to Home / Inbox / Settings |
| `⌘↵` | Send comment / create task |
| `Esc` | Close panel or dialog |
