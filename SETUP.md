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

## Architecture summary

```
HRMS (localhost:4000/5173)          IMS (localhost:4001/5174)
┌─────────────────────────┐         ┌─────────────────────────┐
│ Employee data center    │←────HRMS│ Pulls employees         │
│ API keys for outbound   │  API    │ API keys for inbound    │
│ Webhooks + External sys │         │ Integration security     │
└─────────────────────────┘         └─────────────────────────┘
```
