import React, { useState } from 'react';
import { departments } from '../data/mock.js';

const STATUSES = ['Active', 'On Leave', 'Probationary'];

/** Shared add/edit employee form (full PII per schema.prisma Employee model). */
export default function EmployeeForm({ formId, initial, submitLabel = 'Save', onSubmit }) {
  const [form, setForm] = useState(initial);
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  return (
    <form id={formId} onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="e-no" className="block text-sm font-medium text-ink mb-1">Employee No. *</label>
          <input id="e-no" required className="input" value={form.no} onChange={e => set('no', e.target.value)} placeholder="EMP-0xx" />
        </div>
        <div>
          <label htmlFor="e-name" className="block text-sm font-medium text-ink mb-1">Full Name *</label>
          <input id="e-name" required className="input" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="e-pos" className="block text-sm font-medium text-ink mb-1">Position *</label>
        <input id="e-pos" required className="input" value={form.position} onChange={e => set('position', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="e-dept" className="block text-sm font-medium text-ink mb-1">Department *</label>
          <select id="e-dept" required className="input" value={form.dept} onChange={e => set('dept', e.target.value)}>
            {departments.map(d => <option key={d.code} value={d.code}>{d.code} · {d.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="e-status" className="block text-sm font-medium text-ink mb-1">Employment Status</label>
          <select id="e-status" className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="e-sg" className="block text-sm font-medium text-ink mb-1">Salary Grade</label>
          <input id="e-sg" className="input" value={form.sg} onChange={e => set('sg', e.target.value)} placeholder="SG-12" />
        </div>
        <div>
          <label htmlFor="e-hired" className="block text-sm font-medium text-ink mb-1">Date Hired *</label>
          <input id="e-hired" required type="date" className="input" value={form.hired} onChange={e => set('hired', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="e-email" className="block text-sm font-medium text-ink mb-1">Email</label>
          <input id="e-email" type="email" className="input" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="name@lgu.gov.ph" />
        </div>
        <div>
          <label htmlFor="e-contact" className="block text-sm font-medium text-ink mb-1">Contact No.</label>
          <input id="e-contact" className="input" value={form.contact ?? ''} onChange={e => set('contact', e.target.value)} placeholder="0917-000-0000" />
        </div>
      </div>
    </form>
  );
}