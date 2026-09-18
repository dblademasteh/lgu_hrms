# DEPLOYMENT.md — VPS Deployment Runbook

> **Deployment target: VPS** (cloud VM). Adopted 2026-09-18, supersedes the on-prem LGU data-center assumption for this deployment. Update this doc when the deployment posture changes.

---

## 1. Deployment Topology

```
┌────────────────────────────── Internet ──────────────────────────────┐
│                                                                      │
│   Users (browser / ESS) ──HTTPS 443──►  Host nginx (TLS + certbot)   │
│   Kiosk terminals (lobby) ───────────►   │                           │
│                                          │ proxy_pass                │
│                                          ▼                           │
│                    ┌──────────────────────────────────────┐          │
│                    │  Docker network (internal, VPS)      │          │
│                    │                                      │          │
│                    │  ┌──────────────┐   ┌─────────────┐  │          │
│                    │  │ web (nginx)  │   │ api :4000   │  │          │
│                    │  │ SPA + /api   │──►│ Express 5   │  │          │
│                    │  │ :80 internal │   │ + JWT + Zod │  │          │
│                    │  └──────────────┘   └──────┬──────┘  │          │
│                    │                            │         │          │
│                    │                            ▼         │          │
│                    │                     ┌────────────┐   │          │
│                    │                     │ db :5432   │   │          │
│                    │                     │ postgres16 │   │          │
│                    │                     └────────────┘   │          │
│                    └──────────────────────────────────────┘          │
│                                                                      │
│   Only host ports 22 / 80 / 443 are open (UFW).                      │
│   5432 and 4000 are NOT published — internal compose network only.   │
└──────────────────────────────────────────────────────────────────────┘
```

**Runtime shape (production `docker-compose.yml`):**
- `db` — postgres:16, internal only, healthcheck-gated, data in the `pgdata` volume
- `api` — runs `npx prisma migrate deploy && node src/server.js` on start (schema updates ship with each rebuild), internal only
- `web` — nginx serving the Vite bundle + proxying `/api/` → `api:4000` (same compose network, same-origin)

---

## 2. Prerequisites

| Item | Requirement |
|---|---|
| VPS | Ubuntu 22.04 / 24.04 LTS, **2 GB+ RAM** (Prisma + payroll; no Puppeteer by design), 20 GB+ disk |
| Runtime | Docker Engine + docker compose plugin |
| Domain | A/AAAA record → VPS IP (e.g. `hrms.your-lgu.gov.ph`) |
| TLS | Let's Encrypt via certbot (host nginx) |
| Access | SSH key auth recommended; password auth hardened |

```bash
# Install Docker (Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # re-login after
```

---

## 3. Environment Configuration

Create `backend/.env` from the example — **fresh values, never committed**:

```bash
cp backend/.env.example backend/.env
```

| Variable | Value | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` | DB password — must match compose interpolation |
| `JWT_SECRET` | `openssl rand -hex 32` | Access-token signing |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` | Refresh-rotation signing |
| `POSTGRES_DB` | `lgu_hrms` | DB name |
| `WEB_ORIGIN` | `https://hrms.your-lgu.gov.ph` | CORS allowlist — **never `*` in prod** |
| `VITE_API_BASE` | `/api/v1` | Same-origin via nginx proxy |
| `WEB_PORT` | `80` | Host port the web container publishes (nginx TLS proxies to it) |
| `SEED_DEFAULT_PASSWORD` | strong value | Change seeded passwords after first login regardless |
| `PORT` | `4000` | API port (internal) |
| `NODE_ENV` | `production` | Suppresses per-request logging |
| `TRUST_PROXY` | `"1"` | **Required** — makes `req.ip` the real client behind nginx |
| `ALLOWED_IPS` | `""` or office CIDRs | Global allowlist fallback |
| `BIOMETRIC_PUNCH_KEY` | strong value | Shared secret for the public kiosk punch endpoint (recommended) |
| `BIOMETRIC_POLLER` | `0` or `1` | ZK device pull loop (only if a device is on the same LAN) |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | optional | Error tracking; empty = no-op |

