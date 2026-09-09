import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { departmentsApi } from '../api/departments.js';
import { employeeSectionsApi } from '../api/employeeSections.js';

const GENDERS = ['MALE', 'FEMALE'];
const CIVIL_STATUSES = ['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED', 'ANNULLED'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'RESIGNED', 'RETIRED'];

const TABS = [
  { id: 'personal', label: 'Personal' },
  { id: 'family', label: 'Family' },
  { id: 'education', label: 'Education' },
  { id: 'history', label: 'Work Experience' },
  { id: 'eligibilities', label: 'Eligibility' },
  { id: 'awards', label: 'Awards' },
];

const SECTION_FIELDS = {
  family: [
    { key: 'relationship', label: 'Relationship', type: 'select', options: ['SPOUSE', 'FATHER', 'MOTHER', 'CHILD'], required: true },
    { key: 'firstName', label: 'First name', required: true },
    { key: 'lastName', label: 'Last name', required: true },
    { key: 'middleName', label: 'Middle name' },
    { key: 'birthDate', label: 'Birth date', type: 'date' },
    { key: 'occupation', label: 'Occupation' },
  ],
  education: [
    { key: 'level', label: 'Level', type: 'select', options: ['ELEMENTARY', 'SECONDARY', 'VOCATIONAL', 'COLLEGE', 'GRADUATE_STUDIES'], required: true },
    { key: 'school', label: 'School', required: true },
    { key: 'degree', label: 'Degree / Course' },
    { key: 'fromDate', label: 'From', type: 'date' },
    { key: 'toDate', label: 'To', type: 'date' },
    { key: 'yearGraduated', label: 'Year graduated', type: 'number' },
  ],
  history: [
    { key: 'departmentId', label: 'Department', type: 'dept', required: true },
    { key: 'positionId', label: 'Position', type: 'position', required: true },
    { key: 'startDate', label: 'From', type: 'date', required: true },
    { key: 'endDate', label: 'To (blank = present)', type: 'date' },
  ],
  eligibilities: [
    { key: 'eligibilityType', label: 'Eligibility', required: true, placeholder: 'e.g. Civil Service Professional' },
    { key: 'rating', label: 'Rating' },
    { key: 'examDate', label: 'Exam date', type: 'date' },
    { key: 'validUntil', label: 'Valid until', type: 'date' },
  ],
  awards: [
    { key: 'title', label: 'Award title', required: true },
    { key: 'issuer', label: 'Issued by' },
    { key: 'dateGiven', label: 'Date given', type: 'date' },
    { key: 'remarks', label: 'Remarks' },
  ],
};

const dateStr = (v) => (v ? String(v).slice(0, 10) : '');

