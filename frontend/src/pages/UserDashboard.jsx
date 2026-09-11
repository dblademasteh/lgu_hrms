import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useToast } from '../components/Toast.jsx';
import { badgeTone } from '../data/mock.js';
import { useAuthStore } from '../stores/authStore.js';
import { listEmployees } from '../api/employees.js';
import { payrollApi } from '../api/payroll.js';
import { leaveApi } from '../api/leave.js';
import { auditApi } from '../api/audit.js';
import { reportsApi } from '../api/reports.js';
import { vacancyApi } from '../api/vacancy.js';
import { plantillaApi } from '../api/plantilla.js';
import { appointmentsApi } from '../api/appointments.js';
import { listApplicants } from '../api/recruitment.js';
import { attendanceApi } from '../api/attendance.js';
import { disqualificationApi } from '../api/disqualifications.js';
import { listPerformanceReviews } from '../api/performance.js';
import { listPrograms, listEnrollments } from '../api/training.js';
import { bonusApi } from '../api/bonus.js';
import { loansApi } from '../api/loans.js';
import { designationApi } from '../api/designation.js';

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
  const role = useAuthStore(s => s.user?.role);
  const can = (...allowed) => allowed.includes(role);
  const canEmployees = can('ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD');
  const canPayroll = can('ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER');
  const canReports = can('ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'AUDITOR');
  const canLeave = can('ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD');
  const canAudit = can('ADMIN', 'AUDITOR');
  const canRsp = can('ADMIN', 'HR_MANAGER');
  const canPerformance = can('ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD');
  const canAttendance = can('ADMIN', 'HR_MANAGER', 'DEPARTMENT_HEAD');

  const [headcount, setHeadcount] = useState(0);
  const [deptBreakdown, setDeptBreakdown] = useState([]);
  const [runs, setRuns] = useState([]);
  const [pendingLeave, setPendingLeave] = useState(0);
  const [leaveQueue, setLeaveQueue] = useState([]);
  const [activity, setActivity] = useState([]);
  const [paySummary, setPaySummary] = useState(null);
  const [vacancies, setVacancies] = useState([]);
  const [vacanciesTotal, setVacanciesTotal] = useState(0);
  const [applicants, setApplicants] = useState([]);
  const [applicantsTotal, setApplicantsTotal] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [reviewsPending, setReviewsPending] = useState([]);
  const [reviewsPendingCount, setReviewsPendingCount] = useState(0);
  const [enrollActive, setEnrollActive] = useState(0);
  const [programsCount, setProgramsCount] = useState(0);
  const [attendanceToday, setAttendanceToday] = useState(0);
  const [dibar, setDibar] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loansTotal, setLoansTotal] = useState(0);
  const [designations, setDesignations] = useState([]);
  const [plantillaVacant, setPlantillaVacant] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const get = async (fn) => {
        try {
          const r = await fn();
          return r?.data ?? r;
        } catch {
          return null;
        }
      };
      const today = new Date().toISOString().slice(0, 10);
      try {
        const [
          empRes, runsRes, leaveRes, auditRes, summaryRes, vacRes,
          applRes, apptRes, perfRes, enrollRes, progRes, attRes,
          dibarRes, bonusRes, loanRes, desigRes, plantRes,
        ] = await Promise.all([
          canEmployees ? get(() => listEmployees({ page: 1, limit: 200 })) : null,
          canPayroll ? get(() => payrollApi.listRuns()) : null,
          canLeave ? get(() => leaveApi.listRequests()) : null,
          canAudit ? get(() => auditApi.list({ limit: 8 })) : null,
          canReports ? get(() => reportsApi.payrollSummary()) : null,
          canRsp ? get(() => vacancyApi.list({ page: 1, limit: 10, status: 'OPEN' })) : null,
          canRsp ? get(() => listApplicants({ page: 1, limit: 10 })) : null,
          canRsp ? get(() => appointmentsApi.list()) : null,
          canPerformance ? get(() => listPerformanceReviews({ page: 1, limit: 50 })) : null,
          get(() => listEnrollments({ page: 1, limit: 50 })),
          get(() => listPrograms({ page: 1, limit: 50 })),
          canAttendance ? get(() => attendanceApi.list({ date: today })) : null,
          canRsp ? get(() => disqualificationApi.getActive()) : null,
          canPayroll ? get(() => bonusApi.list({ page: 1, limit: 10 })) : null,
          canPayroll ? get(() => loansApi.list({ page: 1, limit: 10 })) : null,
          canRsp ? get(() => designationApi.list({ page: 1, limit: 10 })) : null,
          canRsp ? get(() => plantillaApi.list({ page: 1, limit: 5, status: 'VACANT' })) : null,
        ]);
        if (cancelled) return;
        const itemsOf = (v) => {
          if (!v) return [];
          if (Array.isArray(v)) return v;
          if (Array.isArray(v.items)) return v.items;
          if (Array.isArray(v.records)) return v.records;
          if (Array.isArray(v.data)) return v.data;
          return [];
        };
        if (empRes) {
          const items = empRes.items ?? [];
          setHeadcount(empRes.total ?? items.length);
          const byDept = new Map();
          for (const e of items) {
            const key = e.department?.code ?? '?';
            const entry = byDept.get(key) ?? { code: key, name: e.department?.name ?? key, count: 0 };
            entry.count += 1;
            byDept.set(key, entry);
          }
          setDeptBreakdown([...byDept.values()].sort((a, b) => b.count - a.count));
        }
        setRuns(itemsOf(runsRes).slice(0, 5));
        const reqs = itemsOf(leaveRes);
        const pending = reqs.filter(r => r.status === 'PENDING');
        setPendingLeave(pending.length);
        setLeaveQueue(pending.slice(0, 5));
        setActivity(itemsOf(auditRes?.data ?? auditRes).slice(0, 8));
        if (summaryRes?.data) setPaySummary(summaryRes.data);
        if (vacRes) {
          setVacancies(itemsOf(vacRes).slice(0, 5));
          setVacanciesTotal(vacRes.total ?? itemsOf(vacRes).length);
        }
        if (applRes) {
          setApplicants(itemsOf(applRes).slice(0, 5));
          setApplicantsTotal(applRes.total ?? itemsOf(applRes).length);
        }
        setAppointments(itemsOf(apptRes).slice(0, 5));
        if (plantRes) setPlantillaVacant(plantRes.total ?? itemsOf(plantRes).length);
        setDesignations(itemsOf(desigRes).slice(0, 5));
        if (perfRes) {
          const all = itemsOf(perfRes);
          const pend = all.filter(r => r.status === 'DRAFT' || r.status === 'SUBMITTED');
          setReviewsPending(pend.slice(0, 5));
          setReviewsPendingCount(pend.length);
        }
        if (enrollRes) setEnrollActive(itemsOf(enrollRes).filter(e => e.status === 'ENROLLED').length);
        if (progRes) setProgramsCount(progRes.total ?? itemsOf(progRes).length);
        setAttendanceToday(itemsOf(attRes).length);
        setDibar(itemsOf(dibarRes).slice(0, 5));
        setBonuses(itemsOf(bonusRes).slice(0, 5));
        if (loanRes) {
          setLoans(itemsOf(loanRes).slice(0, 5));
          setLoansTotal(loanRes.total ?? itemsOf(loanRes).length);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          toast('Failed to load dashboard data', 'error');
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const maxDept = Math.max(1, ...deptBreakdown.map(d => d.count));
  const fullName = (e) => e ? [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') : '—';
  const todayLabel = new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const kpis = [];
  if (canEmployees) kpis.push({ title: 'Total Employees', value: headcount.toLocaleString(), sub: `${deptBreakdown.length} departments`, Icon: kpiIcons.employees });
  if (canPayroll) kpis.push({ title: 'Payroll Runs', value: String(runs.length), sub: runs[0]?.status ?? 'No runs', Icon: kpiIcons.payroll });
  if (canLeave) kpis.push({ title: 'Pending Leave', value: String(pendingLeave), sub: 'Awaiting approval', Icon: kpiIcons.leave });
  if (canAudit) kpis.push({ title: 'Recent Audit Events', value: String(activity.length), sub: 'Latest 8', Icon: kpiIcons.audit });
  if (canRsp) kpis.push({ title: 'Open Vacancies', value: String(vacanciesTotal), sub: `${plantillaVacant} vacant plantilla`, Icon: kpiIcons.employees });
  if (canRsp) kpis.push({ title: 'Applicants', value: String(applicantsTotal), sub: 'Recruitment pipeline', Icon: kpiIcons.leave });
  if (canAttendance) kpis.push({ title: 'Present Today', value: String(attendanceToday), sub: 'DTR records', Icon: kpiIcons.payroll });
  if (canPayroll) kpis.push({ title: 'Active Loans', value: String(loansTotal), sub: `${bonuses.length} recent bonuses`, Icon: kpiIcons.audit });
  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Overview</h1>
          <p className="text-sm text-muted mt-0.5">Workforce, payroll and compliance at a glance · {role ?? 'STAFF'}</p>
        </div>
        <span className="mono-label">As of {todayLabel}</span>
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
        {canPayroll && (
        <div className="card p-5 lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink">Payroll Runs</h3>
            <Link to="/payroll" className="mono-label text-accent hover:underline">Open payroll →</Link>
          </div>
          {paySummary?.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg border border-line p-3"><p className="mono-label">Headcount</p><p className="font-display font-bold text-ink">{paySummary.data.headcount ?? '—'}</p></div>
              <div className="rounded-lg border border-line p-3"><p className="mono-label">Basic</p><p className="font-mono text-sm text-ink">{peso(paySummary.data.totalBasicPay)}</p></div>
              <div className="rounded-lg border border-line p-3"><p className="mono-label">Deductions</p><p className="font-mono text-sm text-ink">{peso(paySummary.data.totalDeductions)}</p></div>
              <div className="rounded-lg border border-line p-3"><p className="mono-label">Net</p><p className="font-mono text-sm font-bold text-accent">{peso(paySummary.data.totalNetPay)}</p></div>
            </div>
          )}
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
                  <tr><td colSpan={3} className="text-muted text-sm">No payroll runs yet. <Link to="/payroll" className="text-accent hover:underline">Create one →</Link></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {canEmployees && (
        <div className="card p-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink">Headcount</h3>
            <Link to="/employees" className="mono-label text-accent hover:underline">Directory →</Link>
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
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {canLeave && (
        <div className="card p-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink">Leave Queue</h3>
            <Link to="/leave" className="mono-label text-accent hover:underline">{pendingLeave} pending →</Link>
          </div>
          <ul className="space-y-2">
            {leaveQueue.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm border border-line rounded-lg px-3 py-2">
                <span className="min-w-0"><span className="block truncate text-ink font-medium">{fullName(r.employee)}</span><span className="mono-label">{r.type} · {r.days}d</span></span>
                <span className={`badge ${badgeTone(r.status)} shrink-0`}>{r.status}</span>
              </li>
            ))}
            {leaveQueue.length === 0 && <li className="text-muted text-sm">No pending requests.</li>}
          </ul>
        </div>
        )}

        {canRsp && (
        <div className="card p-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink">RSP Funnel</h3>
            <Link to="/vacancy" className="mono-label text-accent hover:underline">{vacanciesTotal} open →</Link>
          </div>
          <ul className="space-y-2 text-sm">
            {vacancies.map(v => (
              <li key={v.id} className="flex items-center justify-between gap-2 border border-line rounded-lg px-3 py-2">
                <span className="truncate text-ink font-medium">{v.title}</span>
                <span className={`badge ${badgeTone(v.status)} shrink-0`}>{v.status}</span>
              </li>
            ))}
            {vacancies.length === 0 && <li className="text-muted text-sm">No open vacancies.</li>}
          </ul>
          <div className="mt-3 pt-3 border-t border-line">
            <p className="mono-label mb-2">Latest applicants · {applicantsTotal}</p>
            <ul className="space-y-1.5 text-sm">
              {applicants.map(a => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink">{a.firstName} {a.lastName}</span>
                  <span className={`badge ${badgeTone(a.status)} shrink-0`}>{a.status}</span>
                </li>
              ))}
              {applicants.length === 0 && <li className="text-muted text-sm">No applicants yet.</li>}
            </ul>
            <div className="flex gap-3 mt-2">
              <Link to="/recruitment" className="text-xs text-accent hover:underline">Recruitment →</Link>
              <Link to="/appointments" className="text-xs text-accent hover:underline">Appointments ({appointments.length}) →</Link>
              <Link to="/plantilla" className="text-xs text-accent hover:underline">Plantilla ({plantillaVacant} vacant) →</Link>
            </div>
          </div>
        </div>
        )}

        {canPerformance && (
        <div className="card p-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink">Performance & L&D</h3>
            <Link to="/performance" className="mono-label text-accent hover:underline">{reviewsPendingCount} pending →</Link>
          </div>
          <ul className="space-y-2 text-sm">
            {reviewsPending.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-2 border border-line rounded-lg px-3 py-2">
                <span className="truncate text-ink">{fullName(r.employee)} · {r.reviewYear}</span>
                <span className={`badge ${badgeTone(r.status)} shrink-0`}>{r.status}</span>
              </li>
            ))}
            {reviewsPending.length === 0 && <li className="text-muted text-sm">No pending reviews.</li>}
          </ul>
          <div className="mt-3 pt-3 border-t border-line text-sm text-muted">
            <p><span className="font-mono text-ink">{enrollActive}</span> active enrollments · <span className="font-mono text-ink">{programsCount}</span> programs</p>
            <Link to="/learning" className="text-xs text-accent hover:underline">Open Learning →</Link>
          </div>
          {canAttendance && (
            <div className="mt-2 text-sm text-muted"><span className="font-mono text-ink">{attendanceToday}</span> DTR records today · <Link to="/attendance" className="text-xs text-accent hover:underline">Attendance →</Link></div>
          )}
        </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {canPayroll && (
        <div className="card p-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink">Bonuses & Loans</h3>
            <Link to="/reports" className="mono-label text-accent hover:underline">Reports →</Link>
          </div>
          <p className="mono-label mb-2">Recent bonuses</p>
          <ul className="space-y-1.5 text-sm mb-3">
            {bonuses.map(b => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-ink">{b.title ?? b.type ?? 'Bonus'}</span>
                <span className="font-mono text-muted">{peso(b.amount)}</span>
              </li>
            ))}
            {bonuses.length === 0 && <li className="text-muted text-sm">No bonuses on file.</li>}
          </ul>
          <p className="mono-label mb-2">Recent loans · {loansTotal}</p>
          <ul className="space-y-1.5 text-sm">
            {loans.map(l => (
              <li key={l.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-ink">{fullName(l.employee)} · {l.type ?? 'Loan'}</span>
                <span className="font-mono text-muted">{peso(l.amount ?? l.principal)}</span>
              </li>
            ))}
            {loans.length === 0 && <li className="text-muted text-sm">No loans on file.</li>}
          </ul>
        </div>
        )}

        {canRsp && (
        <div className="card p-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink">Designations & DIBAR</h3>
            <Link to="/disqualifications" className="mono-label text-accent hover:underline">DIBAR →</Link>
          </div>
          <ul className="space-y-2 text-sm mb-3">
            {designations.map(d => (
              <li key={d.id} className="flex items-center justify-between gap-2 border border-line rounded-lg px-3 py-2">
                <span className="truncate text-ink">{d.orderNumber} · {fullName(d.employee)}</span>
                <span className={`badge ${badgeTone(d.status)} shrink-0`}>{d.status}</span>
              </li>
            ))}
            {designations.length === 0 && <li className="text-muted text-sm">No recent designations. <Link to="/designation" className="text-accent hover:underline">Open →</Link></li>}
          </ul>
          <p className="mono-label mb-2">Active disqualifications · {dibar.length}</p>
          <ul className="space-y-1.5 text-sm">
            {dibar.map(d => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-ink">{fullName(d.employee)}</span>
                <span className={`badge ${badgeTone(d.type)} shrink-0`}>{d.isBarred ? 'BARRED' : d.type}</span>
              </li>
            ))}
            {dibar.length === 0 && <li className="text-muted text-sm">No active records.</li>}
          </ul>
        </div>
        )}

        <div className="card p-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink">Shortcuts</h3>
            <span className="mono-label">Modules</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {canEmployees && <Link to="/employees" className="rounded-lg border border-line px-3 py-2 hover:border-accent hover:text-accent transition">Employees</Link>}
            {canRsp && <Link to="/vacancy" className="rounded-lg border border-line px-3 py-2 hover:border-accent hover:text-accent transition">Vacancy</Link>}
            {canRsp && <Link to="/recruitment" className="rounded-lg border border-line px-3 py-2 hover:border-accent hover:text-accent transition">Recruitment</Link>}
            {canPerformance && <Link to="/performance" className="rounded-lg border border-line px-3 py-2 hover:border-accent hover:text-accent transition">Performance</Link>}
            {canPayroll && <Link to="/payroll" className="rounded-lg border border-line px-3 py-2 hover:border-accent hover:text-accent transition">Payroll</Link>}
            {canLeave && <Link to="/leave" className="rounded-lg border border-line px-3 py-2 hover:border-accent hover:text-accent transition">Leave</Link>}
            {canAttendance && <Link to="/attendance" className="rounded-lg border border-line px-3 py-2 hover:border-accent hover:text-accent transition">Attendance</Link>}
            {canReports && <Link to="/reports" className="rounded-lg border border-line px-3 py-2 hover:border-accent hover:text-accent transition">Reports</Link>}
            {canAudit && <Link to="/audit" className="rounded-lg border border-line px-3 py-2 hover:border-accent hover:text-accent transition">Audit Trail</Link>}
            <Link to="/ess" className="rounded-lg border border-line px-3 py-2 hover:border-accent hover:text-accent transition">Self-Service</Link>
            <Link to="/learning" className="rounded-lg border border-line px-3 py-2 hover:border-accent hover:text-accent transition">Learning</Link>
            <Link to="/help" className="rounded-lg border border-line px-3 py-2 hover:border-accent hover:text-accent transition">Help</Link>
          </div>
        </div>
      </div>

      {canAudit && (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-ink">Recent Activity</h3>
          <Link to="/audit" className="mono-label text-accent hover:underline">Audit trail →</Link>
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
      )}
    </Layout>
  );
}
