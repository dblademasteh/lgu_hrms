import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout.jsx';
import { attendanceApi } from '../api/attendance.js';
import { badgeTone } from '../data/mock.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Pencil, Trash2, Upload, X, Save, Plus, Download } from 'lucide-react';

export default function Attendance() {
  const toast = useToast();
  const [date, setDate] = useState('');
  const [rows, setRows] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({ timeIn: '', timeOut: '', hours: '', remark: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    attendanceApi.list(date ? { date } : {}).then(r => {
      const all = Array.isArray(r.data) ? r.data : [];
      setRows(all);
      setDates([...new Set(all.map(a => a.date ? new Date(a.date).toISOString().slice(0, 10) : ''))].filter(Boolean).sort());
    }).catch(() => toast('Failed to load attendance', 'error')).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!date) return;
    load();
  }, [date]);

  const summary = useMemo(() => {
    const onTime = rows.filter(r => r.remark === 'On time').length;
    const late = rows.filter(r => r.remark === 'Tardiness').length;
    const ot = rows.filter(r => r.remark === 'Overtime').reduce((s, r) => s + Math.max(0, (r.hours ?? 0) - 8), 0);
    const onLeave = rows.filter(r => r.remark === 'On leave').length;
    return { onTime, late, ot: Math.round(ot * 10) / 10, onLeave };
  }, [rows]);

  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  const openEdit = (row) => {
    setEditRow(row);
    setEditForm({
      timeIn: row.timeIn ? new Date(row.timeIn).toISOString().slice(0, 16) : '',
      timeOut: row.timeOut ? new Date(row.timeOut).toISOString().slice(0, 16) : '',
      hours: row.hours ?? '',
      remark: row.remark || '',
    });
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      const payload = {};
      if (editForm.timeIn) payload.timeIn = editForm.timeIn;
      if (editForm.timeOut) payload.timeOut = editForm.timeOut;
      if (editForm.hours !== '') payload.hours = Number(editForm.hours);
      if (editForm.remark) payload.remark = editForm.remark;
      await attendanceApi.update(editRow.id, payload);
      toast('Attendance updated', 'success');
      setEditRow(null);
      load();
    } catch (e) {
      toast(e.response?.data?.error?.message || 'Failed to update attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await attendanceApi.remove(deleteTarget.id);
      toast('Attendance record deleted', 'success');
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast(e.response?.data?.error?.message || 'Failed to delete attendance', 'error');
    }
  };

  const downloadSampleCsv = () => {
    const sample = 'employeeNumber,date,timeIn,timeOut,hours,remark\n000123,2026-01-15,08:00,17:00,8,On time';
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance-import-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const lines = importText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const required = ['employeenumber', 'date'];
      const missing = required.filter(r => !headers.includes(r));
      if (missing.length > 0) {
        toast(`Missing columns: ${missing.join(', ')}`, 'error');
        setImporting(false);
        return;
      }
      const records = lines.slice(1).filter(l => l.trim()).map(line => {
        const values = line.split(',');
        const get = (name) => values[headers.indexOf(name.toLowerCase())]?.trim() || '';
        return {
          employeeNumber: get('employeenumber'),
          date: get('date'),
          timeIn: get('timein') || null,
          timeOut: get('timeout') || null,
          hours: get('hours') ? Number(get('hours')) : null,
          remark: get('remark') || null,
        };
      });
      const res = await attendanceApi.bulkImport(records);
      const created = res.data.results.filter(r => r.status === 'created').length;
      const updated = res.data.results.filter(r => r.status === 'updated').length;
      const errors = res.data.results.filter(r => r.status === 'error');
      toast(`Imported: ${created} created, ${updated} updated${errors.length > 0 ? `, ${errors.length} errors` : ''}`, 'success');
      setShowImport(false);
      setImportText('');
      load();
    } catch (e) {
      toast(e.response?.data?.error?.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Attendance (DTR)</h1>
          <p className="text-sm text-muted mt-0.5">Daily time records and biometrics import</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-primary btn-sm gap-2" onClick={() => setShowImport(true)}>
            <Upload size={14} /> Import CSV
          </button>
          <button className="btn btn-ghost btn-sm gap-2" onClick={downloadSampleCsv}>
            <Download size={14} /> Sample
          </button>
          <label className="flex items-center gap-2">
            <span className="mono-label">Date</span>
            <select className="select w-auto" value={date} onChange={e => setDate(e.target.value)} aria-label="Filter by date">
              <option value="">All dates</option>
              {dates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'On Time', value: String(summary.onTime), tone: 'success' },
          { title: 'Tardiness', value: String(summary.late), tone: 'warning' },
          { title: 'Overtime Hours', value: summary.ot.toFixed(1), tone: 'accent' },
          { title: 'On Leave', value: String(summary.onLeave), tone: 'neutral' },
        ].map(s => (
          <div key={s.title} className="card stat p-5">
            <p className="text-sm text-muted">{s.title}</p>
            <p className={`stat-value ${s.tone === 'success' ? 'text-success' : s.tone === 'warning' ? 'text-warning' : s.tone === 'accent' ? 'text-accent' : ''}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">Daily Time Record</h3>
          <span className="mono-label">Biometrics source</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="data-table">
              <thead>
                <tr><th>No.</th><th>Name</th><th>Time In</th><th>Time Out</th><th className="text-right">Hours</th><th>Remark</th><th className="text-right">Actions</th></tr>
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
                      <td className="text-right">
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(r)} title="Edit"><Pencil size={12} /></button>
                        <button className="btn btn-ghost btn-xs text-error" onClick={() => setDeleteTarget(r)} title="Delete"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted">No attendance records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!editRow} onClose={() => setEditRow(null)} title="Edit Attendance" footer={
        <>
          <button type="button" className="btn" onClick={() => setEditRow(null)}><X size={14} /> Cancel</button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={saveEdit}><Save size={14} /> Save</button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Time In</label>
            <input type="datetime-local" className="input" value={editForm.timeIn} onChange={e => setEditForm({ ...editForm, timeIn: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Time Out</label>
            <input type="datetime-local" className="input" value={editForm.timeOut} onChange={e => setEditForm({ ...editForm, timeOut: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Hours</label>
            <input type="number" step="0.1" min="0" max="24" className="input" value={editForm.hours} onChange={e => setEditForm({ ...editForm, hours: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Remark</label>
            <input className="input" value={editForm.remark} onChange={e => setEditForm({ ...editForm, remark: e.target.value })} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} title="Delete attendance" message={`Delete attendance record for ${deleteTarget?.employee?.employeeNumber ?? 'this employee'} on ${deleteTarget?.date ? new Date(deleteTarget.date).toISOString().slice(0, 10) : ''}?`} confirmLabel="Delete" danger />

      <Modal open={showImport} onClose={() => { setShowImport(false); setImportText(''); }} title="Import Attendance CSV" footer={
        <>
          <button type="button" className="btn" onClick={() => { setShowImport(false); setImportText(''); }}><X size={14} /> Cancel</button>
          <button type="button" className="btn btn-primary" disabled={importing} onClick={handleImport}><Upload size={14} /> {importing ? 'Importing...' : 'Import'}</button>
        </>
      }>
        <div className="space-y-3">
          <p className="text-sm text-muted">CSV format: employeeNumber, date (YYYY-MM-DD), timeIn, timeOut, hours, remark</p>
          <p className="text-xs text-muted">Download the sample CSV for the correct format.</p>
          <textarea className="textarea" rows={8} value={importText} onChange={e => setImportText(e.target.value)} placeholder="000123,2026-01-15,08:00,17:00,8,On time" />
        </div>
      </Modal>
    </Layout>
  );
}
