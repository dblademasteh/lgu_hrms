import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Save, Building2, Users, Landmark } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { departmentsApi } from '../api/departments.js';
import { useToast } from '../components/Toast.jsx';

const UNIT_TYPES = [
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'DIVISION', label: 'Division' },
  { value: 'SECTION', label: 'Section' },
];

const LGU_OFFICE_CATEGORIES = [
  { value: 'EXECUTIVE', label: 'Executive' },
  { value: 'LEGISLATIVE', label: 'Legislative' },
  { value: 'LINE_OFFICE', label: 'Line Office' },
  { value: 'SUPPORT_OFFICE', label: 'Support Office' },
];

const emptyForm = {
  code: '',
  name: '',
  parent: '',
  unitType: 'DEPARTMENT',
  lguOfficeCategory: '',
  isMandatory: false,
  isOptional: false,
  isHrmOffice: false,
  headTitle: '',
  sanggunianConcurrence: false,
  concurrenceDate: '',
  concurrenceResolution: '',
  cscSubmissionDate: '',
  remarks: '',
};

export default function Organization() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [rename, setRename] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  useEffect(() => {
    departmentsApi.list().then(r => setList(r.data)).catch(() => toast('Failed to load departments', 'error'));
  }, [toast]);

  const parentMap = useMemo(() => {
    const map = new Map();
    for (const d of list) map.set(d.id, d);
    return map;
  }, [list]);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = [...list];
    if (q) {
      rows = rows.filter(d => `${d.code} ${d.name}`.toLowerCase().includes(q));
    }
    return rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.code.localeCompare(b.code));
  }, [list, search]);

  const addDept = async e => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    if (!code || !form.name.trim()) { toast('Code and name are required.', 'error'); return; }
    if (list.some(d => d.code === code)) { toast(`Department code ${code} already exists.`, 'error'); return; }
    try {
      const payload = {
        code,
        name: form.name.trim(),
        parentId: form.parent || null,
        unitType: form.unitType,
        lguOfficeCategory: form.lguOfficeCategory || null,
        isMandatory: form.isMandatory,
        isOptional: form.isOptional,
        isHrmOffice: form.isHrmOffice,
        headTitle: form.headTitle || null,
        sanggunianConcurrence: form.sanggunianConcurrence,
        concurrenceDate: form.concurrenceDate || null,
        concurrenceResolution: form.concurrenceResolution || null,
        cscSubmissionDate: form.cscSubmissionDate || null,
        remarks: form.remarks || null,
      };
      const r = await departmentsApi.create(payload);
      setList(l => [...l, r.data]);
      toast(`Organization unit ${code} added.`, 'success');
      setForm(emptyForm);
      setAddOpen(false);
    } catch { toast('Failed to add department', 'error'); }
  };

  const submitRename = async e => {
    e.preventDefault();
    if (!renameName.trim()) { toast('Name is required.', 'error'); return; }
    try {
      const r = await departmentsApi.update(rename.id, { name: renameName.trim() });
      setList(l => l.map(d => (d.id === rename.id ? r.data : d)));
      toast(`Department ${rename.code} renamed.`, 'success');
      setRename(null);
    } catch { toast('Failed to rename department', 'error'); }
  };

  const removeDept = async dept => {
    if (childrenOf(list, dept.id).length > 0) {
      toast(`${dept.code} has child units — move or remove them first.`, 'error');
      return;
    }
    try {
      await departmentsApi.remove(dept.id);
      setList(l => l.filter(d => d.id !== dept.id));
      toast(`Organization unit ${dept.code} removed.`, 'info');
    } catch { toast('Failed to remove department', 'error'); }
  };

  const startEdit = (dept) => {
    setForm({
      code: dept.code,
      name: dept.name,
      parent: dept.parentId || '',
      unitType: dept.unitType || 'DEPARTMENT',
      lguOfficeCategory: dept.lguOfficeCategory || '',
      isMandatory: dept.isMandatory,
      isOptional: dept.isOptional,
      isHrmOffice: dept.isHrmOffice,
      headTitle: dept.headTitle || '',
      sanggunianConcurrence: dept.sanggunianConcurrence,
      concurrenceDate: dept.concurrenceDate || '',
      concurrenceResolution: dept.concurrenceResolution || '',
      cscSubmissionDate: dept.cscSubmissionDate || '',
      remarks: dept.remarks || '',
    });
    setRename(dept);
    setRenameName(dept.name);
  };

  const submitEdit = async e => {
    e.preventDefault();
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        parentId: form.parent || null,
        unitType: form.unitType,
        lguOfficeCategory: form.lguOfficeCategory || null,
        isMandatory: form.isMandatory,
        isOptional: form.isOptional,
        isHrmOffice: form.isHrmOffice,
        headTitle: form.headTitle || null,
        sanggunianConcurrence: form.sanggunianConcurrence,
        concurrenceDate: form.concurrenceDate || null,
        concurrenceResolution: form.concurrenceResolution || null,
        cscSubmissionDate: form.cscSubmissionDate || null,
        remarks: form.remarks || null,
      };
      const r = await departmentsApi.update(rename.id, payload);
      setList(l => l.map(d => (d.id === rename.id ? r.data : d)));
      toast(`Department ${payload.code} updated.`, 'success');
      setRename(null);
      setForm(emptyForm);
    } catch { toast('Failed to update department', 'error'); }
  };

  const childCount = (parentId) => list.filter(d => d.parentId === parentId).length;

  const parentName = (parentId) => {
    if (!parentId) return '—';
    const p = parentMap.get(parentId);
    return p ? `${p.code} · ${p.name}` : '—';
  };

  return (
    <Layout maxWidth="max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Building2 size={20} className="text-accent" />
            Organization
          </h1>
          <p className="text-sm text-muted mt-0.5">Organizational structure, departments, divisions, and sections</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-outline gap-2" onClick={() => {}}>
            <Building2 size={16} />
            OSSP Compliance
          </button>
          <button type="button" className="btn btn-primary gap-2" onClick={() => { setForm(emptyForm); setRename(null); setAddOpen(true); }}>
            <Plus size={18} />
            Add Unit
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Departments</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{list.filter(d => d.unitType === 'DEPARTMENT').length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Divisions</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{list.filter(d => d.unitType === 'DIVISION').length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Sections</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{list.filter(d => d.unitType === 'SECTION').length}</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-display font-semibold text-ink">Organization Units</h2>
          <input
            type="search"
            className="input w-64"
            placeholder="Search code or name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Unit Type</th>
                <th>LGU Category</th>
                <th>Level</th>
                <th>Parent</th>
                <th>Head Title</th>
                <th>Flags</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(dept => (
                <tr key={dept.id}>
                  <td className="font-mono">{dept.code}</td>
                  <td className="font-medium">{dept.name}</td>
                  <td className="text-xs text-muted mono-label">{UNIT_TYPES.find(u => u.value === dept.unitType)?.label || dept.unitType}</td>
                  <td className="text-xs text-muted mono-label">
                    {dept.lguOfficeCategory ? LGU_OFFICE_CATEGORIES.find(c => c.value === dept.lguOfficeCategory)?.label || dept.lguOfficeCategory : '—'}
                  </td>
                  <td className="text-xs text-muted mono-label">{dept.level ?? 0}</td>
                  <td className="text-xs text-muted mono-label">{parentName(dept.parentId)}</td>
                  <td className="text-xs text-muted mono-label">{dept.headTitle || '—'}</td>
                  <td>
                    <span className="inline-flex flex-wrap gap-1">
                      {dept.isMandatory && <span className="text-xs badge badge-warning">Mandatory</span>}
                      {dept.isHrmOffice && <span className="text-xs badge badge-info">HRM Office</span>}
                      {dept.sanggunianConcurrence && <span className="text-xs badge badge-success">Sanggunian</span>}
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="inline-flex gap-1">
                      <button type="button" className="btn btn-ghost px-2 text-xs" onClick={() => startEdit(dept)}>
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button type="button" className="btn btn-ghost px-2 text-xs text-error hover:text-error-ink" onClick={() => setConfirmDel(dept)}>
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-muted text-sm">No organization units found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setForm(emptyForm); }}
        title="Add Organization Unit"
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => { setAddOpen(false); setForm(emptyForm); }}>
              <X size={16} />
              Cancel
            </button>
            <button type="submit" form="dept-form" className="btn btn-primary gap-2">
              <Plus size={16} />
              Add Unit
            </button>
          </>
        }
      >
        <form id="dept-form" onSubmit={addDept} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="d-code" className="block text-sm font-medium text-ink mb-1">Code *</label>
              <input id="d-code" className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. ITO" />
            </div>
            <div>
              <label htmlFor="d-type" className="block text-sm font-medium text-ink mb-1">Unit Type *</label>
              <select id="d-type" className="select" value={form.unitType} onChange={e => setForm(f => ({ ...f, unitType: e.target.value }))}>
                {UNIT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="d-category" className="block text-sm font-medium text-ink mb-1">Office Category</label>
              <select id="d-category" className="select" value={form.lguOfficeCategory} onChange={e => setForm(f => ({ ...f, lguOfficeCategory: e.target.value }))}>
                <option value="">None</option>
                {LGU_OFFICE_CATEGORIES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="d-name" className="block text-sm font-medium text-ink mb-1">Name *</label>
            <input id="d-name" className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="d-parent" className="block text-sm font-medium text-ink mb-1">Parent Unit</label>
            <select id="d-parent" className="select" value={form.parent} onChange={e => setForm(f => ({ ...f, parent: e.target.value }))}>
              <option value="">None (top level)</option>
              {list.map(d => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="d-head" className="block text-sm font-medium text-ink mb-1">Head Title</label>
            <input id="d-head" className="input" value={form.headTitle} onChange={e => setForm(f => ({ ...f, headTitle: e.target.value }))} placeholder="e.g. Department Head I" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={form.isMandatory} onChange={e => setForm(f => ({ ...f, isMandatory: e.target.checked }))} />
              Mandatory Position
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={form.isOptional} onChange={e => setForm(f => ({ ...f, isOptional: e.target.checked }))} />
              Optional Position
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={form.isHrmOffice} onChange={e => setForm(f => ({ ...f, isHrmOffice: e.target.checked }))} />
              HRM Office
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={form.sanggunianConcurrence} onChange={e => setForm(f => ({ ...f, sanggunianConcurrence: e.target.checked }))} />
              Sanggunian Concurrence
            </label>
          </div>
          {form.sanggunianConcurrence && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="d-concurrence-date" className="block text-sm font-medium text-ink mb-1">Concurrence Date</label>
                <input id="d-concurrence-date" type="date" className="input" value={form.concurrenceDate} onChange={e => setForm(f => ({ ...f, concurrenceDate: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="d-resolution" className="block text-sm font-medium text-ink mb-1">Resolution No.</label>
                <input id="d-resolution" className="input" value={form.concurrenceResolution} onChange={e => setForm(f => ({ ...f, concurrenceResolution: e.target.value }))} />
              </div>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={!!rename}
        onClose={() => { setRename(null); setForm(emptyForm); }}
        title={`Edit · ${rename?.code ?? ''}`}
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => { setRename(null); setForm(emptyForm); }}>
              <X size={16} />
              Cancel
            </button>
            <button type="submit" form="rename-form" className="btn btn-primary gap-2">
              <Save size={16} />
              Save
            </button>
          </>
        }
      >
        <form id="rename-form" onSubmit={submitEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="d-code" className="block text-sm font-medium text-ink mb-1">Code *</label>
              <input id="d-code" className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="d-type" className="block text-sm font-medium text-ink mb-1">Unit Type *</label>
              <select id="d-type" className="select" value={form.unitType} onChange={e => setForm(f => ({ ...f, unitType: e.target.value }))}>
                {UNIT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="d-category" className="block text-sm font-medium text-ink mb-1">Office Category</label>
              <select id="d-category" className="select" value={form.lguOfficeCategory} onChange={e => setForm(f => ({ ...f, lguOfficeCategory: e.target.value }))}>
                <option value="">None</option>
                {LGU_OFFICE_CATEGORIES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="d-name" className="block text-sm font-medium text-ink mb-1">Name *</label>
            <input id="d-name" className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="d-parent" className="block text-sm font-medium text-ink mb-1">Parent Unit</label>
            <select id="d-parent" className="select" value={form.parent} onChange={e => setForm(f => ({ ...f, parent: e.target.value }))}>
              <option value="">None (top level)</option>
              {list.map(d => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="d-head" className="block text-sm font-medium text-ink mb-1">Head Title</label>
            <input id="d-head" className="input" value={form.headTitle} onChange={e => setForm(f => ({ ...f, headTitle: e.target.value }))} placeholder="e.g. Department Head I" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={form.isMandatory} onChange={e => setForm(f => ({ ...f, isMandatory: e.target.checked }))} />
              Mandatory Position
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={form.isOptional} onChange={e => setForm(f => ({ ...f, isOptional: e.target.checked }))} />
              Optional Position
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={form.isHrmOffice} onChange={e => setForm(f => ({ ...f, isHrmOffice: e.target.checked }))} />
              HRM Office
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="checkbox" checked={form.sanggunianConcurrence} onChange={e => setForm(f => ({ ...f, sanggunianConcurrence: e.target.checked }))} />
              Sanggunian Concurrence
            </label>
          </div>
          {form.sanggunianConcurrence && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="d-concurrence-date" className="block text-sm font-medium text-ink mb-1">Concurrence Date</label>
                <input id="d-concurrence-date" type="date" className="input" value={form.concurrenceDate} onChange={e => setForm(f => ({ ...f, concurrenceDate: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="d-resolution" className="block text-sm font-medium text-ink mb-1">Resolution No.</label>
                <input id="d-resolution" className="input" value={form.concurrenceResolution} onChange={e => setForm(f => ({ ...f, concurrenceResolution: e.target.value }))} />
              </div>
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => removeDept(confirmDel)}
        title="Remove organization unit?"
        message={`${confirmDel?.code} · ${confirmDel?.name} will be removed. Units with children cannot be removed.`}
        confirmLabel="Remove"
        danger
      />
    </Layout>
  );
}

function childrenOf(list, parentId) {
  return list.filter(d => d.parentId === parentId);
}
