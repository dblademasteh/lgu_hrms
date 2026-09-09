# LGU HRMS

Human Resource Management System for Philippine Local Government Units.

## Architecture
Standard Design Pattern foundation with tactical Master-Detail UI (rationale: `HRMS_Architectural_Comparison.md`).

## Structure
- `backend/` — Express 5 API (port 4000), Prisma + PostgreSQL 16 schema, RBAC/audit middleware (skeleton)
- `frontend/` — React 19 + Vite 5 SPA, Tailwind CSS 4 design system, mock data layer (`src/data/mock.js`)

## Run
Backend:  `cd backend && npm run dev`   # http://localhost:4000
Frontend: `cd frontend && npm run dev`  # http://localhost:5173

## Docs
- `AGENTS.MD` — build spec + codebase map (start here)
- `DESIGN.md` — design system: tokens, components, page specs
- `FEATURE_GAP_ANALYSIS.md` — feature gap matrix + prioritized roadmap
- `HRMS_Architectural_Comparison.md` — architectural rationale

## Login (mock)
Any valid email + 6+ character password — auth is scaffolded client-side until the backend auth stack lands.
