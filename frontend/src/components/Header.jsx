import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toggleTheme, useTheme } from '../theme.js';
import { useAuthStore } from '../stores/authStore.js';
import { useNotifications, useInAppEnabled } from '../hooks/useNotifications.js';
import { Search, Bell, Sun, Moon, LogOut, User, Menu, ChevronDown, Home, CheckCheck, Trash2, Inbox, HelpCircle } from 'lucide-react';

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
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const { items, loading, live, markRead, markAllRead, dismissAll } = useNotifications();
  const inAppEnabled = useInAppEnabled();
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const bellRef = useRef(null);
  const userRef = useRef(null);
  const unread = inAppEnabled ? items.filter(n => n.unread).length : 0;

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

  useEffect(() => {
    const onKey = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('lgu:open-palette'));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const openItem = (n) => {
    markRead(n.id);
    setBellOpen(false);
    if (n.path) navigate(n.path);
  };

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
            <p className="hidden sm:block text-xs text-muted truncate">{location.pathname.replace('/','').toUpperCase()} Â· On-prem Â· RA 10173</p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button
            type="button"
            className="btn btn-ghost px-2 md:px-3"
            onClick={() => window.dispatchEvent(new CustomEvent('lgu:open-palette'))}
            aria-label="Quick search - press to open"
            title="Quick search"
          >
            <Search size={18} />
            <span className="hidden md:inline ml-1 text-sm">Search</span>
            <span className="hidden lg:inline mono-label ml-2">{navigator.platform.toUpperCase().includes('MAC') ? '⌘K' : 'Ctrl K'}</span>
          </button>

          <button
            type="button"
            className="btn btn-ghost px-2 md:px-3"
            onClick={() => navigate('/help')}
            aria-label="Help"
            title="Help"
          >
            <HelpCircle size={18} />
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
              <div className="dropdown-panel w-90 p-0" role="menu" aria-label="Notifications">
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
                    <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={dismissAll} title="Clear all" aria-label="Clear all notifications">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {!inAppEnabled ? (
                  <div className="py-12 px-6 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-bg grid place-items-center mb-3">
                      <Bell size={20} className="text-muted" />
                    </div>
                    <p className="text-sm font-medium text-ink">Notifications muted</p>
                    <p className="text-xs text-muted mt-1">Turn on In-app notifications under Settings â†’ Notifications.</p>
                  </div>
                ) : loading ? (
                  <p className="text-sm text-muted px-4 py-8 text-center">Loading notificationsâ€¦</p>
                ) : items.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-bg grid place-items-center mb-3">
                      <Bell size={20} className="text-muted" />
                    </div>
                    <p className="text-sm font-medium text-ink">No notifications</p>
                    <p className="text-xs text-muted mt-1">Youâ€™re all caught up</p>
                  </div>
                ) : (
                  <ul className="max-h-95 overflow-auto divide-y divide-line">
                    {items.map(n => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={`w-full text-left px-4 py-3 hover:bg-bg/50 transition-colors ${n.unread ? 'bg-accent/3' : ''}`}
                          onClick={() => openItem(n)}
                        >
                          <div className="flex gap-3">
                            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.unread ? 'bg-accent' : 'bg-line'}`} aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-medium text-ink ${n.unread ? '' : 'opacity-90'}`}>{n.title}</p>
                                <span className="mono-label text-[10px] text-muted shrink-0">{n.time}</span>
                              </div>
                              <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="px-4 py-2 border-t border-line flex items-center justify-between">
                  <span className="mono-label text-[10px]">{live ? 'Live' : 'Offline sample'}</span>
                  <button type="button" className="text-xs mono-label hover:text-accent" onClick={() => { setBellOpen(false); navigate('/audit'); }}>
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
              className="flex items-center gap-2.5 pl-1 pr-2.5 py-1 rounded-[12px] hover:bg-bg/60 border border-transparent hover:border-line transition"
              onClick={() => setUserOpen(o => !o)}
              aria-expanded={userOpen}
              aria-label="User menu"
            >
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-accent/20 to-accent/5 text-accent grid place-items-center shrink-0 ring-1 ring-accent/10">
                <span className="font-display font-bold text-[13px]">{user?.username?.[0]?.toUpperCase() ?? 'U'}</span>
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <p className="text-sm font-semibold text-ink truncate max-w-28">{user?.username ?? 'Account'}</p>
                <p className="text-[10px] mono-label text-muted">{user?.role?.replaceAll('_', ' ') ?? '—'}</p>
              </div>
              <ChevronDown size={14} className="text-muted hidden lg:block" />
            </button>
            {userOpen && (
              <div className="dropdown-panel w-64 shadow-lg" role="menu" aria-label="User menu">
                <div className="px-4 py-4 border-b border-line">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-accent/20 to-accent/5 text-accent grid place-items-center ring-1 ring-accent/10">
                      <span className="font-display font-bold">{user?.username?.[0]?.toUpperCase() ?? 'U'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink text-sm truncate">{user?.username ?? 'Account'}</p>
                      <p className="mono-label text-[11px] text-muted truncate">{user?.role?.replaceAll('_', ' ')}</p>
                      <p className="mono-label text-[10px] text-muted mt-0.5 truncate">{user?.tenantId ? `Tenant · ${user.tenantId}` : 'No tenant'}</p>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg/60 flex items-center gap-2"
                    onClick={() => { setUserOpen(false); navigate('/settings'); }}
                  >
                    <User size={16} /> Profile & Settings
                  </button>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg/60 flex items-center gap-2"
                    onClick={() => { setUserOpen(false); navigate('/help'); }}
                  >
                    <HelpCircle size={16} /> Help Center
                  </button>
                </div>
                <div className="border-t border-line py-1">
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg/60 flex items-center gap-2 text-error"
                    onClick={() => { logout(); setUserOpen(false); navigate('/'); }}
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