> The compose file interpolates `${POSTGRES_PASSWORD:?}` etc. from the shell env or an env file it loads — export them in the shell or use `docker compose --env-file`.

---

## 4. Deploy Runbook

```bash
# 1. Clone
git clone https://github.com/dblademasteh/lgu_hrms.git && cd lgu_hrms

# 2. Configure env (see §3) — fresh secrets, WEB_ORIGIN, TRUST_PROXY=1
export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
export JWT_SECRET="$(openssl rand -hex 32)"
export JWT_REFRESH_SECRET="$(openssl rand -hex 32)"

# 3. Build + start (db → api auto-migrates → web)
docker compose up -d --build
docker compose ps          # all healthy?

# 4. Seed — NOT automatic, run once
docker compose exec api node prisma/seed.js

# 5. ⚠️ CRITICAL — fix the tenant IP allowlists (see §5) or EVERY login 403s
docker compose exec db psql -U postgres -d lgu_hrms \
  -c "UPDATE \"Tenant\" SET \"allowedIps\" = '{}';"
#    (or set office CIDRs via the app: Tenant detail page, SUPER_ADMIN)

# 6. Host nginx TLS (see §5) + firewall
sudo ufw allow 22,80,443/tcp && sudo ufw enable

# 7. Verify
curl -s https://hrms.your-lgu.gov.ph/api/v1/health
#    → {"status":"ok"} (or equivalent)
```

---

## 5. Nginx TLS + the allowedIps Gotcha

### 5.1 Host nginx (TLS termination)

```nginx
server {
  listen 80;
  server_name hrms.your-lgu.gov.ph;
  return 301 https://$host$request_uri;      # certbot manages this + 443 block
}

server {
  listen 443 ssl;
  http2 on;
  server_name hrms.your-lgu.gov.ph;

  ssl_certificate     /etc/letsencrypt/live/hrms.your-lgu.gov.ph/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/hrms.your-lgu.gov.ph/privkey.pem;

  # SPA + /api proxy → web container (which itself proxies /api → api:4000)
  location / {
    proxy_pass http://127.0.0.1:80;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 25m;                # 201 documents / attachments
  }

  # Kiosk (separate app, base /kiosk/) — see §6
  location /kiosk/ {
    alias /srv/lgu-hrms/kiosk/dist/;
    try_files $uri $uri/ /kiosk/index.html;
  }
}
```

Issue the certificate: `sudo certbot --nginx -d hrms.your-lgu.gov.ph` (auto-renewal via systemd timer).

### 5.2 ⚠️ Critical: seeded `allowedIps` block every login

The seed puts **private-range CIDRs** on both tenants: `127.0.0.1/32, ::1/128, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16`. On an internet-exposed VPS, real users arrive from **public IPs** → nobody matches → `403 ONPREMISE_ONLY` for everyone.

**How `requireOnPremise` decides** (`backend/src/middleware/onPremise.js`):

| Situation | Result |
|---|---|
| Tenant has `allowedIps`, IP inside | ✅ allowed |
| Tenant has `allowedIps`, IP outside | ❌ 403 `ONPREMISE_ONLY` |
| Tenant list empty → global `ALLOWED_IPS` set | falls back to it |
| Both empty | ✅ open (dev/back-compat) |
| Tenant `isActive: false` | ❌ 403 `TENANT_INACTIVE` |

**Pick one posture at deploy time:**
1. **Open logins** — clear tenant lists (`UPDATE "Tenant" SET "allowedIps" = '{}';`) + `ALLOWED_IPS=""`. Typical for a VPS deployment.
2. **Office/VPN-only** — set each tenant's `allowedIps` to the office **public IP**/VPN range (Tenant detail page, SUPER_ADMIN). The feature works correctly on a VPS because `TRUST_PROXY=1` + `X-Forwarded-For` make `req.ip` the real client.
3. **Platform-wide default** — set `ALLOWED_IPS` env to office CIDRs; tenants with empty lists inherit it.

