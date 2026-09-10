import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { departmentsApi } from '../api/departments.js';
import { useToast } from '../components/Toast.jsx';

const childrenOf = (list, parentId) => list.filter(d => d.parentId === parentId);

function Node({ list, dept, onRename, onRemove, expanded, onToggle }) {
  const hasChildren = childrenOf(list, dept.id).length > 0;
  const isExpanded = expanded || !hasChildren;
  
  return (
    <li className="mb-2">
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          className="btn btn-ghost p-1 rounded-full hover:bg-bg/50"
          onClick={() => hasChildren && onToggle(dept.id)}
          aria-label={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : ''}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown size={16} className="text-muted" />
            ) : (
              <ChevronDown size={16} className="text-muted rotate-180" />
            )
          )}
        </button>
        <span className="mono-label bg-accent/10 text-accent px-2 py-1 rounded text-xs font-medium">
          {dept.code}
        </span>
        <span className="font-display font-semibold text-ink text-sm">{dept.name}</span>
        <span className="ml-auto text-xs text-muted mono-label">Level {dept.level}</span>
        <div className="flex items-center gap-1">
          <button 
            type="button" 
            className="btn btn-ghost px-2 text-xs flex items-center gap-1" 
            onClick={() => onRename(dept)}
          >
            <Pencil size={14} />
            Rename
          </button>
          <button 
            type="button" 
            className="btn btn-ghost px-2 text-xs text-error hover:text-error-ink" 
            onClick={() => onRemove(dept)}
          >
            <Trash2 size={14} />
            Remove
          </button>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <ul className="ml-4 mt-2 space-y-2 border-l border-line pl-4">
          {childrenOf(list, dept.id).map(c => (
            <Node
              key={c.id}
              list={list}
              dept={c}
              onRename={onRename}
              onRemove={onRemove}
              expanded={!!expanded[c.id]}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Organization() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [rename, setRename] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', parent: '' });

  useEffect(() => {
    departmentsApi.list().then(r => setList(r.data)).catch(() => toast('Failed to load departments', 'error'));
  }, []);

  const addDept = async e => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    if (!code || !form.name.trim()) { toast('Code and name are required.', 'error'); return; }
    if (list.some(d => d.code === code)) { toast(`Department code ${code} already exists.`, 'error'); return; }
    try {
      const r = await departmentsApi.create({ code, name: form.name.trim(), parentId: form.parent || null });
      setList(l => [...l, r.data]);
      toast(`Department ${code} added.`, 'success');
      setForm({ code: '', name: '', parent: '' });
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
      toast(`${dept.code} has child departments — move or remove them first.`, 'error');
      return;
    }
    try {
      await departmentsApi.remove(dept.id);
      setList(l => l.filter(d => d.id !== dept.id));
      toast(`Department ${dept.code} removed.`, 'info');
    } catch { toast('Failed to remove department', 'error'); }
  };

  const roots = list.filter(d => !d.parentId);
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (id) => {
    setExpanded(e => ({ ...e, [id]: !e[id] }));
  };

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Organization</h1>
          <p className="text-sm text-muted mt-0.5">Multi-level department hierarchy</p>
        </div>
        <button type="button" className="btn btn-primary gap-2" onClick={() => setAddOpen(true)}>
          <Plus size={18} />
          Add Department
        </button>
      </div>

      <ul className="space-y-2">
        {roots.map(r => (
          <Node
            key={r.id}
            list={list}
            dept={r}
            onRename={d => { setRename(d); setRenameName(d.name); }}
            onRemove={setConfirmDel}
            expanded={!!expanded[r.id]}
            onToggle={toggleExpand}
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
              {list.map(d => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
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