import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import { biometricApi } from '../api/biometric.js';
import { useAuthStore } from '../stores/authStore.js';
import { Calendar, Clock, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { badgeTone } from '../data/mock.js';
import { useToast } from '../components/Toast.jsx';

export default function BiometricAttendance() {
  const toast = useToast();
  const user = useAuthStore(s => s.user);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [myAttendance, setMyAttendance] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    loadStatus();
    loadAttendance();
  }, []);

  useEffect(() => {
    if (month) {
      loadAttendance();
    }
  }, [month]);

  const loadStatus = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const response = await biometricApi.getMyAttendance(today);
      const record = response.data?.records?.[0] || null;
      setStatus(record);
    } catch (err) {
      if (err.response?.status === 404) {
        setStatus(null); // Not punched yet
      } else {
        toast('Failed to load attendance status', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      const response = await biometricApi.getMyAttendance(month);
      setMyAttendance(response.data?.records || []);
    } catch (err) {
      toast('Failed to load attendance records', 'error');
    }
  };

  const handlePunch = async (type) => {
    setPunchLoading(true);
    try {
      const response = await biometricApi.punch(type);
      toast(response.data.message || `${type === 'IN' ? 'Punched in' : 'Punched out'} successfully`, 'success');
      await loadStatus();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Punch failed';
      toast(msg, 'error');
    } finally {
      setPunchLoading(false);
    }
  };

  const isPunchedIn = status && !status.timeOut;
  const isPunchedOut = status && status.timeOut;
  const canPunchIn = !isPunchedIn || isPunchedOut;

  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const hours = status ? ((status.timeOut || new Date()) - status.timeIn) / (1000 * 60 * 60) : 0;

  // Calculate summary stats
  const summary = {
    totalDays: myAttendance.filter(a => a.date).length,
    punchedIn: myAttendance.filter(a => a.timeIn).length,
    punchedOut: myAttendance.filter(a => a.timeOut).length,
    totalHours: myAttendance.reduce((sum, a) => sum + (a.hours || 0), 0).toFixed(1),
    onTime: myAttendance.filter(a => a.remark === 'On time' || a.remark === 'Punched in').length,
    late: myAttendance.filter(a => a.remark === 'Tardiness').length,
  };

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Clock size={20} className="text-accent" />
            Biometric Attendance
          </h1>
          <p className="text-sm text-muted mt-0.5">Self-service punch in/out for employees</p>
        </div>
      </div>

      {/* Quick Status Card */}
      <div className="card p-6 mb-6">
        <h2 className="font-display font-semibold text-ink mb-4">Today's Status</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-bg rounded-lg">
              <p className="text-sm text-muted">Status</p>
              <p className="font-bold text-lg text-ink mt-1">
                {isPunchedIn && !isPunchedOut ? (
                  <span className="badge badge-success">IN - Not Out</span>
                ) : isPunchedOut ? (
                  <span className="badge badge-success">Completed</span>
                ) : (
                  <span className="badge badge-neutral">Not Punched</span>
                )}
              </p>
            </div>
            {status && (
              <>
                <div className="text-center p-4 bg-bg rounded-lg">
                  <p className="text-sm text-muted">Time In</p>
                  <p className="font-bold text-lg text-ink mt-1">{fmtTime(status.timeIn)}</p>
                </div>
                <div className="text-center p-4 bg-bg rounded-lg">
                  <p className="text-sm text-muted">Time Out / Hours</p>
                  <p className="font-bold text-lg text-ink mt-1">
                    {fmtTime(status.timeOut || '')} • {hours.toFixed(1)} hrs
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Punch Buttons */}
        <div className="flex gap-4 mt-6">
          {canPunchIn && !isPunchedOut && (
            <button
              onClick={() => handlePunch('IN')}
              disabled={punchLoading}
              className="btn btn-primary gap-2"
            >
              {punchLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : 'Punch In'}
            </button>
          )}
          {isPunchedIn && !isPunchedOut && (
            <button
              onClick={() => handlePunch('OUT')}
              disabled={punchLoading}
              className="btn btn-secondary gap-2"
            >
              {punchLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : 'Punch Out'}
            </button>
          )}
          {isPunchedOut && (
            <button
              onClick={loadStatus}
              disabled={punchLoading}
              className="btn btn-outline gap-2"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Total Days', value: String(summary.totalDays) },
          { title: 'Punched In', value: String(summary.punchedIn) },
          { title: 'Punched Out', value: String(summary.punchedOut) },
          { title: 'Total Hours', value: summary.totalHours },
        ].map(s => (
          <div key={s.title} className="card stat p-5">
            <p className="text-sm text-muted">{s.title}</p>
            <p className="stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Attendance History Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">Attendance History</h3>
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
              {myAttendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted">No attendance records for this month</td>
                </tr>
              ) : (
                myAttendance.map(a => (
                  <tr key={a.id}>
                    <td className="font-mono">{a.date ? new Date(a.date).toISOString().slice(0, 10) : '—'}</td>
                    <td className="font-mono">{fmtTime(a.timeIn)}</td>
                    <td className="font-mono">{fmtTime(a.timeOut)}</td>
                    <td className="font-mono text-right">{(a.hours || 0).toFixed(1)}</td>
                    <td><span className={`badge ${badgeTone(a.remark)}`}>{a.remark || '—'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}