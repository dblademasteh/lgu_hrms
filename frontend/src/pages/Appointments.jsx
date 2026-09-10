import React, { useState, useEffect } from 'react';
import { Briefcase, Calendar, User, MapPin, FileText, X, Plus, Trash2 } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { departmentsApi } from '../api/departments.js';
import { badgeTone } from '../data/mock.js';
import { appointmentsApi } from '../api/appointments.js';
import { useToast } from '../components/Toast.jsx';
import { useNotifications } from '../hooks/useNotifications.js';

const TYPES = [
  { value: 'Permanent', label: 'Permanent' },
  { value: 'Temporary', label: 'Temporary' },
  { value: 'Casual', label: 'Casual' },
  { value: 'Contractual', label: 'Contractual' },
];

const emptyForm = { name: '', position: '', dept: 'PGO', type: 'Permanent', itemNo: '', start: '' };

export default function Appointments() {
  const toast = useToast();
  const { items: notifications } = useNotifications();
  const [list, setList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    appointmentsApi.list().then(r => setList(r.data)).catch(() => toast('Failed to load appointments', 'error'));
    departmentsApi.list().then(r => setDeptList(r.data)).catch(() => {});
  }, []);

  const submit = async e => {
    e.preventDefault();
    if (!form.name.trim() || !form.position.trim() || !form.itemNo.trim() || !form.start) {
      toast('Name, position, item no. and start date are required.', 'error');
      return;
    }
    try {
      const r = await appointmentsApi.create({
        name: form.name,
        position: form.position,
        dept: form.dept,
        type: form.type,
        itemNo: form.itemNo,
        start: form.start
      });
      setList(l => [r.data, ...l]);
      toast(`Appointment for ${form.name} recorded.`, 'success');
      setForm(emptyForm);
      setOpen(false);
    } catch { toast('Failed to record appointment', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await appointmentsApi.remove(id);
      setList(l => l.filter(x => x.id !== id));
      toast('Appointment removed.', 'info');
      setDeleting(null);
    } catch { toast('Failed to remove appointment', 'error'); }
  };

  // Count non-permanent appointments for notification
  const nonPermanentCount = list.filter(a => /temporary|casual|contractual/i.test(a.type)).length;

  return (
    <Layout title="Appointments">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Briefcase size={20} className="text-accent" />
            Appointments
          </h1>
          <p className="text-sm text-muted mt-0.5">CSC appointment issuance and plantilla items</p>
        </div>
        <button type="button" className="btn btn-primary gap-2" onClick={() => setOpen(true)}>
          <Plus size={18} />
          New Appointment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Total</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{list.length}</p>
          <p className="text-xs text-muted">Active appointments</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Non-Permanent</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{nonPermanentCount}</p>
          <p className="text-xs text-muted">Need renewal review</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Pending</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">
            {notifications.filter(n => n.id?.startsWith('appt-')).length}
          </p>
          <p className="text-xs text-muted">Notification alerts</p>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink mb-0 flex items-center gap-2">
            <FileText size={18} className="text-accent" />
            Appointment Records
          </h3>
          <span className="mono-label">{list.length} on file</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>E.No.</th>
                <th>Name</th>
                <th>Position</th>
                <th>Department</th>
                <th>Type</th>
                <th>Plantilla</th>
                <th>Start Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map(a => {
                const emp = a.employee ?? {};
                const no = emp.employeeNumber ?? '';
                const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || '—';
                const start = a.startDate ? new Date(a.startDate).toLocaleDateString() : '';
                const typeBadge = a.type === 'Permanent' ? 'badge-info' : 'badge-accent';
                const statusBadge = badgeTone(a.status);
                return (
                  <tr key={a.id}>
                    <td className="font-mono">{no}</td>
                    <td className="font-medium">{name}</td>
                    <td>{a.position}</td>
                    <td className="font-mono">{a.dept ?? a.department?.code ?? ''}</td>
                    <td><span className={`badge ${typeBadge}`}>{a.type}</span></td>
                    <td className="font-mono">{a.itemNo}</td>
                    <td className="font-mono">{start}</td>
                    <td><span className={`badge ${statusBadge}`}>{a.status || 'ACTIVE'}</span></td>
                    <td>
                      <button 
                        type="button" 
                        className="btn btn-ghost text-xs text-error hover:text-error-ink" 
                        onClick={() => setDeleting(a)}
                        aria-label="Remove appointment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-muted text-sm py-8 text-center">
                    No appointments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Appointment Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Appointment"
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => setOpen(false)}>
              <X size={16} /> Cancel
            </button>
            <button type="submit" form="appt-form" className="btn btn-primary gap-2">
              <Plus size={16} /> Record Appointment
            </button>
          </>
        }
      >
        <form id="appt-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="a-name" className="block text-sm font-medium text-ink mb-1">Full Name</label>
              <input 
                id="a-name" 
                className="input" 
                value={form.name} 
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                placeholder="Employee full name"
                required 
              />
            </div>
            <div>
              <label htmlFor="a-pos" className="block text-sm font-medium text-ink mb-1">Position</label>
              <input 
                id="a-pos" 
                className="input" 
                value={form.position} 
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                placeholder="Position title"
                required 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="a-dept" className="block text-sm font-medium text-ink mb-1">Department</label>
              <select 
                id="a-dept" 
                className="select" 
                value={form.dept} 
                onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}
              >
                {deptList.map(d => (
                  <option key={d.id} value={d.code}>
                    {d.code} · {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="a-type" className="block text-sm font-medium text-ink mb-1">Appointment Type</label>
              <select 
                id="a-type" 
                className="select" 
                value={form.type} 
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="a-item" className="block text-sm font-medium text-ink mb-1">Plantilla Item No.</label>
              <input 
                id="a-item" 
                className="input" 
                value={form.itemNo} 
                onChange={e => setForm(f => ({ ...f, itemNo: e.target.value }))}
                placeholder="e.g. GR-001"
                required 
              />
            </div>
            <div>
              <label htmlFor="a-start" className="block text-sm font-medium text-ink mb-1">Start Date</label>
              <input 
                id="a-start" 
                type="date" 
                className="input" 
                value={form.start} 
                onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                required 
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => handleDelete(deleting.id)}
        title="Remove Appointment"
        message={`Remove appointment for ${deleting?.name || 'this position'}?`}
        confirmLabel="Remove"
        danger
      />
    </Layout>
  );
}