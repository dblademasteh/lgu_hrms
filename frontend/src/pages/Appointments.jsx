import React, { useState } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { appointments, departments, badgeTone } from '../data/mock.js';
import { useToast } from '../components/Toast.jsx';

const TYPES = ['Permanent', 'Temporary', 'Casual', 'Contractual'];
const emptyForm = { no: '', name: '', position: '', dept: 'PGO', type: 'Permanent', itemNo: '', start: '' };

export default function Appointments() {
  const toast = useToast();
  const [list, setList] = useState(appointments);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const submit = e => {
    e.preventDefault();
    if (!form.no.trim() || !form.name.trim() || !form.position.trim() || !form.itemNo.trim() || !form.start) {
      toast('Employee no., name, position, item no. and start date are required.', 'error');
      return;
    }
    setList(l => [...l, { ...form, status: 'Active' }]);
    toast(`Appointment for ${form.name} recorded.`, 'success');
    setForm(emptyForm);
    setOpen(false);
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
              {list.map(a => (
                <tr key={`${a.no}-${a.itemNo}`}>
                  <td className="font-mono">{a.no}</td>
                  <td className="font-medium">{a.name}</td>
                  <td>{a.position}</td>
                  <td className="font-mono">{a.dept}</td>
                  <td><span className="badge badge-accent">{a.type}</span></td>
                  <td className="font-mono">{a.itemNo}</td>
                  <td className="font-mono">{a.start}</td>
                  <td><span className={`badge ${badgeTone(a.status)}`}>{a.status}</span></td>
                </tr>
              ))}
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
              <label htmlFor="a-no" className="block text-sm font-medium text-ink mb-1">Employee No.</label>
              <input id="a-no" className="input" value={form.no} onChange={e => setForm(f => ({ ...f, no: e.target.value }))} placeholder="EMP-0xx" />
            </div>
            <div>
              <label htmlFor="a-name" className="block text-sm font-medium text-ink mb-1">Full Name</label>
              <input id="a-name" className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          </div>
          <div>
            <label htmlFor="a-pos" className="block text-sm font-medium text-ink mb-1">Position</label>
            <input id="a-pos" className="input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="a-dept" className="block text-sm font-medium text-ink mb-1">Department</label>
              <select id="a-dept" className="input" value={form.dept} onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}>
                {departments.map(d => <option key={d.code} value={d.code}>{d.code} · {d.name}</option>)}
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