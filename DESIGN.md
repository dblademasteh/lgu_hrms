# DESIGN.md — LGU HRMS Design System

> **Single source of design truth.** Updated 2026-09-10 to match the implementation in `frontend/src/index.css` (tokens + component classes) and the live pages. Supersedes the removed `Design_Documentation.md`; `DESIGN_DOCUMENT.md` remains the architecture/data spec. Agents and designers: consume tokens/classes as documented here — never introduce parallel styling.

---

## 1. Design Principles

1. **Quiet productivity** — calm surfaces, no decorative motion, hierarchy through typography and spacing.
2. **Data-first** — tables and figures are the hero; JetBrains Mono for every machine label, number, and figure.
3. **Cool slate palette, authoritative blue accent** — neutral chrome, one confident action color.
4. **Accessible by construction** — WCAG 2.1 AA targets, keyboard-first, both themes verified.
5. **One system** — every screen consumes the same tokens and component classes; page-level styling is composition, not invention.
6. **Professional-look** - move away from generic ai generated design

---

## 2. Theming & Color Tokens

Two themes switch on `<html data-theme>` (`light` default, persisted in `localStorage['lgu-theme']`, applied pre-paint by an inline script in `index.html` to avoid FOUC). Tailwind consumes them via `@theme inline` so utilities resolve at runtime — theme switching needs no rebuild.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#f4f6fb` | `#0b1120` | App background (`bg-bg`) |
| `--surface` | `#ffffff` | `#111a2e` | Cards, sidebar, header, modals (`bg-surface`) |
| `--accent` | `#1d4ed8` | `#60a5fa` | Primary actions, active nav, focus (`bg-accent`, `text-accent`) |
| `--accent-ink` | `#ffffff` | `#0b1120` | Text/icons on accent (`text-accent-ink`) |
| `--success` | `#059669` | `#34d399` | Approved/active/posted states |
| `--warning` | `#d97706` | `#fbbf24` | Probationary/overtime/pending-attention |
| `--error` | `#dc2626` | `#f87171` | Destructive, denied, invalid (`text-error`, `bg-error`) |
| `--error-ink` | `#ffffff` | `#0b1120` | Text on error fills (`text-error-ink`) |
| `--ink` | `#0f172a` | `#e2e8f0` | Primary text (`text-ink`) |
| `--muted` | `#475569` | `#94a3b8` | Secondary text, mono labels (`text-muted`) |
| `--line` | `#e2e8f0` | `#1e293b` | Hairline borders, tracks (`border-line`, `bg-line`) |

Tinted fills always come from `color-mix()` against these tokens (e.g. `bg-accent/10`, badge fills at 10%, hovers at 5–8%) — never new colors. `color-scheme` is set per theme so native controls/scrollbars follow.

**Contrast (measured, both themes AA ✓):** ink on bg/surface ≈ 13–15:1 · muted on surface ≈ 7:1 · accent on surface ≈ 6.3–7:1 · accent-ink on accent ≈ 6.3:1 · error-ink on error ≈ 4.6:1 (light) / 8:1 (dark). Warning is fill/badge-only (large or non-text usage).

---

## 3. Typography

Self-hosted variable fonts via `@fontsource-variable/*` (no CDN — on-prem requirement), imported in `main.jsx`.

| Family | Utility | Role |
|---|---|---|
| **Sora** (500–800) | `font-display` | Headings, brand, page titles, modal titles |
| **Inter** (400–700) | default / `font-sans` | Body, UI, forms |
| **JetBrains Mono** (400–600) | `font-mono` | Machine labels, employee numbers, timestamps, **all money figures**, `pre/code` |

Rules:
- `.mono-label` = JetBrains Mono 0.6875rem / 500, `letter-spacing: 0.08em`, uppercase, `--muted` — section tags, metadata ("Ledger pattern · append-only", "As of Sep 9, 2026").
- Figures use `font-mono` with `tabular-nums` (`.stat-value` bakes this in).
- Scale in use: page title `text-xl`, card headings `font-semibold text-ink`, body `text-sm`, dense data `text-xs`.

---

## 4. Component Class Library (`@layer components` in `index.css`)

Use these before writing any new CSS; extend `index.css` only when a pattern repeats ≥3×.

### Icons
All icons use `lucide-react` (MIT, tree-shakable). No custom SVGs unless the icon set is missing a concept. Icons are decorative unless paired with accessible label. Icon-only buttons require `aria-label`. Size tokens: 16px for inline text, 20px for toolbar, 24px for sidebar. Color follows text tokens: `text-muted` default, `text-ink` on hover/active, semantic on status. Do not stroke icons with hardcoded hex.

### Buttons — `.btn` + variants
Inline-flex, gap 0.5rem, Inter 600 @ 0.875rem, radius **10px**, hairline border, padding 0.625rem × 1rem, 150ms transitions, `:active` presses down 1px.
- `.btn-primary` — blue gradient (`color-mix` accent 88% white → accent), `--accent-ink` text; hover brightens 8%. **One per view.**
- `.btn-ghost` — transparent, muted; hover ink 6% tint. Toolbars, table row actions (pair with `px-3 text-xs`).
- `.btn-danger` — error gradient + `--error-ink`; confirm-dialog destructive action only.

