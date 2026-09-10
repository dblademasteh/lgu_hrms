import React, { useEffect, useState } from 'react';
import { FileText, Plus, Calendar, User, MapPin, RefreshCw, Check, X, Save, Search } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { designationApi } from '../api/designation.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import { badgeTone } from '../data/mock.js';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active', className: 'badge-success' },
  { value: 'SUSPENDED', label: 'Suspended', className: 'badge-warning' },
  { value: 'REVOKED', label: 'Revoked', className: 'badge-error' },
];

export default function Designation() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ employeeId:'', orderNumber:'', issuedDate:'', signedBy:'' });

  const load = async () => {
    try {
      const params = { search: search || undefined };
      const { data } = await designationApi.list();
      setItems(data.items || []);
    } catch (e) {
      toast('Failed to load designation orders', 'error');
    }
  };
  useEffect(()=>{ load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search]);

  const activeCount = items.filter(d => d.status === 'ACTIVE').length;
  const suspendedCount = items.filter(d => d.status === 'SUSPENDED').length;

  const submit = async e => {
    e.preventDefault();
    if (!form.employeeId?.trim() || !form.orderNumber?.trim() || !form.issuedDate) {
      toast('Employee ID, Order Number, and Issue Date are required.', 'error');
      return;
    }
    try {
      await designationApi.create(form);
      toast('Designation order created', 'success');
      setOpen(false);
      setForm({ employeeId:'', orderNumber:'', issuedDate:'', signedBy:'' });
      load();
    } catch (err) {
      toast(err?.response?.data?.error?.message || 'Failed to create designation order', 'error');
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
            <User className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Active</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{activeCount}</p>
          <p className="text-xs text-muted">Valid orders</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Suspended</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{suspendedCount}</p>
          <p className="text-xs text-muted">On hold</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order number, employee name..."
            className="input pl-10 w-full md:w-60"
            aria-label="Search designation orders"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">Designation Orders</h3>
          <span className="mono-label">{items.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Order No</th><th>Employee</th><th>Issued</th><th>Signed By</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {items.map(d=>(
                <tr key={d.id}>
                  <td className="font-mono">{d.orderNumber}</td>
                  <td>{d.employee?.firstName} {d.employee?.lastName}</td>
                  <td>{d.issuedDate}</td>
                  <td className="font-mono">{d.signedBy || '—'}</td>
                  <td><span className={`badge ${badgeTone(d.status)}`}>{d.status}</span></td>
                  <td className="text-right">
                    <button type="button" className="btn btn-ghost px-2 text-xs" onClick={() => {}}>
                      <X size={14} />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="text-muted text-sm py-8 text-center">No designation orders recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Order Modal */}
      <Modal open={open} onClose={()=>setOpen(false)} title="New Designation Order" size="sm">
        <form onSubmit={submit} className="space-y-4" id="do-form">
          <div>
            <label htmlFor="do-emp" className="block text-sm font-medium text-ink mb-1">Employee ID *</label>
            <input 
              id="do-emp" 
              className="input" 
              placeholder="e.g. EMP-001"
              value={form.employeeId} 
              onChange={e=>setForm({...form,employeeId:e.target.value})} 
              required 
            />
          </div>
          <div>
            <label htmlFor="do-order" className="block text-sm font-medium text-ink mb-1">Order Number *</label>
            <input 
              id="do-order" 
              className="input" 
              placeholder="Unique order number"
              value={form.orderNumber} 
              onChange={e=>setForm({...form,orderNumber:e.target.value})} 
              required 
            />
          </div>
          <div>
            <label htmlFor="do-date" className="block text-sm font-medium text-ink mb-1">Issue Date *</label>
            <input 
              id="do-date" 
              type="date" 
              className="input" 
              value={form.issuedDate} 
              onChange={e=>setForm({...form,issuedDate:e.target.value})} 
              required 
            />
          </div>
          <div>
            <label htmlFor="do-signed" className="block text-sm font-medium text-ink mb-1">Signed By</label>
            <input 
              id="do-signed" 
              className="input" 
              placeholder="Name of signing authority"
              value={form.signedBy} 
              onChange={e=>setForm({...form,signedBy:e.target.value})}
            />
          </div>
        </form>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost gap-2" onClick={() => { setOpen(false); setForm({ employeeId:'', orderNumber:'', issuedDate:'', signedBy:'' }); }}>
            <X size={16} />
            Cancel
          </button>
          <button type="submit" form="do-form" className="btn btn-primary gap-2">
            <Save size={16} />
            Create Order
          </button>
        </div>
      </Modal>
    </Layout>
  );
}
