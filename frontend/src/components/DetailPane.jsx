import React, { useState } from 'react';
import Tabs from './Tabs.jsx';
import Modal from './Modal.jsx';
import { departments, badgeTone, employmentHistory, ledgerEntries, deductionLines } from '../data/mock.js';

const initialsOf = name => name.split(' ').map(p => p[0]).slice(0, 2).join('');
const peso = n => `₱ ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const totalDeductions = deductionLines.reduce((s, d) => s + d.amount, 0);

function PayrollBreakdown({ onViewPayslip }) {
  return (
    <div>
      <div className="overflow-auto mb-4">
        <table className="data-table">
          <thead><tr><th>Deduction</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {deductionLines.map(d => (
              <tr key={d.label}>
                <td>{d.label}</td>
                <td className="font-mono text-right">{peso(d.amount)}</td>
              </tr>
            ))}
            <tr>
              <td className="font-semibold">Total Deductions</td>
              <td className="font-mono text-right font-semibold">{peso(totalDeductions)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-primary" onClick={onViewPayslip}>View Payslip</button>
    </div>
  );
}

export default function DetailPane({ employee }) {
  const [payslipOpen, setPayslipOpen] = useState(false);
  const dept = employee && departments.find(d => d.code === employee.dept);
  const history = employee ? employmentHistory.filter(h => h.no === employee.no) : [];
  const entry = employee ? ledgerEntries.find(l => l.employee.startsWith(employee.no)) : null;

  const tabs = employee ? [
    {
      id: 'profile',
      label: 'Profile',
      content: (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div><dt className="mono-label">Department</dt><dd className="text-ink mt-0.5">{dept ? dept.name : employee.dept}</dd></div>
          <div><dt className="mono-label">Status</dt><dd className="mt-0.5"><span className={`badge ${badgeTone(employee.status)}`}>{employee.status}</span></dd></div>
          <div><dt className="mono-label">Salary Grade</dt><dd className="font-mono text-ink mt-0.5">{employee.sg}</dd></div>
          <div><dt className="mono-label">Date Hired</dt><dd className="font-mono text-ink mt-0.5">{employee.hired}</dd></div>
          <div><dt className="mono-label">Email</dt><dd className="font-mono text-ink mt-0.5">{employee.email || '—'}</dd></div>
          <div><dt className="mono-label">Contact</dt><dd className="font-mono text-ink mt-0.5">{employee.contact || '—'}</dd></div>
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
              <p className="font-display font-semibold text-ink truncate">{employee.name}</p>
              <p className="text-sm text-muted truncate">{employee.position}</p>
              <p className="mono-label mt-0.5">{employee.no}</p>
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
        title={`Payslip · ${employee?.name ?? ''}`}
        size="sm"
        footer={<button type="button" className="btn btn-primary" onClick={() => setPayslipOpen(false)}>Close</button>}
      >
        {employee && (
          <div>
            <p className="mono-label">{employee.no} · {employee.position} · {employee.sg}</p>
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
