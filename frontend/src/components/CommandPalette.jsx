import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Search as SearchIcon, User, Home, BarChart3, FileText, Calendar, ShieldCheck, Users, Settings, Clock } from 'lucide-react';

const pages = [
  { label: 'Dashboard', path: '/dashboard', icon: Home },
  { label: 'Employees', path: '/employees', icon: Users },
  { label: 'Organization', path: '/organization', icon: Home },
  { label: 'Payroll', path: '/payroll', icon: BarChart3 },
  { label: 'Leave & Appointments', path: '/leave', icon: Calendar },
  { label: 'Attendance (DTR)', path: '/attendance', icon: Clock },
  { label: 'Appointments', path: '/appointments', icon: FileText },
  { label: 'Plantilla', path: '/plantilla', icon: FileText },
  { label: 'Vacancy', path: '/vacancy', icon: FileText },
  { label: 'Designation', path: '/designation', icon: Users },
  { label: 'Recruitment', path: '/recruitment', icon: Users },
  { label: 'Performance', path: '/performance', icon: BarChart3 },
  { label: 'Learning', path: '/learning', icon: Users },
  { label: 'Audit Trail', path: '/audit', icon: ShieldCheck },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Users & Roles', path: '/users', icon: Users },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('lgu:open-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('lgu:open-palette', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      clearTimeout(debounceRef.current);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const pageHits = pages
      .filter(p => !query || p.label.toLowerCase().includes(query))
      .map(p => ({ type: 'Page', label: p.label, path: p.path, icon: p.icon }));
    return query ? pageHits : pageHits;
  }, [q]);

  if (!open) return null;
  const go = item => {
    setOpen(false);
    navigate(item.path);
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={() => setOpen(false)}>
      <div className="modal-box modal-sm palette" role="dialog" aria-modal="true" aria-label="Quick search" onClick={e => e.stopPropagation()}>
        <div className="modal-head !flex-row items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <SearchIcon size={18} className="text-muted" />
            <h3 className="font-display font-semibold text-ink text-sm">Quick Search</h3>
          </div>
          <span className="mono-label text-[10px] text-muted">Ctrl K</span>
        </div>
        <div className="px-4 py-3">
          <input
            ref={inputRef}
            className="input w-full"
            placeholder="Search pages, employees…"
            aria-label="Quick search"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <ul className="max-h-80 overflow-y-auto palette-list">
          {results.map((r, i) => (
            <li key={`${r.type}-${r.label}-${i}`}>
              <button type="button" className="palette-item" onClick={() => go(r)}>
                <r.icon size={16} className="text-muted" aria-hidden="true" />
                <span className="mono-label shrink-0">{r.type}</span>
                <span className="text-sm text-ink truncate">{r.label}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="text-sm text-muted p-3">No matches found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}