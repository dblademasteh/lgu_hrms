import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, FileText, Clock, User, Check, CalendarDays, FileDown, TrendingUp, CreditCard, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { openHtmlInNewTab } from '../lib/print.js';
import { badgeTone } from '../data/mock.js';
import { getEssProfile, getEssPayslips, getEssLeaveRequests, createEssLeaveRequest, getEssAttendance, getEssPayslipPrint } from '../api/ess.js';
import { useNotifications } from '../hooks/useNotifications.js';
import { useAuthStore } from '../stores/authStore.js';
import { manilaDateLabel, manilaTimeLabel, manilaMonthKey } from '../lib/time.js';

const LEAVE_TYPES = [
  { value: 'VACATION', label: 'Vacation Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'SPECIAL_PRIVILEGE', label: 'Special Privilege Leave' },
  { value: 'MATERNITY', label: 'Maternity Leave' },
  { value: 'PATERNITY', label: 'Paternity Leave' },
  { value: 'SOLO_PARENT', label: 'Solo Parent Leave' },
  { value: 'SPECIAL_WOMEN', label: 'Special Leave for Women' },
  { value: 'COMPENSATORY', label: 'Compensatory Leave' },
];

const LEAVE_TYPE_LABELS = {
  VACATION: 'Vacation',
  SICK: 'Sick',
  SPECIAL_PRIVILEGE: 'Special Privilege',
  SPECIAL_WOMEN: 'Special Women',
  COMPENSATORY: 'Compensatory',
  MATERNITY: 'Maternity',
  PATERNITY: 'Paternity',
  SOLO_PARENT: 'Solo Parent',
};

const LEAVE_CREDITS_MAP = {
  VACATION: 'Vacation Leave',
  SICK: 'Sick Leave',
  SPECIAL_PRIVILEGE: 'Special Privilege',
  SPECIAL_WOMEN: 'Special Women',
  COMPENSATORY: 'Compensatory',
  MATERNITY: 'Maternity',
  PATERNITY: 'Paternity',
  SOLO_PARENT: 'Solo Parent',
};

function formatCurrency(n) {
  return '₱' + Number(n || 0).toLocaleString();
}

function statusBadge(status) {
  const tone = badgeTone(status);
  return <span className={`badge ${tone}`}>{status.replace(/_/g, ' ')}</span>;
}

// Only PENDING + RECOMMENDED reserve days from the balance — APPROVED leaves
// are already decremented server-side, and CANCELLED/DENIED consume nothing.
function usedLeaveDays(leaves, type) {
  return leaves
    .filter(l => l.type === type && (l.status === 'PENDING' || l.status === 'RECOMMENDED'))
    .reduce((sum, l) => sum + (l.days || 0), 0);
}

export default function ESS() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceMonth, setAttendanceMonth] = useState(manilaMonthKey());
  const [loading, setLoading] = useState(true);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [showAllLeaves, setShowAllLeaves] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'VACATION', fromDate: '', toDate: '', reason: '', isHalfDay: false, isLwop: false, isTerminal: false, advanceNoticed: false, documentUrl: '' });
  const { items: notifications } = useNotifications();
  const role = useAuthStore(s => s.user?.role);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      getEssProfile(),
      getEssPayslips(),
      getEssLeaveRequests(),
      getEssAttendance(attendanceMonth),
    ]).then(([p, ps, lr, at]) => {
      if (cancelled) return;
      if (p.status === 'fulfilled') setProfile(p.value);
      if (ps.status === 'fulfilled') setPayslips(ps.value ?? []);
      if (lr.status === 'fulfilled') setLeaves(lr.value ?? []);
      if (at.status === 'fulfilled') setAttendance(at.value ?? []);
      const failed = [p, ps, lr, at].some(r => r.status === 'rejected');
      if (failed) toast('Some sections failed to load. Ask HR to link your account.', 'error');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [attendanceMonth]);

  const fileLeave = async e => {
    e.preventDefault();
    if (!leaveForm.fromDate || !leaveForm.toDate) {
      toast('Pick a start and end date.', 'error');
      return;
    }
    if (leaveForm.toDate < leaveForm.fromDate) {
      toast('End date cannot be before the start date.', 'error');
      return;
    }
    const days = Math.round((new Date(leaveForm.toDate) - new Date(leaveForm.fromDate)) / 86400000) + 1;
    try {
      setSubmitting(true);
      const created = await createEssLeaveRequest({ ...leaveForm, days });
      setLeaves(l => [created, ...l]);
      setLeaveOpen(false);
      setLeaveForm({ type: 'VACATION', fromDate: '', toDate: '', reason: '', isHalfDay: false, isLwop: false, isTerminal: false, advanceNoticed: false, documentUrl: '' });
      toast('Leave request filed.', 'success');
    } catch (err) {
      const msg = err?.response?.data?.error?.message;
      toast(msg || 'Failed to file leave', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const creditMap = useMemo(() => {
    const map = {};
    (profile?.leaveCredits || []).forEach(c => { map[c.type] = c; });
    return map;
  }, [profile]);

  const leaveBalance = (type) => {
    const row = creditMap[type];
    const total = row?.balance ?? 0;
    const used = usedLeaveDays(leaves, type);
    return Math.max(total - used, 0);
  };

  const totalPayslip = useMemo(() => payslips.reduce((sum, p) => sum + Number(p.netPay || 0), 0), [payslips]);
  const totalHours = useMemo(() => attendance.reduce((sum, a) => sum + (a.hours || 0), 0), [attendance]);
  const pendingLeaves = useMemo(() => leaves.filter(l => l.status === 'PENDING').length, [leaves]);
  const unreadNotifications = useMemo(() => notifications.filter(n => n.unread).length, [notifications]);

  const monthLabel = useMemo(() => {
    const [y, m] = attendanceMonth.split('-').map(Number);
    return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [attendanceMonth]);

  const changeMonth = (delta) => {
    const [y, m] = attendanceMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setAttendanceMonth(key);
  };

  const initials = useMemo(() => {
    if (!profile) return '';
    return `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase();
  }, [profile]);

  return (
    <Layout title="Employee Self-Service" maxWidth="max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <User size={20} className="text-accent" />
            Employee Self-Service
          </h1>
          <p className="text-sm text-muted mt-0.5">Payslips, leave filing, and attendance</p>
        </div>
        <button type="button" className="btn btn-primary gap-2" onClick={() => setLeaveOpen(true)}>
          <Calendar size={18} />
          File Leave
        </button>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4"><div className="skeleton h-16 w-full" /></div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="text-accent" size={16} />
                <span className="text-xs mono-label uppercase text-muted">Net Pay</span>
              </div>
              <p className="font-display text-2xl font-bold text-ink">{formatCurrency(totalPayslip)}</p>
              <p className="text-xs text-muted">{payslips.length} payslip(s)</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-accent" size={16} />
                <span className="text-xs mono-label uppercase text-muted">Hours Worked</span>
              </div>
              <p className="font-display text-2xl font-bold text-ink">{totalHours.toFixed(1)}h</p>
              <p className="text-xs text-muted">{monthLabel}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="text-accent" size={16} />
                <span className="text-xs mono-label uppercase text-muted">Leave Balance</span>
              </div>
              <p className="font-display text-2xl font-bold text-ink">
                {Object.keys(LEAVE_CREDITS_MAP).reduce((sum, type) => sum + leaveBalance(type), 0)}
              </p>
              <p className="text-xs text-muted">{pendingLeaves} pending request(s)</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="text-accent" size={16} />
                <span className="text-xs mono-label uppercase text-muted">Notifications</span>
              </div>
              <p className="font-display text-2xl font-bold text-ink">{unreadNotifications}</p>
              <p className="text-xs text-muted">Unread alerts</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {profile && (
              <div className="card p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center text-accent font-display text-xl font-bold">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display font-semibold text-ink text-lg truncate">
                      {profile.firstName} {profile.middleName ? profile.middleName[0] + '.' : ''} {profile.lastName}
                    </h2>
                    <p className="text-sm text-muted font-mono">{profile.employeeNumber}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted block mb-0.5">Department</span>
                    <span className="text-ink font-medium">{profile.department?.name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted block mb-0.5">Position</span>
                    <span className="text-ink font-medium">{profile.position?.title || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted block mb-0.5">Status</span>
                    <span className={`badge ${badgeTone(profile.status)}`}>{profile.status}</span>
                  </div>
                  <div>
                    <span className="text-muted block mb-0.5">Salary Grade</span>
                    <span className="text-ink font-medium">{profile.position?.salaryGrade ? `SG-${profile.position.salaryGrade}` : '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted block mb-0.5">Address</span>
                    <span className="text-ink font-medium">{profile.address || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted block mb-0.5">Contact</span>
                    <span className="text-ink font-medium">{profile.contactNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted block mb-0.5">Email</span>
                    <span className="text-ink font-medium">{profile.email || '—'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="card p-5">
              <h2 className="font-display text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                <CalendarDays size={18} className="text-accent" />
                Leave Credits
              </h2>
              <div className="grid gap-2">
                {Object.entries(LEAVE_CREDITS_MAP).map(([type, label]) => {
                  const row = creditMap[type];
                  const total = row?.balance ?? 0;
                  const used = usedLeaveDays(leaves, type);
                  const balance = Math.max(total - used, 0);
                  return (
                    <div key={type} className="flex items-center justify-between p-2.5 rounded bg-bg/50">
                      <span className="text-sm font-medium text-ink">{label}</span>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-ink">{balance}</span>
                        <span className="text-xs text-muted"> / {total} days</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="font-display text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                <FileDown className="text-accent" size={18} />
                Payslips
              </h2>
              {payslips.length === 0 ? (
                <p className="text-muted text-sm">No payslips available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table w-full">
                    <thead><tr><th>Period</th><th>Net Pay</th><th>Actions</th></tr></thead>
                    <tbody>
                      {payslips.map(p => (
                        <tr key={p.id}>
                          <td>{p.run?.period?.name || '—'}</td>
                          <td className="font-mono">{formatCurrency(p.netPay)}</td>
                          <td>
                            <button type="button" className="btn btn-ghost btn-sm gap-1" onClick={async () => {
                              try { await openHtmlInNewTab(getEssPayslipPrint(p.id)); } catch { toast('Payslip could not be opened', 'error'); }
                            }}>
                              <FileDown size={14} />
                              Print
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card p-5">
              <h2 className="font-display text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                <Calendar className="text-accent" size={18} />
                Leave Requests
              </h2>
              {leaves.length === 0 ? (
                <p className="text-muted text-sm">No leave requests on file.</p>
              ) : (
                <div className="space-y-2">
                  {leaves.slice(0, showAllLeaves ? leaves.length : 10).map(l => (
                    <div key={l.id} className="flex items-center justify-between p-3 rounded bg-bg/50">
                      <div>
                        <span className="text-sm font-medium text-ink">{LEAVE_TYPE_LABELS[l.type] || l.type.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-muted ml-2">
                          {manilaDateLabel(l.fromDate)} – {manilaDateLabel(l.toDate)}
                        </span>
                        {Number(l.days) > 0 && (
                          <span className="text-xs text-muted ml-2">({l.days} {Number(l.days) !== 1 ? 'days' : 'day'})</span>
                        )}
                      </div>
                      {statusBadge(l.status)}
                    </div>
                  ))}
                  {leaves.length > 10 && (
                    <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => setShowAllLeaves(s => !s)}>
                      {showAllLeaves ? 'Show fewer' : `Show all (${leaves.length})`}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="card p-5 md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
                  <Clock className="text-accent" size={18} />
                  Attendance
                </h2>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={14} /></button>
                  <span className="mono-label text-sm">{monthLabel}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={14} /></button>
                </div>
              </div>
              {attendance.length === 0 ? (
                <p className="text-muted text-sm">No attendance records for this month.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table w-full">
                    <thead><tr><th>Date</th><th>Time In</th><th>Time Out</th><th>Hours</th></tr></thead>
                    <tbody>
                      {attendance.map(a => (
                        <tr key={a.id}>
                          <td className="font-mono">{manilaDateLabel(a.date)}</td>
                          <td>{a.timeIn ? manilaTimeLabel(a.timeIn) : '—'}</td>
                          <td>{a.timeOut ? manilaTimeLabel(a.timeOut) : '—'}</td>
                          <td className="font-mono">{a.hours?.toFixed(1) || '0.0'}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="File Leave Request"
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => setLeaveOpen(false)} disabled={submitting}>
              <X size={16} />
              Cancel
            </button>
            <button type="submit" form="ess-leave-form" className="btn btn-primary gap-2" disabled={submitting}>
              <Check size={16} />
              {submitting ? 'Filing...' : 'File Request'}
            </button>
          </>
        }
      >
        <form id="ess-leave-form" onSubmit={fileLeave} className="space-y-4">
          <div>
            <label htmlFor="ess-type" className="block text-sm font-medium text-ink mb-1">Leave Type *</label>
            <select id="ess-type" className="select" value={leaveForm.type} onChange={e => setLeaveForm(f => ({ ...f, type: e.target.value }))}>
              {LEAVE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ess-from" className="block text-sm font-medium text-ink mb-1">From *</label>
              <input id="ess-from" type="date" className="input" value={leaveForm.fromDate} onChange={e => setLeaveForm(f => ({ ...f, fromDate: e.target.value }))} required />
            </div>
            <div>
              <label htmlFor="ess-to" className="block text-sm font-medium text-ink mb-1">To *</label>
              <input id="ess-to" type="date" className="input" value={leaveForm.toDate} onChange={e => setLeaveForm(f => ({ ...f, toDate: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label htmlFor="ess-reason" className="block text-sm font-medium text-ink mb-1">Reason</label>
            <textarea id="ess-reason" className="input" value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))} placeholder="Brief reason for the leave" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={leaveForm.isHalfDay} onChange={e => setLeaveForm(f => ({ ...f, isHalfDay: e.target.checked }))} />
              Half-day
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={leaveForm.isLwop} onChange={e => setLeaveForm(f => ({ ...f, isLwop: e.target.checked }))} />
              LWOP
            </label>
            {role !== 'EMPLOYEE' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="checkbox" checked={leaveForm.isTerminal} onChange={e => setLeaveForm(f => ({ ...f, isTerminal: e.target.checked }))} />
                Terminal
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={leaveForm.advanceNoticed} onChange={e => setLeaveForm(f => ({ ...f, advanceNoticed: e.target.checked }))} />
              5-day notice (VL)
            </label>
          </div>
          <div>
            <label htmlFor="ess-doc" className="block text-sm font-medium text-ink mb-1">Document URL (MC / cert)</label>
            <input id="ess-doc" className="input" value={leaveForm.documentUrl || ''} onChange={e => setLeaveForm(f => ({ ...f, documentUrl: e.target.value }))} placeholder="https://..." />
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
