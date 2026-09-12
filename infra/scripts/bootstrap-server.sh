#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 22.04/24.04 server (any provider). Run as root:
#   curl -fsSL <raw-url>/bootstrap-server.sh | bash
# or copy it over and run it. Installs Docker, opens ports 22/80/443, and
# prepares /opt/tandem for deploys.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg ufw rsync git

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# Firewall: SSH + HTTP/HTTPS only. Everything else (Postgres, Envoy, Studio)
# stays inside the Docker network.
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# Docker publishes ports by bypassing ufw; we only publish 80/443 via Caddy,
# so this is fine. Keep the default policies explicit anyway.
ufw default deny incoming
ufw default allow outgoing

# Swap helps smaller servers (Postgres + Realtime + Node).
if [ ! -f /swapfile ] && [ "$(free -m | awk '/^Mem:/{print $2}')" -lt 8000 ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p /opt/tandem
IP="$(curl -s -4 ifconfig.me || true)"
echo "Server ready. Deploy with: ./infra/scripts/deploy.sh root@${IP:-<server-ip>}"
