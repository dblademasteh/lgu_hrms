import { useCallback, useEffect, useState } from 'react';
import { leaveApi } from '../api/leave.js';
import { payrollApi } from '../api/payroll.js';
import { appointmentsApi } from '../api/appointments.js';
import { vacancyApi } from '../api/vacancy.js';
import { listApplicants } from '../api/recruitment.js';
import { bonusApi } from '../api/bonus.js';
import { loansApi } from '../api/loans.js';
import { notifications as fallbackNotifications } from '../data/mock.js';

const READ_KEY = 'lgu-notif-read';
const DISMISSED_KEY = 'lgu-notif-dismissed';
export const INAPP_KEY = 'lgu-notif-inapp';

function loadIds(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

function saveIds(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* storage unavailable — ids stay in memory for the session */
  }
}

function timeAgo(iso) {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Live notification feed derived from existing APIs:
 * - Pending leave requests
 * - DRAFT payroll runs
 * - Temporary/expiring appointments
 * - New vacancies published
 * - New applicants in recruitment
 * - Bonuses pending approval
 * - Loans pending approval
 * Read + dismissed ids persist in localStorage so state survives remounts.
 * Falls back to the static mock rows when every source fails (offline/dev).
 */
export function useNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [leaveRes, runsRes, apptRes, vacancyRes, applicantRes, bonusRes, loanRes] = await Promise.allSettled([
          leaveApi.listRequests(),
          payrollApi.listRuns(),
          appointmentsApi.list(),
          vacancyApi.list({ status: 'OPEN' }),
          listApplicants({ status: 'NEW' }),
          bonusApi.list(),
          loansApi.list(),
        ]);
        if (cancelled) return;
        const built = [];
        
        // Existing sources: leave, payroll, appointments
        if (leaveRes.status === 'fulfilled') {
          const reqs = Array.isArray(leaveRes.value?.data) ? leaveRes.value.data : [];
          for (const r of reqs.filter(x => x?.status === 'PENDING').slice(0, 10)) {
            const emp = r.employee ?? {};
            const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || emp.employeeNumber || 'An employee';
            built.push({
              id: `leave-${r.id}`,
              title: 'Leave request pending',
              body: `${name} filed ${r.type} ${String(r.fromDate ?? '').slice(0, 10)} → ${String(r.toDate ?? '').slice(0, 10)}.`,
              time: timeAgo(r.createdAt),
              path: '/leave',
            });
          }
        }
        if (runsRes.status === 'fulfilled') {
          const runs = Array.isArray(runsRes.value?.data) ? runsRes.value.data : [];
          for (const run of runs.filter(x => x?.status === 'DRAFT').slice(0, 5)) {
            built.push({
              id: `payroll-${run.id}`,
              title: 'Payroll run ready for review',
              body: `${run.period?.name ?? 'A run'} · ${(run.items ?? []).length} item(s) awaiting approval.`,
              time: timeAgo(run.createdAt),
              path: '/payroll',
            });
          }
        }
        if (apptRes.status === 'fulfilled') {
          const list = Array.isArray(apptRes.value?.data) ? apptRes.value.data : [];
          for (const a of list.filter(x => /temporary|casual|contractual/i.test(x?.type ?? '')).slice(0, 5)) {
            built.push({
              id: `appt-${a.id}`,
              title: 'Non-permanent appointment',
              body: `${a.name ?? a.employee?.firstName ?? 'An appointee'} (${a.type}) — review renewal.`,
              time: timeAgo(a.createdAt),
              path: '/appointments',
            });
          }
        }
        
        // New source: vacancies
        if (vacancyRes.status === 'fulfilled') {
          const vacancies = Array.isArray(vacancyRes.value?.data?.items) ? vacancyRes.value.data.items : [];
          for (const v of vacancies.filter(x => x?.status === 'OPEN').slice(0, 5)) {
            const deptName = v.department?.name || v.departmentId || 'An open position';
            built.push({
              id: `vacancy-${v.id}`,
              title: 'New vacancy published',
              body: `${v.title} in ${deptName} - review plantilla alignment.`,
              time: timeAgo(v.createdAt),
              path: '/vacancy',
            });
          }
        }
        
        // New source: applicants
        if (applicantRes.status === 'fulfilled') {
          const applicants = Array.isArray(applicantRes.value?.items) ? applicantRes.value.items : [];
          for (const a of applicants.filter(x => x?.status === 'NEW').slice(0, 5)) {
            const posTitle = a.position?.title || a.appliedPositionId || 'an opening';
            built.push({
              id: `applicant-${a.id}`,
              title: 'New applicant applied',
              body: `${a.firstName} ${a.lastName} applied for ${posTitle}.`,
              time: timeAgo(a.createdAt),
              path: '/recruitment',
            });
          }
        }
        
        // New source: bonuses
        if (bonusRes.status === 'fulfilled') {
          const bonuses = Array.isArray(bonusRes.value?.data) ? bonusRes.value.data : [];
          for (const b of bonuses.filter(x => x?.status === 'PENDING').slice(0, 5)) {
            const emp = b.employee ?? {};
            const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || emp.employeeNumber || 'An employee';
            built.push({
              id: `bonus-${b.id}`,
              title: 'Bonus request pending approval',
              body: `${name}: ${b.amount} for ${b.type?.replace('_', ' ').toLowerCase() || 'bonus'}.`,
              time: timeAgo(b.createdAt),
              path: '/payroll',
            });
          }
        }
        
        // New source: loans
        if (loanRes.status === 'fulfilled') {
          const loans = Array.isArray(loanRes.value?.data) ? loanRes.value.data : [];
          for (const l of loans.filter(x => x?.status === 'PENDING').slice(0, 5)) {
            const emp = l.employee ?? {};
            const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || emp.employeeNumber || 'An employee';
            built.push({
              id: `loan-${l.id}`,
              title: 'Loan request pending approval',
              body: `${name}: ₱${Number(l.amount).toLocaleString()} (${l.type}) pending processing.`,
              time: timeAgo(l.createdAt),
              path: '/payroll',
            });
          }
        }
        
        const read = loadIds(READ_KEY);
        const dismissed = loadIds(DISMISSED_KEY);
        const withState = built
          .filter(n => !dismissed.has(n.id))
          .map(n => ({ ...n, unread: !read.has(n.id) }));
        if (withState.length > 0) {
          setItems(withState);
          setLive(true);
        } else if (built.length === 0) {
          // All sources failed or empty — show the static fallback rows.
          setItems(fallbackNotifications.map(n => ({ ...n, path: '/audit', unread: n.unread && !read.has(`mock-${n.id}`), id: `mock-${n.id}` })));
          setLive(false);
        } else {
          setItems([]);
          setLive(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((key, id) => {
    const set = loadIds(key);
    set.add(id);
    saveIds(key, set);
  }, []);

  const markRead = useCallback((id) => {
    persist(READ_KEY, id);
    setItems(ns => ns.map(n => (n.id === id ? { ...n, unread: false } : n)));
  }, [persist]);

  const markAllRead = useCallback(() => {
    // Collect ids from current state synchronously — setItems updaters run
    // later, so persisting inside them races the save (stored [] bug).
    const set = loadIds(READ_KEY);
    for (const n of items) set.add(n.id);
    saveIds(READ_KEY, set);
    setItems(ns => ns.map(n => ({ ...n, unread: false })));
  }, [items]);

  const dismissAll = useCallback(() => {
    const set = loadIds(DISMISSED_KEY);
    for (const n of items) set.add(n.id);
    saveIds(DISMISSED_KEY, set);
    setItems([]);
  }, [items]);

  return { items, loading, live, markRead, markAllRead, dismissAll };
}

/** Reads the Settings → Notifications → In-app toggle (defaults ON). */
export function useInAppEnabled() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(INAPP_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    const onStorage = e => {
      if (e.key === INAPP_KEY) setEnabled(e.newValue !== 'false');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return enabled;
}
