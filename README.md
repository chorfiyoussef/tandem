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

## Deploying

The frontend runs on **Cloudflare Workers**, built automatically from this
repo. Supabase and the Tandem API run on **one Hetzner VM**. Three hostnames:

| Hostname | Where | What |
| --- | --- | --- |
| `APP_DOMAIN`, e.g. `tandem.example.com` | Cloudflare | the Next.js app |
| `API_DOMAIN`, e.g. `api.tandem.example.com` | Hetzner (Caddy) | the Tandem API |
| `SUPABASE_DOMAIN`, e.g. `supabase.tandem.example.com` | Hetzner (Caddy) | Supabase API + Studio |

### 1. Backend on Hetzner

```bash
# On the server (Ubuntu 22.04/24.04), once:
ssh root@<ip> 'bash -s' < infra/scripts/bootstrap-server.sh

# On your machine, once: create the production env with fresh secrets and copy it up
cd infra
node scripts/generate-env.mjs --app tandem.example.com --api api.tandem.example.com \
  --supabase supabase.tandem.example.com --email you@example.com
scp .env root@<ip>:/opt/tandem/infra/.env       # edit SMTP_* first if you want email

# Every backend deploy:
./infra/scripts/deploy.sh root@<ip>
```

Point the `API_DOMAIN` and `SUPABASE_DOMAIN` A records at the VM. Caddy
obtains certificates on first request. `deploy.sh` rsyncs the repo, builds
the API image, starts Supabase, and applies any new migrations.

### 2. Frontend on Cloudflare (auto-deploys from git)

The web app is packaged for Workers with `@opennextjs/cloudflare`
(`apps/web/wrangler.jsonc`, `apps/web/open-next.config.ts`). Connect the repo
once and every push to `main` builds and deploys it; other branches get
preview URLs.

In the Cloudflare dashboard: **Workers & Pages → Create → Import a
repository** → pick `tandem`, then:

| Setting | Value |
| --- | --- |
| Project / Worker name | `tandem-web` (must match `name` in `wrangler.jsonc`) |
| Root directory | `apps/web` |
| Build command | `pnpm run build:cf` |
| Deploy command | `pnpm exec opennextjs-cloudflare deploy` |
| Build variables | `NEXT_PUBLIC_SUPABASE_URL=https://<SUPABASE_DOMAIN>`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from infra/.env>`, `NEXT_PUBLIC_API_URL=https://<API_DOMAIN>` |

`generate-env.mjs` prints these three build variables for you. Then add
`APP_DOMAIN` as a custom domain on the Worker (Settings → Domains & Routes).
That's it: `git push` = deploy.

To deploy from your laptop instead: `cd apps/web && pnpm run deploy:cf`
(needs `wrangler login`).

### Self-hosting the frontend on the VM instead

Possible, if you'd rather not use Cloudflare: point `APP_DOMAIN` at the VM and
run `CADDYFILE=Caddyfile.with-web docker compose --profile web up -d --build`
in `/opt/tandem/infra`. See [`infra/README.md`](infra/README.md).

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
