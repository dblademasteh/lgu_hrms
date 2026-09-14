# HRMS + IMS Setup Guide

Complete setup instructions for the LGU HRMS and IMS systems, including database initialization, development servers, and cross-system integration.

## Prerequisites

- Node.js 18+
- Docker Desktop
- Git

---

## 1. Clone both projects

```bash
git clone <hrms-repo-url> lgu_hrms
git clone <ims-repo-url> lgu_ims
```

---

## 2. Start databases with Docker

**HRMS database** (port 5432):
```bash
cd lgu_hrms
docker compose up -d db
```

**IMS database** (port 5433):
```bash
cd lgu_ims
docker compose up -d db
```

Verify they are running:
```bash
docker ps
```

You should see `lguhrms-db` and `lguims-db`.

---

## 3. Setup HRMS

```bash
cd lgu_hrms

# Install dependencies
npm install

# Configure environment
cd backend
cp .env.example .env   # if .env.example exists
# Edit .env and set DATABASE_URL

# Run Prisma migrations
npx prisma migrate dev

# Seed the database
node prisma/seed.js

# Start backend (port 4000)
npm run dev

# In another terminal, start frontend (port 5173)
cd ../frontend
npm install
npm run dev
```

Access HRMS at: **http://localhost:5173**

Default seed credentials are in `backend/prisma/seed.js` or the README.

---

## 4. Setup IMS

```bash
cd lgu_ims

# Install dependencies
npm install

# If using Docker, database is already running on port 5433
# Prisma should already be configured in .env

# Run Prisma migrations
cd backend
npx prisma migrate dev

# Seed the database
node prisma/seed.js

# Start backend (port 4001)
npm run dev

# In another terminal, start frontend (port 5174)
cd ../frontend
npm install
npm run dev
```

Access IMS at: **http://localhost:5174**

Default IMS demo accounts (from README):
- `admin` / `LguIms2026!`
- `warehouse` / `LguIms2026!`
- `custodian` / `LguIms2026!`
- `auditor` / `LguIms2026!`

---

## 5. Configure HRMS → IMS Integration

1. Open HRMS: **http://localhost:5173**
2. Log in as admin
3. Go to **Settings → Integrations**
4. Click **Create API Key**
   - Name: `IMS Integration`
   - Scopes: `employees:read`
5. **Copy the raw key** — it is shown only once

---

## 6. Configure IMS to pull from HRMS

1. Open IMS: **http://localhost:5174**
2. Log in as `admin`
3. Go to **Settings → Integrations**
4. In the **Outbound: HRMS Integration** container:
   - HRMS Base URL: `http://localhost:4000`
   - HRMS API Key: paste the key from step 5
   - Default IMS role for new users: select appropriate role
   - Default password for new users: optional
5. Click **Pull employees from HRMS**

This will:
- Call HRMS `/api/v1/integrations/employees`
- Create IMS users for new employees
- Update existing users (name, email, active state)
- Never copy passwords — users sign in with HRMS credentials

---

## 7. Configure IMS Inbound API Keys (optional)

If external systems need to call IMS APIs:

1. In IMS **Settings → Integrations**
2. In the **Inbound: API Keys** container:
   - Enter a name (e.g., `HRIS Sync`)
   - Ensure "Integration key" is checked
   - Set expiry days (optional)
   - Click **Generate**
3. **Copy the key** — shown only once
4. External systems send it as: `X-API-Key: <prefix>.<raw>`

---

## 8. Quick start with batch files

Double-click to start all services:

- **HRMS only**: `C:\Users\itcub\Desktop\Projects\lgu_hrms\start-dev.bat`
- **IMS only**: `C:\Users\itcub\Desktop\Projects\lgu_ims\start-dev.bat`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| HRMS 500 on login | `docker ps` → ensure `lguhrms-db` is running |
| IMS 500 on login | `docker ps` → ensure `lguims-db` is running |
| Port already in use | Kill process on that port: `netstat -ano \| findstr :PORT` then `taskkill /F /PID <pid>` |
| Prisma generate fails on Windows | Stop backend watch process, then run `npx prisma generate` |
| IMS login fails after seed | Check `docker exec lguims-db psql -U lguims -d lgu_ims -c "SELECT * FROM \"User\";"` |

---

## 9. Production infrastructure recommendations

These are not required for development, but are recommended for production deployments to avoid crashes, corruption, and data loss.

### 9.1 Connection pooling with PgBouncer

PostgreSQL has a connection limit (default 100). Under load, the app can exhaust connections and cause 500 errors. PgBouncer sits between the app and PostgreSQL and pools connections.

