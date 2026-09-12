# Tandem infrastructure

Production runs on one Hetzner VM with Docker Compose. This directory holds
the compose file, Caddy config, the Supabase init files, and the scripts.

```
infra/
├── docker-compose.yml   Supabase (db, auth, rest, realtime, storage, imgproxy, meta, studio, envoy)
│                        + tandem web + tandem api + caddy
├── Caddyfile            HTTPS for APP_DOMAIN (app + /api) and SUPABASE_DOMAIN (Supabase + Studio)
├── .env.example         Every variable, documented. generate-env.mjs turns it into .env
├── volumes/
│   ├── db/              Postgres init SQL from the official Supabase self-hosting repo
│   ├── api/envoy/       Envoy gateway config (routes /auth, /rest, /realtime, /storage, /pg, Studio)
│   ├── storage/         Uploaded files (bind mount; back this up)
│   └── db/data/         Postgres data (created on first start; back this up)
├── scripts/
│   ├── bootstrap-server.sh  Fresh Ubuntu → Docker + firewall + /opt/tandem
│   ├── generate-env.mjs     Fresh secrets + signed anon/service JWTs → .env
│   ├── deploy.sh            rsync + build + up + migrate, from your laptop
│   ├── migrate.sh           Applies ../supabase/migrations/*.sql once each
│   ├── backup.sh            pg_dump + storage tarball, keeps 14 days
│   └── restore.sh           Restore a pg_dump
└── upstream/            Unmodified copy of the Supabase compose files we adapted (reference only)
```

## Sizing

| Team | Hetzner type | Notes |
| --- | --- | --- |
| up to ~15 people | CX22 (2 vCPU, 4 GB) + 2 GB swap | bootstrap-server.sh adds the swap |
| up to ~50 people | CX32 (4 vCPU, 8 GB) | comfortable |

Disk: the Supabase images are ~3 GB; data grows with attachments.

## First deploy

1. Create the VM (Ubuntu 24.04), add your SSH key, point `APP_DOMAIN` and
   `SUPABASE_DOMAIN` A records at it.
2. `ssh root@<ip> 'bash -s' < infra/scripts/bootstrap-server.sh`
3. `cd infra && node scripts/generate-env.mjs --app <app-domain> --supabase <supabase-domain> --email <acme-email>`
4. Optional: edit `.env` and fill `SMTP_*` (any SMTP provider). Without SMTP,
   invite links are shown in the UI to copy, and password reset emails can't
   be sent.
5. `scp infra/.env root@<ip>:/opt/tandem/infra/.env`
6. `./infra/scripts/deploy.sh root@<ip>`
7. Open `https://<app-domain>` → **Set up Tandem** → create the owner account.

Caddy obtains certificates automatically on the first request; give DNS a
few minutes to propagate before the first deploy.

## Day-to-day

```bash
./infra/scripts/deploy.sh root@<ip>              # ship a new version (rebuilds images)
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
curl -X POST -H "X-Cron-Secret: $CRON_SECRET" https://<app-domain>/api/jobs/due-reminders
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

- **`web` unhealthy right after deploy**: it waits for Envoy; check
  `docker compose logs api-gw studio`. Studio takes ~20 s to become healthy.
- **Invite emails not arriving**: `docker compose logs api` shows SMTP errors.
  The UI always offers a copyable link as a fallback.
- **Realtime not updating**: the `realtime` container must be able to reach
  Postgres with the `supabase_admin` role; check `docker compose logs realtime`.
- **Changed a migration locally**: never edit an applied migration. Add a new
  file with `pnpm db:migration <name>`, test with `pnpm db:reset`, then deploy.
