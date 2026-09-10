import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, FileBadge, Banknote, CalendarDays, Clock,
  ShieldCheck, BarChart3, UserCog, Landmark, Settings as SettingsIcon
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore.js';

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
      { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['PAYROLL_OFFICER', 'HR_MANAGER', 'ADMIN', 'AUDITOR'] },
    ]
  },
  {
    label: 'Administration',
    items: [
      { name: 'Users & Roles', path: '/users', icon: UserCog, roles: ['ADMIN'] },
      { name: 'Settings', path: '/settings', icon: SettingsIcon },
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

export default function Sidebar({ collapsed }) {
  const expanded = !collapsed;
  const role = useAuthStore(s => s.user?.role);
  const visibleGroups = groups
    .map(g => ({ ...g, items: g.items.filter(i => canSee(role, i)) }))
    .filter(g => g.items.length > 0);
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

      <nav className="flex-1 overflow-y-auto py-4">
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