> Only the 6 session-establishing auth routes are gated (`/auth/login`, `/login-pin`, `/refresh`, `/auth/oidc/login|callback|consume`). Authenticated API traffic, the public kiosk punch, and public doc-download are deliberately not IP-gated.

---

## 6. Kiosk on the VPS

The kiosk (`kiosk/`) is a **separate login-less React app** (base `/kiosk/`) built to `kiosk/dist` — it is **not** inside the web container's image.

```bash
# Build on the VPS (or build locally and rsync the dist)
cd kiosk && npm ci && npm run build        # → kiosk/dist, base /kiosk/
sudo mkdir -p /srv/lgu-hrms && sudo cp -r kiosk/dist /srv/lgu-hrms/kiosk
```

Serve via the host nginx `location /kiosk/` alias (§5.1). Kiosk punches go through the same-origin `/api` proxy → `requireOnPremise` does **not** apply to the public punch endpoint, but set `BIOMETRIC_PUNCH_KEY` and configure it on each kiosk device (kept in-memory per session, never persisted). Full workflow: `docs/KIOSK.md`.

---

## 7. Post-Deploy Checklist

- [ ] `docker compose ps` — db healthy, api + web running
- [ ] `GET /api/v1/health` returns ok over **HTTPS**
- [ ] Tenant `allowedIps` posture chosen (§5.2) — login works from a real client
- [ ] Seeded passwords changed (`admin123` is public knowledge in the repo)
- [ ] `WEB_ORIGIN` = real domain (CORS) — no wildcard
- [ ] TLS valid + auto-renewal enabled (`certbot renew --dry-run`)
- [ ] UFW: only 22/80/443 open; **5432/4000 not reachable from outside** (`ufw status`, `docker compose port db 5432` should error)
- [ ] `BIOMETRIC_PUNCH_KEY` set (public punch endpoint protected)
- [ ] Login → audit trail shows the login event; Sentry capturing (if configured)
- [ ] DB backup scheduled (§8)

---

## 8. Backups & Updates

```bash
# Nightly DB dump (cron on the VPS) — keep off-VPS copies too
0 2 * * * docker compose -f /srv/lgu-hrms/docker-compose.yml exec -T db \
  pg_dump -U postgres lgu_hrms | gzip > /srv/backups/lgu_hrms-$(date +\%F).sql.gz

# Updates — pull, rebuild (api auto-migrates), verify
cd /srv/lgu-hrms
git pull
docker compose up -d --build
curl -s https://hrms.your-lgu.gov.ph/api/v1/health
docker compose logs api --tail 50      # check migrate deploy output
```

Rollback: `git checkout <previous-tag> && docker compose up -d --build` — the pgdata volume persists across rebuilds; take a dump before rolling back.

---

## 9. Troubleshooting

| Symptom | Cause → Fix |
|---|---|
| `403 ONPREMISE_ONLY` on login | Seeded tenant `allowedIps` are private CIDRs → clear/adjust (§5.2) |
| `403 TENANT_INACTIVE` | Tenant deactivated → reactivate on the Tenant detail page |
| 500 on login | Dead DB container → `docker compose ps`, `docker compose up -d db` |
| Every IP allowed/blocked oddly behind nginx | `TRUST_PROXY` unset/wrong → set `TRUST_PROXY="1"` so `req.ip` is the real client |
| CORS errors in the browser | `WEB_ORIGIN` mismatch → set the exact HTTPS origin |
| `429` on login | `authLimiter` (15m window) tripped — in-memory, resets itself; wrong-password loop → wait |
| Kiosk punch rejected | `BIOMETRIC_PUNCH_KEY` set but kiosk missing the key (or vice versa) |
| Uploads fail | Host nginx `client_max_body_size` below the API's 10mb cap → set 25m (§5.1) |

---

## 10. Zero-Subscription Posture

Every runtime component is open-source and self-hosted: PostgreSQL, Express, React, Vite, Tailwind, Prisma, Nginx, Docker. Recurring cost = the VPS + people only. Sentry is the sole optional SaaS (no DSN = no-op).
