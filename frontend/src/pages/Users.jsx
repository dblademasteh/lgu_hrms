import React, { useState, useEffect } from 'react';
import { Plus, Save, X, Edit, UserCheck, Shield, Building2 } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { usersApi } from '../api/users.js';
import { departmentsApi } from '../api/departments.js';
import { databaseApi } from '../api/database.js';
import { listEmployees } from '../api/employees.js';
import { roleMatrix, badgeTone } from '../data/mock.js';

const ROLES = ['ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'DEPARTMENT_HEAD', 'AUDITOR'];
const emptyForm = { username: '', role: 'HR_MANAGER', departmentId: '', externalId: '' };

export default function Users() {
  const toast = useToast();
  const myRole = useAuthStore(s => s.user?.role);
  const [list, setList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tenants, setTenants] = useState(null);
  const [tenantFilter, setTenantFilter] = useState(null);
  const [tenantForm, setTenantForm] = useState({ code: '', name: '', domain: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    usersApi.list().then(r => setList(r.data)).catch(()=>toast('Failed to load users','error'));
    departmentsApi.list().then(r => setDeptList(r.data)).catch(()=>{});
    listEmployees({ page: 1, limit: 200 }).then(({ items = [] }) => setEmployees(items)).catch(()=>{});
    if (myRole === 'SUPER_ADMIN') databaseApi.tenants().then(setTenants).catch(()=>setTenants([]));
  }, [myRole]);

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
        <button type="button" className="btn btn-primary gap-2" onClick={openAdd}>
            <Plus size={16} />
            Add User
          </button>
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">User Accounts</h3>
          <span className="flex items-center gap-3 mono-label">
            {list.filter(isActive).length} active
            {myRole === 'SUPER_ADMIN' && tenants && (
              <select
                className="select select-sm mono-label"
                value={tenantFilter ?? ''}
                onChange={e => setTenantFilter(e.target.value || null)}
                aria-label="Filter by tenant"
              >
                <option value="">All tenants</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.code} · {t.name}</option>
                ))}
              </select>
            )}
          </span>
        </div>
        <div className="overflow-auto">
          {(() => {
            const shown = tenantFilter
              ? list.filter(u => u.tenantId === tenantFilter)
              : list;
            return (
              <table className="data-table">
                <thead>
                  <tr><th>Username</th><th>Role</th><th>Tenant</th><th>Department</th><th>Linked Employee (ESS)</th><th>Status</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {shown.map(u => (
                    <tr key={u.id}>
                      <td className="font-mono">{u.username}</td>
                      <td>
                        <span className="badge badge-accent">{u.role}</span>
                        {u.role === 'SUPER_ADMIN' && <span className="badge badge-success ml-1 mono-label">PLATFORM</span>}
                      </td>
                      <td className="font-mono text-xs">
                        {u.tenantId
                          ? u.tenantId.slice(0, 8) + '…'
                          : <span className="text-muted">unscoped</span>}
                      </td>
                      <td className="font-mono">{u.department?.name ?? u.department ?? '—'}</td>
                      <td>
                        {u.linkedEmployee
                          ? <span className="font-mono text-xs">{u.linkedEmployee.employeeNumber} · {u.linkedEmployee.lastName}, {u.linkedEmployee.firstName}</span>
                          : <span className="text-muted text-xs">—</span>}
                      </td>
                      <td><span className={"badge " + badgeTone(u.status)}>{u.status}</span></td>
                      <td className="text-right">
                        <span className="inline-flex gap-1">
                          <button type="button" className="btn btn-ghost px-2 text-xs" onClick={() => openEdit(u)}>
                            <Edit size={14} />
                            Edit
                          </button>
                          <button type="button" className="btn btn-ghost px-2 text-xs" onClick={() => setConfirm(u)}>
                            {isActive(u) ? <><UserCheck size={14} /> Deactivate</> : <><Shield size={14} /> Activate</>}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
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

      {myRole === 'SUPER_ADMIN' && (
        <div className="card p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink flex items-center gap-2"><Building2 size={16}/> Tenants</h3>
            <span className="mono-label">{tenants?.length ?? '…'} registered</span>
          </div>
          <div className="overflow-auto mb-3">
            <table className="data-table">
              <thead><tr><th>Code</th><th>Name</th><th>Domain</th><th>Status</th></tr></thead>
              <tbody>
                {(tenants ?? []).map(t => (
                  <tr key={t.id}>
                    <td className="font-mono">{t.code}</td>
                    <td className="font-medium">{t.name}</td>
                    <td className="font-mono text-xs">{t.domain ?? '—'}</td>
                    <td>{t.isActive ? <span className="badge badge-success">Active</span> : <span className="badge">Disabled</span>}</td>
                  </tr>
                ))}
                {tenants?.length === 0 && <tr><td colSpan={4} className="text-muted text-sm">No tenants yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <form className="grid sm:grid-cols-4 gap-2" onSubmit={async e => {
            e.preventDefault();
            if (!tenantForm.code.trim() || !tenantForm.name.trim()) { toast('Code and name are required', 'error'); return; }
            try {
              const t = await databaseApi.createTenant({ code: tenantForm.code.trim().toUpperCase(), name: tenantForm.name.trim(), domain: tenantForm.domain.trim() || undefined });
              setTenants(ts => [...(ts ?? []), t]);
              setTenantForm({ code: '', name: '', domain: '' });
              toast('Tenant ' + t.code + ' created', 'success');
            } catch (err) { toast(err?.response?.data?.error?.message || 'Could not create tenant', 'error'); }
          }}>
            <input className="input" placeholder="CODE" value={tenantForm.code} onChange={e => setTenantForm({ ...tenantForm, code: e.target.value })} aria-label="Tenant code" />
            <input className="input" placeholder="LGU name" value={tenantForm.name} onChange={e => setTenantForm({ ...tenantForm, name: e.target.value })} aria-label="Tenant name" />
            <input className="input" placeholder="domain (optional)" value={tenantForm.domain} onChange={e => setTenantForm({ ...tenantForm, domain: e.target.value })} aria-label="Tenant domain" />
            <button type="submit" className="btn btn-primary gap-2"><Plus size={14}/> Add tenant</button>
          </form>
          <p className="text-[11px] text-muted mt-2">Scaffold scope: User + Department carry tenantId today. Full per-table rollout is tracked in PRE_PRODUCTION_CHECKLIST.</p>
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit User · ' + editing.username : 'Add User'}
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => setFormOpen(false)}>
              <X size={16} />
              Cancel
            </button>
            <button type="submit" form="user-form" className="btn btn-primary gap-2">
              <Save size={16} />
              {editing ? 'Save Changes' : 'Create User'}
            </button>
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