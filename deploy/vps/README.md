# VPS deploy (backend only)

Runs `apps/api` (REST) + the indexer (loop mode) behind Caddy for automatic
HTTPS, on a bare Ubuntu VPS. Postgres stays on the existing hosted Supabase
project; `apps/web` stays on Vercel and just points `NEXT_PUBLIC_API_URL` at
this box.

## One-time VPS setup

```bash
# Docker Engine + compose plugin (Ubuntu 24.04)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # log out/in (or `newgrp docker`) to apply

# Clone (public repo, no auth needed)
sudo mkdir -p /opt/annona && sudo chown "$USER":"$USER" /opt/annona
git clone https://github.com/Agricultural-Settlement-Protocol/Annona.git /opt/annona
cd /opt/annona
```

## Create `apps/api/.env`

Copy `apps/api/.env.example` to `apps/api/.env` on the VPS and fill in real
values. Production-specific notes:

- `DATABASE_URL` — use Supabase's **transaction pooler** (port `6543`), not
  the direct connection. Supabase dashboard: Project Settings → Database →
  Connection pooling → "Transaction" mode. `apps/api/src/db/client.ts`
  already sets `prepare: false`, which the transaction pooler requires.
- `SETTLEMENT_SERVICE_SECRET` — the coop's Stellar secret key. Keep this
  file `chmod 600` and never commit it.
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — same project as `apps/web`, used
  only to verify the caller's bearer token on `POST /settlements/execute`.
- `OFFTAKE_REGISTRY_CONTRACT_ID` / `DIDR_TOKEN_CONTRACT_ID` — from
  `scripts/artifacts.testnet.json`.

## Bring the stack up

```bash
cd /opt/annona
docker compose -f deploy/vps/docker-compose.yml up -d --build
docker compose -f deploy/vps/docker-compose.yml logs -f api indexer   # sanity check
```

If Caddy fails to obtain a certificate, check that your cloud provider's
**security group / firewall panel** (not just `ufw`) allows inbound 80/443 —
a cloud-level firewall blocks Let's Encrypt's HTTP-01 challenge even when
`ufw` is disabled.

## Verify

```bash
curl https://<host-from-Caddyfile>/health
```

## Point the web app at it

In Vercel's project settings, set `NEXT_PUBLIC_API_URL` to the same host
(`https://...`) and redeploy.

## Redeploying after a code change

```bash
cd /opt/annona && git pull
docker compose -f deploy/vps/docker-compose.yml up -d --build
```

## Moving to a real domain later

Point an A record at the VPS IP, replace the hostname in `Caddyfile` with
it, then `docker compose -f deploy/vps/docker-compose.yml restart caddy`.
