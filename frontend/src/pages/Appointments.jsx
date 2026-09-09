import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { departmentsApi } from '../api/departments.js';
import { badgeTone } from '../data/mock.js';
import { appointmentsApi } from '../api/appointments.js';
import { useToast } from '../components/Toast.jsx';

const TYPES = ['Permanent', 'Temporary', 'Casual', 'Contractual'];
const emptyForm = { name: '', position: '', dept: 'PGO', type: 'Permanent', itemNo: '', start: '' };

export default function Appointments() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

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

  const remove = async (id) => {
    try {
      await appointmentsApi.remove(id);
      setList(l => l.filter(x => x.id !== id));
      toast('Appointment removed.', 'info');
    } catch { toast('Failed to remove appointment', 'error'); }
  };

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Appointments</h1>
          <p className="text-sm text-muted mt-0.5">CSC appointment issuance and plantilla items</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>New Appointment</button>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">Appointment Records</h3>
          <span className="mono-label">{list.length} on file</span>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th>No.</th><th>Name</th><th>Position</th><th>Dept</th><th>Type</th><th>Plantilla Item</th><th>Start</th><th>Status</th></tr>
            </thead>
            <tbody>
              {list.map(a => {
                const emp = a.employee ?? {};
                const no = emp.employeeNumber ?? '';
                const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || '—';
                const start = a.startDate ? new Date(a.startDate).toLocaleDateString() : '';
                return (
                  <tr key={a.id}>
                    <td className="font-mono">{no}</td>
                    <td className="font-medium">{name}</td>
                    <td>{a.position}</td>
                    <td className="font-mono">{a.dept ?? a.department?.code ?? ''}</td>
                    <td><span className="badge badge-accent">{a.type}</span></td>
                    <td className="font-mono">{a.itemNo}</td>
                    <td className="font-mono">{start}</td>
                    <td>
                      <span className={`badge ${badgeTone(a.status)}`}>{a.status}</span>
                      <button type="button" className="btn btn-ghost text-xs ml-2" onClick={() => remove(a.id)}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Appointment"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" form="appt-form" className="btn btn-primary">Record Appointment</button>
          </>
        }
      >
        <form id="appt-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="a-name" className="block text-sm font-medium text-ink mb-1">Full Name</label>
              <input id="a-name" className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="a-pos" className="block text-sm font-medium text-ink mb-1">Position</label>
              <input id="a-pos" className="input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="a-dept" className="block text-sm font-medium text-ink mb-1">Department</label>
              <select id="a-dept" className="input" value={form.dept} onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}>
                {deptList.map(d => <option key={d.id} value={d.code}>{d.code} · {d.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="a-type" className="block text-sm font-medium text-ink mb-1">Appointment Type</label>
              <select id="a-type" className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="a-item" className="block text-sm font-medium text-ink mb-1">Plantilla Item No.</label>
              <input id="a-item" className="input" value={form.itemNo} onChange={e => setForm(f => ({ ...f, itemNo: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="a-start" className="block text-sm font-medium text-ink mb-1">Start Date</label>
              <input id="a-start" type="date" className="input" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
            </div>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}