### Inputs — `.input`
Full-width, surface fill, 1px `--line`, radius **10px**, 0.875rem. Hover: border tints 35% toward accent. Focus-visible: accent border + 2px accent-30% ring (outline suppressed). `[aria-invalid='true']`: error border + error ring. Always pair with a `<label htmlFor>`.

### Cards & stats — `.card`, `.stat`, `.stat-value`
`.card`: surface, hairline, radius **12px**, soft two-layer shadow. `.stat`: card padding 1rem, column flex. `.stat-value`: mono 1.5rem/600 tabular-nums.

### Badges — `.badge` + `.badge-success/-warning/-error/-accent`
Mono 0.6875rem uppercase pill; color/border/background all derive from `--badge-color` (30%/10% mixes; default muted). Semantics come from `badgeTone()` in `mock.js` — Approved/Active/Posted → success, Pending/Processing/On Leave/Draft → accent, Denied/Inactive → error, Probationary/Overtime/Tardiness → warning.

### Tables — `.data-table`
Full-width, 0.875rem. **Sticky thead** (mono 0.6875rem uppercase, muted, surface bg), row hover = accent 5% tint, hairline row dividers. Row affordances: `[data-selectable='true']` cursor, `[data-selected='true']` accent 10% fill. Wrap in `overflow-auto` container (sticky needs it); add `rounded-lg border border-line` for inset tables.

### Sidebar links — `.sidebar-link`
Flex, radius 8px, muted → ink on hover (ink 8% tint), 200ms ease. Active state via `aria-current='page'` (React Router `NavLink` supplies it automatically): accent 15% tint + accent text, weight 600.

### Modal — `.modal-overlay`, `.modal-box` (+`.modal-sm` 26rem / `.modal-md` 36rem / `.modal-lg` 56rem), `.modal-head/-body/-foot`
Behavior (docs: *persists until explicit close*): overlay click does **not** close; Escape and the ✕/footer buttons do. Body scroll locks while open. Head = display-font title + X close button (size 16-18px); foot = right-aligned footer with gap-2 buttons, using X icon for cancel/clear, Save/Check for primary actions. Footer buttons always have icons for visual clarity on mutation actions. Forms submit via footer button with `onClick` handler (form uses `id` attribute referenced by `form` prop).

### Toasts — `.toast-stack`, `.toast` + `.toast-success/-error/-info`, `.toast-x`
Fixed bottom-right stack, 18–24rem cards with 3px semantic left border, `toast-in` 200ms entrance, `role="status"` + `aria-live="polite"`, 4s auto-dismiss. Toast notification for all user-initiated actions: create/update/delete, API errors, validation failures, and success confirmations. Never rely on modal alone for feedback.

### Tabs — `.tabbar`, `.tab`, `.tab-active`
Underline tab strip (2px accent when active); `role="tablist"/"tab"/"tabpanel"` from the `Tabs` component.

### Misc — `.mono-label`, `.palette/.palette-list/.palette-item`, `.dropdown/.dropdown-panel`
Command palette list rows and the header bell dropdown (absolute, right-anchored, 20rem, radius 12).

---

## 5. Structural Components (React)

| Component | Behavior contract |
|---|---|
| `Layout` | App shell: `h-screen flex` + `Sidebar` + `Header`; `<main>` = `flex-1 overflow-auto p-6`. Every page wraps in it. |
| `Sidebar` | Collapsible drawer: `w-64 ↔ w-16` at 200ms ease; icon-rail shows 2-letter hints + tooltips; `aria-expanded` on toggle. `NavLink` + `aria-current`. Hidden below `md` (responsive gap — mobile nav is a known TODO). |
| `Header` | `h-16` surface bar; route title map; quick-search button (dispatches `lgu:open-palette`), notification bell (unread count badge, outside-click close), theme toggle (`aria-pressed`), Logout. |
| `Modal` / `ConfirmDialog` | See §4. ConfirmDialog = sm modal with `danger` destructive styling. |
| `Toast` (`ToastProvider`/`useToast`) | `toast(message, 'success'|'error'|'info')`; stacked, auto-dismiss 4s; required for all mutations, errors, and confirmations. |
| `Tabs` | Controlled tab strip + hidden panels. |
| `CommandPalette` | Ctrl/Cmd+K toggle or header button; searches pages + employees; overlay-click closes; navigates on select. |
| `ErrorBoundary` / `NotFound` | Global crash card + 404 route (`*` in `App.jsx`). |

## 6. Page Design Specs (as implemented)

