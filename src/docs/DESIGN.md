# LGU HRMS — Design Summary

> **Summary only.** The single source of design truth is `DESIGN.md` at the repo root ("recorded from the built world", updated to match `frontend/src/index.css` + live pages). Keep the root doc in sync with code; this file only mirrors the highlights. Any conflict: root `DESIGN.md` wins.

## Design Tokens
Source: `frontend/src/index.css`
- Light: bg `#f4f6fb` · surface `#ffffff` · accent `#1d4ed8`
- Dark: bg `#0b1120` · surface `#111a2e` · accent `#60a5fa`

Tokens exposed as Tailwind utilities via `@theme inline` (runtime theme-aware): `--bg, --surface, --accent, --accent-ink, --success, --warning, --error, --error-ink, --ink, --muted, --line, --accent-secondary`. Infrastructure vars: `--grid`, `--shadow-sm`, `--shadow-lg`.

Typography (self-hosted via `@fontsource-variable/*`, no CDN):
- Display: Sora Variable
- Sans: Inter Variable
- Mono: JetBrains Mono Variable (machine labels, money, IDs, timestamps)

## Component Conventions
- Input base class: `.input` — surface fill, **8px radius**, accent focus ring (2px `color-mix` halo), `[aria-invalid]` error ring.
- Select: `.select` — native select restyled with inline SVG chevron; prefer it over hand-rolled chevron wrappers.
- Buttons: `.btn` (+ `.btn-primary`, `.btn-ghost`, `.btn-outline`, `.btn-danger`) — radius 10px.
- Cards: `.card` / `.stat` / `.stat-value`
- Badges: `.badge` with tone via `badgeTone(`)`
- Tables: `.data-table` — sticky mono uppercase thead, hover/selected tints
- Modal: `.modal-overlay`/`.modal-box` (`sm/md/lg`); persists until explicit close (no overlay-click close)
- Toasts: `.toast-stack` (top-right), `.toast-success/-error/-info`
- Tabs: `.tabbar` / `.tab` / `.tab-active`
- Layout: `Layout` component with `Sidebar` rank-filtered; `Header` (search, notifications, theme, user)

## Multi-tenancy UI
Login page hides the tenant selector behind an **Advanced** toggle; neutral **Institution** label. Tenant picker loads via `GET /api/v1/tenants`. Separate onboarding portal at `/tenant-register`.

## Reports UI
Payroll Summary live card uses the real aggregation (`GET /api/v1/reports/payroll-summary`) with CSV download. Standard reports grid has Generate / Preview actions; PDF/XLSX generation is tracked in TODOs.

## Accessibility
- Focus visible with 2px accent outline
- Reduced motion media query respected (durations → ~0)
- Color contrast follows design tokens (AA targets in both themes)

## Benchmark
Design lineage is shared with the sibling **lgu_ims** repo (`TEMPLATE_AGENT.md` / `TEMPLATE_DESIGN.md`); root `DESIGN.md` §11 records the benchmark and adopted practices (breakpoints, provenance, print plan).