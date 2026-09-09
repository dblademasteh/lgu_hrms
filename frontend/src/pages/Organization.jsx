import React, { useState } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { departments } from '../data/mock.js';
import { useToast } from '../components/Toast.jsx';

const childrenOf = (list, code) => list.filter(d => d.parent === code);

function Node({ list, dept, depth, onRename, onRemove }) {
  const children = childrenOf(list, dept.code);
  return (
    <li>
      <div
        className="card p-4 flex items-center gap-3 flex-wrap"
        style={depth ? { marginLeft: `${depth * 1.5}rem` } : undefined}
      >
        <span className="mono-label">{dept.code}</span>
        <span className="font-display font-semibold text-ink text-sm">{dept.name}</span>
        <span className="ml-auto mono-label">Head · {dept.head}</span>
        <span className="inline-flex gap-1">
          <button type="button" className="btn btn-ghost px-2 text-xs" onClick={() => onRename(dept)}>Rename</button>
          <button type="button" className="btn btn-ghost px-2 text-xs" onClick={() => onRemove(dept)}>Remove</button>
        </span>
      </div>
      {children.length > 0 && (
        <ul className="mt-2 space-y-2">
          {children.map(c => (
            <Node key={c.code} list={list} dept={c} depth={depth + 1} onRename={onRename} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Organization() {
  const toast = useToast();
  const [list, setList] = useState(departments);
  const [addOpen, setAddOpen] = useState(false);
  const [rename, setRename] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', parent: '' });

  const addDept = e => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    if (!code || !form.name.trim()) { toast('Code and name are required.', 'error'); return; }
    if (list.some(d => d.code === code)) { toast(`Department code ${code} already exists.`, 'error'); return; }
    setList(l => [...l, { code, name: form.name.trim(), parent: form.parent || null, head: '—' }]);
    toast(`Department ${code} added.`, 'success');
    setForm({ code: '', name: '', parent: '' });
    setAddOpen(false);
  };

  const submitRename = e => {
    e.preventDefault();
    if (!renameName.trim()) { toast('Name is required.', 'error'); return; }
    setList(l => l.map(d => (d.code === rename.code ? { ...d, name: renameName.trim() } : d)));
    toast(`Department ${rename.code} renamed.`, 'success');
    setRename(null);
  };

  const removeDept = dept => {
    if (childrenOf(list, dept.code).length > 0) {
      toast(`${dept.code} has child departments — move or remove them first.`, 'error');
      return;
    }
    setList(l => l.filter(d => d.code !== dept.code));
    toast(`Department ${dept.code} removed.`, 'info');
  };

  const roots = list.filter(d => !d.parent);

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Organization</h1>
          <p className="text-sm text-muted mt-0.5">Multi-level department hierarchy</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>Add Department</button>
      </div>

      <ul className="space-y-2">
        {roots.map(r => (
          <Node
            key={r.code}
            list={list}
            dept={r}
            depth={0}
            onRename={d => { setRename(d); setRenameName(d.name); }}
            onRemove={setConfirmDel}
          />
        ))}
      </ul>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Department"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" form="dept-form" className="btn btn-primary">Add Department</button>
          </>
        }
      >
        <form id="dept-form" onSubmit={addDept} className="space-y-4">
          <div>
            <label htmlFor="d-code" className="block text-sm font-medium text-ink mb-1">Code *</label>
            <input id="d-code" className="input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. ITO" />
          </div>
          <div>
            <label htmlFor="d-name" className="block text-sm font-medium text-ink mb-1">Name *</label>
            <input id="d-name" className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="d-parent" className="block text-sm font-medium text-ink mb-1">Parent Unit</label>
            <select id="d-parent" className="input" value={form.parent} onChange={e => setForm(f => ({ ...f, parent: e.target.value }))}>
              <option value="">None (top level)</option>
              {list.map(d => <option key={d.code} value={d.code}>{d.code} · {d.name}</option>)}
            </select>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!rename}
        onClose={() => setRename(null)}
        title={`Rename · ${rename?.code ?? ''}`}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setRename(null)}>Cancel</button>
            <button type="submit" form="rename-form" className="btn btn-primary">Save</button>
          </>
        }
      >
        <form id="rename-form" onSubmit={submitRename}>
          <label htmlFor="d-rename" className="block text-sm font-medium text-ink mb-1">Department name</label>
          <input id="d-rename" className="input" value={renameName} onChange={e => setRenameName(e.target.value)} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => removeDept(confirmDel)}
        title="Remove department?"
        message={`${confirmDel?.code} · ${confirmDel?.name} will be removed from the hierarchy. Units with children cannot be removed.`}
        confirmLabel="Remove"
        danger
      />
    </Layout>
  );
}