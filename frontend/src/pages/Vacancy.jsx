import React, { useEffect, useState } from 'react';
import { Search, Plus, FileText, MapPin, ChevronDown, RefreshCw, Check, X } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { vacancyApi } from '../api/vacancy.js';
import { departmentsApi } from '../api/departments.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import { badgeTone } from '../data/mock.js';

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open', className: 'badge-accent' },
  { value: 'CLOSED', label: 'Closed', className: 'badge-success' },
  { value: 'CANCELLED', label: 'Cancelled', className: 'badge-error' },
];

export default function Vacancy() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ plantillaItemId:'', title:'', description:'', qualifications:'', status:'OPEN' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    try {
      const params = { search: search || undefined, status: statusFilter || undefined };
      const { data } = await vacancyApi.list(params);
      setItems(data.items || []);
      const depts = await departmentsApi.list();
      setDeptList(depts.data || []);
    } catch (e) {
      toast('Failed to load vacancies', 'error');
    }
  };
  useEffect(()=>{ load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search, statusFilter]);

  const openCount = items.filter(v => v.status === 'OPEN').length;
  const closedCount = items.filter(v => v.status === 'CLOSED').length;
  const cancelledCount = items.filter(v => v.status === 'CANCELLED').length;

  const submit = async e => {
    e.preventDefault();
    if (!form.plantillaItemId || !form.title) {
      toast('Plantilla Item and Title are required.', 'error');
      return;
    }
    try {
      await vacancyApi.create(form);
      toast('Vacancy published', 'success');
      setOpen(false);
      setForm({ plantillaItemId:'', title:'', description:'', qualifications:'', status:'OPEN' });
      load();
    } catch (err) {
      toast(err?.response?.data?.error?.message || 'Failed to create vacancy', 'error');
    }
  };

  return (
    <Layout title="Vacancies">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Search size={20} className="text-accent" />
            Vacancy Publication
          </h1>
          <p className="text-sm text-muted mt-0.5">Open positions and recruitment tracking</p>
        </div>
        <div className="flex gap-2">
          <select 
            className="select w-auto" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={load} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
          <button className="btn btn-primary gap-2" onClick={()=>setOpen(true)}>
            <Plus size={18} />
            New Vacancy
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Open</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{openCount}</p>
          <p className="text-xs text-muted">Positions available</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Check className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Closed</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{closedCount}</p>
          <p className="text-xs text-muted">Filled positions</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <X className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Cancelled</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{cancelledCount}</p>
          <p className="text-xs text-muted">Cancelled openings</p>
        </div>
      </div>

      {/* Vacancies Table */}
      <div className="card p-4">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Title</th><th>Plantilla Item</th><th>Department</th><th>Status</th></tr></thead>
            <tbody>
              {items.map(v=>(
                <tr key={v.id}>
                  <td>{v.title}</td>
                  <td className="font-mono">{v.plantillaItem?.itemNumber}</td>
                  <td>{v.department?.name || v.departmentId}</td>
                  <td><span className={`badge ${badgeTone(v.status)}`}>{v.status}</span></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="text-muted text-sm py-8 text-center">No vacancies found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Vacancy Modal */}
      <Modal open={open} onClose={()=>setOpen(false)} title="New Vacancy">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="v-item" className="block text-sm font-medium text-ink mb-1">Plantilla Item ID *</label>
            <input 
              id="v-item" 
              className="input" 
              placeholder="e.g. GR-001"
              value={form.plantillaItemId} 
              onChange={e=>setForm({...form,plantillaItemId:e.target.value})} 
              required 
            />
          </div>
          <div>
            <label htmlFor="v-title" className="block text-sm font-medium text-ink mb-1">Title *</label>
            <input 
              id="v-title" 
              className="input" 
              placeholder="Position title"
              value={form.title} 
              onChange={e=>setForm({...form,title:e.target.value})} 
              required 
            />
          </div>
          <div>
            <label htmlFor="v-desc" className="block text-sm font-medium text-ink mb-1">Description</label>
            <textarea 
              id="v-desc" 
              className="input" 
              value={form.description} 
              onChange={e=>setForm({...form,description:e.target.value})}
              placeholder="Position description and responsibilities"
              rows={3}
            />
          </div>
          <div>
            <label htmlFor="v-qual" className="block text-sm font-medium text-ink mb-1">Qualifications</label>
            <textarea 
              id="v-qual" 
              className="input" 
              value={form.qualifications} 
              onChange={e=>setForm({...form,qualifications:e.target.value})}
              placeholder="Required education, experience, skills"
              rows={2}
            />
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
