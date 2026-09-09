import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const items = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Employees', path: '/employees' },
  { name: 'Organization', path: '/organization' },
  { name: 'Payroll', path: '/payroll' },
  { name: 'Leave', path: '/leave' },
  { name: 'Attendance', path: '/attendance' },
  { name: 'Appointments', path: '/appointments' },
  { name: 'Audit Trail', path: '/audit' },
  { name: 'Reports', path: '/reports' },
  { name: 'Users & Roles', path: '/users' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside
      className={`bg-surface border-r border-line hidden md:flex flex-col shrink-0 transition-all duration-200 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}
    >
      <div className={`flex items-center gap-3 p-4 border-b border-line ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="w-9 h-9 rounded-[10px] bg-accent text-accent-ink flex items-center justify-center font-display font-bold shrink-0" aria-hidden="true">L</div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display font-bold text-ink leading-tight">LGU HRMS</p>
            <p className="mono-label">Personnel &amp; Payroll</p>
          </div>
        )}
      </div>

      <nav className={`flex-1 overflow-y-auto py-3 space-y-1 ${collapsed ? 'px-2' : 'p-3'}`} aria-label="Main navigation">
        {items.map(i => (
          <NavLink
            key={i.path}
            to={i.path}
            title={i.name}
            className={`sidebar-link ${collapsed ? 'justify-center' : ''}`}
          >
            <span className={collapsed ? 'hidden' : ''}>{i.name}</span>
            {collapsed && <span className="text-xs font-semibold">{i.name.slice(0, 2)}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={`border-t border-line ${collapsed ? 'p-2 flex justify-center' : 'p-4'}`}>
        <button
          type="button"
          className="btn btn-ghost w-full"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? '»' : '« Collapse'}
        </button>
        {!collapsed && <p className="mono-label mt-3">On-prem &middot; COA compliant</p>}
      </div>
    </aside>
  );
}
