import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, FileBadge, Banknote, CalendarDays, Clock,
  ShieldCheck, BarChart3, UserCog, Landmark, Settings as SettingsIcon
} from 'lucide-react';

const groups = [
  {
    label: 'Personnel',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Employees', path: '/employees', icon: Users },
      { name: 'Organization', path: '/organization', icon: Building2 },
      { name: 'Appointments', path: '/appointments', icon: FileBadge },
    ]
  },
  {
    label: 'Payroll',
    items: [
      { name: 'Payroll', path: '/payroll', icon: Banknote },
      { name: 'Attendance DTR', path: '/attendance', icon: Clock },
    ]
  },
  {
    label: 'Compliance',
    items: [
      { name: 'Leave', path: '/leave', icon: CalendarDays },
      { name: 'Audit Trail', path: '/audit', icon: ShieldCheck },
    ]
  },
  {
    label: 'Administration',
    items: [
      { name: 'Reports', path: '/reports', icon: BarChart3 },
      { name: 'Users & Roles', path: '/users', icon: UserCog },
      { name: 'Settings', path: '/settings', icon: SettingsIcon },
    ]
  }
];

export default function Sidebar({ collapsed }) {
  const expanded = !collapsed;
  return (
    <aside className={`bg-surface border-r border-line hidden md:flex flex-col shrink-0 transition-[width] duration-200 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}>
      <div className={`flex items-center gap-3 p-4 border-b border-line ${!expanded ? 'justify-center' : ''}`}>
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
        {groups.map(g => (
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

      <div className={`border-t border-line p-3 ${!expanded ? 'flex justify-center' : ''}`}>
        {expanded && (
          <p className="mono-label text-[10px] text-center">On-prem · RA 10173 · v0.1</p>
        )}
        {!expanded && (
          <p className="mono-label text-[8px] text-center rotate-90 origin-center opacity-60">v0.1</p>
        )}
      </div>
    </aside>
  );
}
