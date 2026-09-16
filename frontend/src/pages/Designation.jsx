import React, { useEffect, useState } from 'react';
import { FileText, Plus, Calendar, User, RefreshCw, Check, X, Save } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { designationApi } from '../api/designation.js';
import { listEmployees } from '../api/employees.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { badgeTone } from '../data/mock.js';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'RECOMMENDED', label: 'Recommended' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'EFFECTIVE', label: 'Effective' },
  { value: 'REVOKED', label: 'Revoked' },
];

export default function Designation() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ employeeId:'', orderNumber:'', issuedDate:'', effectiveDate:'', signedBy:'', status:'DRAFT' });

  const load = async () => {
    try {
      const { data } = await designationApi.list({ limit: 100 });
      setItems(data.items || []);
    } catch (e) {
      toast('Failed to load designation orders', 'error');
    }
  };
  useEffect(()=>{ load(); }, []);

  useEffect(() => {
    listEmployees({ limit: 200 }).then((res) => setEmployees(res.items || [])).catch(() => setEmployees([]));
  }, []);

  const filtered = statusFilter ? items.filter(d => d.status === statusFilter) : items;
  const effectiveCount = items.filter(d => d.status === 'EFFECTIVE').length;
  const pendingCount = items.filter(d => ['DRAFT','RECOMMENDED','APPROVED','ISSUED'].includes(d.status)).length;

  const submit = async e => {
    e.preventDefault();
    if (!form.employeeId || !form.orderNumber?.trim() || !form.issuedDate) {
      toast('Employee, Order Number, and Issue Date are required.', 'error');
      return;
    }
    try {
      await designationApi.create({
        employeeId: form.employeeId,
        orderNumber: form.orderNumber.trim(),
        issuedDate: form.issuedDate,
        effectiveDate: form.effectiveDate || null,
        signedBy: form.signedBy || null,
        status: form.status,
      });
      toast('Designation order created', 'success');
      setOpen(false);
      setForm({ employeeId:'', orderNumber:'', issuedDate:'', effectiveDate:'', signedBy:'', status:'DRAFT' });
      load();
    } catch (err) {
      toast(err?.response?.data?.error?.message || 'Failed to create designation order', 'error');
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await designationApi.remove(deleteTarget.id);
      setItems((l) => l.filter(d => d.id !== deleteTarget.id));
      toast('Designation order removed', 'success');
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.response?.data?.error?.message || 'Failed to remove designation order', 'error');
    }
  };

  return (
    <Layout title="Designation Orders">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <FileText size={20} className="text-accent" />
            Designation Orders
          </h1>
          <p className="text-sm text-muted mt-0.5">Official personnel designations and orders</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={load} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
          <button className="btn btn-primary gap-2" onClick={()=>setOpen(true)}>
            <Plus size={18} />
            New Order
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Check className="text-success" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Effective</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{effectiveCount}</p>
          <p className="text-xs text-muted">Currently in force</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Pending / Issued</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{pendingCount}</p>
          <p className="text-xs text-muted">Awaiting effectivity</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="do-status-filter" className="text-sm text-muted">Status:</label>
        <select id="do-status-filter" className="select w-48" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="">All</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <span className="mono-label">{filtered.length} records</span>
      </div>

      {/* Orders Table */}
      <div className="card p-4">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Order No</th><th>Employee</th><th>Issued</th><th>Effective</th><th>Signed By</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map(d=>(
                <tr key={d.id}>
                  <td className="font-mono">{d.orderNumber}</td>
                  <td>{d.employee?.firstName} {d.employee?.lastName}</td>
                  <td>{d.issuedDate}</td>
                  <td>{d.effectiveDate || '—'}</td>
                  <td className="font-mono">{d.signedBy || '—'}</td>
                  <td><span className={`badge ${badgeTone(d.status)}`}>{d.status}</span></td>
                  <td className="text-right">
                    <button type="button" className="btn btn-ghost px-2 text-xs text-error" onClick={() => setDeleteTarget(d)}>
                      <X size={14} />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-muted text-sm py-8 text-center">No designation orders recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Order Modal */}
      <Modal open={open} onClose={()=>setOpen(false)} title="New Designation Order" size="sm">
        <form onSubmit={submit} className="space-y-4" id="do-form">
          <div>
            <label htmlFor="do-emp" className="block text-sm font-medium text-ink mb-1">Employee *</label>
            <select id="do-emp" className="select" value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})} required>
              <option value="">Select employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.lastName}, {emp.firstName}{emp.employeeNumber ? ` · ${emp.employeeNumber}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="do-order" className="block text-sm font-medium text-ink mb-1">Order Number *</label>
            <input id="do-order" className="input" placeholder="Unique order number" value={form.orderNumber} onChange={e=>setForm({...form,orderNumber:e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="do-date" className="block text-sm font-medium text-ink mb-1">Issue Date *</label>
              <input id="do-date" type="date" className="input" value={form.issuedDate} onChange={e=>setForm({...form,issuedDate:e.target.value})} required />
            </div>
            <div>
              <label htmlFor="do-effdate" className="block text-sm font-medium text-ink mb-1">Effective Date</label>
              <input id="do-effdate" type="date" className="input" value={form.effectiveDate} onChange={e=>setForm({...form,effectiveDate:e.target.value})} />
            </div>
          </div>
          <div>
            <label htmlFor="do-status" className="block text-sm font-medium text-ink mb-1">Status</label>
            <select id="do-status" className="select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="do-signed" className="block text-sm font-medium text-ink mb-1">Signed By</label>
            <input id="do-signed" className="input" placeholder="Name of signing authority" value={form.signedBy} onChange={e=>setForm({...form,signedBy:e.target.value})} />
          </div>
        </form>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost gap-2" onClick={() => { setOpen(false); setForm({ employeeId:'', orderNumber:'', issuedDate:'', effectiveDate:'', signedBy:'', status:'DRAFT' }); }}>
            <X size={16} />
            Cancel
          </button>
          <button type="submit" form="do-form" className="btn btn-primary gap-2">
            <Save size={16} />
            Create Order
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="Remove designation order?"
        message={`Order ${deleteTarget?.orderNumber} for ${deleteTarget?.employee?.firstName || ''} ${deleteTarget?.employee?.lastName || ''} will be removed permanently.`}
        confirmLabel="Remove"
        danger
      />
    </Layout>
  );
}