**docker-compose.yml additions:**
```yaml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    ports:
      - "5432:5432"
    environment:
      - DATABASES_HOST=db
      - DATABASES_PORT=5432
      - DATABASES_USER=${POSTGRES_USER:-postgres}
      - DATABASES_DBNAME=${POSTGRES_DB:-lgu_hrms}
      - PGPASSWORD=${POSTGRES_PASSWORD}
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=1000
      - DEFAULT_POOL_SIZE=25
      - RESERVE_POOL_SIZE=5
      - MAX_DB_CONNECTIONS=100
    depends_on:
      - db
    volumes:
      - ./pgbouncer/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini:ro
```

**backend/.env:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lgu_hrms?connection_limit=10
```

Point the backend to PgBouncer (`localhost:5432`) instead of the DB container directly.

### 9.2 Point-in-time recovery (PITR)

Enable WAL archiving so you can restore to any point in time, not just the last backup.

**docker-compose.yml additions for the db service:**
```yaml
services:
  db:
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backups:/backups
    command: >
      postgres
      -c wal_level=replica
      -c archive_mode=on
      -c archive_command='cp %p /backups/wal/%f'
      -c archive_timeout=300
      -c max_wal_senders=5
      -c wal_keep_size=1GB
```

Create the WAL directory:
```bash
mkdir -p backups/wal
```

**Restore procedure:**
```bash
# 1. Stop the app
# 2. Restore base backup
pg_restore -U postgres -d lgu_hrms < base_backup.sql

# 3. Replay WAL files
pg_waldump /backups/wal/ | psql -U postgres -d lgu_hrms
```

### 9.3 Automated backups

Add a cron job or CI pipeline to run daily:

```bash
# Daily at 2 AM
0 2 * * * cd /path/to/lgu_hrms && docker compose exec db pg_dump -U postgres lgu_hrms | gzip > backups/lgu_hrms_$(date +\%Y\%m\%d).sql.gz
```

Keep at least 7 days of backups. Copy to offsite storage weekly.

### 9.4 Monitoring alerts

Monitor these metrics and alert on thresholds:

| Metric | Warning | Critical |
|--------|---------|----------|
| Database size | > 80% disk | > 95% disk |
| Connection count | > 70% of max_connections | > 90% of max_connections |
| Slow queries (>1s) | > 10 per minute | > 50 per minute |
| Replication lag | > 30s | > 5min |
| Dead tuples | > 10,000 | > 100,000 |

Example check script (run via cron):
```bash
#!/bin/bash
THRESHOLD=80
USAGE=$(docker exec lguhrms-db psql -U postgres -d lgu_hrms -tAc "SELECT ROUND(pg_database_size('lgu_hrms')::numeric / (SELECT setting::numeric FROM pg_settings WHERE name = 'data_directory' ) * 100)" 2>/dev/null || echo 0)
if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "ALERT: Database disk usage at ${USAGE}%" | mail -s "DB Disk Alert" ops@example.com
fi
```

### 9.5 Maintenance schedule

| Task | Frequency | How |
|------|-----------|-----|
| VACUUM | Weekly | `POST /database/maintenance/vacuum` or `VACUUM (VERBOSE, ANALYZE);` |
| ANALYZE | Weekly | `POST /database/maintenance/analyze` or `ANALYZE;` |
| REINDEX | Monthly | `POST /database/maintenance/reindex` or `REINDEX CONCURRENTLY;` |
| Test restore | Monthly | Restore a backup to staging and verify |
| Review slow queries | Weekly | `GET /database/slow-queries` or `SELECT * FROM pg_stat_statements` |

The Super Admin Database Tools page at `/platform/database` provides one-click access to all maintenance operations.

### 9.6 Production startup behavior

The backend now:
- Runs `npx prisma migrate deploy` on startup in production (set `RUN_MIGRATIONS_ON_STARTUP=true` to enable in dev)
- Handles `SIGTERM`/`SIGINT` for graceful shutdown: closes HTTP server, disconnects Prisma, then exits
- Fails fast in production if migrations fail, preventing stale schema from serving traffic

**Environment variables:**
```env
NODE_ENV=production
RUN_MIGRATIONS_ON_STARTUP=true  # optional, default: true in production
```

---

## Architecture summary

```
HRMS (localhost:4000/5173)          IMS (localhost:4001/5174)
┌─────────────────────────┐         ┌─────────────────────────┐
│ Employee data center    │←────HRMS│ Pulls employees         │
│ API keys for outbound   │  API    │ API keys for inbound    │
│ Webhooks + External sys │         │ Integration security     │
└─────────────────────────┘         └─────────────────────────┘
```
