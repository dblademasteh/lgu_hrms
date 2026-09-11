import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, FileBadge, Banknote, CalendarDays, Clock,
  ShieldCheck, BarChart3, UserCog, Landmark, Settings as SettingsIcon, Fingerprint, ShieldAlert, HelpCircle,
  Search, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore.js';
import { useSidebarStyle } from '../sidebarStyle.js';

/**
 * Minimal role = least-privileged role that may see the item.
 * Hierarchy (low → high): AUDITOR < DEPARTMENT_HEAD < PAYROLL_OFFICER < HR_MANAGER < ADMIN.
 * Items without `roles` are visible to every authenticated user.
 */
const ROLE_RANK = { AUDITOR: 0, DEPARTMENT_HEAD: 1, PAYROLL_OFFICER: 2, HR_MANAGER: 3, ADMIN: 4 };

const groups = [
  {
    label: 'Workforce',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Employees', path: '/employees', icon: Users, roles: ['HR_MANAGER', 'ADMIN', 'DEPARTMENT_HEAD'] },
      { name: 'Organization', path: '/organization', icon: Building2 },
      { name: 'Employee Self-Service', path: '/ess', icon: UserCog },
    ]
  },
  {
    label: 'RSP',
    items: [
      { name: 'Appointments', path: '/appointments', icon: FileBadge, roles: ['HR_MANAGER', 'ADMIN'] },
      { name: 'Plantilla', path: '/plantilla', icon: FileBadge, roles: ['HR_MANAGER', 'ADMIN'] },
      { name: 'Vacancy', path: '/vacancy', icon: BarChart3, roles: ['HR_MANAGER', 'ADMIN'] },
      { name: 'Designation', path: '/designation', icon: UserCog, roles: ['HR_MANAGER', 'ADMIN'] },
      { name: 'Recruitment', path: '/recruitment', icon: UserCog, roles: ['HR_MANAGER', 'ADMIN'] },
    ]
  },
  {
    label: 'Performance & L&D',
    items: [
      { name: 'Performance', path: '/performance', icon: BarChart3, roles: ['HR_MANAGER', 'ADMIN', 'DEPARTMENT_HEAD'] },
      { name: 'Learning', path: '/learning', icon: Landmark },
      { name: 'Attendance DTR', path: '/attendance', icon: Clock, roles: ['HR_MANAGER', 'ADMIN', 'DEPARTMENT_HEAD'] },
      { name: 'Biometric Attendance', path: '/biometric', icon: Fingerprint, roles: ['HR_MANAGER', 'ADMIN', 'DEPARTMENT_HEAD', 'PAYROLL_OFFICER'] },
    ]
  },
  {
    label: 'Payroll & Benefits',
    items: [
      { name: 'Payroll', path: '/payroll', icon: Banknote, roles: ['PAYROLL_OFFICER', 'HR_MANAGER', 'ADMIN'] },
      { name: 'Leave', path: '/leave', icon: CalendarDays, roles: ['HR_MANAGER', 'ADMIN', 'DEPARTMENT_HEAD'] },
    ]
  },
  {
    label: 'Compliance & Audit',
    items: [
      { name: 'Audit Trail', path: '/audit', icon: ShieldCheck, roles: ['AUDITOR', 'ADMIN'] },
      { name: 'DIBAR Records', path: '/disqualifications', icon: ShieldAlert, roles: ['HR_MANAGER', 'ADMIN'] },
      { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['PAYROLL_OFFICER', 'HR_MANAGER', 'ADMIN', 'AUDITOR'] },
    ]
  },
  {
    label: 'Administration',
    items: [
      { name: 'Users & Roles', path: '/users', icon: UserCog, roles: ['ADMIN'] },
      { name: 'Settings', path: '/settings', icon: SettingsIcon },
    ]
  },
  {
    label: 'Support',
    items: [
      { name: 'Help', path: '/help', icon: HelpCircle },
    ]
  }
];

export function canSee(role, item) {
  if (!item.roles) return true;
  const rank = ROLE_RANK[role] ?? -1;
  // Visible when the user's rank meets ANY listed role's rank — higher roles
  // inherit lower items (ADMIN sees everything; AUDITOR sees auditor items).
  return item.roles.some(r => rank >= (ROLE_RANK[r] ?? 99));
}

