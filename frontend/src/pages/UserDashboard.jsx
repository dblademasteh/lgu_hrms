import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { useToast } from '../components/Toast.jsx';
import { badgeTone } from '../data/mock.js';
import { listEmployees } from '../api/employees.js';
import { payrollApi } from '../api/payroll.js';
import { leaveApi } from '../api/leave.js';
import { auditApi } from '../api/audit.js';

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

const kpiIcons = { employees: UsersIcon, payroll: WalletIcon, leave: CheckIcon, audit: ShieldIcon };

const peso = n => `₱ ${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function UserDashboard() {
  const toast = useToast();
  const [headcount, setHeadcount] = useState(0);
  const [deptBreakdown, setDeptBreakdown] = useState([]);
  const [runs, setRuns] = useState([]);
  const [pendingLeave, setPendingLeave] = useState(0);
  const [activity, setActivity] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ items = [], total = 0 }, runsRes, leaveRes, auditRes] = await Promise.all([
          listEmployees({ page: 1, limit: 200 }),
          payrollApi.listRuns(),
          leaveApi.listRequests().catch(() => ({ data: [] })),
          auditApi.list({ limit: 8 }).catch(() => ({ data: { data: [] } })),
        ]);
        setHeadcount(total || items.length);
        const byDept = new Map();
        for (const e of items) {
          const key = e.department?.code ?? '?';
          const entry = byDept.get(key) ?? { code: key, name: e.department?.name ?? key, count: 0 };
          entry.count += 1;
          byDept.set(key, entry);
        }
        const breakdown = [...byDept.values()].sort((a, b) => b.count - a.count);
        setDeptBreakdown(breakdown);
        const runList = Array.isArray(runsRes.data) ? runsRes.data : [];
        setRuns(runList.slice(0, 5));
        const reqs = Array.isArray(leaveRes.data) ? leaveRes.data : [];
        setPendingLeave(reqs.filter(r => r.status === 'PENDING').length);
        const logs = auditRes?.data?.data ?? auditRes?.data ?? [];
        setActivity((Array.isArray(logs) ? logs : []).slice(0, 8));
      } catch {
        setFailed(true);
        toast('Failed to load dashboard data', 'error');
      }
    })();
  }, []);

  const maxDept = Math.max(1, ...deptBreakdown.map(d => d.count));
  const kpis = [
    { title: 'Total Employees', value: headcount.toLocaleString(), sub: `${deptBreakdown.length} departments`, Icon: kpiIcons.employees },
    { title: 'Payroll Runs', value: String(runs.length), sub: runs[0]?.status ?? 'No runs', Icon: kpiIcons.payroll },
    { title: 'Pending Leave', value: String(pendingLeave), sub: 'Awaiting approval', Icon: kpiIcons.leave },
    { title: 'Recent Audit Events', value: String(activity.length), sub: 'Latest 8', Icon: kpiIcons.audit },
  ];
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
        {kpis.map(({ title, value, sub, Icon }) => (
          <div key={title} className="card stat p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">{title}</p>
              <span className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center" aria-hidden="true"><Icon /></span>
            </div>
            <p className="stat-value">{value}</p>
            <span className="mono-label">{sub}</span>
          </div>
        ))}
      </div>
      {failed && (
        <p className="text-sm text-error card p-4 mb-4">Some dashboard sections failed to load — check your role permissions.</p>
      )}

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
                {runs.map(r => {
                  const net = (r.items ?? []).reduce((s, i) => s + Number(i?.netPay ?? 0), 0);
                  return (
                    <tr key={r.id}>
                      <td className="font-medium">{r.period?.name ?? '—'}</td>
                      <td><span className={`badge ${badgeTone(r.status)}`}>{r.status}</span></td>
                      <td className="font-mono text-right">{peso(net)}</td>
                    </tr>
                  );
                })}
                {runs.length === 0 && (
                  <tr><td colSpan={3} className="text-muted text-sm">No payroll runs yet.</td></tr>
                )}
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
            {deptBreakdown.map(d => (
              <li key={d.code}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-ink"><span className="font-mono text-muted mr-2">{d.code}</span>{d.name}</span>
                  <span className="font-mono text-muted">{d.count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-line overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((d.count / maxDept) * 100)}%` }} />
                </div>
              </li>
            ))}
            {deptBreakdown.length === 0 && (
              <li className="text-muted text-sm">No employees on file.</li>
            )}
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
              <tr><th>User</th><th>Action</th><th>Date</th></tr>
            </thead>
            <tbody>
              {activity.map(a => (
                <tr key={a.id}>
                  <td className="font-mono">{a.user?.username ?? '—'}</td>
                  <td><span className={`badge ${badgeTone(a.action)}`}>{a.action}</span></td>
                  <td className="font-mono">{a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {activity.length === 0 && (
                <tr><td colSpan={3} className="text-muted text-sm">No recent activity.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
