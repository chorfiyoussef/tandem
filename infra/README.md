# Tandem infrastructure

The backend (Supabase + the Tandem API) runs on one Linux server with Docker
Compose (any provider; the scripts assume Ubuntu 22.04/24.04); the web app is built and deployed by Cloudflare from git (see the
root README, "Frontend on Cloudflare"). This directory holds the compose
file, Caddy config, the Supabase init files, and the scripts.

```
infra/
├── docker-compose.yml   Supabase (db, auth, rest, realtime, storage, imgproxy, meta, studio, envoy)
│                        + tandem api + caddy (+ tandem web behind the optional `web` profile)
├── Caddyfile            HTTPS for API_DOMAIN (Tandem API) and SUPABASE_DOMAIN (Supabase + Studio)
├── Caddyfile.with-web   Same, plus APP_DOMAIN → the self-hosted web container
├── .env.example         Every variable, documented. generate-env.mjs turns it into .env
├── volumes/
│   ├── db/              Postgres init SQL from the official Supabase self-hosting repo
│   ├── api/envoy/       Envoy gateway config (routes /auth, /rest, /realtime, /storage, /pg, Studio)
│   ├── storage/         Uploaded files (bind mount; back this up)
│   └── db/data/         Postgres data (created on first start; back this up)
├── scripts/
│   ├── bootstrap-server.sh  Fresh Ubuntu server → Docker + firewall + /opt/tandem
│   ├── generate-env.mjs     Fresh secrets + signed anon/service JWTs → .env
│   ├── deploy.sh            rsync + build + up + migrate, from your laptop
│   ├── migrate.sh           Applies ../supabase/migrations/*.sql once each
│   ├── backup.sh            pg_dump + storage tarball, keeps 14 days
│   └── restore.sh           Restore a pg_dump
└── upstream/            Unmodified copy of the Supabase compose files we adapted (reference only)
```

## Sizing

| Team | Server size | Notes |
| --- | --- | --- |
| up to ~15 people | 2 vCPU, 4 GB RAM + 2 GB swap | bootstrap-server.sh adds the swap |
| up to ~50 people | 4 vCPU, 8 GB RAM | comfortable |

Disk: the Supabase images are ~3 GB; data grows with attachments.

## First deploy

1. Create a server (Ubuntu 24.04) at any provider, add your SSH key, point `API_DOMAIN` and
   `SUPABASE_DOMAIN` A records at it. (`APP_DOMAIN` points at Cloudflare.)
2. `ssh root@<ip> 'bash -s' < infra/scripts/bootstrap-server.sh`
3. `cd infra && node scripts/generate-env.mjs --app <app-domain> --api <api-domain> --supabase <supabase-domain> --email <acme-email>`
4. Optional: edit `.env` and fill `SMTP_*` (any SMTP provider). Without SMTP,
   invite links are shown in the UI to copy, and password reset emails can't
   be sent.
5. `scp infra/.env root@<ip>:/opt/tandem/infra/.env`
6. `./infra/scripts/deploy.sh root@<ip>`
7. Connect the repo in Cloudflare (root README) with the build variables the
   generator printed, then open `https://<app-domain>` → **Set up Tandem**.

Caddy obtains certificates automatically on the first request; give DNS a
few minutes to propagate before the first deploy.

## Day-to-day

```bash
./infra/scripts/deploy.sh root@<ip>              # ship a new API/Supabase version (the web app deploys itself from git)
./infra/scripts/deploy.sh root@<ip> --no-build   # just restart / apply migrations
ssh root@<ip> 'cd /opt/tandem/infra && docker compose logs -f api web'
ssh root@<ip> 'cd /opt/tandem/infra && docker compose ps'
```

### Backups

On the server, add to root's crontab:

```
30 3 * * * /opt/tandem/infra/scripts/backup.sh >> /var/log/tandem-backup.log 2>&1
```

Copy `/opt/tandem-backups` somewhere off the box (Hetzner Storage Box +
rclone, or S3). Restore with `scripts/restore.sh <dump>`.

### Manually running the reminder job

```bash
curl -X POST -H "X-Cron-Secret: $CRON_SECRET" https://<api-domain>/jobs/due-reminders
```

### Updating Supabase

Image tags are pinned in `docker-compose.yml`. To upgrade, compare with the
[official compose](https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml),
bump the tags, and `deploy.sh`. Postgres major upgrades need a dump/restore;
see Supabase's `utils/upgrade-pg17.sh` in the same repo.

## Ports and exposure

Only Caddy publishes ports (80/443). Postgres, Envoy, Studio and the API are
reachable only inside the Docker network. Studio is served by Envoy at
`https://<supabase-domain>/` behind HTTP basic auth
(`DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`).

## Troubleshooting

- **`api` unhealthy right after deploy**: it waits for Envoy; check
  `docker compose logs api-gw studio`. Studio takes ~20 s to become healthy.
- **Browser errors about CORS on the API**: `APP_URL` (derived from
  `APP_DOMAIN`) must be exactly the origin the app is served from.
- **Invite emails not arriving**: `docker compose logs api` shows SMTP errors.
  The UI always offers a copyable link as a fallback.
- **Realtime not updating**: the `realtime` container must be able to reach
  Postgres with the `supabase_admin` role; check `docker compose logs realtime`.
- **Changed a migration locally**: never edit an applied migration. Add a new
  file with `pnpm db:migration <name>`, test with `pnpm db:reset`, then deploy.
