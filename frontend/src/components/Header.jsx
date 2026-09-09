import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toggleTheme, useTheme } from '../theme.js';
import { notifications } from '../data/mock.js';

const titles = {
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/organization': 'Organization',
  '/payroll': 'Payroll',
  '/leave': 'Leave & Appointments',
  '/attendance': 'Attendance (DTR)',
  '/appointments': 'Appointments',
  '/audit': 'Audit Trail',
  '/reports': 'Reports',
  '/users': 'Users & Roles',
};

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [items, setItems] = useState(notifications);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  const unread = items.filter(n => n.unread).length;

  useEffect(() => {
    if (!bellOpen) return undefined;
    const onDown = e => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [bellOpen]);

  return (
    <header className="h-16 shrink-0 bg-surface border-b border-line flex items-center justify-between px-6">
      <h2 className="font-display font-semibold text-ink">{titles[location.pathname] ?? 'LGU HRMS'}</h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost px-3"
          onClick={() => window.dispatchEvent(new CustomEvent('lgu:open-palette'))}
          aria-label="Quick search (Ctrl+K)"
          title="Quick search (Ctrl+K)"
        >
          <SearchIcon />
        </button>

        <div className="dropdown" ref={bellRef}>
          <button
            type="button"
            className="btn btn-ghost px-3 relative"
            onClick={() => setBellOpen(o => !o)}
            aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
            aria-expanded={bellOpen}
          >
            <BellIcon />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-error text-error-ink text-[10px] font-bold flex items-center justify-center" aria-hidden="true">
                {unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <div className="dropdown-panel" role="menu" aria-label="Notifications">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                <p className="font-display font-semibold text-ink text-sm">Notifications</p>
                <button type="button" className="mono-label hover:text-accent" onClick={() => setItems(ns => ns.map(n => ({ ...n, unread: false })))}>
                  Mark all read
                </button>
              </div>
              <ul className="max-h-72 overflow-auto">
                {items.map(n => (
                  <li key={n.id} className="px-4 py-3 border-b border-line last:border-b-0">
                    <p className="text-sm font-medium text-ink flex items-center gap-2">
                      {n.title}
                      {n.unread && <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-label="Unread" />}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{n.body}</p>
                    <p className="mono-label mt-1">{n.time}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="btn btn-ghost px-3"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          type="button"
          onClick={() => { localStorage.removeItem('auth'); navigate('/'); }}
          className="btn btn-ghost"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
