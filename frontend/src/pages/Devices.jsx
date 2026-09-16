import React, { useEffect, useState } from 'react';
import { Fingerprint, Plus, RefreshCw, Save, X, Trash2, Server, Info, AlertTriangle, Activity, Users } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { biometricDevicesApi } from '../api/biometricDevices.js';
import { biometricDeviceUsersApi } from '../api/biometricDevices.js';

const EMPTY_FORM = {
  name: '',
  model: '',
  host: '',
  port: 4370,
  serial: '',
  active: true,
  pollIntervalMs: 30000,
};

const EMPTY_MAPPING = { deviceUserId: '', employeeId: '' };

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-PH', { hour12: true }) : null;

const timeAgo = (iso) => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
};

export default function Devices() {
  const toast = useToast();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [mappingsOpen, setMappingsOpen] = useState(false);
  const [mappingsDevice, setMappingsDevice] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [mappingForm, setMappingForm] = useState(EMPTY_MAPPING);
  const [mappingSaving, setMappingSaving] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [deleteMappingTarget, setDeleteMappingTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await biometricDevicesApi.list();
      setDevices(Array.isArray(data) ? data : []);
    } catch (e) {
      toast('Failed to load devices', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (d) => {
    setEditing(d);
    setForm({
      name: d.name,
      model: d.model ?? '',
      host: d.host,
      port: d.port,
      serial: d.serial ?? '',
      active: d.active,
      pollIntervalMs: d.pollIntervalMs,
    });
    setFormOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.host.trim()) {
      toast('Name and host are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        model: form.model.trim() || null,
        host: form.host.trim(),
        port: Number(form.port) || 4370,
        serial: form.serial.trim() || null,
        active: form.active,
        pollIntervalMs: Number(form.pollIntervalMs) || 30000,
      };
      if (editing) {
        const r = await biometricDevicesApi.update(editing.id, payload);
        setDevices((l) => l.map((d) => (d.id === editing.id ? r : d)));
        toast(`Device ${payload.name} updated`, 'success');
      } else {
        const r = await biometricDevicesApi.create(payload);
        setDevices((l) => [r, ...l]);
        toast(`Device ${payload.name} added`, 'success');
      }
      setFormOpen(false);
    } catch (err) {
      toast(err?.response?.data?.error?.message || 'Failed to save device', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openMappings = async (d) => {
    setMappingsDevice(d);
    setMappingsOpen(true);
    setMappingsLoading(true);
    try {
      const data = await biometricDeviceUsersApi.list(d.id);
      setMappings(Array.isArray(data) ? data : []);
    } catch (e) {
      toast('Failed to load mappings', 'error');
      setMappings([]);
    } finally {
      setMappingsLoading(false);
    }
  };

  const submitMapping = async (e) => {
    e.preventDefault();
    if (!mappingForm.deviceUserId.trim() || !mappingForm.employeeId.trim()) {
      toast('Device user ID and employee are required', 'error');
      return;
    }
    setMappingSaving(true);
    try {
      const payload = {
        deviceUserId: mappingForm.deviceUserId.trim(),
        employeeId: mappingForm.employeeId.trim(),
      };
      let r;
      if (editingMapping) {
        r = await biometricDeviceUsersApi.update(mappingsDevice.id, editingMapping.deviceUserId, payload);
        setMappings((l) => l.map((m) => (m.deviceUserId === editingMapping.deviceUserId ? r : m)));
        toast('Mapping updated', 'success');
      } else {
        r = await biometricDeviceUsersApi.create(mappingsDevice.id, payload);
        setMappings((l) => [...l, r]);
        toast('Mapping added', 'success');
      }
      setMappingForm(EMPTY_MAPPING);
      setEditingMapping(null);
    } catch (err) {
      toast(err?.response?.data?.error?.message || 'Failed to save mapping', 'error');
    } finally {
      setMappingSaving(false);
    }
  };

  const startEditMapping = (m) => {
    setEditingMapping(m);
    setMappingForm({ deviceUserId: m.deviceUserId, employeeId: m.employeeId });
  };

  const confirmDeleteMapping = async () => {
    if (!deleteMappingTarget) return;
    try {
      await biometricDeviceUsersApi.delete(mappingsDevice.id, deleteMappingTarget.deviceUserId);
      setMappings((l) => l.filter((m) => m.deviceUserId !== deleteMappingTarget.deviceUserId));
      toast('Mapping removed', 'success');
      setDeleteMappingTarget(null);
    } catch (err) {
      toast(err?.response?.data?.error?.message || 'Failed to remove mapping', 'error');
    }
  };

  const runSync = async (d) => {
    setSyncingId(d.id);
    try {
      const r = await biometricDevicesApi.sync(d.id);
      const st = r.stats;
      const bits = [];
      if (st?.fetched !== undefined) bits.push(`pulled ${st.fetched}`);
      if (st?.newLogs !== undefined) bits.push(`${st.newLogs} new`);
      if (st?.duplicates) bits.push(`${st.duplicates} dup`);
      if (st?.applied !== undefined) bits.push(`${st.applied} applied`);
      if (st?.unmatched) bits.push(`${st.unmatched} unmatched`);
      toast(r.skipped ? `Device inactive — sync skipped` : `${d.name}: ${bits.join(', ') || 'no changes'}`, 'success');
      load();
    } catch (err) {
      const msg = err?.response?.data?.error?.message;
      toast(msg || `Sync ${d.name} failed`, 'error');
      load();
    } finally {
      setSyncingId(null);
    }
  };

  const remove = async () => {
    try {
      await biometricDevicesApi.remove(deleteTarget.id);
      setDevices((l) => l.filter((d) => d.id !== deleteTarget.id));
      toast(`${deleteTarget.name} removed`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      toast(err?.response?.data?.error?.message || 'Failed to remove device', 'error');
    }
  };

  const hasError = (d) => !!d.lastError;
  const isHealthy = (d) => !!d.lastConnectedAt && !d.lastError;
  const neverSynced = (d) => !d.lastConnectedAt && !d.lastError;

  const stats = {
    total: devices.length,
    active: devices.filter((d) => d.active).length,
    healthy: devices.filter((d) => isHealthy(d)).length,
    errored: devices.filter((d) => hasError(d)).length,
  };

  return (
    <Layout maxWidth="max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Fingerprint size={20} className="text-accent" />
            Biometric Devices
          </h1>
          <p className="text-sm text-muted mt-0.5">
            ZK terminals (port 4370) that feed attendance into the DTR via the pull sync
          </p>
        </div>
        <button type="button" className="btn btn-primary gap-2" onClick={openAdd}>
          <Plus size={18} />
          Add Device
        </button>
      </div>

      {!loading && devices.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Server className="text-accent" size={16} />
              <span className="mono-label text-[10px] uppercase text-muted">Total</span>
            </div>
            <p className="font-display text-2xl font-bold text-ink">{stats.total}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="text-success" size={16} />
              <span className="mono-label text-[10px] uppercase text-muted">Active</span>
            </div>
            <p className="font-display text-2xl font-bold text-ink">{stats.active}</p>
            <p className="text-xs text-muted mt-1">{stats.healthy} healthy</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-warning" size={16} />
              <span className="mono-label text-[10px] uppercase text-muted">Errors</span>
            </div>
            <p className="font-display text-2xl font-bold text-ink">{stats.errored}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="text-accent" size={16} />
              <span className="mono-label text-[10px] uppercase text-muted">Poller</span>
            </div>
            <p className="font-display text-2xl font-bold text-ink">{stats.active}</p>
            <p className="text-xs text-muted mt-1">active polls</p>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-display font-semibold text-ink">Registered Terminals</h2>
          <button type="button" className="btn btn-outline gap-2" onClick={load}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Endpoint</th>
                <th>Status</th>
                <th>Last Sync</th>
                <th>Health</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-muted text-sm">Loading devices…</td></tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <Server size={32} className="text-muted" />
                      <p className="text-sm text-muted font-medium">No devices registered</p>
                      <p className="text-xs text-muted">Point your ZK terminal on the same LAN, then add it here.</p>
                      <button type="button" className="btn btn-primary gap-2 mt-2" onClick={openAdd}>
                        <Plus size={16} />
                        Add Device
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                devices.map((d) => (
                  <tr key={d.id} className="group align-top">
                    <td className="min-w-48">
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted mono-label mt-0.5">
                        {d.model || 'ZK'} · poll {Math.round((d.pollIntervalMs || 30000) / 1000)}s · {d.protocol}
                      </p>
                    </td>
                    <td className="font-mono text-xs">{d.host}:{d.port}</td>
                    <td>
                      <span className={`badge ${d.active ? 'badge-success' : 'badge'}`}>
                        {d.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-xs text-muted">
                      {neverSynced(d) ? (
                        <span className="text-muted">Never synced</span>
                      ) : (
                        <span title={fmtTime(d.lastSyncAt)}>
                          {timeAgo(d.lastSyncAt) || '—'}
                        </span>
                      )}
                    </td>
                    <td className="max-w-64">
                      {hasError(d) ? (
                        <span className="inline-flex items-start gap-1.5 text-xs text-error" title={d.lastError}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current mt-1 shrink-0" aria-hidden="true" />
                          <span className="line-clamp-2">{d.lastError}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                          {isHealthy(d) ? 'Connected' : 'Idle'}
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <span className="inline-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost px-2 text-xs"
                          onClick={() => runSync(d)}
                          disabled={syncingId === d.id}
                          title="Pull attendance logs now"
                        >
                          <RefreshCw size={14} className={syncingId === d.id ? 'animate-spin' : ''} />
                          {syncingId === d.id ? 'Syncing' : 'Sync'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost px-2 text-xs"
                          onClick={() => openMappings(d)}
                          title="Manage device user ID mappings"
                        >
                          <Users size={14} />
                          Mappings
                        </button>
                        <button type="button" className="btn btn-ghost px-2 text-xs" onClick={() => openEdit(d)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost px-2 text-xs"
                          onClick={() => setDeleteTarget(d)}
                          title="Remove device"
                        >
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit Device · ${editing.name}` : 'Add Device'}
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => setFormOpen(false)}>
              <X size={16} />
              Cancel
            </button>
            <button type="submit" form="device-form" className="btn btn-primary gap-2" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Device'}
            </button>
          </>
        }
      >
        <form id="device-form" onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="d-name" className="block text-sm font-medium text-ink mb-1">Device name</label>
            <input id="d-name" className="input" placeholder="Lobby terminal 1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="d-host" className="block text-sm font-medium text-ink mb-1">Host</label>
              <input id="d-host" className="input" placeholder="192.168.1.50" value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="d-port" className="block text-sm font-medium text-ink mb-1">Port</label>
              <input id="d-port" type="number" min={1} max={65535} className="input" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="d-model" className="block text-sm font-medium text-ink mb-1">Model</label>
              <input id="d-model" className="input" placeholder="X628 / iClock 2600" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="d-serial" className="block text-sm font-medium text-ink mb-1">Serial</label>
              <input id="d-serial" className="input" placeholder="optional" value={form.serial} onChange={(e) => setForm((f) => ({ ...f, serial: e.target.value }))} />
            </div>
          </div>
          <div>
            <label htmlFor="d-poll" className="block text-sm font-medium text-ink mb-1">Poll interval (ms)</label>
            <input id="d-poll" type="number" min={5000} step={5000} className="input" value={form.pollIntervalMs} onChange={(e) => setForm((f) => ({ ...f, pollIntervalMs: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Active (included in poller rounds)
          </label>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Info size={13} className="text-accent shrink-0" />
            The device keeps its own clock — sync it to Asia/Manila on the terminal, and set each employee's user ID to their HRMS employee number.
          </p>
        </form>
      </Modal>

      <Modal
        open={mappingsOpen}
        onClose={() => { setMappingsOpen(false); setMappingsDevice(null); setMappings([]); setMappingForm(EMPTY_MAPPING); setEditingMapping(null); }}
        title={mappingsDevice ? `Device User Mappings · ${mappingsDevice.name}` : 'Device User Mappings'}
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => { setMappingsOpen(false); setMappingForm(EMPTY_MAPPING); setEditingMapping(null); }}>
              <X size={16} />
              Close
            </button>
            <button type="submit" form="mapping-form" className="btn btn-primary gap-2" disabled={mappingSaving}>
              <Save size={16} />
              {mappingSaving ? 'Saving…' : editingMapping ? 'Update Mapping' : 'Add Mapping'}
            </button>
          </>
        }
      >
        <form id="mapping-form" onSubmit={submitMapping} className="space-y-4">
          <p className="text-sm text-muted">
            Map the ZK terminal&apos;s internal user IDs to HRMS employees. When the device reports a punch for user <span className="font-mono text-ink">{mappingForm.deviceUserId || '&lt;user ID&gt;'}</span>, it will be attributed to the selected employee.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="m-device-user-id" className="block text-sm font-medium text-ink mb-1">Device User ID</label>
              <input
                id="m-device-user-id"
                className="input"
                placeholder="e.g. 1 or EMP-DEFAULT-0001"
                value={mappingForm.deviceUserId}
                onChange={(e) => setMappingForm((f) => ({ ...f, deviceUserId: e.target.value }))}
                disabled={!!editingMapping}
              />
              <p className="text-xs text-muted mt-1">The user ID configured on the ZK terminal for this employee.</p>
            </div>
            <div>
              <label htmlFor="m-employee-id" className="block text-sm font-medium text-ink mb-1">Employee</label>
              <input
                id="m-employee-id"
                className="input"
                placeholder="Employee ID or employee number"
                value={mappingForm.employeeId}
                onChange={(e) => setMappingForm((f) => ({ ...f, employeeId: e.target.value }))}
              />
              <p className="text-xs text-muted mt-1">Paste the HRMS Employee ID or employee number.</p>
            </div>
          </div>
        </form>

        <div className="mt-6">
          <h3 className="font-display font-semibold text-ink mb-3">Current Mappings</h3>
          {mappingsLoading ? (
            <p className="text-sm text-muted text-center py-4">Loading mappings…</p>
          ) : mappings.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">No mappings yet. Add one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Device User ID</th>
                    <th>Employee</th>
                    <th>Employee Number</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m) => (
                    <tr key={m.deviceUserId}>
                      <td className="font-mono text-sm">{m.deviceUserId}</td>
                      <td className="text-sm">{m.employee ? `${m.employee.firstName} ${m.employee.lastName}` : '—'}</td>
                      <td className="font-mono text-xs text-muted">{m.employee?.employeeNumber || '—'}</td>
                      <td className="text-right">
                        <span className="inline-flex gap-1">
                          <button type="button" className="btn btn-ghost px-2 text-xs" onClick={() => startEditMapping(m)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost px-2 text-xs text-error"
                            onClick={() => setDeleteMappingTarget(m)}
                            title="Remove mapping"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="Remove device?"
        message={`${deleteTarget?.name} (${deleteTarget?.host}:${deleteTarget?.port}) and its sync logs will be removed. Existing attendance rows are kept.`}
        confirmLabel="Remove"
        danger
      />

      <ConfirmDialog
        open={!!deleteMappingTarget}
        onClose={() => setDeleteMappingTarget(null)}
        onConfirm={confirmDeleteMapping}
        title="Remove mapping?"
        message={`Remove mapping for device user ID "${deleteMappingTarget?.deviceUserId}"?`}
        confirmLabel="Remove"
        danger
      />
    </Layout>
  );
}
