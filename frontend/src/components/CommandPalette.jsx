import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { employees } from '../data/mock.js';

const pages = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Employees', path: '/employees' },
  { label: 'Organization', path: '/organization' },
  { label: 'Payroll', path: '/payroll' },
  { label: 'Leave & Appointments', path: '/leave' },
  { label: 'Audit Trail', path: '/audit' },
  { label: 'Reports', path: '/reports' },
  { label: 'Users & Roles', path: '/users' },
  { label: 'Attendance (DTR)', path: '/attendance' },
];

/** Global quick search — Ctrl/Cmd+K (HRMS-standard command palette). */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);

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
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const pageHits = pages
      .filter(p => !query || p.label.toLowerCase().includes(query))
      .map(p => ({ type: 'Page', label: p.label, path: p.path }));
    const empHits = employees
      .filter(e => query && (e.name.toLowerCase().includes(query) || e.no.toLowerCase().includes(query)))
      .slice(0, 5)
      .map(e => ({ type: 'Employee', label: `${e.no} · ${e.name}`, path: '/employees' }));
    return query ? [...pageHits, ...empHits] : pageHits;
  }, [q]);

  if (!open) return null;
  const go = item => {
    setOpen(false);
    navigate(item.path);
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={() => setOpen(false)}>
      <div className="modal-box modal-sm palette" role="dialog" aria-modal="true" aria-label="Quick search" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="input"
          placeholder="Search pages, employees…"
          aria-label="Quick search"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <ul className="palette-list mt-2">
          {results.map((r, i) => (
            <li key={`${r.type}-${r.label}-${i}`}>
              <button type="button" className="palette-item" onClick={() => go(r)}>
                <span className="mono-label shrink-0">{r.type}</span>
                <span className="text-sm text-ink truncate">{r.label}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="text-sm text-muted p-3">No matches found.</li>}
        </ul>
      </div>
    </div>
  );
}