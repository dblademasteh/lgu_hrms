# LGU HRMS Design Documentation

## Design Tokens
Source: `frontend/src/index.css`
Light: bg #f4f6fb · surface #ffffff · accent #1d4ed8
Dark: bg #0b1120 · surface #111a2e · accent #60a5fa

Tokens exposed as CSS vars: --bg, --surface, --accent, --accent-secondary, --ink, --muted, --line, --grid, --shadow-sm, --shadow-lg

Typography:
- Display: Sora Variable
- Sans: Inter Variable
- Mono: JetBrains Mono Variable

## Component Conventions
- Input base class: `.input` – surface fill, 8px radius, accent focus ring
- Buttons: `.btn`, `.btn-primary`, `.btn-ghost`
- Cards: `.card`
- Badges: `.badge` with tone via `badgeTone()`
- Layout: `Layout` component with `Sidebar` rank-filtered

## Form Controls
Selects should use `appearance-none` + custom chevron via Lucide `ChevronDown` wrapped in relative container with `pr-8/10` padding to avoid native chevron edge issues.

Example:
```jsx
<div className="relative">
  <select className="input h-12 pr-10 appearance-none w-full">...</select>
  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"/>
</div>
```

## Multi-tenancy UI
Login page hides tenant selector behind Advanced toggle. Institution label used instead of Tenant. Tenant picker loads via `GET /api/v1/tenants`. Separate onboarding portal at `/tenant-register`.

## Reports UI
Payroll Summary live card uses stat tiles grid. Standard reports grid with Generate / Preview actions. Preview opens modal placeholder until backend report generation is wired.

## Accessibility
- Focus visible with accent outline
- Reduced motion media query respected
- Color contrast follows design tokens
