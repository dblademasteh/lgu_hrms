import { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout.jsx';
import { biometricApi } from '../api/biometric.js';
import { useToast } from '../components/Toast.jsx';
import { Clock, LogIn, LogOut, RefreshCw, Calendar, TrendingUp, UserCheck, TimerOff, Fingerprint, Trash2, Plus, ShieldCheck } from 'lucide-react';
import { badgeTone } from '../data/mock.js';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export default function AttendancePortal() {
  const toast = useToast();
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  // Public kiosk mode state
  const [kioskEmployeeNumber, setKioskEmployeeNumber] = useState('');
  const [kioskTenantCode, setKioskTenantCode] = useState('default');
  const [kioskMode, setKioskMode] = useState(false);

  // Biometric enrollment state
  const [credentials, setCredentials] = useState([]);
  const [credentialsLoading, setCredentialsLoading] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollDeviceName, setEnrollDeviceName] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const formatTime = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  const loadToday = async () => {
    setLoading(true);
    try {
      const data = await biometricApi.getTodayAttendance();
      setToday(data.data?.record || null);
    } catch (e) {
      toast(e.response?.data?.error?.message || 'Failed to load attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await biometricApi.getMyAttendance(month);
      setHistory(data.data?.records || []);
    } catch (e) {
      toast(e.response?.data?.error?.message || 'Failed to load history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadToday();
  }, []);

  useEffect(() => {
    loadHistory();
  }, [month]);

  const handlePunch = async (type) => {
    setPunching(true);
    try {
      const res = await biometricApi.punch(type);
      const data = res.data;
      toast(data?.message || `${type === 'IN' ? 'Punched in' : 'Punched out'} successfully`, 'success');
      loadToday();
      loadHistory();
    } catch (e) {
      const msg = e.response?.data?.error?.message || 'Punch failed';
      toast(msg, 'error');
    } finally {
      setPunching(false);
    }
  };

  const handlePublicPunch = async (type) => {
    if (!kioskEmployeeNumber.trim()) {
      toast('Enter employee number', 'error');
      return;
    }
    setPunching(true);
    try {
      const res = await biometricApi.publicPunch(kioskEmployeeNumber.trim(), type, kioskTenantCode.trim() || undefined);
      const data = res.data;
      toast(data?.message || `${type === 'IN' ? 'Punched in' : 'Punched out'} successfully`, 'success');
      setToday(data?.record || null);
    } catch (e) {
      const msg = e.response?.data?.error?.message || 'Public punch failed';
      toast(msg, 'error');
    } finally {
      setPunching(false);
    }
  };

  const loadCredentials = async () => {
    setCredentialsLoading(true);
    try {
      const data = await biometricApi.getCredentials();
      setCredentials(data.data?.credentials || []);
    } catch (e) {
      toast(e.response?.data?.error?.message || 'Failed to load biometric credentials', 'error');
    } finally {
      setCredentialsLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const credentialId = `cred_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const publicKey = `publicKey_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const res = await biometricApi.enroll(credentialId, publicKey, enrollDeviceName.trim() || undefined);
      toast('Fingerprint enrolled successfully', 'success');
      setShowEnrollModal(false);
      setEnrollDeviceName('');
      loadCredentials();
    } catch (e) {
      toast(e.response?.data?.error?.message || 'Enrollment failed', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  const confirmDeleteCredential = async () => {
    if (!deleteTarget) return;
    try {
      await biometricApi.removeCredential(deleteTarget.credentialId);
      toast('Credential removed', 'success');
      setDeleteTarget(null);
      loadCredentials();
    } catch (e) {
      toast(e.response?.data?.error?.message || 'Failed to remove credential', 'error');
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const isPunchedIn = today?.timeIn && !today?.timeOut;
  const isPunchedOut = today?.timeIn && today?.timeOut;
  const canPunchIn = !today?.timeIn || isPunchedOut;
  const hoursToday = useMemo(() => {
    if (!today?.timeIn || !today?.timeOut) return '0.0';
    const diff = (new Date(today.timeOut) - new Date(today.timeIn)) / (1000 * 60 * 60);
    return diff.toFixed(1);
  }, [today]);

  const stats = useMemo(() => {
    const totalDays = history.length;
    const punchedIn = history.filter(a => a.timeIn).length;
    const punchedOut = history.filter(a => a.timeOut).length;
    const totalHours = history.reduce((sum, a) => sum + (a.hours || 0), 0).toFixed(1);
    const onTime = history.filter(a => a.remark === 'On time' || a.remark === 'Punched in').length;
    const late = history.filter(a => a.remark === 'Tardiness').length;
    return { totalDays, punchedIn, punchedOut, totalHours, onTime, late };
  }, [history]);

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Clock size={20} className="text-accent" />
            Attendance Portal
          </h1>
          <p className="text-sm text-muted mt-0.5">Biometric check-in/out and daily time records</p>
        </div>
        <button className="btn btn-ghost btn-sm gap-2" onClick={() => setKioskMode(m => !m)}>
          <Fingerprint size={14} />
          {kioskMode ? 'Hide Kiosk' : 'Kiosk Mode'}
        </button>
      </div>

      {kioskMode && (
        <div className="card p-6 mb-6 border-accent/30">
          <h2 className="font-display font-semibold text-ink mb-4">Public Biometric Punch</h2>
          <p className="text-sm text-muted mb-4">Use this for biometric device integration or public kiosk. No login required.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Employee Number</label>
              <input
                className="input"
                value={kioskEmployeeNumber}
                onChange={e => setKioskEmployeeNumber(e.target.value)}
                placeholder="e.g. 000123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Tenant Code</label>
              <input
                className="input"
                value={kioskTenantCode}
                onChange={e => setKioskTenantCode(e.target.value)}
                placeholder="default"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                className="btn btn-primary gap-2"
                onClick={() => handlePublicPunch('IN')}
                disabled={punching}
              >
                {punching ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <LogIn size={16} />}
                Punch In
              </button>
              <button
                className="btn btn-outline gap-2"
                onClick={() => handlePublicPunch('OUT')}
                disabled={punching}
              >
                {punching ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent" /> : <LogOut size={16} />}
                Punch Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-ink flex items-center gap-2">
            <ShieldCheck size={16} className="text-accent" />
            Enrolled Fingerprint Devices
          </h3>
          <button className="btn btn-primary btn-sm gap-2" onClick={() => setShowEnrollModal(true)}>
            <Plus size={14} /> Enroll New
          </button>
        </div>
        {credentialsLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
          </div>
        ) : credentials.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">No fingerprint devices enrolled</p>
        ) : (
          <div className="space-y-2">
            {credentials.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-bg rounded-lg border border-line">
                <div>
                  <p className="font-medium text-ink text-sm">{c.deviceName || 'Unnamed Device'}</p>
                  <p className="text-xs text-muted">Enrolled {new Date(c.enrolledAt).toLocaleDateString()}</p>
                </div>
                <button className="btn btn-ghost btn-xs text-error gap-1" onClick={() => setDeleteTarget(c)}>
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-display font-semibold text-ink mb-4">Today&apos;s Status</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          ) : today ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <span className="mono-label">Time In</span>
                  <div className="text-lg font-semibold text-ink">{formatTime(today.timeIn)}</div>
                </div>
                <div>
                  <span className="mono-label">Time Out</span>
                  <div className="text-lg font-semibold text-ink">{formatTime(today.timeOut)}</div>
                </div>
                <div>
                  <span className="mono-label">Hours</span>
                  <div className="text-lg font-semibold text-ink">{hoursToday}</div>
                </div>
                <div>
                  <span className="mono-label">Remark</span>
                  <div><span className={`badge ${badgeTone(today.remark)}`}>{today.remark || '—'}</span></div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-primary gap-2"
                  onClick={() => handlePunch('IN')}
                  disabled={punching || loading || !canPunchIn}
                >
                  {punching ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <LogIn size={16} />}
                  {isPunchedOut ? 'Punch In (New)' : 'Punch In'}
                </button>
                <button
                  className="btn btn-outline gap-2"
                  onClick={() => handlePunch('OUT')}
                  disabled={punching || loading || !isPunchedIn}
                >
                  {punching ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent" /> : <LogOut size={16} />}
                  Punch Out
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted mb-4">No record yet for today</p>
              <button
                className="btn btn-primary gap-2"
                onClick={() => handlePunch('IN')}
                disabled={punching || loading}
              >
                {punching ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <LogIn size={16} />}
                Punch In
              </button>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-ink mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" />
            Monthly Summary
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Total Days', value: stats.totalDays, icon: Calendar },
              { label: 'Punched In', value: stats.punchedIn, icon: UserCheck },
              { label: 'Punched Out', value: stats.punchedOut, icon: LogOut },
              { label: 'Total Hours', value: stats.totalHours, icon: TimerOff },
              { label: 'On Time', value: stats.onTime, icon: UserCheck },
              { label: 'Tardiness', value: stats.late, icon: TimerOff },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                <span className="text-sm text-muted flex items-center gap-2">
                  <stat.icon size={14} />
                  {stat.label}
                </span>
                <span className="font-semibold text-ink">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-ink flex items-center gap-2">
            <Calendar size={16} />
            Attendance History
          </h3>
          <label className="flex items-center gap-2">
            <span className="mono-label">Month</span>
            <input
              type="month"
              className="input w-auto"
              value={month}
              onChange={e => setMonth(e.target.value)}
            />
          </label>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th className="text-right">Hours</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto"></div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted">No attendance records for this month</td>
                </tr>
              ) : (
                history.map(a => (
                  <tr key={a.id}>
                    <td className="font-mono">{a.date ? new Date(a.date).toISOString().slice(0, 10) : '—'}</td>
                    <td className="font-mono">{formatTime(a.timeIn)}</td>
                    <td className="font-mono">{formatTime(a.timeOut)}</td>
                    <td className="font-mono text-right">{(a.hours || 0).toFixed(1)}</td>
                    <td><span className={`badge ${badgeTone(a.remark)}`}>{a.remark || '—'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showEnrollModal} onClose={() => { setShowEnrollModal(false); setEnrollDeviceName(''); }} title="Enroll Fingerprint Device" footer={
        <>
          <button type="button" className="btn" onClick={() => { setShowEnrollModal(false); setEnrollDeviceName(''); }}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={enrolling} onClick={handleEnroll}>
            {enrolling ? 'Enrolling...' : 'Enroll'}
          </button>
        </>
      }>
        <div className="space-y-4">
          <p className="text-sm text-muted">Enroll a new fingerprint device for biometric attendance. Follow your device instructions to capture the fingerprint template.</p>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Device Name (optional)</label>
            <input className="input" value={enrollDeviceName} onChange={e => setEnrollDeviceName(e.target.value)} placeholder="e.g. Left Thumb Scanner" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDeleteCredential} title="Remove biometric device" message={`Remove enrolled device "${deleteTarget?.deviceName || 'Unnamed Device'}"? This will prevent future fingerprint punches from this device.`} confirmLabel="Remove" danger />
    </Layout>
  );
}
