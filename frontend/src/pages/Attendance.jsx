import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout.jsx';
import { attendanceApi } from '../api/attendance.js';
import { badgeTone } from '../data/mock.js';
import { useToast } from '../components/Toast.jsx';

export default function Attendance() {
  const toast = useToast();
  const [date, setDate] = useState('');
  const [rows, setRows] = useState([]);
  const [dates, setDates] = useState([]);

  useEffect(() => {
    attendanceApi.list().then(r => {
      const all = r.data;
      setRows(all);
      setDates([...new Set(all.map(a => a.date ? new Date(a.date).toISOString().slice(0, 10) : ''))].filter(Boolean).sort());
    }).catch(() => toast('Failed to load attendance', 'error'));
  }, []);

  useEffect(() => {
    attendanceApi.list(date || undefined).then(r => setRows(r.data)).catch(() => toast('Failed to load attendance', 'error'));
  }, [date]);

  const summary = useMemo(() => {
    const onTime = rows.filter(r => r.remark === 'On time').length;
    const late = rows.filter(r => r.remark === 'Tardiness').length;
    const ot = rows.filter(r => r.remark === 'Overtime').reduce((s, r) => s + (r.hours ?? 0) - 8, 0);
    const onLeave = rows.filter(r => r.remark === 'On leave').length;
    return { onTime, late, ot: Math.round(ot * 10) / 10, onLeave };
  }, [rows]);

  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Attendance (DTR)</h1>
          <p className="text-sm text-muted mt-0.5">Daily time records and biometrics import</p>
        </div>
        <label className="flex items-center gap-2">
          <span className="mono-label">Date</span>
          <select className="input w-auto" value={date} onChange={e => setDate(e.target.value)} aria-label="Filter by date">
            <option value="">All dates</option>
            {dates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { title: 'On Time', value: String(summary.onTime) },
          { title: 'Tardiness', value: String(summary.late) },
          { title: 'Overtime Hours', value: summary.ot.toFixed(1) },
          { title: 'On Leave', value: String(summary.onLeave) },
        ].map(s => (
          <div key={s.title} className="card stat p-5">
            <p className="text-sm text-muted">{s.title}</p>
            <p className="stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">Daily Time Record</h3>
          <span className="mono-label">Biometrics source</span>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th>No.</th><th>Name</th><th>Time In</th><th>Time Out</th><th className="text-right">Hours</th><th>Remark</th></tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const emp = r.employee ?? {};
                const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || '—';
                const no = emp.employeeNumber ?? '';
                return (
                  <tr key={r.id}>
                    <td className="font-mono">{no}</td>
                    <td className="font-medium">{name}</td>
                    <td className="font-mono">{fmtTime(r.timeIn)}</td>
                    <td className="font-mono">{fmtTime(r.timeOut)}</td>
                    <td className="font-mono text-right">{(r.hours ?? 0).toFixed(1)}</td>
                    <td><span className={`badge ${badgeTone(r.remark)}`}>{r.remark}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}