import React, { useState } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { users, departments, roleMatrix, badgeTone } from '../data/mock.js';
import { useToast } from '../components/Toast.jsx';

const ROLES = ['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD', 'AUDITOR'];
const emptyForm = { username: '', role: 'HR_MANAGER', department: '' };

export default function Users() {
  const toast = useToast();
  const [list, setList] = useState(users);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState(null);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = u => {
    setEditing(u);
    setForm({ username: u.username, role: u.role, department: u.department ?? '' });
    setFormOpen(true);
  };

  const submit = e => {
    e.preventDefault();
    if (!form.username.trim()) { toast('Username is required.', 'error'); return; }
    if (editing) {
      setList(l => l.map(u => (u.id === editing.id ? { ...u, ...form, department: form.department || null } : u)));
      toast(`User ${form.username} updated.`, 'success');
    } else {
      if (list.some(u => u.username === form.username.trim())) { toast('Username already exists.', 'error'); return; }
      setList(l => [...l, { id: Math.max(0, ...l.map(x => x.id)) + 1, ...form, department: form.department || null, status: 'Active' }]);
      toast(`User ${form.username} created.`, 'success');
    }
    setFormOpen(false);
  };

  const toggleStatus = u => {
    const next = u.status === 'Active' ? 'Inactive' : 'Active';
    setList(l => l.map(x => (x.id === u.id ? { ...x, status: next } : x)));
    toast(`User ${u.username} set to ${next}.`, next === 'Active' ? 'success' : 'info');
  };

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Users &amp; Roles</h1>
          <p className="text-sm text-muted mt-0.5">RBAC administration and permission matrix</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAdd}>Add User</button>
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">User Accounts</h3>
          <span className="mono-label">{list.filter(u => u.status === 'Active').length} active</span>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th>Username</th><th>Role</th><th>Department</th><th>Status</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {list.map(u => (
                <tr key={u.id}>
                  <td className="font-mono">{u.username}</td>
                  <td><span className="badge badge-accent">{u.role}</span></td>
                  <td className="font-mono">{u.department ?? '—'}</td>
                  <td><span className={`badge ${badgeTone(u.status)}`}>{u.status}</span></td>
                  <td className="text-right">
                    <span className="inline-flex gap-2">
                      <button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => openEdit(u)}>Edit</button>
                      <button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => setConfirm(u)}>
                        {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-display font-semibold text-ink mb-3">Permissions Matrix</h3>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th>Capability</th>{ROLES.map(r => <th key={r} className="text-center">{r.replaceAll('_', ' ')}</th>)}</tr>
            </thead>
            <tbody>
              {roleMatrix.map(row => (
                <tr key={row.capability}>
                  <td className="font-medium">{row.capability}</td>
                  {ROLES.map(r => (
                    <td key={r} className="text-center">
                      {row[r]
                        ? <span className="text-success font-bold" aria-label="Allowed">✓</span>
                        : <span className="text-muted" aria-label="Denied">·</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit User · ${editing.username}` : 'Add User'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" form="user-form" className="btn btn-primary">{editing ? 'Save Changes' : 'Create User'}</button>
          </>
        }
      >
        <form id="user-form" onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="u-username" className="block text-sm font-medium text-ink mb-1">Username</label>
            <input id="u-username" className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="u-role" className="block text-sm font-medium text-ink mb-1">Role</label>
            <select id="u-role" className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="u-dept" className="block text-sm font-medium text-ink mb-1">Department scope</label>
            <select id="u-dept" className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
              <option value="">All departments (central)</option>
              {departments.map(d => <option key={d.code} value={d.code}>{d.code} · {d.name}</option>)}
            </select>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => toggleStatus(confirm)}
        title={`${confirm?.status === 'Active' ? 'Deactivate' : 'Activate'} user?`}
        message={`User account "${confirm?.username}" will be set to ${confirm?.status === 'Active' ? 'Inactive — they will lose access.' : 'Active — they will regain access.'}`}
        confirmLabel={confirm?.status === 'Active' ? 'Deactivate' : 'Activate'}
        danger={confirm?.status === 'Active'}
      />
    </Layout>
  );
}