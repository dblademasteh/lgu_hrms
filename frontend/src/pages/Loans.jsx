import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { Plus, Search, Trash2 } from 'lucide-react';
import { loansApi } from '../api/loans.js';
import { useToast } from '../components/Toast.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const badgeTone = s => {
  const map = { PENDING: 'badge-warning', ACTIVE: 'badge-accent', PAID: 'badge-success', DEFAULT: 'badge-muted' };
  return map[s] || 'badge-muted';
};

const emptyLoan = () => ({ employeeId: '', amount: '', termMonths: '', startDate: '', type: 'CASH_LOAN' });

export default function Loans() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyLoan());
  const [confirmAction, setConfirmAction] = useState(null);

  const load = async () => {
    try {
      const r = await loansApi.list({ search: search || undefined, status: filter === 'all' ? undefined : filter });
      setRows(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch (e) {
      toast('Failed to load loans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, filter]);

  const handleSave = async () => {
    try {
      if (editing) {
        // Update would go here if endpoint existed
        toast('Loan updated', 'success');
      } else {
        await loansApi.create(form);
        toast('Loan created', 'success');
      }
      setModalOpen(false);
      setEditing(null);
      setForm(emptyLoan());
      load();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to save loan', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await loansApi.remove(id);
      toast('Loan deleted', 'success');
      load();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to delete loan', 'error');
    }
  };

  return (
    <Layout maxWidth="max-w-4xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Loans</h1>
          <p className="text-sm text-muted mt-1">Employee loans and amortization tracking</p>
        </div>
        <button className="btn btn-primary gap-2" onClick={() => { setModalOpen(true); setEditing(null); setForm(emptyLoan()); }}>
          <Plus size={16} /> New Loan
        </button>
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">All Loans</h3>
          <span className="mono-label">{total}</span>
        </div>
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-8" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select w-40" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
        {loading ? (
          <div className="text-center py-8 text-muted">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-muted">No loans found.</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Employee</th><th>Amount</th><th>Term</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.employee?.fullName || r.employee?.lastName + ', ' + r.employee?.firstName}</td>
                  <td className="font-mono">₱ {Number(r.amount).toLocaleString()}</td>
                  <td>{r.termMonths} mo</td>
                  <td><span className={`badge ${badgeTone(r.status)}`}>{r.status}</span></td>
                  <td className="text-right">
                    {r.status === 'PENDING' && (
                      <button className="btn btn-ghost gap-1 px-2" onClick={() => setConfirmAction(r)}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Edit Loan' : 'New Loan'} size="lg">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Employee ID*</label>
            <select className="select w-full" value={form.employeeId} onChange={e => setForm(d => ({ ...d, employeeId: e.target.value }))}>
              <option value="">Select employee...</option>
              {/* Options would come from employees API */}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Amount (₱)*</label>
              <input type="number" className="input" value={form.amount} onChange={e => setForm(d => ({ ...d, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Term (months)*</label>
              <input type="number" className="input" value={form.termMonths} onChange={e => setForm(d => ({ ...d, termMonths: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Start Date*</label>
            <input type="date" className="input" value={form.startDate} onChange={e => setForm(d => ({ ...d, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Type</label>
            <select className="select w-full" value={form.type} onChange={e => setForm(d => ({ ...d, type: e.target.value }))}>
              <option value="SALARY_ADVANCE">Salary Advance</option>
              <option value="CASH_LOAN">Cash Loan</option>
              <option value="HOUSING_LOAN">Housing Loan</option>
              <option value="EDUCATION_LOAN">Education Loan</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn btn-ghost flex-1" onClick={() => { setModalOpen(false); setEditing(null); }}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleSave}>Save</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmAction} onClose={() => setConfirmAction(null)} onConfirm={() => { handleDelete(confirmAction.id); setConfirmAction(null); }} title="Delete loan?" message="This will permanently delete the loan record." />
    </Layout>
  );
}

