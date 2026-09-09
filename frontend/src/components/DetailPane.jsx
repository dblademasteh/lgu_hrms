import React, { useState } from 'react';
import Tabs from './Tabs.jsx';
import Modal from './Modal.jsx';
import { badgeTone } from '../data/mock.js';
import { employeeSectionsApi } from '../api/employeeSections.js';

const initialsOf = name => name.split(' ').map(p => p[0]).slice(0, 2).join('');
const peso = n => `\u20B1 ${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const d10 = v => (v ? String(v).slice(0, 10) : '\u2014');
const dash = v => (v ?? v === 0 ? String(v) : '\u2014');

/** Generic table renderer per relation section. */
const RELATION_COLUMNS = {
  history: [
    { key: 'position', label: 'Position', get: r => dash(r.position?.title ?? r.positionId) },
    { key: 'dept', label: 'Dept', get: r => dash(r.department?.name ?? r.departmentId) },
    { key: 'startDate', label: 'From', get: r => d10(r.startDate) },
    { key: 'endDate', label: 'To', get: r => (r.endDate ? d10(r.endDate) : 'Present') },
  ],
  appointments: [
    { key: 'type', label: 'Type', get: r => dash(r.type) },
    { key: 'itemNumber', label: 'Item No', get: r => dash(r.itemNumber) },
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

const READONLY_TABS = ['appointments', 'leave', 'leaveCredits', 'attendance', 'payroll', 'performance', 'training', 'loans'];

function RelationTable({ employeeId, section, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    setError(false);
    employeeSectionsApi.list(employeeId, section)
      .then(r => setRows(r.data ?? r))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [employeeId, section, refreshKey]);

  if (loading) return <p className="text-sm text-muted py-4">Loading...</p>;
  if (error) return <p className="text-sm text-error py-4">Failed to load records.</p>;
  if (!rows.length) return <p className="text-sm text-muted py-2">No records on file.</p>;

  const cols = RELATION_COLUMNS[section];
  return (
    <div className="overflow-auto">
      <table className="data-table">
        <thead><tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              {cols.map(c => <td key={c.key}>{c.get(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DetailPane({ employee }) {
  const [payslipOpen, setPayslipOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const history = employee ? employmentHistory.filter(h => h.no === employee.employeeNumber) : [];
  const entry = employee ? ledgerEntries.find(l => l.employee.startsWith(employee.no)) : null;

  const relationTabs = READONLY_TABS.map(id => ({
    id,
    label: {
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
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
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
      id: 'history',
      label: 'Employment History',
      content: history.length ? (
        <table className="data-table">
          <thead><tr><th>Position</th><th>Dept</th><th>From</th><th>To</th></tr></thead>
          <tbody>
            {history.map(h => (
              <tr key={`${h.from}-${h.position}`}>
                <td className="font-medium">{h.position}</td>
                <td className="font-mono">{h.dept}</td>
                <td className="font-mono">{h.from}</td>
                <td className="font-mono">{h.to ?? 'Present'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="text-sm text-muted">No history records on file.</p>,
    },
    {
      id: 'payroll',
      label: 'Payroll Breakdown',
      content: <PayrollBreakdown onViewPayslip={() => setPayslipOpen(true)} />,
    },
    ...relationTabs,
  ] : [];

  return (
    <div className="card p-5 h-full flex flex-col">
      <h2 className="font-display font-semibold text-ink mb-4">Employee Profile</h2>
      {employee ? (
        <>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent font-display font-bold flex items-center justify-center shrink-0" aria-hidden="true">
              {initialsOf(employee.name)}
            </div>
             <div className="min-w-0">
               <p className="font-display font-semibold text-ink truncate">{employee.fullName}</p>
               <p className="text-sm text-muted truncate">{employee.position}</p>
               <p className="mono-label mt-0.5">{employee.employeeNumber}</p>
             </div>
          </div>

          <Tabs tabs={tabs} label="Employee detail sections" />

          <div className="flex gap-2 mt-auto pt-5">
            <button type="button" className="btn btn-primary flex-1">Edit Profile</button>
            <button type="button" className="btn btn-ghost">History</button>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-center py-12">
          <p className="text-sm text-muted max-w-48">Select an employee from the master list to view their profile.</p>
        </div>
      )}

      <Modal
        open={payslipOpen}
        onClose={() => setPayslipOpen(false)}
        title={`Payslip · ${employee?.fullName ?? ''}`}
        size="sm"
        footer={<button type="button" className="btn btn-primary" onClick={() => setPayslipOpen(false)}>Close</button>}
      >
        {employee && (
          <div>
            <p className="mono-label">{employee.employeeNumber} · {employee.position} · {employee.sg}</p>
            <table className="data-table mt-3">
              <thead><tr><th>Earnings</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                <tr><td>Gross Pay (latest run)</td><td className="font-mono text-right">{entry ? entry.gross : '—'}</td></tr>
              </tbody>
            </table>
            <table className="data-table mt-3">
              <thead><tr><th>Deductions</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {deductionLines.map(d => (
                  <tr key={d.label}><td>{d.label}</td><td className="font-mono text-right">{peso(d.amount)}</td></tr>
                ))}
                <tr><td className="font-semibold">Total</td><td className="font-mono text-right font-semibold">{peso(totalDeductions)}</td></tr>
              </tbody>
            </table>
            {entry && (
              <p className="text-sm mt-3 text-right">
                <span className="text-muted">Net Pay · </span>
                <span className="font-mono font-semibold">{entry.net}</span>
              </p>
            )}
            <p className="mono-label mt-3">Sample figures — payslip wires to the payroll API.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
