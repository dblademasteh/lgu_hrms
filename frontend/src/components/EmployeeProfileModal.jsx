import React, { useState, useEffect, useRef } from 'react';
import { Edit, History as HistoryIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import Tabs from './Tabs.jsx';
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
    { key: 'balance', label: 'Balance', get: r => dash(r.balance) },
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
    { key: 'basicPay', label: 'Basic Pay', get: r => peso(r.basicPay) },
    { key: 'allowances', label: 'Allowances', get: r => peso(r.allowances) },
    { key: 'deductions', label: 'Deductions', get: r => peso(r.deductions) },
    { key: 'netPay', label: 'Net Pay', get: r => peso(r.netPay) },
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
    { key: 'amount', label: 'Amount', get: r => peso(r.amount) },
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
      departmentsApi.list().then(r => r?.data ?? r).catch(() => []),
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

function RelationTable({ employeeId, section, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [employeeId, section, refreshKey]);

  if (loading) return <p className="text-sm text-muted py-6 text-center">Loading records…</p>;
  if (error) return <p className="text-sm text-error py-6 text-center">Failed to load records.</p>;
  if (!rows.length) return <p className="text-sm text-muted py-6 text-center">No records on file.</p>;

  const cols = RELATION_COLUMNS[section];
  if (!cols) return <p className="text-sm text-muted py-6 text-center">{rows.length} record(s) on file.</p>;
  return (
    <div className="overflow-auto max-h-[40vh]">
      <table className="data-table text-sm">
        <thead><tr className="text-[10px] uppercase tracking-wide text-muted">{cols.map(c => <th key={c.key} className="text-left">{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="hover:bg-accent/5">
              {cols.map(c => <td key={c.key} className="text-sm">{c.get(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
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

  if (loading) return <p className="text-sm text-muted py-6 text-center">Loading payslip…</p>;
  if (error) return <p className="text-sm text-error py-6 text-center">Failed to load payslip.</p>;
  if (!items.length) return <p className="text-sm text-muted py-6 text-center">No payroll records on file.</p>;

  const latest = items[0];
  const period = latest.run?.period?.name ?? latest.run?.runDate?.slice(0, 10) ?? 'Latest run';
  return (
    <div className="max-h-[35vh] overflow-auto">
      <p className="mono-label mb-3">{period}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div><dt className="mono-label">Basic Pay</dt><dd className="font-mono mt-0.5">{peso(latest.basicPay)}</dd></div>
        <div><dt className="mono-label">Allowances</dt><dd className="font-mono mt-0.5">{peso(latest.allowances)}</dd></div>
        <div><dt className="mono-label">Deductions</dt><dd className="font-mono mt-0.5">{peso(latest.deductions)}</dd></div>
        <div><dt className="mono-label">Net Pay</dt><dd className="font-mono mt-0.5 font-semibold">{peso(latest.netPay)}</dd></div>
      </dl>
    </div>
  );
}

// Scrollable tab bar with navigation buttons
function ScrollableTabBar({ tabs, active, onChange }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      setCanScrollLeft(scrollRef.current.scrollLeft > 0);
      setCanScrollRight(
        scrollRef.current.scrollLeft + scrollRef.current.clientWidth < scrollRef.current.scrollWidth - 4
      );
    }
  };

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [tabs, active]);

  const scrollBy = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction * 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className={`btn btn-ghost p-2 w-8 h-8 absolute left-0 top-1/2 -translate-y-1/2 z-10 ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => scrollBy(-1)}
        aria-label="Scroll tabs left"
      >
        <ChevronLeft size={16} />
      </button>
      <div
        ref={scrollRef}
        className="tabbar overflow-x-auto scrollbar-hide"
        role="tablist"
        aria-label="Employee detail sections"
        onScroll={updateScrollButtons}
      >
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            className={`tab ${active === t.id ? 'tab-active' : ''} whitespace-nowrap flex-shrink-0`}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`btn btn-ghost p-2 w-8 h-8 absolute right-0 top-1/2 -translate-y-1/2 z-10 ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => scrollBy(1)}
        aria-label="Scroll tabs right"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default function EmployeeProfileModal({ employee, onEdit, refreshKey = 0 }) {
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    setActiveTab('profile');
  }, [employee?.id]);

  const relationTabs = READONLY_TABS.map(id => ({
    id,
    label: {
      history: 'Employment History',
      appointments: 'Appointments', leave: 'Leave', leaveCredits: 'Leave Credits',
      attendance: 'Attendance', payroll: 'Payroll', performance: 'Performance',
      training: 'Training', loans: 'Loans',
    }[id],
    content: <RelationTable employeeId={employee?.id} section={id} refreshKey={refreshKey} />,
  }));

  const tabs = employee ? [
    {
      id: 'profile',
      label: '201 Profile',
      content: (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm max-h-[40vh] overflow-auto">
          <div><dt className="mono-label">Employee No</dt><dd className="font-mono mt-0.5">{employee.employeeNumber}</dd></div>
          <div><dt className="mono-label">Status</dt><dd className="mt-0.5"><span className={`badge ${badgeTone(employee.status)}`}>{employee.status}</span></dd></div>
          <div><dt className="mono-label">Department</dt><dd className="text-ink mt-0.5">{employee.department}</dd></div>
          <div><dt className="mono-label">Salary Grade</dt><dd className="font-mono text-ink mt-0.5">{employee.sg}</dd></div>
          <div><dt className="mono-label">Date Hired</dt><dd className="font-mono text-ink mt-0.5">{employee.hired}</dd></div>
          <div><dt className="mono-label">Email</dt><dd className="font-mono text-ink mt-0.5">{employee.email || '—'}</dd></div>
          <div><dt className="mono-label">Contact</dt><dd className="font-mono text-ink mt-0.5">{employee.contact || '—'}</dd></div>
          <div><dt className="mono-label">Position</dt><dd className="text-ink mt-0.5">{employee.position}</dd></div>
        </dl>
      ),
    },
    {
      id: 'payslip',
      label: 'Payslip',
      content: <PayslipPanel employeeId={employee.id} refreshKey={refreshKey} />,
    },
    ...relationTabs,
  ] : [];

  return (
    <div className="p-4 h-full flex flex-col min-h-[560px]">
      {employee ? (
        <>
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent font-display font-bold flex items-center justify-center shrink-0" aria-hidden="true">
              {initialsOf(employee.name)}
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-ink truncate">{employee.fullName}</p>
              <p className="text-sm text-muted truncate">{employee.position}</p>
              <p className="mono-label mt-0.5">{employee.employeeNumber}</p>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 gap-4">
            <nav className="w-[220px] shrink-0 border-r border-line pr-2 overflow-auto">
              <div className="space-y-0.5">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${activeTab === t.id ? 'bg-accent/10 text-accent font-semibold' : 'text-muted hover:text-ink hover:bg-ink/[0.04]'}`}
                    aria-selected={activeTab === t.id}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </nav>

            <div className="flex-1 min-w-0 overflow-auto">
              {tabs.find(t => t.id === activeTab)?.content}
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-line shrink-0">
            <button type="button" className="btn btn-primary gap-2 flex-1" onClick={() => onEdit?.(employee)}>
              <Edit size={16} />
              Edit Profile
            </button>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => setActiveTab('history')}>
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