const GROUP_ICONS = {
  'Workforce': LayoutDashboard,
  'RSP': FileBadge,
  'Performance & L&D': BarChart3,
  'Payroll & Benefits': Banknote,
  'Compliance & Audit': ShieldCheck,
  'Administration': UserCog,
  'Support': HelpCircle,
};

function groupIndexForPath(visibleGroups, pathname) {
  const idx = visibleGroups.findIndex(g =>
    g.items.some(i => pathname === i.path || pathname.startsWith(i.path + '/'))
  );
  return idx === -1 ? 0 : idx;
}

function ClassicSidebar({ collapsed, visibleGroups, expanded }) {
  return (
    <aside className={`bg-surface border-r border-line hidden md:flex flex-col shrink-0 transition-[width] duration-200 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-line ${!expanded ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 rounded-[12px] bg-ink text-bg grid place-items-center">
          <Landmark size={20} />
        </div>
        {expanded && (
          <div className="min-w-0">
            <p className="font-display font-bold text-ink leading-tight truncate">LGU HRMS</p>
            <p className="mono-label text-[10px]">GOV · CSC Compliant</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto hide-scrollbar py-4">
        {expanded && <div className="px-4 pb-2 pt-1 mono-label text-[10px] uppercase tracking-wider text-muted">Navigation</div>}
        {visibleGroups.map(g => (
          <div key={g.label} className="mb-4">
            {expanded && <div className="px-4 py-1 mono-label text-[10px] uppercase tracking-wider text-muted">{g.label}</div>}
            <div className="space-y-1 px-2">
              {g.items.map(i => {
                const Icon = i.icon;
                return (
                  <NavLink
                    key={i.path}
                    to={i.path}
                    title={i.name}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors
                        ${isActive ? 'bg-accent/10 text-accent font-semibold border-l-2 border-accent' : 'text-ink hover:bg-bg/60 border-l-2 border-transparent'}
                        ${!expanded ? 'justify-center' : ''}`
                    }
                  >
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                    {expanded && <span className="truncate text-sm">{i.name}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`border-t border-line p-3 ${!expanded ? 'hidden' : 'flex justify-center'}`}>
        {expanded && (
          <p className="mono-label text-[10px] text-center">On-prem · RA 10173 · v0.1</p>
        )}
      </div>
    </aside>
  );
}

