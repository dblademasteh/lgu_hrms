import React, { useEffect, useState } from 'react';
import { FileText, Plus, User, Briefcase, MapPin, Check } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { plantillaApi } from '../api/plantilla.js';
import { departmentsApi } from '../api/departments.js';
import { positionsApi } from '../api/positions.js';
import { useToast } from '../components/Toast.jsx';
import { badgeTone } from '../data/mock.js';

export default function Plantilla() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [posList, setPosList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ itemNumber:'', positionId:'', departmentId:'', status:'VACANT' });

  const load = async () => {
    try {
      const { data } = await plantillaApi.list();
      setItems(data.items || []);
      const depts = await departmentsApi.list();
      setDeptList(depts.data || []);
      const positions = await positionsApi.list();
      setPosList(positions.data || []);
    } catch (e) {
      toast('Failed to load data', 'error');
    }
  };
  useEffect(()=>{ load(); },[]);

  const vacantCount = items.filter(i => i.status === 'VACANT').length;
  const filledCount = items.filter(i => i.status === 'FILLED').length;
  const frozenCount = items.filter(i => i.status === 'FROZEN').length;

  const submit = async e => {
    e.preventDefault();
    if (!form.itemNumber.trim() || !form.positionId || !form.departmentId) {
      toast('Item number, position, and department are required.', 'error');
      return;
    }
    try {
      await plantillaApi.create(form);
      toast('Plantilla item created', 'success');
      setOpen(false);
      load();
    } catch (err) {
      toast(err?.response?.data?.error?.message || 'Failed to create plantilla item', 'error');
    }
  };

  return (
    <Layout title="Plantilla">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Briefcase size={20} className="text-accent" />
            Plantilla Management
          </h1>
          <p className="text-sm text-muted mt-0.5">CSC plantilla items and position management</p>
        </div>
        <button className="btn btn-primary gap-2" onClick={()=>setOpen(true)}>
          <Plus size={18} />
          New Item
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Vacant</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{vacantCount}</p>
          <p className="text-xs text-muted">Available positions</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Check className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Filled</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{filledCount}</p>
          <p className="text-xs text-muted">Occupied positions</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Frozen</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{frozenCount}</p>
          <p className="text-xs text-muted">Paused positions</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="card p-4">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Item No</th><th>Position</th><th>Department</th><th>Status</th></tr></thead>
            <tbody>
              {items.map(i=>(
                <tr key={i.id}>
                  <td className="font-mono">{i.itemNumber}</td>
                  <td>{i.position?.title}</td>
                  <td>{i.department?.name || i.departmentId}</td>
                  <td><span className={`badge ${badgeTone(i.status)}`}>{i.status}</span></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="text-muted text-sm py-8 text-center">No plantilla items recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Item Modal */}
      <Modal open={open} onClose={()=>setOpen(false)} title="New Plantilla Item">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pi-item" className="block text-sm font-medium text-ink mb-1">Item Number *</label>
              <input 
                id="pi-item" 
                className="input" 
                placeholder="e.g. GR-001"
                value={form.itemNumber} 
                onChange={e=>setForm({...form,itemNumber:e.target.value})} 
                required 
              />
            </div>
            <div>
              <label htmlFor="pi-pos" className="block text-sm font-medium text-ink mb-1">Position *</label>
              <select 
                id="pi-pos" 
                className="input" 
                value={form.positionId} 
                onChange={e=>setForm({...form,positionId:e.target.value})}
              >
                <option value="">Select position</option>
                {posList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.salaryGrade ? `(SG-${p.salaryGrade})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="pi-dept" className="block text-sm font-medium text-ink mb-1">Department *</label>
            <select 
              id="pi-dept" 
              className="input" 
              value={form.departmentId} 
              onChange={e=>setForm({...form,departmentId:e.target.value})}
            >
              <option value="">Select department</option>
              {deptList.map(d => (
                <option key={d.id} value={d.id}>{d.code} · {d.name}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
