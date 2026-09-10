import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { usersApi } from '../api/users.js';
import { departmentsApi } from '../api/departments.js';
import { listEmployees } from '../api/employees.js';
import { roleMatrix, badgeTone } from '../data/mock.js';

const ROLES = ['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD', 'AUDITOR'];
const emptyForm = { username: '', role: 'HR_MANAGER', departmentId: '', externalId: '' };

export default function Users() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    usersApi.list().then(r => setList(r.data)).catch(()=>toast('Failed to load users','error'));
    departmentsApi.list().then(r => setDeptList(r.data)).catch(()=>{});
    listEmployees({ page: 1, limit: 200 }).then(({ items = [] }) => setEmployees(items)).catch(()=>{});
  }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = u => {
    setEditing(u);
    setForm({ username: u.username, role: u.role, departmentId: u.departmentId ?? '', externalId: u.externalId ?? '' });
    setFormOpen(true);
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.username.trim()) { toast('Username is required.', 'error'); return; }
    try {
      if (editing) {
        const r = await usersApi.update(editing.id, form);
        setList(l => l.map(u => u.id === editing.id ? r.data : u));
        toast(`User ${form.username} updated.`, 'success');
      } else {
        const r = await usersApi.create(form);
        setList(l => [...l, r.data]);
        toast(`User ${form.username} created.`, 'success');
      }
      setFormOpen(false);
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      toast(msg || 'Operation failed', 'error');
    }
  };

  // DB stores status as 'ACTIVE'/'INACTIVE' (uppercase); the API contract
  // enforces the same. Normalize here so seeded rows and toggles agree.
  const isActive = u => String(u.status ?? '').toUpperCase() === 'ACTIVE';

  const toggleStatus = async u => {
    const next = isActive(u) ? 'INACTIVE' : 'ACTIVE';
    try {
      const r = await usersApi.update(u.id, { status: next });
      setList(l => l.map(x => (x.id === u.id ? r.data : x)));
      toast(`User ${u.username} set to ${next === 'ACTIVE' ? 'Active' : 'Inactive'}.`, next === 'ACTIVE' ? 'success' : 'info');
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      toast(msg || 'Status change failed', 'error');
    }
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
          <span className="mono-label">{list.filter(isActive).length} active</span>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th>Username</th><th>Role</th><th>Department</th><th>Linked Employee (ESS)</th><th>Status</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {list.map(u => (
                <tr key={u.id}>
                  <td className="font-mono">{u.username}</td>
                  <td><span className="badge badge-accent">{u.role}</span></td>
                  <td className="font-mono">{u.department?.name ?? u.department ?? '—'}</td>
                  <td>
                    {u.linkedEmployee
                      ? <span className="font-mono text-xs">{u.linkedEmployee.employeeNumber} · {u.linkedEmployee.lastName}, {u.linkedEmployee.firstName}</span>
                      : <span className="text-muted text-xs">—</span>}
                  </td>
                  <td><span className={`badge ${badgeTone(u.status)}`}>{u.status}</span></td>
                  <td className="text-right">
                    <span className="inline-flex gap-2">
                      <button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => openEdit(u)}>Edit</button>
                      <button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => setConfirm(u)}>
                        {isActive(u) ? 'Deactivate' : 'Activate'}
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
            <select id="u-role" className="select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="u-dept" className="block text-sm font-medium text-ink mb-1">Department scope</label>
            <select id="u-dept" className="select" value={form.departmentId || ''} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
              <option value="">All departments (central)</option>
              {deptList.map(d => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="u-employee" className="block text-sm font-medium text-ink mb-1">Linked employee (ESS access)</label>
            <select id="u-employee" className="select" value={form.externalId || ''} onChange={e => setForm(f => ({ ...f, externalId: e.target.value || null }))}>
              <option value="">None (staff account only)</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.employeeNumber}>
                  {emp.employeeNumber} · {emp.lastName}, {emp.firstName}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1">Links this account to an employee record so they can use the ESS portal (payslips, leave filing, attendance).</p>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => toggleStatus(confirm)}
        title={`${confirm && isActive(confirm) ? 'Deactivate' : 'Activate'} user?`}
        message={`User account "${confirm?.username}" will be set to ${confirm && isActive(confirm) ? 'Inactive — they will lose access.' : 'Active — they will regain access.'}`}
        confirmLabel={confirm && isActive(confirm) ? 'Deactivate' : 'Activate'}
        danger={!!confirm && isActive(confirm)}
      />
    </Layout>
  );
}