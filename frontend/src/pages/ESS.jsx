import React, { useEffect, useState } from 'react';
import { Calendar, FileText, Clock, User, Check, CalendarDays, FileDown, TrendingUp, CreditCard } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { badgeTone } from '../data/mock.js';
import { getEssProfile, getEssPayslips, getEssLeaveRequests, createEssLeaveRequest, getEssAttendance } from '../api/ess.js';
import { useNotifications } from '../hooks/useNotifications.js';

const LEAVE_TYPES = [
  { value: 'VACATION', label: 'Vacation Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'MATERNITY', label: 'Maternity Leave' },
  { value: 'PATERNITY', label: 'Paternity Leave' },
  { value: 'SOLO_PARENT', label: 'Solo Parent Leave' },
  { value: 'STUDY', label: 'Service Study Leave' },
  { value: 'EMERGENCY', label: 'Emergency Leave' },
  { value: 'SPECIAL', label: 'Special Leave' },
];

const LEAVE_CREDITS_MAP = {
  vacation: 'VACATION',
  sick: 'SICK',
  special: 'SPECIAL',
};

export default function ESS(){
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [failed, setFailed] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'VACATION', fromDate: '', toDate: '', reason: '' });
  const { items: notifications } = useNotifications();

  useEffect(()=>{
    Promise.allSettled([
      getEssProfile(),
      getEssPayslips(),
      getEssLeaveRequests(),
      getEssAttendance('2026-09'),
    ]).then(([p, ps, lr, at]) => {
      if (p.status === 'fulfilled') setProfile(p.value);
      if (ps.status === 'fulfilled') setPayslips(ps.value ?? []);
      if (lr.status === 'fulfilled') setLeaves(lr.value ?? []);
      if (at.status === 'fulfilled') setAttendance(at.value ?? []);
      if ([p, ps, lr, at].some(r => r.status === 'rejected')) {
        setFailed(true);
        toast('Some ESS sections failed to load (link your account to an employee record).', 'error');
      }
    });
  },[]);

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
      const created = await createEssLeaveRequest({ ...leaveForm, days });
      setLeaves(l => [created, ...l]);
      setLeaveOpen(false);
      setLeaveForm({ type: 'VACATION', fromDate: '', toDate: '', reason: '' });
      toast('Leave request filed.', 'success');
    } catch (err) {
      const msg = err?.response?.data?.error?.message;
      toast(msg || 'Failed to file leave', 'error');
    }
  };

  // Calculate leave balance
  const getLeaveBalance = (type) => {
    const credits = profile?.leaveCredits || {};
    const used = leaves.filter(l => l.type === type && l.status !== 'DENIED').length;
    const total = credits[LEAVE_CREDITS_MAP[type.toLowerCase()]] || 15;
    return total - used;
  };

  const totalPayslip = payslips.reduce((sum, p) => sum + Number(p.netPay || 0), 0);
  const totalHours = attendance.reduce((sum, a) => sum + (a.hours || 0), 0);

  return (
    <Layout title="Employee Self-Service">
      <div className="flex items-end justify-between gap-4 mb-4">
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

      {failed && !profile && (
        <div className="card p-4 mb-4 border border-error/20 bg-error/5">
          <p className="text-sm text-error-ink font-medium">Your account is not linked to an employee record — ask HR to link it on the Users &amp; Roles page.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Net Pay</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">₱{totalPayslip.toLocaleString()}</p>
          <p className="text-xs text-muted">Total payslips</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Hours Worked</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{totalHours.toFixed(1)}h</p>
          <p className="text-xs text-muted">This month</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Leave Balance</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{leaves.filter(l => l.status === 'PENDING').length}</p>
          <p className="text-xs text-muted">Pending requests</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Check className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Notifications</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{notifications.filter(n => n.unread).length}</p>
          <p className="text-xs text-muted">Unread alerts</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Profile Section */}
        {profile && (
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center text-accent font-display text-xl font-bold">
              {profile.firstName?.[0]}{profile.lastName?.[0]}
            </div>
            <div>
              <h2 className="font-display font-semibold text-ink text-lg mb-1">
                {profile.firstName} {profile.middleName ? profile.middleName[0] + '.' : ''} {profile.lastName}
              </h2>
              <p className="text-sm text-muted">{profile.employeeNumber}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted block mb-1">Department</span>
              {profile.department?.name || '—'}
            </div>
            <div>
              <span className="text-muted block mb-1">Position</span>
              {profile.position?.title || '—'}
            </div>
            <div>
              <span className="text-muted block mb-1">HR Status</span>
              <span className={`badge ${badgeTone(profile.status)}`}>{profile.status}</span>
            </div>
            <div>
              <span className="text-muted block mb-1">SG Grade</span>
              {profile.position?.salaryGrade ? `SG-${profile.position.salaryGrade}` : '—'}
            </div>
          </div>
        </div>
        )}

        {/* Leave Credits Section */}
        <div className="card p-4">
          <h2 className="font-display text-lg font-semibold text-ink mb-3 flex items-center gap-2">
            <CalendarDays size={18} className="text-accent" />
            Leave Credits
          </h2>
          <div className="grid gap-2">
            {Object.entries(LEAVE_CREDITS_MAP).map(([key, type]) => {
              const balance = getLeaveBalance(key.toUpperCase());
              const credits = profile?.leaveCredits?.[LEAVE_CREDITS_MAP[key.toUpperCase()]] || 15;
              const used = leaves.filter(l => l.type === key.toUpperCase() && l.status !== 'DENIED').length;
              return (
                <div key={key} className="flex items-center justify-between p-2 rounded bg-bg/50">
                  <span className="text-sm font-medium text-ink">{type.replace('_', ' ')}</span>
                  <div className="text-right">
                    <span className="font-mono font-semibold text-ink">{balance} left</span>
                    <span className="text-xs text-muted"> ({credits} total, {used} used)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payslips Section */}
        <div className="card p-4">
          <h2 className="font-display text-lg font-semibold text-ink mb-3 flex items-center gap-2">
            <FileDown className="text-accent" size={18} />
            Payslips
          </h2>
          <div className="text-xs text-muted mb-2">Showing {payslips.length} payslip(s)</div>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead><tr><th>Period</th><th>Net Pay</th></tr></thead>
              <tbody>
                {payslips.map(p=>(
                  <tr key={p.id}>
                    <td>{p.run?.period?.name}</td>
                    <td className="font-mono">₱{Number(p.netPay).toLocaleString()}</td>
                  </tr>
                ))}
                {payslips.length === 0 && (
                  <tr><td colSpan={2} className="text-muted text-sm">No payslips available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leave Requests Section */}
        <div className="card p-4">
          <h2 className="font-display text-lg font-semibold text-ink mb-3 flex items-center gap-2">
            <Calendar className="text-accent" size={18} />
            Leave Requests
          </h2>
          {leaves.length ? (
            <ul className="space-y-2">
              {leaves.map(l=>(
                <li key={l.id} className="card p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-ink">{l.type.replace('_', ' ')}</span>
                    <span className="text-xs text-muted"> · {new Date(l.fromDate).toLocaleDateString()} – {new Date(l.toDate).toLocaleDateString()}</span>
                  </div>
                  <span className={`badge ${badgeTone(l.status)}`}>{l.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted text-sm mt-2">No leave requests on file.</p>
          )}
        </div>

        {/* Attendance Section */}
        <div className="card p-4 md:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink mb-3 flex items-center gap-2">
            <Clock className="text-accent" size={18} />
            Attendance (September 2026)
          </h2>
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead><tr><th>Date</th><th>Time In</th><th>Time Out</th><th>Hours</th></tr></thead>
              <tbody>
                {attendance.map(a=>(
                  <tr key={a.id}>
                    <td>{new Date(a.date).toLocaleDateString()}</td>
                    <td>{a.timeIn ? new Date(a.timeIn).toLocaleTimeString() : '—'}</td>
                    <td>{a.timeOut ? new Date(a.timeOut).toLocaleTimeString() : '—'}</td>
                    <td className="font-mono">{a.hours?.toFixed(1) || '0.0'}h</td>
                  </tr>
                ))}
                {attendance.length === 0 && (
                  <tr><td colSpan={4} className="text-muted text-sm">No attendance records this month.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* File Leave Modal */}
      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="File Leave Request"
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setLeaveOpen(false)}>Cancel</button>
            <button type="submit" form="ess-leave-form" className="btn btn-primary">File Request</button>
          </>
        }
      >
        <form id="ess-leave-form" onSubmit={fileLeave} className="space-y-4">
          <div>
            <label htmlFor="ess-type" className="block text-sm font-medium text-ink mb-1">Leave Type *</label>
            <select id="ess-type" className="input" value={leaveForm.type} onChange={e => setLeaveForm(f => ({ ...f, type: e.target.value }))}>
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
        </form>
      </Modal>
    </Layout>
  );
}
