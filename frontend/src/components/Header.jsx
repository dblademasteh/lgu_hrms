import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toggleTheme, useTheme } from '../theme.js';
import { notifications } from '../data/mock.js';
import { Search, Bell, Sun, Moon, LogOut, User, Menu, ChevronDown, Home, CheckCheck, Trash2, Inbox } from 'lucide-react';

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

export default function Header({ onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [items, setItems] = useState(notifications);
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const bellRef = useRef(null);
  const userRef = useRef(null);
  const unread = items.filter(n => n.unread).length;

  useEffect(() => {
    if (!bellOpen) return undefined;
    const onDown = e => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [bellOpen]);

  useEffect(() => {
    if (!userOpen) return undefined;
    const onDown = e => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [userOpen]);

  const markAllRead = () => setItems(ns => ns.map(n => ({ ...n, unread: false })));
  const dismissAll = () => setItems([]);

  return (
    <header className="h-16 shrink-0 bg-surface/90 backdrop-blur-md border-b border-line" style={{ zIndex: 50 }}>
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="btn btn-ghost p-2 md:p-2.5"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-muted">
            <Home size={16} />
            <span className="mono-label">/</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-ink text-lg leading-tight truncate">{titles[location.pathname] ?? 'LGU HRMS'}</h1>
            <p className="hidden sm:block text-xs text-muted truncate">{location.pathname.replace('/','').toUpperCase()} · On-prem · RA 10173</p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button
            type="button"
            className="btn btn-ghost px-2 md:px-3"
            onClick={() => window.dispatchEvent(new CustomEvent('lgu:open-palette'))}
            aria-label="Quick search (Ctrl+K)"
            title="Quick search (Ctrl+K)"
          >
            <Search size={18} />
            <span className="hidden md:inline ml-1 text-sm">Search</span>
            <span className="hidden lg:inline mono-label ml-2">⌘K</span>
          </button>

          <div className="dropdown" ref={bellRef}>
            <button
              type="button"
              className="btn btn-ghost px-2 md:px-3 relative"
              onClick={() => setBellOpen(o => !o)}
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
              aria-expanded={bellOpen}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-error text-error-ink text-[10px] font-bold flex items-center justify-center" aria-hidden="true">
                  {unread}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="dropdown-panel w-[360px] p-0" role="menu" aria-label="Notifications">
                <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                  <div className="flex items-center gap-2">
                    <Inbox size={16} className="text-muted" />
                    <p className="font-display font-semibold text-ink text-sm">Notifications</p>
                    {unread > 0 && <span className="mono-label text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">{unread} new</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" className="btn btn-ghost px-2 py-1 text-xs flex items-center gap-1" onClick={markAllRead} title="Mark all read">
                      <CheckCheck size={14} /> Mark all
                    </button>
                    <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={dismissAll} title="Clear all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-bg grid place-items-center mb-3">
                      <Bell size={20} className="text-muted" />
                    </div>
                    <p className="text-sm font-medium text-ink">No notifications</p>
                    <p className="text-xs text-muted mt-1">You’re all caught up</p>
                  </div>
                ) : (
                  <ul className="max-h-[380px] overflow-auto divide-y divide-line">
                    {items.map(n => (
                      <li key={n.id} className={`px-4 py-3 hover:bg-bg/50 transition-colors cursor-pointer ${n.unread ? 'bg-accent/[0.03]' : ''}`} onClick={() => { setBellOpen(false); navigate('/audit'); }}>
                        <div className="flex gap-3">
                          <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.unread ? 'bg-accent' : 'bg-transparent'}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium text-ink truncate ${n.unread ? '' : 'opacity-90'}`}>{n.title}</p>
                              <span className="mono-label text-[10px] text-muted shrink-0">{n.time}</span>
                            </div>
                            <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="px-4 py-2 border-t border-line">
                  <button className="w-full text-center text-xs mono-label hover:text-accent" onClick={() => navigate('/audit')}>
                    View audit log
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-ghost px-2 md:px-3"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="dropdown" ref={userRef}>
            <button
              type="button"
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-[10px] hover:bg-bg/60 border border-transparent hover:border-line transition"
              onClick={() => setUserOpen(o => !o)}
              aria-expanded={userOpen}
              aria-label="User menu"
            >
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                <User size={16} />
              </div>
              <div className="hidden md:block text-left leading-tight">
                <p className="text-sm font-semibold text-ink">Admin</p>
                <p className="text-[10px] mono-label text-muted">HRMO</p>
              </div>
              <ChevronDown size={14} className="text-muted" />
            </button>
            {userOpen && (
              <div className="dropdown-panel w-56" role="menu" aria-label="User menu">
                <div className="px-4 py-3 border-b border-line">
                  <p className="font-semibold text-ink text-sm">Signed in as</p>
                  <p className="mono-label text-xs text-muted">admin@lgu.gov.ph</p>
                </div>
                <button
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg/60 flex items-center gap-2"
                  onClick={() => { localStorage.removeItem('auth'); navigate('/'); }}
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
