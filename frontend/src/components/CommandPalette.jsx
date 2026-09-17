import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Search as SearchIcon, User, Home, BarChart3, FileText, Calendar, ShieldCheck, ShieldAlert, Users, Settings, Clock, Fingerprint, File, Activity } from 'lucide-react';
import { useAuthStore } from '../stores/authStore.js';
import { useUserCapabilities } from '../config/permissions.js';

const ALL = ['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD', 'AUDITOR', 'EMPLOYEE', 'SUPER_ADMIN'];
const HR_LEAD = ['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN'];

const pages = [
  { label: 'Dashboard', path: '/dashboard', icon: Home, roles: ALL },
  { label: 'Employees', path: '/employees', icon: Users, roles: ['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN'] },
  { label: 'Organization', path: '/organization', icon: Home, roles: ['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN'] },
  { label: 'Payroll', path: '/payroll', icon: BarChart3, roles: ['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'SUPER_ADMIN'], capability: 'payrollRead' },
  { label: 'Leave & Appointments', path: '/leave', icon: Calendar, roles: ['ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD', 'SUPER_ADMIN'], capability: 'leaveApproval' },
  { label: 'Attendance (DTR)', path: '/attendance', icon: Clock, roles: HR_LEAD },
  { label: 'Biometric Devices', path: '/biometric-devices', icon: Fingerprint, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { label: 'Appointments', path: '/appointments', icon: FileText, roles: ['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'], capability: 'appointmentsCRUD' },
  { label: 'Plantilla', path: '/plantilla', icon: FileText, roles: ['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'], capability: 'employeeRecordsCRUD' },
  { label: 'Designation', path: '/designation', icon: Users, roles: ['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'], capability: 'appointmentsCRUD' },
  { label: 'Recruitment', path: '/recruitment', icon: Users, roles: ['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'], capability: 'recruitmentCRUD' },
  { label: 'Performance', path: '/performance', icon: BarChart3, roles: HR_LEAD },
  { label: 'Learning', path: '/learning', icon: Users, roles: ['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'], capability: 'trainingCRUD' },
  { label: 'Documents', path: '/documents', icon: File, roles: ['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'], capability: 'documentsCRUD' },
  { label: 'Document Access Tracking', path: '/documents/tracking', icon: Activity, roles: ['ADMIN', 'HR_MANAGER', 'AUDITOR', 'SUPER_ADMIN'], capability: 'documentsTrack' },
  { label: 'Audit Trail', path: '/audit', icon: ShieldCheck, roles: ['ADMIN', 'AUDITOR', 'SUPER_ADMIN'] },
  { label: 'DIBAR Records', path: '/disqualifications', icon: ShieldAlert, roles: ['ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'], capability: 'disqualificationCRUD' },
  { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'AUDITOR', 'SUPER_ADMIN'] },
  { label: 'Users & Roles', path: '/users', icon: Users, roles: ['ADMIN', 'SUPER_ADMIN'], capability: 'manageUsersAndRoles' },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ALL },
];

function isVisible(page, role, caps) {
  if (page.roles && !page.roles.includes(role)) return false;
  if (page.capability && role !== 'SUPER_ADMIN') return !!caps?.[page.capability];
  return true;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const caps = useUserCapabilities();

  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
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
      .filter((p) => isVisible(p, user?.role, caps))
      .filter(p => !query || p.label.toLowerCase().includes(query))
      .map(p => ({ type: 'Page', label: p.label, path: p.path, icon: p.icon }));
    return pageHits;
  }, [q, user?.role, caps]);

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