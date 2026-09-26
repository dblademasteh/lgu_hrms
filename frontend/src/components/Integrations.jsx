import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  Webhook,
  X,
} from 'lucide-react';
import Modal from './Modal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { useToast } from './Toast.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { integrationsApi } from '../api/integrations.js';
import IntegrationSetupWizard from './IntegrationSetupWizard.jsx';

const EMPTY_SYSTEM = {
  name: '',
  type: 'PAYROLL',
  description: '',
  baseUrl: '',
  apiKey: '',
  apiSecret: '',
  headers: '',
  syncDirection: 'pull',
  attendanceMode: 'pull',
  attendancePollInterval: '',
  deviceId: '',
  punchKey: '',
};

function generateSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function Integrations() {
  const toast = useToast();
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const isSuperAdmin = useAuthStore((s) => s.user?.role) === 'SUPER_ADMIN';

  const [view, setView] = useState('setup');
  const [catalog, setCatalog] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [externalSystems, setExternalSystems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ name: '', url: '', events: [], secret: '' });
  const [webhookFormReveal, setWebhookFormReveal] = useState(false);
  const [createdWebhook, setCreatedWebhook] = useState(null);
  const [rotateSecretTarget, setRotateSecretTarget] = useState(null);
  const [disableWebhookTarget, setDisableWebhookTarget] = useState(null);
  const [deleteWebhookTarget, setDeleteWebhookTarget] = useState(null);
  const [deleteKeyTarget, setDeleteKeyTarget] = useState(null);
  const [systemModal, setSystemModal] = useState(null);
  const [systemForm, setSystemForm] = useState(EMPTY_SYSTEM);

  const list = (res) => (Array.isArray(res) ? res : (res?.data ?? []));

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      integrationsApi.catalog(),
      integrationsApi.listKeys(),
      integrationsApi.listWebhooks(),
      integrationsApi.listExternalSystems(),
    ]).then(([cat, keys, hooks, systems]) => {
      if (cat.status === 'fulfilled') setCatalog(cat.value);
      else toast('Failed to load the integration catalog', 'error');
      if (keys.status === 'fulfilled') setApiKeys(list(keys.value));
      else toast('Failed to load API keys', 'error');
      if (hooks.status === 'fulfilled') setWebhooks(list(hooks.value));
      else toast('Failed to load webhooks', 'error');
      if (systems.status === 'fulfilled') setExternalSystems(list(systems.value));
      else toast('Failed to load external systems', 'error');
      setLoading(false);
    });
  // Re-runs on tenant switch: the client injects `X-Tenant-Id`, so every list
  // has to be refetched or the wizard would show the previous tenant's keys.
  }, [toast, activeTenantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openWebhookModal = () => {
    setWebhookForm({ name: '', url: '', events: [], secret: generateSecret() });
    setShowWebhookModal(true);
  };

  const saveWebhook = async () => {
    try {
      const result = await integrationsApi.createWebhook({
        name: webhookForm.name,
        url: webhookForm.url,
        events: webhookForm.events,
        secret: webhookForm.secret || undefined,
      });
      setShowWebhookModal(false);
      setCreatedWebhook(result);
      toast('Webhook created — save the secret now', 'success');
      refresh();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to create the webhook', 'error');
    }
  };

  const saveSystem = async () => {
    const payload = {
      name: systemForm.name,
      type: systemForm.type,
      description: systemForm.description || undefined,
      baseUrl: systemForm.baseUrl,
      apiKey: systemForm.apiKey || undefined,
      apiSecret: systemForm.apiSecret || undefined,
      headers: systemForm.headers || undefined,
      syncDirection: systemForm.syncDirection,
      isActive: systemModal?.isActive ?? true,
      attendanceMode: systemForm.type === 'ATTENDANCE' ? systemForm.attendanceMode || undefined : undefined,
      attendancePollInterval:
        systemForm.type === 'ATTENDANCE' && systemForm.attendancePollInterval ? Number(systemForm.attendancePollInterval) : undefined,
      deviceId: systemForm.type === 'ATTENDANCE' ? systemForm.deviceId || undefined : undefined,
      punchKey: systemForm.type === 'ATTENDANCE' ? systemForm.punchKey || undefined : undefined,
    };
    try {
      if (systemModal?.id) {
        await integrationsApi.updateExternalSystem(systemModal.id, payload);
        toast('System updated', 'success');
      } else {
        await integrationsApi.createExternalSystem(payload);
        toast('System added', 'success');
      }
      setSystemModal(null);
      setSystemForm(EMPTY_SYSTEM);
      refresh();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to save the system', 'error');
    }
  };

  const deleteKey = async () => {
    if (!deleteKeyTarget) return;
    try {
      await integrationsApi.deleteKey(deleteKeyTarget.id);
      toast('API key permanently deleted', 'success');
      refresh();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to delete the API key', 'error');
    } finally {
      setDeleteKeyTarget(null);
    }
  };

  const toggleWebhook = async () => {
    if (!disableWebhookTarget) return;
    try {
      await integrationsApi.updateWebhook(disableWebhookTarget.id, { isActive: !disableWebhookTarget.isActive });
      toast(disableWebhookTarget.isActive ? 'Webhook deactivated' : 'Webhook activated', 'success');
      refresh();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to update the webhook', 'error');
    } finally {
      setDisableWebhookTarget(null);
    }
  };

  const deleteWebhook = async () => {
    if (!deleteWebhookTarget) return;
    try {
      await integrationsApi.deleteWebhook(deleteWebhookTarget.id);
      toast('Webhook deleted', 'success');
      refresh();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to delete the webhook', 'error');
    } finally {
      setDeleteWebhookTarget(null);
    }
  };

  const rotateSecret = async () => {
    if (!rotateSecretTarget) return;
    try {
      const res = await integrationsApi.rotateWebhookSecret(rotateSecretTarget.id);
      setCreatedWebhook({ name: rotateSecretTarget.name, secret: res.secret });
      toast('Secret rotated — save the new secret', 'success');
      refresh();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to rotate the secret', 'error');
    } finally {
      setRotateSecretTarget(null);
    }
  };

  return (
    <section className="card p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-ink">Integrations</h2>
          <p className="text-sm text-muted">Connect an external payroll, attendance or leave system in six steps.</p>
        </div>
        <div className="tabbar" role="tablist" aria-label="Integration views">
          <button role="tab" aria-selected={view === 'setup'} onClick={() => setView('setup')} className={`tab ${view === 'setup' ? 'tab-active' : ''}`}>
            Setup
          </button>
          <button role="tab" aria-selected={view === 'advanced'} onClick={() => setView('advanced')} className={`tab ${view === 'advanced' ? 'tab-active' : ''}`}>
            Advanced
          </button>
        </div>
      </div>

      {isSuperAdmin && !activeTenantId && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning">
          You are SUPER_ADMIN but no tenant is selected. Use the tenant switcher in the header to select a tenant before configuring external systems.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading integrations…</p>
      ) : view === 'setup' ? (
        <IntegrationSetupWizard
          catalog={catalog}
          apiKeys={apiKeys}
          webhooks={webhooks}
          externalSystems={externalSystems}
          tenantId={activeTenantId}
          onRefresh={refresh}
          onOpenAdvanced={() => setView('advanced')}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink">API Keys</p>
                <p className="text-xs text-muted">Credentials issued by the setup wizard</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm gap-2" onClick={() => setView('setup')}>
                Issue key
              </button>
            </div>
            {apiKeys.length === 0 ? (
              <p className="text-xs text-muted">No API keys yet — run the setup wizard to issue one.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {apiKeys.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-2 text-xs p-2 bg-bg/40 rounded">
                    <span className="text-muted truncate">{k.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge ${k.isActive !== false ? 'badge-success' : 'badge-ghost'}`}>
                        {k.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                      <span className="badge badge-accent">{(k.scopes || []).join(', ')}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-error"
                        aria-label={k.isActive !== false ? `Deactivate ${k.name}` : `Activate ${k.name}`}
                        onClick={() =>
                          integrationsApi
                            .revokeKey(k.id)
                            .then((r) => {
                              toast(r?.isActive ? 'API key reactivated' : 'API key deactivated', 'success');
                              refresh();
                            })
                            .catch(() => toast('Failed to update the API key', 'error'))
                        }
                      >
                        {k.isActive !== false ? <PowerOff size={12} /> : <Power size={12} />}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-error"
                        aria-label={`Delete ${k.name}`}
                        onClick={() => setDeleteKeyTarget(k)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-muted">Secrets are SHA-256 hashed — rotate every 90 days.</p>
          </div>

          <div className="p-5 border border-line rounded-xl bg-bg/50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink">Webhooks</p>
                <p className="text-xs text-muted">Event subscriptions pushed by HRMS</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm gap-2" onClick={openWebhookModal}>
                <Plus size={14} /> Add
              </button>
            </div>
            {webhooks.length === 0 ? (
              <p className="text-xs text-muted">No webhooks yet — the Events step can create one for you.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {webhooks.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-2 text-xs p-2 bg-bg/40 rounded">
                    <div className="min-w-0">
                      <span className="text-ink truncate block">{w.name}</span>
                      <span className="text-muted truncate block">{w.url}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge ${w.isActive ? 'badge-success' : 'badge-ghost'}`}>{w.isActive ? 'Active' : 'Inactive'}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label={`Send test event to ${w.name}`}
                        onClick={() =>
                          integrationsApi
                            .testWebhook(w.id)
                            .then(() => toast('Test payload sent', 'success'))
                            .catch(() => toast('Test failed', 'error'))
                        }
                      >
                        <Webhook size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label={`Rotate secret for ${w.name}`}
                        onClick={() => setRotateSecretTarget(w)}
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label={`${w.isActive ? 'Disable' : 'Activate'} ${w.name}`}
                        onClick={() => setDisableWebhookTarget(w)}
                      >
                        {w.isActive ? <PowerOff size={12} /> : <Power size={12} />}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-error"
                        aria-label={`Delete ${w.name}`}
                        onClick={() => setDeleteWebhookTarget(w)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="md:col-span-2 p-5 border border-line rounded-xl bg-bg/50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink">External Systems</p>
                <p className="text-xs text-muted">Payroll, attendance, HRIS and portal endpoints registered by the setup wizard</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-2"
                onClick={() => {
                  setSystemForm({ ...EMPTY_SYSTEM, type: catalog?.types?.[0]?.type || 'PAYROLL' });
                  setSystemModal({});
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>
            {externalSystems.length === 0 ? (
              <p className="text-xs text-muted">No external systems configured yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {externalSystems.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-xs p-2 bg-bg/40 rounded">
                    <div className="min-w-0">
                      <span className="text-ink truncate block">{s.name}</span>
                      <span className="text-muted truncate block">{s.baseUrl}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="badge badge-accent">{s.type}</span>
                      <span className={`badge ${s.isActive ? 'badge-success' : 'badge-ghost'}`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label={`Edit ${s.name}`}
                        onClick={() => {
                          setSystemForm({
                            name: s.name || '',
                            type: s.type || 'PAYROLL',
                            description: s.description || '',
                            baseUrl: s.baseUrl || '',
                            apiKey: s.apiKey || '',
                            apiSecret: s.apiSecret || '',
                            headers: s.headers || '',
                            syncDirection: s.syncDirection || 'pull',
                            attendanceMode: s.attendanceMode || 'pull',
                            attendancePollInterval: s.attendancePollInterval ? String(s.attendancePollInterval) : '',
                            deviceId: s.deviceId || '',
                            punchKey: s.punchKey || '',
                          });
                          setSystemModal(s);
                        }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-error"
                        aria-label={`Delete ${s.name}`}
                        onClick={() =>
                          integrationsApi
                            .deleteExternalSystem(s.id)
                            .then(() => {
                              toast('External system deleted', 'success');
                              refresh();
                            })
                            .catch(() => toast('Failed to delete the external system', 'error'))
                        }
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <Modal
        open={showWebhookModal}
        onClose={() => setShowWebhookModal(false)}
        title="Add Webhook"
        size="md"
        footer={
          <>
            <button className="btn btn-ghost gap-2" onClick={() => setShowWebhookModal(false)}>
              <X size={16} /> Cancel
            </button>
            <button
              className="btn btn-primary gap-2"
              disabled={!webhookForm.name || !webhookForm.url || webhookForm.events.length === 0}
              onClick={saveWebhook}
            >
              <Plus size={14} /> Add
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-ink mb-1" htmlFor="adv-webhook-name">Name</label>
            <input id="adv-webhook-name" className="input w-full" value={webhookForm.name} onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1" htmlFor="adv-webhook-url">URL</label>
            <input
              id="adv-webhook-url"
              className="input w-full font-mono"
              placeholder="https://example.com/webhook"
              value={webhookForm.url}
              onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
            />
          </div>
          <div>
            <p className="block text-xs font-medium text-ink mb-1">Events</p>
            <div className="space-y-1 max-h-48 overflow-auto">
              {(catalog?.events || []).map((evt) => (
                <label key={evt.event} className="flex items-center gap-2 text-xs" title={evt.description}>
                  <input
                    type="checkbox"
                    checked={webhookForm.events.includes(evt.event)}
                    onChange={(e) =>
                      setWebhookForm({
                        ...webhookForm,
                        events: e.target.checked
                          ? [...webhookForm.events, evt.event]
                          : webhookForm.events.filter((x) => x !== evt.event),
                      })
                    }
                  />
                  <span className="font-mono">{evt.event}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1" htmlFor="adv-webhook-secret">Secret</label>
            <div className="flex gap-2">
              <input
                id="adv-webhook-secret"
                className="input w-full font-mono"
                type={webhookFormReveal ? 'text' : 'password'}
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label={webhookFormReveal ? 'Hide secret' : 'Reveal secret'}
                onClick={() => setWebhookFormReveal(!webhookFormReveal)}
              >
                {webhookFormReveal ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Regenerate secret"
                onClick={() => setWebhookForm({ ...webhookForm, secret: generateSecret() })}
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <p className="text-[11px] text-muted mt-1">Auto-generated 24-byte hex secret. Used by the receiver to verify HMAC-SHA256 signatures.</p>
          </div>
        </div>
      </Modal>

      {createdWebhook && (
        <Modal
          open
          onClose={() => setCreatedWebhook(null)}
          title={createdWebhook.name ? `Secret for ${createdWebhook.name}` : 'Webhook secret'}
          size="sm"
          footer={
            <button className="btn btn-primary gap-2" onClick={() => setCreatedWebhook(null)}>
              <Check size={16} /> Done
            </button>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="text-xs text-muted">Save this secret now — it is not shown again.</p>
            <div className="flex gap-2">
              <input className="input flex-1 font-mono text-xs" readOnly value={createdWebhook.secret} aria-label="Webhook secret" />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Copy webhook secret"
                onClick={() => {
                  navigator.clipboard.writeText(createdWebhook.secret);
                  toast('Secret copied', 'success');
                }}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        </Modal>
      )}

      {systemModal && (
        <Modal
          open
          onClose={() => {
            setSystemModal(null);
            setSystemForm(EMPTY_SYSTEM);
          }}
          title={systemModal.id ? 'Edit External System' : 'Add External System'}
          size="md"
          footer={
            <>
              <button
                className="btn btn-ghost gap-2"
                onClick={() => {
                  setSystemModal(null);
                  setSystemForm(EMPTY_SYSTEM);
                }}
              >
                <X size={16} /> Cancel
              </button>
              <button
                className="btn btn-primary gap-2"
                disabled={!systemForm.name || !systemForm.baseUrl}
                onClick={saveSystem}
              >
                {systemModal.id ? <Check size={16} /> : <Plus size={14} />} {systemModal.id ? 'Save' : 'Add'}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-ink mb-1" htmlFor="sys-name">Name</label>
              <input id="sys-name" className="input w-full" value={systemForm.name} onChange={(e) => setSystemForm({ ...systemForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1" htmlFor="sys-type">Type</label>
              <select id="sys-type" className="select w-full" value={systemForm.type} onChange={(e) => setSystemForm({ ...systemForm, type: e.target.value })}>
                {(catalog?.systemTypes || ['PAYROLL', 'ATTENDANCE', 'LEAVE', 'HRIS', 'PORTAL', 'OTHER']).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1" htmlFor="sys-url">Base URL</label>
              <input
                id="sys-url"
                className="input w-full font-mono"
                placeholder="https://hr.example.com/api"
                value={systemForm.baseUrl}
                onChange={(e) => setSystemForm({ ...systemForm, baseUrl: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1" htmlFor="sys-description">Description</label>
              <input
                id="sys-description"
                className="input w-full"
                placeholder="Optional description"
                value={systemForm.description}
                onChange={(e) => setSystemForm({ ...systemForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1" htmlFor="sys-apikey">API Key</label>
                <input
                  id="sys-apikey"
                  className="input w-full font-mono"
                  type="password"
                  autoComplete="off"
                  placeholder="Optional"
                  value={systemForm.apiKey}
                  onChange={(e) => setSystemForm({ ...systemForm, apiKey: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1" htmlFor="sys-apisecret">API Secret</label>
                <input
                  id="sys-apisecret"
                  className="input w-full font-mono"
                  type="password"
                  autoComplete="off"
                  placeholder="Optional"
                  value={systemForm.apiSecret}
                  onChange={(e) => setSystemForm({ ...systemForm, apiSecret: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1" htmlFor="sys-headers">Headers (JSON, optional)</label>
              <textarea
                id="sys-headers"
                className="input w-full font-mono"
                rows="3"
                placeholder='{"X-Custom-Header": "value"}'
                value={systemForm.headers}
                onChange={(e) => setSystemForm({ ...systemForm, headers: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1" htmlFor="sys-direction">Sync direction</label>
              <select
                id="sys-direction"
                className="select w-full"
                value={systemForm.syncDirection}
                onChange={(e) => setSystemForm({ ...systemForm, syncDirection: e.target.value })}
              >
                <option value="pull">Pull from external</option>
                <option value="push">Push to external</option>
                <option value="bidirectional">Bidirectional</option>
              </select>
            </div>
            {systemForm.type === 'ATTENDANCE' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1" htmlFor="sys-mode">Ingestion mode</label>
                  <select
                    id="sys-mode"
                    className="select w-full"
                    value={systemForm.attendanceMode || 'pull'}
                    onChange={(e) => setSystemForm({ ...systemForm, attendanceMode: e.target.value })}
                  >
                    <option value="pull">Poll / Pull</option>
                    <option value="push">Push / Webhook</option>
                    <option value="bulk">Bulk import</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1" htmlFor="sys-interval">Poll interval (seconds)</label>
                    <input
                      id="sys-interval"
                      className="input w-full font-mono"
                      type="number"
                      placeholder="300"
                      value={systemForm.attendancePollInterval}
                      onChange={(e) => setSystemForm({ ...systemForm, attendancePollInterval: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1" htmlFor="sys-device">Device / terminal ID</label>
                    <input
                      id="sys-device"
                      className="input w-full font-mono"
                      placeholder="ZK-400"
                      value={systemForm.deviceId}
                      onChange={(e) => setSystemForm({ ...systemForm, deviceId: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1" htmlFor="sys-punchkey">Punch key (optional)</label>
                  <input
                    id="sys-punchkey"
                    className="input w-full font-mono"
                    type="password"
                    autoComplete="off"
                    placeholder="Shared secret for kiosk / public punch"
                    value={systemForm.punchKey}
                    onChange={(e) => setSystemForm({ ...systemForm, punchKey: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteKeyTarget}
        onClose={() => setDeleteKeyTarget(null)}
        onConfirm={deleteKey}
        title="Delete API key"
        message={`Permanently delete "${deleteKeyTarget?.name}"? Any external system using it stops working immediately.`}
        confirmLabel="Delete"
        danger
      />

      <ConfirmDialog
        open={!!rotateSecretTarget}
        onClose={() => setRotateSecretTarget(null)}
        onConfirm={rotateSecret}
        title="Rotate webhook secret?"
        message={`This generates a new secret for "${rotateSecretTarget?.name}". The old secret stops working immediately.`}
        confirmLabel="Rotate"
        danger
      />

      <ConfirmDialog
        open={!!disableWebhookTarget}
        onClose={() => setDisableWebhookTarget(null)}
        onConfirm={toggleWebhook}
        title={disableWebhookTarget?.isActive ? 'Disable webhook?' : 'Activate webhook?'}
        message={`${disableWebhookTarget?.isActive ? 'Disable' : 'Activate'} "${disableWebhookTarget?.name}"? ${
          disableWebhookTarget?.isActive ? 'It will stop receiving events.' : 'It will resume receiving events.'
        }`}
        confirmLabel={disableWebhookTarget?.isActive ? 'Disable' : 'Activate'}
        danger={disableWebhookTarget?.isActive}
      />

      <ConfirmDialog
        open={!!deleteWebhookTarget}
        onClose={() => setDeleteWebhookTarget(null)}
        onConfirm={deleteWebhook}
        title="Delete webhook?"
        message={`Permanently delete "${deleteWebhookTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </section>
  );
}