- **Pattern — page header:** `font-display text-xl font-bold text-ink` title + `text-sm text-muted` subtitle left; `.mono-label` metadata right (e.g. "As of Sep 9, 2026", record counts); primary action button top-right.
- **Pattern — dashboard grid:** KPI `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`; content rows `lg:grid-cols-3` with `lg:col-span-2` master pane.
- **Pattern — table with filters:** Search input (left), filter dropdowns (middle), record count (right); table with Actions column for row operations.
- **Login** — centered `.card max-w-md p-8` on `bg-bg`; accent logo tile; `.input` fields with inline `text-error` messages; full-width `.btn-primary`.
- **Dashboard** — 4 KPI `.stat` cards (icon chip `bg-accent/10`, `.stat-value`, delta badges), Payroll Runs table, Headcount CSS bars (`bg-line` track / `bg-accent` fill), Recent Activity.
- **Employees** — master-detail layout with inline table: search + department/status filters, pagination (50/page), Actions column (Edit/Delete buttons with icons); DetailPane with Tabs = Profile / Employment History / Payroll Breakdown / etc.; Add/Edit = full-PII `EmployeeForm` in `modal-lg` with modal footer (X/Cancel, Save/Create buttons with icons).
- **Users** — Users table with Actions column (Edit with Edit icon, Activate/Deactivate with UserCheck/Shield icons); Add User button with Plus icon; modals footer with X/Cancel, Save/Check/Create buttons.
- **Organization** — recursive tree of `.card` nodes (indent via `marginLeft`), per-node Rename/Remove; Add Department modal (code/name/parent); child-guard on removal.
- **Payroll** — stat row, runs table with status badges (DRAFT/APPROVED/POSTED), Actions column (View, Approve for DRAFT); **New Payroll Run = 3-step wizard modal** with footer buttons (X/Back, Check/Next, Plus/Create Run); run detail modal with Close button (X icon); payslip modal with Close button.
- **Leave** — master-detail: applications table (row select) + **approval pane** (request facts, leave credits, Approve/Deny behind `ConfirmDialog`).
- **Attendance (DTR)** — date filter + summary stat cards + `.data-table` with remark badges.
- **Appointments** — records table (CSC types, plantilla items) + New Appointment modal.
- **Designation** — search bar + summary cards (Active/Suspended counts), Orders table with Actions column (Remove button), New Order modal with form and footer (X/Cancel, Save/Create Order buttons with icons).
- **Audit** — filterable log; Details modal with **Before/After JSON** side-by-side `pre` cards; Close button with X icon.
- **Users & Roles** — accounts table (role badges, activate/deactivate confirm) + permissions matrix (✓ per role).
- **Reports** — card grid (type mono-label, Generate/Preview → toasts until wired).
- **404 / Error** — centered `.card` with mono error label + recovery button.

## 7. Motion

Interaction feedback only — **no decorative animation**. Durations: 150ms (buttons, inputs, table rows, tabs), 200ms (sidebar links, drawer width, toast entrance). `prefers-reduced-motion: reduce` collapses all durations to ~0 globally.

## 8. Accessibility

- Global 2px accent `:focus-visible` outline (offset 2px); `.input` replaces it with its ring.
- `aria-label` on every icon-only button; `aria-expanded` on toggles/dropdowns; `aria-pressed` on theme toggle; `aria-current` on nav; `aria-invalid` + `aria-describedby` on form errors.
- Modals: `role="dialog"`, `aria-modal`, labeled by title; Escape + explicit close; scroll lock.
- Toasts `role="status"` in a polite live region; tabs use proper `tablist/tab/tabpanel` roles.
- Keyboard: all actions reachable; palette is fully keyboard-driven.

## 9. Data Display Rules

- Money, dates, timestamps, IDs, IPs, usernames → `font-mono`, right-aligned in tables where numeric.
- Status/action labels → `.badge` via `badgeTone()`; never raw colored text.
- Empty states: `text-sm text-muted` sentence inside the pane (e.g. "Select an employee…"), never blank.
- Destructive or audit-relevant actions always pass through `ConfirmDialog`.
- Sample/placeholder data that will be replaced by the API is labeled (`.mono-label` "Sample figures — wires to the payroll API").

## 10. Settings > Account Spec

**Settings > Account** tab design built from tokens/classes.

- Profile card: avatar placeholder, name/email, role/department scope badge, completeness meter progress bar.
- Security card: password last changed, Change Password button opens modal with policy + strength meter; 2FA toggle with setup modal placeholder; Sessions list table with Revoke button; Login history mini table.
- Preferences card: display language, date format, timezone, notification channel consent toggles.
- Privacy card: Data export / Download my data button, Account deactivation with ConfirmDialog.

All actions toast. Mock data labeled `.mono-label`. Wire-later affordances show “Coming soon”.

## 10. Do / Don't

**Do:** compose from tokens + classes; verify both themes; keep one `.btn-primary` per view; use `color-mix` tints for hierarchy; label wire-later affordances honestly; use `lucide-react` icons with `aria-label` on icon-only buttons; toast on every user action.
**Don't:** hardcode hex/slate/gray in JSX (lint fails); invent new component classes for one-off needs; add decorative animation; use warning token for body text (AA); close modals on overlay click (spec: explicit close); introduce a second styling system (no CSS-in-JS, no UI kit).

