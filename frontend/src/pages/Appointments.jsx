import React, { useState, useEffect } from 'react';
import { Briefcase, Calendar, User, MapPin, FileText, X, Plus, Trash2 } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { departmentsApi } from '../api/departments.js';
import { listEmployees } from '../api/employees.js';
import { appointmentsApi } from '../api/appointments.js';
import { badgeTone } from '../data/mock.js';
import { useToast } from '../components/Toast.jsx';
import { useNotifications } from '../hooks/useNotifications.js';

const TYPES = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'TEMPORARY', label: 'Temporary' },
  { value: 'CASUAL', label: 'Casual' },
  { value: 'CONTRACTUAL', label: 'Contractual' },
  { value: 'JOB_ORDER', label: 'Job Order' },
  { value: 'COS', label: 'COS' },
  { value: 'COTERMINOUS', label: 'Coterminous' },
];

const emptyForm = { employeeId: '', type: 'PERMANENT', itemNo: '', startDate: '', endDate: '', status: 'PENDING' };

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'VERIFIED', 'ISSUED', 'EFFECTIVE', 'ENDED'];

export default function Appointments() {
  const toast = useToast();
  const { items: notifications } = useNotifications();
  const [list, setList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    appointmentsApi.list().then(r => setList(r.data?.items ?? [])).catch(() => toast('Failed to load appointments', 'error'));
    departmentsApi.list().then(r => setDeptList(r.data?.items ?? [])).catch(() => {});
    listEmployees({ limit: 200 }).then(r => setEmployeeOptions(r.items ?? [])).catch(() => {});
  }, []);

  const submit = async e => {
    e.preventDefault();
    if (!form.employeeId || !form.itemNo.trim() || !form.startDate) {
      toast('Select an employee, plantilla item no. and start date.', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const r = await appointmentsApi.create(form);
      setList(l => [r.data, ...l]);
      toast(`Appointment recorded.`, 'success');
      setForm(emptyForm);
      setOpen(false);
    } catch (err) { toast(err?.response?.data?.error?.message || 'Failed to record appointment', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      await appointmentsApi.remove(id);
      setList(l => l.filter(x => x.id !== id));
      toast('Appointment removed.', 'info');
      setDeleting(null);
    } catch { toast('Failed to remove appointment', 'error'); }
  };

  const nonPermanentCount = list.filter(a => /temporary|casual|contractual|job_order|cos|coterminous/i.test(a.type)).length;

  return (
    <Layout title="Appointments" maxWidth="max-w-7xl">
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
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map(a => {
                const emp = a.employee ?? {};
                const no = emp.employeeNumber ?? '';
                const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || a.name || '—';
                const start = a.startDate ? new Date(a.startDate).toLocaleDateString() : '';
                const end = a.endDate ? new Date(a.endDate).toLocaleDateString() : '';
                const typeBadge = a.type === 'PERMANENT' ? 'badge-info' : 'badge-accent';
                const statusBadge = badgeTone(a.status);
                return (
                  <tr key={a.id}>
                    <td className="font-mono">{no}</td>
                    <td className="font-medium">{name}</td>
                    <td>{a.position}</td>
                    <td className="font-mono">{a.dept ?? emp.department?.code ?? ''}</td>
                    <td><span className={`badge ${typeBadge}`}>{a.type}</span></td>
                    <td className="font-mono">{a.itemNo}</td>
                    <td className="font-mono">{start}</td>
                    <td className="font-mono">{end || '—'}</td>
                    <td><span className={`badge ${statusBadge}`}>{a.status || 'PENDING'}</span></td>
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
                  <td colSpan={10} className="text-muted text-sm py-8 text-center">
                    No appointments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
            <button type="submit" form="appt-form" className="btn btn-primary gap-2" disabled={submitting}>
              <Plus size={16} /> Record Appointment
            </button>
          </>
        }
      >
        <form id="appt-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="a-emp" className="block text-sm font-medium text-ink mb-1">Employee</label>
              <select
                id="a-emp"
                className="select"
                value={form.employeeId}
                onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                required
              >
                <option value="">— select employee —</option>
                {employeeOptions.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.employeeNumber} · {emp.firstName} {emp.lastName}</option>
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
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="a-end" className="block text-sm font-medium text-ink mb-1">End Date (optional)</label>
              <input
                id="a-end"
                type="date"
                className="input"
                value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="a-status" className="block text-sm font-medium text-ink mb-1">Status</label>
              <select
                id="a-status"
                className="select"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>
                ))}
              </select>
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
