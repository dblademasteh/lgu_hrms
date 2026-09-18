import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { bonusApi } from '../api/bonus.js';
import { leaveApi } from '../api/leave.js';
import { useToast } from '../components/Toast.jsx';
import { useParams } from 'react-router-dom';
import { Plus, RefreshCw, FileText, Calendar } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Modal from '../components/Modal.jsx';

const badgeTone = s => {
  const map = { PENDING: 'badge-warning', APPROVED: 'badge-success', PAID: 'badge-primary', DEFAULT: 'badge-muted' };
  return map[s] || 'badge-muted';
};

export default function Bonus() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ employeeId: '', amount: '', reason: '' });
  const [confirmAction, setConfirmAction] = useState(null);

  const load = async () => {
    try {
      const r = await bonusApi.list();
      setRows(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch (e) {
      toast('Failed to load bonuses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      await bonusApi.create(form);
      toast('Bonus created', 'success');
      setModalOpen(false);
      setEditing(null);
      setForm({ employeeId: '', amount: '', reason: '' });
      load();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to save bonus', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await bonusApi.update(id, { deleted: true });
      toast('Bonus removed', 'success');
      load();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to delete bonus', 'error');
    }
  };

  return (
    <Layout maxWidth="max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Bonuses</h1>
          <p className="text-sm text-muted mt-1">Special bonuses and incentives</p>
        </div>
        <button className="btn btn-primary gap-2" onClick={() => { setModalOpen(true); setEditing(null); setForm({ employeeId: '', amount: '', reason: '' }); }}>
          <Plus size={16} />
          New Bonus
        </button>
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">All Bonuses</h3>
          <span className="mono-label">{total}</span>
        </div>
        {loading ? (
          <div className="text-center py-8 text-muted">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-muted">No bonuses recorded.</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Employee</th><th className="text-right">Amount</th><th>Reason</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.employee?.fullName || r.employee?.lastName + ', ' + r.employee?.firstName}</td>
                  <td className="font-mono text-right">₱ {Number(r.amount).toLocaleString()}</td>
                  <td>{r.reason}</td>
                  <td className="text-right">
                    <button className="btn btn-ghost gap-1 px-2" onClick={() => setConfirmAction(r)}>
                      <FileText size={14} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title="New Bonus" size="lg">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Employee ID*</label>
            <select className="select w-full" value={form.employeeId} onChange={e => setForm(d => ({ ...d, employeeId: e.target.value }))}>
              <option value="">Select employee...</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Amount (₱)*</label>
              <input type="number" className="input" value={form.amount} onChange={e => setForm(d => ({ ...d, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Period*</label>
              <input type="month" className="input" value={form.period || ''} onChange={e => setForm(d => ({ ...d, period: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Reason*</label>
            <textarea className="input" rows={2} value={form.reason} onChange={e => setForm(d => ({ ...d, reason: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn btn-ghost flex-1" onClick={() => { setModalOpen(false); setEditing(null); }}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave}>Save</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={() => { handleDelete(confirmAction.id); setConfirmAction(null); }} title="Remove bonus?" message="This will remove the bonus record." />
    </Layout>
  );
}