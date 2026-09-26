import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Edit, History as HistoryIcon, User, Briefcase, Calendar, FileText, Award, GraduationCap, Users, Wallet, ClipboardList, BookOpen, Loader2 } from 'lucide-react';
import { badgeTone } from '../data/mock.js';
import { api } from '../api/client.js';
import { departmentsApi } from '../api/departments.js';
import { employeeSectionsApi } from '../api/employeeSections.js';

const initialsOf = name => (name ?? '').split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('') || '—';
const peso = n => `\u20B1 ${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const d10 = v => (v ? String(v).slice(0, 10) : '\u2014');
const dash = v => (v === 0 || v ? String(v) : '\u2014');

const RELATION_COLUMNS = {
  history: [
    { key: 'position', label: 'Position', get: r => dash(r._positionName ?? r.position?.title ?? r.positionId) },
    { key: 'dept', label: 'Dept', get: r => dash(r._deptName ?? r.department?.name ?? r.departmentId) },
    { key: 'startDate', label: 'From', get: r => d10(r.startDate) },
    { key: 'endDate', label: 'To', get: r => (r.endDate ? d10(r.endDate) : 'Present') },
  ],
  appointments: [
    { key: 'type', label: 'Type', get: r => dash(r.type) },
    { key: 'itemNumber', label: 'Item No', get: r => dash(r.itemNumber) },
    { key: 'position', label: 'Position', get: r => dash(r._positionString ?? r.position) },
    { key: 'dept', label: 'Dept', get: r => dash(r._deptString ?? r.dept) },
    { key: 'startDate', label: 'From', get: r => d10(r.startDate) },
    { key: 'endDate', label: 'To', get: r => (r.endDate ? d10(r.endDate) : 'Present') },
    { key: 'status', label: 'Status', get: r => dash(r.status) },
  ],
  leave: [
    { key: 'type', label: 'Type', get: r => dash(r.type) },
    { key: 'fromDate', label: 'From', get: r => d10(r.fromDate) },
    { key: 'toDate', label: 'To', get: r => d10(r.toDate) },
    { key: 'days', label: 'Days', get: r => dash(r.days) },
    { key: 'status', label: 'Status', get: r => <span className={`badge ${badgeTone(r.status)}`}>{r.status}</span> },
  ],
  leaveCredits: [
    { key: 'type', label: 'Leave Type', get: r => dash(r.type) },
    { key: 'year', label: 'Year', get: r => dash(r.year) },
    { key: 'balance', label: 'Balance', get: r => <span className="font-semibold text-accent">{dash(r.balance)}</span> },
  ],
  attendance: [
    { key: 'date', label: 'Date', get: r => d10(r.date) },
    { key: 'timeIn', label: 'Time In', get: r => (r.timeIn ? String(r.timeIn).slice(11, 16) : '\u2014') },
    { key: 'timeOut', label: 'Time Out', get: r => (r.timeOut ? String(r.timeOut).slice(11, 16) : '\u2014') },
    { key: 'hours', label: 'Hours', get: r => dash(r.hours) },
    { key: 'remark', label: 'Remark', get: r => dash(r.remark) },
  ],
  payroll: [
    { key: 'run', label: 'Period', get: r => dash(r.run?.period?.name ?? r.run?.runDate?.slice(0, 10)) },
    { key: 'status', label: 'Status', get: r => dash(r.run?.status ?? '—') },
    { key: 'basicPay', label: 'Basic Pay', get: r => peso(r.basicPay) },
    { key: 'allowances', label: 'Allowances', get: r => peso(r.allowances) },
    { key: 'deductions', label: 'Deductions', get: r => peso(r.deductions) },
    { key: 'netPay', label: 'Net Pay', get: r => <span className="font-semibold text-accent">{peso(r.netPay)}</span> },
  ],
  performance: [
    { key: 'reviewYear', label: 'Year', get: r => dash(r.reviewYear) },
    { key: 'reviewType', label: 'Type', get: r => dash(r.reviewType) },
    { key: 'rating', label: 'Rating', get: r => dash(r.rating) },
    { key: 'status', label: 'Status', get: r => <span className={`badge ${badgeTone(r.status)}`}>{r.status}</span> },
  ],
  training: [
    { key: 'program', label: 'Program', get: r => dash(r.program?.title ?? r.programId) },
    { key: 'enrolledAt', label: 'Enrolled', get: r => d10(r.enrolledAt) },
    { key: 'completedAt', label: 'Completed', get: r => (r.completedAt ? d10(r.completedAt) : '\u2014') },
    { key: 'status', label: 'Status', get: r => <span className={`badge ${badgeTone(r.status)}`}>{r.status}</span> },
  ],
  loans: [
    { key: 'type', label: 'Type', get: r => dash(r.type) },
    { key: 'amount', label: 'Amount', get: r => <span className="font-semibold text-accent">{peso(r.amount)}</span> },
    { key: 'termMonths', label: 'Term', get: r => `${r.termMonths} mo` },
    { key: 'startDate', label: 'Start', get: r => d10(r.startDate) },
    { key: 'status', label: 'Status', get: r => <span className={`badge ${badgeTone(r.status)}`}>{r.status}</span> },
  ],
};

const READONLY_TABS = ['history', 'appointments', 'leave', 'leaveCredits', 'attendance', 'payroll', 'performance', 'training', 'loans'];

let refCache = null;
async function getRefMaps() {
  if (refCache) return refCache;
  try {
    const [deps, poss] = await Promise.all([
      departmentsApi.list().catch(() => []),
      api.get('/positions').then(r => r?.data ?? []).catch(() => []),
    ]);
    const depMap = Object.fromEntries(
      (Array.isArray(deps) ? deps : []).map(d => [d.id, d.code ? `${d.code} · ${d.name}` : d.name])
    );
    const posMap = Object.fromEntries(
      (Array.isArray(poss) ? poss : []).map(p => [p.id, p.salaryGrade ? `${p.title} (SG ${p.salaryGrade})` : p.title])
    );
    refCache = { depMap, posMap };
  } catch {
    refCache = { depMap: {}, posMap: {} };
  }
  return refCache;
}

function RelationTable({ employeeId, section, refreshKey, onError, title }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!employeeId) {
      setLoading(false);
      setRows([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const [res, { depMap, posMap }] = await Promise.all([
          employeeSectionsApi.list(employeeId, section),
          getRefMaps(),
        ]);
        if (cancelled) return;
        const data = res?.data ?? res;
        const list = Array.isArray(data) ? data : [];
        for (const row of list) {
          if (row.departmentId && depMap[row.departmentId] !== undefined) row._deptName = depMap[row.departmentId];
          if (row.positionId && posMap[row.positionId] !== undefined) row._positionName = posMap[row.positionId];
          if (row.position && posMap[row.position] !== undefined) row._positionString = posMap[row.position];
          if (row.dept && depMap[row.dept] !== undefined) row._deptString = depMap[row.dept];
        }
        setRows(list);
        onErrorRef.current?.(null);
      } catch (err) {
        if (!cancelled) {
          setError(true);
          onErrorRef.current?.(err?.response?.data?.error?.message || 'Failed to load');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employeeId, section, refreshKey]);

  if (loading) return <SkeletonTable columns={RELATION_COLUMNS[section]?.length ?? 3} rows={3} />;
  if (error) return <SectionError message="Failed to load records." />;
  if (!rows.length) return <p className="text-sm text-muted py-6 text-center">No records on file.</p>;

  const cols = RELATION_COLUMNS[section];
  if (!cols) return <p className="text-sm text-muted py-6 text-center">{rows.length} record(s) on file.</p>;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="mono-label text-xs">{title ?? section}</p>
        <span className="mono-label text-xs text-muted">{rows.length} {rows.length === 1 ? 'record' : 'records'}</span>
      </div>
      <div className="overflow-auto max-h-[40vh]">
        <table className="data-table text-sm">
          <thead><tr>{cols.map(c => <th key={c.key} className="text-left">{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? i} className="hover:bg-accent/5">
                {cols.map(c => <td key={c.key} className="text-sm">{c.get(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayslipPanel({ employeeId, refreshKey }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!employeeId) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    employeeSectionsApi.list(employeeId, 'payroll')
      .then(r => {
        if (cancelled) return;
        const data = r?.data ?? r;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [employeeId, refreshKey]);

  if (loading) return <SkeletonTable columns={4} rows={2} />;
  if (error) return <SectionError message="Failed to load payslip." />;
  if (!items.length) return <p className="text-sm text-muted py-6 text-center">No payroll records on file.</p>;

  const latest = items[0];
  const period = latest.run?.period?.name ?? latest.run?.runDate?.slice(0, 10) ?? 'Latest run';
  const status = latest.run?.status ?? '—';
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="mono-label">Latest Payslip</p>
        <span className={`badge ${badgeTone(status)}`}>{status}</span>
      </div>
      <div className="card p-4">
        <p className="mono-label text-xs text-muted mb-3">{period}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div><dt className="mono-label">Basic Pay</dt><dd className="font-mono mt-0.5">{peso(latest.basicPay)}</dd></div>
          <div><dt className="mono-label">Allowances</dt><dd className="font-mono mt-0.5">{peso(latest.allowances)}</dd></div>
          <div><dt className="mono-label">Deductions</dt><dd className="font-mono mt-0.5">{peso(latest.deductions)}</dd></div>
          <div><dt className="mono-label">Net Pay</dt><dd className="font-mono mt-0.5 font-semibold text-accent">{peso(latest.netPay)}</dd></div>
        </dl>
      </div>
    </div>
  );
}

const TAB_ICONS = {
  profile: User,
  payslip: Wallet,
  history: HistoryIcon,
  appointments: Briefcase,
  leave: Calendar,
  leaveCredits: FileText,
  attendance: ClipboardList,
  payroll: Wallet,
  performance: Award,
  training: BookOpen,
  loans: Users,
};

const TAB_LABELS = {
  profile: '201 Profile',
  payslip: 'Payslip',
  history: 'Employment History',
  appointments: 'Appointments',
  leave: 'Leave',
  leaveCredits: 'Leave Credits',
  attendance: 'Attendance',
  payroll: 'Payroll',
  performance: 'Performance',
  training: 'Training',
  loans: 'Loans',
};

function SkeletonTable({ columns = 4, rows = 3 }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2 border-b border-line pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="skeleton h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="skeleton h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

function SectionError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-error/5 border border-error/10 text-xs text-error">
      <span>{message}</span>
    </div>
  );
}

export default function EmployeeProfileModal({ employee, onEdit, refreshKey = 0 }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [sectionErrors, setSectionErrors] = useState({});

  const setSectionError = useCallback((section, message) => {
    setSectionErrors(e => ({ ...e, [section]: message }));
  }, []);

  useEffect(() => {
    setActiveTab('profile');
    setSectionErrors({});
  }, [employee?.id]);

  const relationTabs = READONLY_TABS.map(id => ({
    id,
    label: TAB_LABELS[id],
    icon: TAB_ICONS[id],
    content: <RelationTable employeeId={employee?.id} section={id} refreshKey={refreshKey} title={TAB_LABELS[id]} onError={(msg) => setSectionError(id, msg)} />,
  }));

  const tabs = employee ? [
    {
      id: 'profile',
      label: '201 Profile',
      icon: User,
      content: (
        <div className="space-y-5">
          <div>
            <h4 className="font-display font-semibold text-xs uppercase tracking-wide text-muted mb-3">Personal Information</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <div><dt className="mono-label">Full Name</dt><dd className="text-ink mt-0.5 font-medium">{employee.fullName}</dd></div>
              <div><dt className="mono-label">Birth Date</dt><dd className="font-mono text-ink mt-0.5">{employee.birthDate || '—'}</dd></div>
              <div><dt className="mono-label">Gender</dt><dd className="text-ink mt-0.5">{employee.gender || '—'}</dd></div>
              <div><dt className="mono-label">Civil Status</dt><dd className="text-ink mt-0.5">{employee.civilStatus || '—'}</dd></div>
              <div className="col-span-2"><dt className="mono-label">Address</dt><dd className="text-ink mt-0.5">{employee.address || '—'}</dd></div>
            </dl>
          </div>

          <div className="border-t border-line pt-4">
            <h4 className="font-display font-semibold text-xs uppercase tracking-wide text-muted mb-3">Employment Details</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <div><dt className="mono-label">Employee No</dt><dd className="font-mono mt-0.5">{employee.employeeNumber}</dd></div>
              <div><dt className="mono-label">Status</dt><dd className="mt-0.5"><span className={`badge ${badgeTone(employee.status)}`}>{employee.status}</span></dd></div>
              <div><dt className="mono-label">Department</dt><dd className="text-ink mt-0.5">{employee.department}</dd></div>
              <div><dt className="mono-label">Position</dt><dd className="text-ink mt-0.5">{employee.position}</dd></div>
              <div><dt className="mono-label">Salary Grade</dt><dd className="font-mono text-ink mt-0.5">{employee.sg}</dd></div>
              <div><dt className="mono-label">Date Hired</dt><dd className="font-mono text-ink mt-0.5">{employee.hired}</dd></div>
            </dl>
          </div>

          <div className="border-t border-line pt-4">
            <h4 className="font-display font-semibold text-xs uppercase tracking-wide text-muted mb-3">Contact Information</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <div><dt className="mono-label">Email</dt><dd className="font-mono text-ink mt-0.5">{employee.email || '—'}</dd></div>
              <div><dt className="mono-label">Contact No.</dt><dd className="font-mono text-ink mt-0.5">{employee.contact || '—'}</dd></div>
            </dl>
          </div>
        </div>
      ),
    },
    {
      id: 'payslip',
      label: 'Payslip',
      icon: Wallet,
      content: <PayslipPanel employeeId={employee.id} refreshKey={refreshKey} />,
    },
    ...relationTabs,
  ] : [];

  return (
    <div className="h-full flex flex-col min-h-[560px]">
      {employee ? (
        <>
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-line shrink-0">
            <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent font-display font-bold flex items-center justify-center shrink-0" aria-hidden="true">
              {initialsOf(employee.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-sm text-ink truncate">{employee.fullName}</p>
              <p className="text-xs text-muted truncate">{employee.position}</p>
            </div>
            <span className="mono-label text-xs">{employee.employeeNumber}</span>
          </div>

          <div className="flex flex-1 min-h-0 gap-4">
            <nav className="w-[200px] shrink-0 border-r border-line pr-3 overflow-auto" role="tablist" aria-label="Employee profile sections">
              <div className="space-y-0.5">
                {tabs.map(t => {
                  const Icon = t.icon;
                  return (
                     <button
                      key={t.id}
                      type="button"
                      role="tab"
                      id={`tab-${t.id}`}
                      aria-selected={activeTab === t.id}
                      aria-controls={`panel-${t.id}`}
                      onClick={() => { setActiveTab(t.id); setSectionErrors({}); }}
                      className="sidebar-link w-full"
                      aria-current={activeTab === t.id ? 'page' : undefined}
                    >
                      {Icon && <Icon size={16} aria-hidden="true" />}
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="flex-1 min-w-0 overflow-auto" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
              {sectionErrors[activeTab] && <SectionError message={sectionErrors[activeTab]} />}
              {tabs.find(t => t.id === activeTab)?.content}
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-line shrink-0">
            <button type="button" className="btn btn-ghost gap-2 flex-1" onClick={() => onEdit?.(employee)}>
              <Edit size={16} />
              Edit Profile
            </button>
            <button type="button" className="btn btn-ghost gap-2 flex-1" onClick={() => setActiveTab('history')}>
              <HistoryIcon size={16} />
              History
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-center py-12">
          <p className="text-sm text-muted max-w-48">Employee data not available.</p>
        </div>
      )}
    </div>
  );
}