/** Shared add/edit employee form with CSC 201 sections. */
export default function EmployeeForm({ formId, initial, submitLabel = 'Save', onSubmit }) {
  const [form, setForm] = useState(initial);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [active, setActive] = useState('personal');
  const [records, setRecords] = useState({});   // section -> rows
  const [draft, setDraft] = useState({});       // section -> add-form state
  const [busy, setBusy] = useState(false);
  const employeeId = initial?.id;
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  useEffect(() => {
    departmentsApi.list().then(r => setDepartments(r.data ?? r)).catch(() => {});
    api.get('/positions').then(r => setPositions(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    Promise.all(
      TABS.filter(t => t.id !== 'personal').map(t =>
        employeeSectionsApi.list(employeeId, t.id).then(r => [t.id, r.data ?? r]).catch(() => [t.id, []])
      )
    ).then(entries => setRecords(Object.fromEntries(entries)));
  }, [employeeId]);

  const selectedPosition = positions.find(p => p.id === form.positionId);
  const salaryGrade = selectedPosition ? `SG ${selectedPosition.salaryGrade}` : '';

  const addRecord = async (section) => {
    const data = draft[section] || {};
    const missing = SECTION_FIELDS[section].filter(f => f.required && !data[f.key]);
    if (missing.length) return;
    setBusy(true);
    try {
      const created = await employeeSectionsApi.create(employeeId, section, data);
      setRecords(r => ({ ...r, [section]: [...(r[section] || []), created.data ?? created] }));
      setDraft(d => ({ ...d, [section]: {} }));
    } catch { /* toast handled by caller page */ }
    finally { setBusy(false); }
  };

  const removeRecord = async (section, recordId) => {
    setBusy(true);
    try {
      await employeeSectionsApi.remove(employeeId, section, recordId);
      setRecords(r => ({ ...r, [section]: (r[section] || []).filter(x => x.id !== recordId) }));
    } catch { /* ignore */ }
    finally { setBusy(false); }
  };

  const displayValue = (section, f, row) => {
    if (f.key === 'departmentId') return row.department?.name ?? '';
    if (f.key === 'positionId') return row.position?.title ?? '';
    if (f.type === 'date') return dateStr(row[f.key]);
    return row[f.key] ?? '';
  };

  const renderSection = (section) => {
    const fields = SECTION_FIELDS[section];
    const rows = records[section] || [];
    const d = draft[section] || {};
    const setDraftKey = (key, value) => setDraft(s => ({ ...s, [section]: { ...(s[section] || {}), [key]: value } }));
    return (
      <div className="space-y-3">
        {!employeeId && (
          <p className="text-xs text-muted p-3 rounded-[8px] bg-bg/60 border border-line">
            Save the employee record first to manage {section} entries.
          </p>
        )}
        {employeeId && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-ink mb-1">{f.label}{f.required ? ' *' : ''}</label>
                  {f.type === 'select' ? (
                    <select className="input" value={d[f.key] ?? ''} onChange={e => setDraftKey(f.key, e.target.value)}>
                      <option value="" disabled>Select...</option>
                      {f.options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                    </select>
                  ) : f.type === 'dept' ? (
                    <select className="input" value={d[f.key] ?? ''} onChange={e => setDraftKey(f.key, e.target.value)}>
                      <option value="" disabled>Select...</option>
                      {departments.map(dep => <option key={dep.id} value={dep.id}>{dep.code} - {dep.name}</option>)}
                    </select>
                  ) : f.type === 'position' ? (
                    <select className="input" value={d[f.key] ?? ''} onChange={e => setDraftKey(f.key, e.target.value)}>
                      <option value="" disabled>Select...</option>
                      {positions.map(p => <option key={p.id} value={p.id}>{p.title} (SG {p.salaryGrade})</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type || 'text'}
                      className="input"
                      placeholder={f.placeholder}
                      value={d[f.key] ?? ''}
                      onChange={e => setDraftKey(f.key, f.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
            <div>
              <button type="button" className="btn btn-ghost text-sm" disabled={busy} onClick={() => addRecord(section)}>+ Add entry</button>
            </div>
            {rows.length > 0 && (
              <div className="overflow-auto border border-line rounded-[10px]">
                <table className="data-table">
                  <thead>
                    <tr>{fields.map(f => <th key={f.key}>{f.label}</th>)}<th className="text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.id}>
                        {fields.map(f => <td key={f.key}>{displayValue(section, f, row)}</td>)}
                        <td className="text-right">
                          <button type="button" className="btn btn-ghost text-xs" disabled={busy} onClick={() => removeRecord(section, row.id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {rows.length === 0 && <p className="text-xs text-muted">No entries yet.</p>}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap border-b border-line pb-2">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`px-3 py-1.5 rounded-[8px] text-sm transition ${active === t.id ? 'bg-accent/10 text-accent font-semibold' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Personal tab: the main form (kept mounted so the modal footer submit works) */}
      <div className={active === 'personal' ? '' : 'hidden'}>
        <form id={formId} onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="e-no" className="block text-sm font-medium text-ink mb-1">Employee No. *</label>
              <input id="e-no" required className="input" value={form.employeeNumber ?? ''} onChange={e => set('employeeNumber', e.target.value)} placeholder="EMP-0xx" />
            </div>
            <div>
              <label htmlFor="e-status" className="block text-sm font-medium text-ink mb-1">Employment Status</label>
              <select id="e-status" className="input" value={form.status ?? 'ACTIVE'} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="e-last" className="block text-sm font-medium text-ink mb-1">Last Name *</label>
              <input id="e-last" required className="input" value={form.lastName ?? ''} onChange={e => set('lastName', e.target.value)} />
            </div>
            <div>
              <label htmlFor="e-first" className="block text-sm font-medium text-ink mb-1">First Name *</label>
              <input id="e-first" required className="input" value={form.firstName ?? ''} onChange={e => set('firstName', e.target.value)} />
            </div>
            <div>
              <label htmlFor="e-middle" className="block text-sm font-medium text-ink mb-1">Middle Name</label>
              <input id="e-middle" className="input" value={form.middleName ?? ''} onChange={e => set('middleName', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="e-birth" className="block text-sm font-medium text-ink mb-1">Birth Date *</label>
              <input id="e-birth" required type="date" className="input" value={form.birthDate ?? ''} onChange={e => set('birthDate', e.target.value)} />
            </div>
            <div>
              <label htmlFor="e-gender" className="block text-sm font-medium text-ink mb-1">Gender *</label>
              <select id="e-gender" required className="input" value={form.gender ?? ''} onChange={e => set('gender', e.target.value)}>
                <option value="" disabled>Select...</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="e-civil" className="block text-sm font-medium text-ink mb-1">Civil Status *</label>
              <select id="e-civil" required className="input" value={form.civilStatus ?? ''} onChange={e => set('civilStatus', e.target.value)}>
                <option value="" disabled>Select...</option>
                {CIVIL_STATUSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="e-address" className="block text-sm font-medium text-ink mb-1">Address *</label>
            <input id="e-address" required className="input" value={form.address ?? ''} onChange={e => set('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="e-dept" className="block text-sm font-medium text-ink mb-1">Department *</label>
              <select id="e-dept" required className="input" value={form.departmentId ?? ''} onChange={e => set('departmentId', e.target.value)}>
                <option value="" disabled>Select...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="e-position" className="block text-sm font-medium text-ink mb-1">Position *</label>
              <select id="e-position" required className="input" value={form.positionId ?? ''} onChange={e => set('positionId', e.target.value)}>
                <option value="" disabled>Select...</option>
                {positions.map(p => <option key={p.id} value={p.id}>{p.title} (SG {p.salaryGrade})</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="e-hired" className="block text-sm font-medium text-ink mb-1">Date Hired *</label>
              <input id="e-hired" required type="date" className="input" value={form.hiredDate ?? ''} onChange={e => set('hiredDate', e.target.value)} />
            </div>
            <div>
              <label htmlFor="e-sg" className="block text-sm font-medium text-ink mb-1">Salary Grade</label>
              <input id="e-sg" className="input font-mono" value={salaryGrade} readOnly tabIndex={-1} placeholder="Auto from position" />
            </div>
            <div>
              <label htmlFor="e-email" className="block text-sm font-medium text-ink mb-1">Email</label>
              <input id="e-email" type="email" className="input" value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="name@lgu.gov.ph" />
            </div>
          </div>
          <div>
            <label htmlFor="e-contact" className="block text-sm font-medium text-ink mb-1">Contact No.</label>
            <input id="e-contact" className="input" value={form.contactNumber ?? ''} onChange={e => set('contactNumber', e.target.value)} placeholder="0917-000-0000" />
          </div>
        </form>
      </div>

      {active !== 'personal' && renderSection(active)}
    </div>
  );
}