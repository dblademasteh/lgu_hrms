import React from 'react';
import Layout from '../components/Layout.jsx';

/* Inline icons — stroke follows currentColor, so they inherit token colors */
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const WalletIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
);
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
);
const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>
);

const kpis = [
  { title: 'Total Employees', value: '1,248', change: '+12', Icon: UsersIcon },
  { title: 'Active Payroll Runs', value: '3', change: 'This month', Icon: WalletIcon },
  { title: 'Pending Approvals', value: '27', change: '-5', Icon: CheckIcon },
  { title: 'Audit Log Entries', value: '4,102', change: '+320', Icon: ShieldIcon },
];

const payrollRuns = [
  { period: 'Sep 1–15, 2026', status: 'Processing', badge: 'badge-accent', net: '₱ 18,420,500' },
  { period: 'Aug 16–31, 2026', status: 'Approved', badge: 'badge-success', net: '₱ 18,102,275' },
  { period: 'Aug 1–15, 2026', status: 'Posted', badge: '', net: '₱ 17,988,400' },
];

const headcount = [
  { code: 'PGO', name: "Governor's Office", count: 312 },
  { code: 'HEA', name: 'Health Services', count: 297 },
  { code: 'ENG', name: 'Engineering', count: 231 },
  { code: 'ACC', name: 'Accounting', count: 126 },
  { code: 'TRE', name: 'Treasury', count: 98 },
  { code: 'HR', name: 'Human Resources', count: 84 },
];
const maxHeadcount = Math.max(...headcount.map(d => d.count));

const activity = [
  { who: 'EMP001 · Dela Cruz', action: 'Payroll Approved', badge: 'badge-success', date: '2026-09-08' },
  { who: 'EMP042 · Santos', action: 'Leave Submitted', badge: 'badge-accent', date: '2026-09-07' },
  { who: 'EMP015 · Reyes', action: 'Profile Updated', badge: '', date: '2026-09-07' },
  { who: 'EMP007 · Mendoza', action: 'Overtime Filed', badge: 'badge-warning', date: '2026-09-06' },
];

function toneFor(change) {
  if (change.startsWith('+')) return 'badge-success';
  if (change.startsWith('-')) return 'badge-error';
  return '';
}

export default function UserDashboard() {
  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Overview</h1>
          <p className="text-sm text-muted mt-0.5">Workforce, payroll and compliance at a glance</p>
        </div>
        <span className="mono-label">As of Sep 9, 2026</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {kpis.map(({ title, value, change, Icon }) => (
          <div key={title} className="card stat p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">{title}</p>
              <span className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center" aria-hidden="true"><Icon /></span>
            </div>
            <p className="stat-value">{value}</p>
            <span className={`badge ${toneFor(change)}`}>{change}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card p-5 lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink">Payroll Runs</h3>
            <span className="mono-label">Latest periods</span>
          </div>
          <div className="overflow-auto">
            <table className="data-table">
              <thead>
                <tr><th>Period</th><th>Status</th><th className="text-right">Net Pay</th></tr>
              </thead>
              <tbody>
                {payrollRuns.map(r => (
                  <tr key={r.period}>
                    <td className="font-medium">{r.period}</td>
                    <td><span className={`badge ${r.badge}`}>{r.status}</span></td>
                    <td className="font-mono text-right">{r.net}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink">Headcount</h3>
            <span className="mono-label">By department</span>
          </div>
          <ul className="space-y-3">
            {headcount.map(d => (
              <li key={d.code}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-ink"><span className="font-mono text-muted mr-2">{d.code}</span>{d.name}</span>
                  <span className="font-mono text-muted">{d.count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-line overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((d.count / maxHeadcount) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-ink">Recent Activity</h3>
          <span className="mono-label">Audit trail</span>
        </div>
        <div className="overflow-auto max-h-80 rounded-lg border border-line">
          <table className="data-table">
            <thead>
              <tr><th>Employee</th><th>Action</th><th>Date</th></tr>
            </thead>
            <tbody>
              {activity.map(a => (
                <tr key={a.who + a.date}>
                  <td className="font-medium">{a.who}</td>
                  <td><span className={`badge ${a.badge}`}>{a.action}</span></td>
                  <td className="font-mono">{a.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
