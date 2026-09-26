import React, { useState, useEffect } from 'react';
import { Edit, History as HistoryIcon, Printer } from 'lucide-react';
import { TabsLegacy } from './Tabs.jsx';
import { badgeTone } from '../data/mock.js';
import { api } from '../api/client.js';
import { departmentsApi } from '../api/departments.js';
import { employeeSectionsApi } from '../api/employeeSections.js';

const initialsOf = name => (name ?? '').split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('') || '—';
const peso = n => `₱ ${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const d10 = v => (v ? String(v).slice(0, 10) : '—');
const dash = v => (v === 0 || v ? String(v) : '—');

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
    { key: 'timeIn', label: 'Time In', get: r => (r.timeIn ? String(r.timeIn).slice(11, 16) : '—') },
    { key: 'timeOut', label: 'Time Out', get: r => (r.timeOut ? String(r.timeOut).slice(11, 16) : '—') },
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
    { key: 'completedAt', label: 'Completed', get: r => (r.completedAt ? d10(r.completedAt) : '—') },
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
    const depMap = Object.fromEntries((Array.isArray(deps)?deps:[]).map(d => [d.id, d.code ? `${d.code} · ${d.name}` : d.name]));
    const posMap = Object.fromEntries((Array.isArray(poss)?poss:[]).map(p => [p.id, p.salaryGrade ? `${p.title} (SG ${p.salaryGrade})` : p.title]));
    refCache = { depMap, posMap };
  } catch { refCache = { depMap: {}, posMap: {} }; }
  return refCache;
}

function RelationTable({ employeeId, section, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!employeeId) { setLoading(false); setRows([]); return; }
    let cancelled = false;
    setLoading(true); setError(false);
    (async () => {
      try {
        const [res, { depMap, posMap }] = await Promise.all([employeeSectionsApi.list(employeeId, section), getRefMaps()]);
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
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [employeeId, section, refreshKey]);
  if (loading) return <div className="py-8 text-center text-sm text-muted">Loading…</div>;
  if (error) return <div className="py-8 text-center text-sm text-error">Failed to load records.</div>;
  if (!rows.length) return <div className="py-10 text-center text-sm text-muted">No records on file.</div>;
  const cols = RELATION_COLUMNS[section];
  if (!cols) return <div className="py-4 text-sm text-muted">{rows.length} record(s) on file.</div>;
  return (
    <div className="overflow-auto rounded-xl border border-line">
      <table className="data-table w-full">
        <thead className="bg-surface/70"><tr className="text-xs uppercase tracking-wide text-muted">{cols.map(c => <th key={c.key} className="p-3 text-left">{c.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">
          {rows.map((row,i)=>(
            <tr key={row.id ?? i} className="hover:bg-surface/60 transition-colors">
              {cols.map(c=> <td key={c.key} className="p-3 text-sm">{c.get(row)}</td>)}
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
    if (!employeeId) { setLoading(false); return; }
    let cancelled = false; setLoading(true); setError(false);
    employeeSectionsApi.list(employeeId,'payroll').then(r=>{ if(!cancelled) setItems(Array.isArray(r?.data??r)?r?.data??r:[]); }).catch(()=>{ if(!cancelled) setError(true); }).finally(()=>{ if(!cancelled) setLoading(false); });
    return ()=>{ cancelled=true; };
  }, [employeeId, refreshKey]);
  if (loading) return <div className="py-8 text-center text-sm text-muted">Loading…</div>;
  if (error) return <div className="py-8 text-center text-sm text-error">Failed to load payslip.</div>;
  if (!items.length) return <div className="py-10 text-center text-sm text-muted">No payroll records on file.</div>;
  const latest = items[0];
  const period = latest.run?.period?.name ?? latest.run?.runDate?.slice(0,10) ?? 'Latest run';
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-muted mb-3">{period}</div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {[
          ['Basic Pay', latest.basicPay],
          ['Allowances', latest.allowances],
          ['Deductions', latest.deductions],
          ['Net Pay', latest.netPay],
        ].map(([k,v])=>(
          <div key={k} className={k==='Net Pay'?'col-span-2':' '}>
            <dt className="text-xs text-muted">{k}</dt>
            <dd className={`font-mono mt-1 ${k==='Net Pay'?'text-lg font-semibold':''}`}>{peso(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function DetailPane({ employee, onEdit, refreshKey = 0 }) {
  const [activeTab, setActiveTab] = useState('201');
  useEffect(()=>{ setActiveTab('201'); }, [employee?.id]);

  const relationTabs = READONLY_TABS.map(id => ({
    id,
    label: { history:'Employment History', appointments:'Appointments', leave:'Leave', leaveCredits:'Leave Credits', attendance:'Attendance', payroll:'Payroll', performance:'Performance', training:'Training', loans:'Loans' }[id],
    content: <RelationTable employeeId={employee?.id} section={id} refreshKey={refreshKey} />,
  }));

  const tabs = employee ? [
    { id:'201', label:'201 File', content:(
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          {[
            ['Employee No', employee.employeeNumber,'font-mono'],
            ['Status', <span className={`badge ${badgeTone(employee.status)}`}>{employee.status}</span>,''],
            ['Department', employee.department,''],
            ['Salary Grade', employee.sg,'font-mono'],
            ['Date Hired', employee.hired,'font-mono'],
            ['Email', employee.email || '—','font-mono'],
            ['Contact', employee.contact || '—','font-mono'],
            ['Position', employee.position,''],
            ['Key Position', employee.raw?.keyPosition || '—',''],
          ].map(([k,v,cls])=>(
            <div key={k} className="flex justify-between gap-4 py-2 border-b border-line last:border-0">
              <span className="text-xs uppercase tracking-wide text-muted">{k}</span>
              <span className={`text-sm text-right ${cls||''}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-muted mb-3">Government IDs</div>
          <dl className="grid grid-cols-1 gap-2 text-sm">
            {[
              ['SSS No', employee.raw?.sssNumber],
              ['PhilHealth No', employee.raw?.philhealthNumber],
              ['Pag-IBIG No', employee.raw?.pagibigNumber],
              ['TIN No', employee.raw?.tinNumber],
            ].map(([k,v])=>v && <div key={k} className="flex justify-between py-2 border-b border-line last:border-0"><dt className="text-muted">{k}</dt><dd className="font-mono">{v}</dd></div>)}
          </dl>
          {!employee.raw?.sssNumber && !employee.raw?.philhealthNumber && !employee.raw?.pagibigNumber && !employee.raw?.tinNumber && <div className="text-sm text-muted py-4 text-center">No government IDs on file</div>}
        </div>
      </div>
    )},
    { id:'payslip', label:'Payslip', content: <PayslipPanel employeeId={employee.id} refreshKey={refreshKey} /> },
    ...relationTabs,
  ] : [];

  return (
    <div className="flex flex-col max-h-[70vh] overflow-auto">
      {employee ? (
        <>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent font-display font-bold flex items-center justify-center text-xl shrink-0">{initialsOf(employee.name)}</div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-lg truncate">{employee.fullName}</p>
              <p className="text-sm text-muted truncate">{employee.position}</p>
              <p className="mono-label mt-1">{employee.employeeNumber}</p>
            </div>
          </div>
          <TabsLegacy tabs={tabs} label="Employee detail sections" active={activeTab} onChange={setActiveTab} />
          <div className="flex gap-2 mt-6">
            <button className="btn btn-primary flex-1 h-8 text-xs font-medium" onClick={()=>onEdit?.(employee)}><Edit size={14}/> Edit</button>
            <button className="btn btn-secondary flex-1 h-8 text-xs font-medium" onClick={()=>window.print()}><Printer size={14}/> Print</button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-center py-16">
          <div>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-surface flex items-center justify-center mb-3">👤</div>
            <p className="font-medium">Select an employee</p>
            <p className="text-sm text-muted mt-1 max-w-56">Choose from the master list to view 201 profile and records.</p>
          </div>
        </div>
      )}
    </div>
  );
}
