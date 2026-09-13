import React, { useState, useEffect } from 'react';
import { Plus, Save, X, Edit, UserCheck, Shield, Building2, Settings, Copy, Trash2 } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { usersApi } from '../api/users.js';
import { departmentsApi } from '../api/departments.js';
import { databaseApi } from '../api/database.js';
import { rolesApi } from '../api/roles.js';
import { listEmployees } from '../api/employees.js';
import { badgeTone } from '../data/mock.js';
import { PERMISSIONS, ROLE_BADGE_TONES } from '../config/permissions.js';

const emptyForm = { username: '', role: '', departmentId: '', externalId: '' };

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
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [roleSaving, setRoleSaving] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [editingPermissions, setEditingPermissions] = useState(false);
  const [permissionDraft, setPermissionDraft] = useState(() => {
    try {
      const raw = localStorage.getItem('permissions-overrides');
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = {};
        for (const key of Object.keys(PERMISSIONS)) {
          merged[key] = { ...PERMISSIONS[key], ...(parsed[key] || {}) };
        }
        return merged;
      }
    } catch {}
    return PERMISSIONS;
  });

  const persistPermissions = (draft) => {
    const overrides = {};
    for (const key of Object.keys(PERMISSIONS)) {
      const original = PERMISSIONS[key];
      const current = draft[key] || {};
      const delta = {};
      for (const cap of Object.keys(original)) {
        if (current[cap] !== original[cap]) delta[cap] = current[cap];
      }
      if (Object.keys(delta).length > 0) overrides[key] = delta;
    }
    localStorage.setItem('permissions-overrides', JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent('permissions-changed'));
  };

  const togglePermission = (roleKey, capKey) => {
    setPermissionDraft(prev => {
      const next = {
        ...prev,
        [roleKey]: {
          ...prev[roleKey],
          [capKey]: !prev[roleKey]?.[capKey],
        },
      };
      persistPermissions(next);
      return next;
    });
  };

  useEffect(() => {
    usersApi.list().then(r => setList(r.data)).catch(()=>toast('Failed to load users','error'));
    departmentsApi.list().then(r => setDeptList(r.data)).catch(()=>{});
    listEmployees({ page: 1, limit: 200 }).then(({ items = [] }) => setEmployees(items)).catch(()=>{});
    if (myRole === 'SUPER_ADMIN') databaseApi.tenants().then(setTenants).catch(()=>setTenants([]));
    rolesApi.list().then(r => setRoles(r.data?.roles || [])).catch(()=>{}).finally(() => setRolesLoading(false));
  }, [myRole]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = u => {
    setEditing(u);
    setForm({ username: u.username, role: u.role, departmentId: u.departmentId ?? '', externalId: u.externalId ?? '' });
    setFormOpen(true);
  };

  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');

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
        if (r.data.temporaryPassword) {
          setTemporaryPassword(r.data.temporaryPassword);
          setShowTemporaryPassword(true);
        } else {
          toast(`User ${form.username} created.`, 'success');
        }
      }
      setFormOpen(false);
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      toast(msg || 'Operation failed', 'error');
    }
  };

  const handleCreateRole = async e => {
    e.preventDefault();
    if (!roleForm.name.trim()) { toast('Role name is required', 'error'); return; }
    setRoleSaving(true);
    try {
      const payload = { name: roleForm.name.trim(), description: roleForm.description.trim() || undefined };
      let r;
      if (editingRole) {
        r = await rolesApi.update(editingRole.name, payload);
        setRoles(rs => rs.map(x => x.name === editingRole.name ? r.data.role : x).sort((a, b) => a.name.localeCompare(b.name)));
        toast('Role updated', 'success');
      } else {
        // Duplicate check
        const exists = roles.some(x => x.name.toUpperCase() === payload.name.toUpperCase());
        if (exists) {
          toast('Role already exists', 'error');
          setRoleSaving(false);
          return;
        }
        r = await rolesApi.create(payload);
        setRoles(rs => [...rs, r.data.role].sort((a, b) => a.name.localeCompare(b.name)));
        toast('Role created', 'success');
      }
      setRoleForm({ name: '', description: '' });
      setEditingRole(null);
      setShowRoleModal(false);
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to save role', 'error');
    } finally {
      setRoleSaving(false);
    }
  };

  const openEditRole = r => {
    setEditingRole(r);
    setRoleForm({ name: r.name, description: r.description || '' });
  };

  const handleDeleteRole = async r => {
    try {
      await rolesApi.delete(r.name);
      setRoles(rs => rs.filter(x => x.name !== r.name));
      toast('Role deleted', 'success');
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to delete role', 'error');
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

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    try {
      await usersApi.delete(deleteConfirm.id);
      setList(l => l.filter(x => x.id !== deleteConfirm.id));
      toast(`User ${deleteConfirm.username} deleted.`, 'success');
      setDeleteConfirm(null);
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      toast(msg || 'Delete failed', 'error');
    }
  };

  return (
    <Layout>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Users &amp; Roles</h1>
            <p className="text-sm text-muted mt-0.5">RBAC administration and permission matrix</p>
          </div>
          <div className="flex items-center gap-2">
            {myRole === 'ADMIN' && (
              <button type="button" className="btn btn-ghost gap-2" onClick={() => { setEditingRole(null); setRoleForm({ name: '', description: '' }); setShowRoleModal(true); }}>
                <Settings size={16} />
                Manage Roles
              </button>
            )}
            <button type="button" className="btn btn-primary gap-2" onClick={openAdd}>
              <Plus size={16} />
              Add User
            </button>
          </div>
        </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">User Accounts</h3>
          <span className="flex items-center gap-3 mono-label">
            {list.filter(isActive).length} active
            <input
              className="input input-sm mono-label"
              placeholder="Search users..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              aria-label="Search users"
            />
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
            const tenantFiltered = tenantFilter
              ? list.filter(u => u.tenantId === tenantFilter)
              : list;
            const shown = userSearch
              ? tenantFiltered.filter(u =>
                  u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                  u.role.toLowerCase().includes(userSearch.toLowerCase()) ||
                  (u.linkedEmployee?.employeeNumber || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                  (u.linkedEmployee?.lastName || '').toLowerCase().includes(userSearch.toLowerCase())
                )
              : tenantFiltered;
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
                        <span className={"badge " + (ROLE_BADGE_TONES[u.role] || 'badge-neutral')}>{u.role}</span>
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
                          <button type="button" className="btn btn-ghost px-2 text-xs text-error" onClick={() => setDeleteConfirm(u)}>
                            Delete
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted py-4">No users match your search.</td></tr>
                  )}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">Permissions Matrix</h3>
          <div className="flex items-center gap-2">
            {editingPermissions ? (
              <>
                <button type="button" className="btn btn-ghost text-xs" onClick={() => { setPermissionDraft(PERMISSIONS); persistPermissions(PERMISSIONS); }}>
                  Reset
                </button>
                <button type="button" className="btn btn-primary text-xs" onClick={() => setEditingPermissions(false)}>
                  Done
                </button>
              </>
            ) : (
              myRole === 'ADMIN' && (
                <button type="button" className="btn btn-ghost text-xs" onClick={() => setEditingPermissions(true)}>
                  Edit Permissions
                </button>
              )
            )}
          </div>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th>Capability</th>{(roles || []).map(r => <th key={r.id} className="text-center">{(r.name || '').replaceAll('_', ' ')}</th>)}</tr>
            </thead>
            <tbody>
              {Object.entries(permissionDraft).map(([roleKey, perms]) => (
                <tr key={roleKey}>
                  <td className="font-medium">{perms.label || roleKey}</td>
                  {(roles || []).map(r => {
                    const allowed = permissionDraft[r.name]?.[roleKey];
                    const canEdit = myRole === 'ADMIN' && editingPermissions;
                    return (
                      <td key={r.id} className="text-center">
                        {canEdit ? (
                          <button
                            type="button"
                            className={"btn btn-ghost px-2 py-1 text-xs " + (allowed ? 'text-success' : 'text-muted')}
                            onClick={() => togglePermission(r.name, roleKey)}
                            aria-label={allowed ? 'Allowed' : 'Denied'}
                          >
                            {allowed ? '✓' : '·'}
                          </button>
                        ) : (
                          allowed
                            ? <span className="text-success font-bold" aria-label="Allowed">✓</span>
                            : <span className="text-muted" aria-label="Denied">·</span>
                        )}
                      </td>
                    );
                  })}
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
              {roles.map(r => <option key={r.name} value={r.name}>{r.name.replaceAll('_', ' ')}</option>)}
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

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteUser}
        title="Delete user?"
        message={`User account "${deleteConfirm?.username}" will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete"
        danger
      />

      <Modal open={showRoleModal} onClose={() => { setShowRoleModal(false); setEditingRole(null); setRoleForm({ name: '', description: '' }); }} title={editingRole ? 'Edit Role' : 'Manage Roles'} footer={
        <>
          <button type="button" className="btn" onClick={() => { setShowRoleModal(false); setEditingRole(null); setRoleForm({ name: '', description: '' }); }}>Close</button>
          {editingRole ? (
            <button type="submit" form="role-form" className="btn btn-primary" disabled={roleSaving}>
              <Save size={14} /> {roleSaving ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <button type="submit" form="role-form" className="btn btn-primary" disabled={roleSaving}>
              <Save size={14} /> {roleSaving ? 'Saving...' : 'Create Role'}
            </button>
          )}
        </>
      }>
        <form id="role-form" onSubmit={handleCreateRole} className="space-y-4">
          <p className="text-sm text-muted">{editingRole ? 'Update role details.' : 'Create custom roles for this tenant. System roles cannot be deleted.'}</p>
          <div>
            <label htmlFor="role-name" className="block text-sm font-medium text-ink mb-1">Role Name</label>
            <input id="role-name" className="input" value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="e.g. CASHIER" disabled={!!editingRole} />
          </div>
          <div>
            <label htmlFor="role-desc" className="block text-sm font-medium text-ink mb-1">Description (optional)</label>
            <input id="role-desc" className="input" value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="What this role can do" />
          </div>
        </form>
        <div className="mt-6">
          <h3 className="font-display font-semibold text-ink mb-3">Existing Roles</h3>
          {rolesLoading ? (
            <p className="text-sm text-muted">Loading roles...</p>
          ) : (
            <div className="space-y-2">
              {roles.map(r => (
                <div key={r.name} className="flex items-center justify-between p-3 bg-bg rounded-lg border border-line">
                  <div>
                    <p className="font-medium text-ink text-sm">{r.name}</p>
                    <p className="text-xs text-muted">{r.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.isSystem && <span className="badge badge-neutral text-[10px]">SYSTEM</span>}
                    {!r.isSystem && (
                      <>
                        <button type="button" className="btn btn-ghost px-2 text-xs" onClick={() => openEditRole(r)}>
                          <Edit size={14} /> Edit
                        </button>
                        <button type="button" className="btn btn-ghost px-2 text-xs text-error" onClick={() => handleDeleteRole(r)}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={showTemporaryPassword} onClose={() => setShowTemporaryPassword(false)} title="User Created - Temporary Password" footer={
        <>
          <button type="button" className="btn" onClick={() => setShowTemporaryPassword(false)}>Close</button>
          <button type="button" className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(temporaryPassword); toast('Password copied', 'success'); }}>
            <Copy size={14} /> Copy Password
          </button>
        </>
      }>
        <div className="space-y-4">
          <p className="text-sm text-muted">Share this temporary password with the user. They will be required to change it on first login.</p>
          <div className="p-3 bg-bg rounded-lg border border-line">
            <code className="text-lg font-mono font-bold text-ink break-all">{temporaryPassword}</code>
          </div>
          <p className="text-xs text-muted">Password expires after 30 days. User must change it on first login.</p>
        </div>
      </Modal>
    </Layout>
  );
}