function DockSidebar({ collapsed, visibleGroups, role }) {
  const location = useLocation();
  const [selected, setSelected] = useState(() => groupIndexForPath(visibleGroups, location.pathname));

  useEffect(() => {
    setSelected(groupIndexForPath(visibleGroups, location.pathname));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, role]);

  const safeSelected = Math.min(selected, Math.max(visibleGroups.length - 1, 0));
  const activeGroup = visibleGroups[safeSelected];
  const panelOpen = !collapsed;

  return (
    <aside className="bg-surface border-r border-line hidden md:flex shrink-0 overflow-hidden">
      <div className="w-[76px] shrink-0 flex flex-col items-center py-3 border-r border-line/60">
        <div className="w-11 h-11 rounded-2xl bg-ink text-bg grid place-items-center shadow-sm" title="LGU HRMS">
          <Landmark size={20} />
        </div>

        <nav className="flex-1 flex flex-col items-center gap-1.5 mt-5 w-full px-2 overflow-y-auto hide-scrollbar" aria-label="Module groups">
          {visibleGroups.map((g, idx) => {
            const GroupIcon = GROUP_ICONS[g.label] || g.items[0]?.icon || LayoutDashboard;
            const isActive = idx === safeSelected;
            return (
              <button
                key={g.label}
                type="button"
                title={`${g.label} (${g.items.length})`}
                aria-label={`${g.label}, ${g.items.length} modules`}
                aria-pressed={isActive}
                onClick={() => setSelected(idx)}
                className={`relative w-[52px] h-[52px] rounded-2xl grid place-items-center transition-all duration-150 cursor-pointer
                  ${isActive
                    ? 'bg-accent/10 text-accent shadow-sm ring-1 ring-accent/25'
                    : 'text-muted hover:text-ink hover:bg-bg'}`}
              >
                <GroupIcon size={20} strokeWidth={isActive ? 2 : 1.75} aria-hidden="true" />
                <span
                  className={`absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full grid place-items-center text-[10px] font-bold font-mono leading-none border
                    ${isActive
                      ? 'bg-accent text-accent-ink border-accent'
                      : 'bg-surface text-muted border-line'}`}
                >
                  {g.items.length}
                </span>
                {isActive && (
                  <span className="absolute left-[-9px] top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-accent" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-3">
          <span className="block w-8 h-1 rounded-full bg-line" aria-hidden="true" />
        </div>
      </div>

      {panelOpen && activeGroup && (
        <div className="w-[228px] shrink-0 flex flex-col min-h-0">
          <div className="px-4 pt-4 pb-3 border-b border-line/60">
            <p className="font-display font-bold text-ink text-[15px] leading-tight truncate">{activeGroup.label}</p>
            <p className="mono-label text-[10px] mt-1">
              {activeGroup.items.length} MODULE{activeGroup.items.length !== 1 ? 'S' : ''} · {role || 'STAFF'}
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto hide-scrollbar p-2.5 space-y-1" aria-label={`${activeGroup.label} modules`}>
            {activeGroup.items.map(i => {
              const Icon = i.icon;
              return (
                <NavLink
                  key={i.path}
                  to={i.path}
                  title={i.name}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 border
                      ${isActive
                        ? 'bg-accent/10 text-accent font-semibold border-accent/20 shadow-sm'
                        : 'text-ink border-transparent hover:bg-bg hover:border-line/60'}`
                  }
                >
                  <span className="w-8 h-8 rounded-lg bg-bg border border-line/60 grid place-items-center shrink-0">
                    <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="truncate text-[13px] leading-snug">{i.name}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-line/60 px-4 py-3">
            <p className="font-display font-bold text-ink text-[13px] leading-tight truncate">LGU HRMS</p>
            <p className="mono-label text-[10px] mt-0.5">ON-PREM · RA 10173 · V0.1</p>
          </div>
        </div>
      )}
    </aside>
  );
}

function RailSidebar({ visibleGroups, role }) {
  const flat = visibleGroups.flatMap(g => g.items.map(i => ({ ...i, group: g.label })));
  return (
    <aside className="bg-surface border-r border-line hidden md:flex flex-col items-center shrink-0 w-[72px] py-3">
      <div className="w-11 h-11 rounded-2xl bg-ink text-bg grid place-items-center shadow-sm" title={`LGU HRMS · ${role || 'STAFF'}`}>
        <Landmark size={20} />
      </div>
      <nav className="flex-1 flex flex-col items-center gap-1.5 mt-5 w-full px-2 overflow-y-auto hide-scrollbar" aria-label="All modules">
        {flat.map(i => {
          const Icon = i.icon;
          return (
            <NavLink
              key={i.path}
              to={i.path}
              title={`${i.name} · ${i.group}`}
              aria-label={i.name}
              className={({ isActive }) =>
                `relative w-[52px] h-[52px] rounded-2xl grid place-items-center transition-all duration-150
                  ${isActive ? 'bg-accent/10 text-accent shadow-sm ring-1 ring-accent/25' : 'text-muted hover:text-ink hover:bg-bg'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.75} aria-hidden="true" />
                  {isActive && (
                    <span className="absolute left-[-11px] top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-accent" aria-hidden="true" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="pt-3">
        <span className="block w-8 h-1 rounded-full bg-line" aria-hidden="true" />
      </div>
    </aside>
  );
}

function AccordionSidebar({ collapsed, visibleGroups, role }) {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const activePath = location.pathname;
  const defaultOpen = () => {
    const o = {};
    visibleGroups.forEach(g => {
      o[g.label] = g.items.some(i => activePath === i.path || activePath.startsWith(i.path + '/'));
    });
    // Always keep the first group open when nothing matches
    if (!Object.values(o).some(Boolean) && visibleGroups[0]) o[visibleGroups[0].label] = true;
    return o;
  };
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(prev => {
      const next = { ...prev };
      visibleGroups.forEach(g => {
        if (g.items.some(i => activePath === i.path || activePath.startsWith(i.path + '/'))) next[g.label] = true;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath, role]);

  const q = query.trim().toLowerCase();
  const filtered = visibleGroups
    .map(g => ({ ...g, items: g.items.filter(i => !q || i.name.toLowerCase().includes(q)) }))
    .filter(g => g.items.length > 0);
  const searching = q.length > 0;

  if (collapsed) {
    const flat = visibleGroups.flatMap(g => g.items);
    return (
      <aside className="bg-surface border-r border-line hidden md:flex flex-col items-center shrink-0 w-[72px] py-3">
        <div className="w-11 h-11 rounded-2xl bg-ink text-bg grid place-items-center" title="LGU HRMS">
          <Landmark size={20} />
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1.5 mt-5 w-full px-2 overflow-y-auto hide-scrollbar" aria-label="All modules">
          {flat.map(i => {
            const Icon = i.icon;
            return (
              <NavLink
                key={i.path}
                to={i.path}
                title={i.name}
                className={({ isActive }) =>
                  `w-[52px] h-[52px] rounded-2xl grid place-items-center transition-colors ${isActive ? 'bg-accent/10 text-accent ring-1 ring-accent/25' : 'text-muted hover:text-ink hover:bg-bg'}`}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              </NavLink>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="bg-surface border-r border-line hidden md:flex flex-col shrink-0 w-[260px]">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
        <div className="w-10 h-10 rounded-[12px] bg-ink text-bg grid place-items-center">
          <Landmark size={20} />
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-ink leading-tight truncate">LGU HRMS</p>
          <p className="mono-label text-[10px]">GOV · CSC Compliant</p>
        </div>
      </div>
      <div className="px-3 pt-3">
        <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-line bg-surface text-ink shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
          <Search size={15} className="text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter modules…"
            aria-label="Filter modules"
            className="w-full bg-transparent outline-none text-sm placeholder:text-muted/60"
          />
        </label>
      </div>
      <nav className="flex-1 overflow-y-auto hide-scrollbar py-2 px-2 space-y-2" aria-label="Modules by group">
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted">No modules match “{query}”.</p>
        )}
        {filtered.map(g => {
          const GroupIcon = GROUP_ICONS[g.label] || g.items[0]?.icon || LayoutDashboard;
          const isOpen = searching ? true : !!open[g.label];
          return (
            <div key={g.label} className="rounded-xl border border-line bg-surface shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(prev => ({ ...prev, [g.label]: !prev[g.label] }))}
                aria-expanded={isOpen}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors
                  ${isOpen ? 'bg-accent/5 text-accent' : 'text-ink hover:bg-bg'}
                  border-b border-line/40`}
              >
                <span className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 transition-colors
                  ${isOpen ? 'bg-accent/10 text-accent' : 'bg-bg border border-line/60 text-muted'}`}>
                  <GroupIcon size={15} strokeWidth={isOpen ? 2 : 1.75} aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{g.label}</span>
                  <span className="mono-label text-[10px] opacity-70">{g.items.length} MODULE{g.items.length !== 1 ? 'S' : ''}</span>
                </span>
                <ChevronDown size={15} className={`text-muted/70 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-ink' : ''}`} aria-hidden="true" />
              </button>
              {isOpen && (
                <div className="px-1 pb-1.5 space-y-0.5">
                  {g.items.map(i => {
                    const Icon = i.icon;
                    return (
                      <NavLink
                        key={i.path}
                        to={i.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-lg mx-1 transition-all duration-150 text-[13px]
                            ${isActive
                              ? 'bg-accent/10 text-accent font-semibold border-l-2 border-accent'
                              : 'text-ink hover:bg-bg/60 border-l-2 border-transparent'}`}
                      >
                        <Icon size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-muted/60 group-active:text-accent" />
                        <span className="truncate">{i.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-line p-3 flex justify-center">
        <p className="mono-label text-[10px] text-center">On-prem · RA 10173 · v0.1</p>
      </div>
    </aside>
  );
}

export default function Sidebar({ collapsed }) {
  const role = useAuthStore(s => s.user?.role);
  const style = useSidebarStyle();
  const visibleGroups = groups
    .map(g => ({ ...g, items: g.items.filter(i => canSee(role, i)) }))
    .filter(g => g.items.length > 0);

  if (style === 'dock') {
    return <DockSidebar collapsed={collapsed} visibleGroups={visibleGroups} role={role} />;
  }
  if (style === 'rail') {
    return <RailSidebar visibleGroups={visibleGroups} role={role} />;
  }
  if (style === 'accordion') {
    return <AccordionSidebar collapsed={collapsed} visibleGroups={visibleGroups} role={role} />;
  }
  return <ClassicSidebar collapsed={collapsed} visibleGroups={visibleGroups} expanded={!collapsed} />;
}
