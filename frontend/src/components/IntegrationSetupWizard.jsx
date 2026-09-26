import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Key,
  Lock,
  Plus,
  Radio,
  ShieldCheck,
  Webhook,
  Zap,
} from 'lucide-react';
import { integrationsApi } from '../api/integrations.js';
import { useToast } from './Toast.jsx';

const TYPE_ICON = { PAYROLL: Banknote, ATTENDANCE: Clock, LEAVE: CalendarDays };

const STEPS = [
  { key: 'choose', label: 'Choose' },
  { key: 'system', label: 'System' },
  { key: 'credentials', label: 'Credentials' },
  { key: 'verify', label: 'Verify' },
  { key: 'events', label: 'Events' },
  { key: 'monitor', label: 'Monitor' },
];

// Connectivity alone does not prove the key carries the scope an endpoint
// requires, so the verify step runs a connectivity probe plus a scoped read.
const CONNECTIVITY_PROBES = {
  PAYROLL: integrationsApi.testPayroll,
  ATTENDANCE: integrationsApi.testAttendance,
  LEAVE: integrationsApi.testLeave,
};

const DATA_PROBES = {
  PAYROLL: {
    label: 'Payroll periods',
    run: (apiKey) => integrationsApi.payrollPeriods({ limit: 1 }, apiKey),
  },
  ATTENDANCE: {
    label: 'Attendance this month',
    run: (apiKey) => {
      const today = new Date().toISOString().slice(0, 10);
      return integrationsApi.attendanceList({ startDate: `${today.slice(0, 8)}01`, endDate: today, limit: 1 }, apiKey);
    },
  },
  LEAVE: {
    label: 'Leave requests',
    run: (apiKey) => integrationsApi.leaveRequests({ limit: 1 }, apiKey),
  },
};

const verifyStoreKey = (type, tenantId) => `lgu-integration-verify:${tenantId || 'platform'}:${type}`;
const typeStoreKey = (tenantId) => `lgu-integration-setup-type:${tenantId || 'platform'}`;

function readVerify(type, tenantId) {
  if (!type) return null;
  try {
    const raw = localStorage.getItem(verifyStoreKey(type, tenantId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildSteps({ config, typeChosen, system, credentials, verifiedAt, events }) {
  const eventsApply = (config?.events?.length || 0) > 0;
  return STEPS.map((step) => {
    switch (step.key) {
      case 'choose':
        return { ...step, state: typeChosen ? 'done' : 'todo' };
      case 'system':
        return { ...step, state: system ? 'done' : 'todo' };
      case 'credentials':
        return { ...step, state: credentials ? 'done' : 'todo' };
      case 'verify':
        return { ...step, state: verifiedAt ? 'done' : 'todo' };
      case 'events':
        return eventsApply ? { ...step, state: events ? 'done' : 'todo' } : { ...step, state: 'skipped', label: 'Events (n/a)' };
      default:
        return { ...step, state: 'todo' };
    }
  });
}

export default function IntegrationSetupWizard({ catalog, apiKeys, webhooks, externalSystems, tenantId, onRefresh, onOpenAdvanced }) {
  const toast = useToast();
  const types = catalog?.types || [];

  const [typeKey, setTypeKey] = useState(() => localStorage.getItem(typeStoreKey(tenantId)) || '');
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];
  const config = useMemo(() => types.find((t) => t.type === typeKey) || null, [types, typeKey]);

  // step 2 — external system
  const [systemForm, setSystemForm] = useState({ name: '', baseUrl: '', syncDirection: 'pull' });
  const [savingSystem, setSavingSystem] = useState(false);
  const system = useMemo(() => externalSystems.find((s) => s.type === typeKey) || null, [externalSystems, typeKey]);

  // step 3 — credentials
  const [keyName, setKeyName] = useState('');
  const [keyScopes, setKeyScopes] = useState([]);
  const [createdKey, setCreatedKey] = useState(null);
  const [keySaved, setKeySaved] = useState(false);
  const [revealKey, setRevealKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [keyError, setKeyError] = useState(null);
  const matchingKey = useMemo(
    () =>
      config
        ? apiKeys.find((k) => k.isActive !== false && config.requiredScopes.every((s) => (k.scopes || []).includes(s))) || null
        : null,
    [apiKeys, config]
  );
  const credentials = Boolean(createdKey || matchingKey);

  // step 4 — verify
  const [probeKey, setProbeKey] = useState('');
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState(() => readVerify(typeKey, tenantId));
  const verifiedAt = probeResult?.ok ? probeResult.at : null;

  // step 5 — events
  const [webhookForm, setWebhookForm] = useState({ name: '', url: '', events: [] });
  const [webhookSecret, setWebhookSecret] = useState(null);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const webhook = useMemo(
    () => webhooks.find((w) => w.isActive && (config?.events || []).some((e) => (w.events || []).includes(e))) || null,
    [webhooks, config]
  );
  const eventsDone = Boolean(webhookSecret) || Boolean(webhook) || (config?.events?.length || 0) === 0;

  const steps = buildSteps({ config, typeChosen: Boolean(typeKey), system, credentials, verifiedAt, events: eventsDone });
  const doneCount = steps.filter((s) => s.state === 'done').length;

  // Resets every type-specific form back to its catalog-derived default.
  // `force: false` keeps whatever the user has already typed on a re-render.
  const seedFor = (key, { force }) => {
    const cfg = types.find((t) => t.type === key);
    if (!cfg) return;
    if (force) {
      setKeyName(`${cfg.label} integration`);
      setKeyScopes([...cfg.requiredScopes]);
      setSystemForm({ name: `${cfg.label} system`, baseUrl: '', syncDirection: cfg.type === 'ATTENDANCE' ? 'bidirectional' : 'pull' });
      setWebhookForm({ name: `${cfg.label} events`, url: '', events: [...(cfg.events || [])] });
      setCreatedKey(null);
      setKeySaved(false);
      setKeyError(null);
      setRevealKey(false);
      setCopied(false);
      setProbeKey('');
      setWebhookSecret(null);
    }
    setProbeResult(readVerify(cfg.type, tenantId));
  };

  const pickType = (cfg) => {
    setTypeKey(cfg.type);
    localStorage.setItem(typeStoreKey(tenantId), cfg.type);
    setStepIndex(1);
    seedFor(cfg.type, { force: true });
  };

  // Restoring a previously chosen type (reload, tenant switch) must re-seed the
  // forms, otherwise the user lands on step 3 with an empty key name and no
  // scopes even though a type is already selected.
  const seededKeyRef = useRef(null);
  useEffect(() => {
    if (!typeKey) return;
    seedFor(typeKey, { force: seededKeyRef.current !== `${tenantId || 'platform'}:${typeKey}` });
    seededKeyRef.current = `${tenantId || 'platform'}:${typeKey}`;
  }, [typeKey, tenantId, config]);

  const saveSystem = async () => {
    if (!systemForm.name.trim() || !systemForm.baseUrl.trim()) {
      toast('Name and base URL are required', 'error');
      return;
    }
    setSavingSystem(true);
    try {
      await integrationsApi.createExternalSystem({
        name: systemForm.name.trim(),
        type: typeKey,
        baseUrl: systemForm.baseUrl.trim(),
        syncDirection: systemForm.syncDirection,
      });
      toast(`${config.label} system registered`, 'success');
      setStepIndex(2);
      onRefresh();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to register the system', 'error');
    } finally {
      setSavingSystem(false);
    }
  };

  const createKey = async () => {
    if (!keyName.trim() || keyScopes.length === 0) {
      setKeyError('Name and at least one scope are required');
      return;
    }
    setKeyError(null);
    setCreatingKey(true);
    try {
      const result = await integrationsApi.createKey({ name: keyName.trim(), scopes: keyScopes });
      setCreatedKey(result);
      setProbeKey(result.key);
      setKeySaved(false);
      toast('API key created — copy it now, it is never shown again', 'success');
      onRefresh();
    } catch (e) {
      const message = e?.response?.data?.error?.message || 'Failed to create the API key';
      setKeyError(message);
      toast(message, 'error');
    } finally {
      setCreatingKey(false);
    }
  };

  const runProbe = async () => {
    const key = probeKey.trim();
    if (!key) {
      toast('Paste the API key to verify', 'error');
      return;
    }
    setProbing(true);
    const checks = [];
    const attempt = async (label, run) => {
      try {
        const result = await run(key);
        return { label, ok: true, detail: result?.message || `${result?.total ?? result?.items?.length ?? 0} record(s) readable with this key` };
      } catch (e) {
        return { label, ok: false, detail: e?.response?.data?.error?.message || e.message };
      }
    };
    checks.push(await attempt(`${config.label} connectivity`, CONNECTIVITY_PROBES[typeKey]));
    checks.push(await attempt(DATA_PROBES[typeKey].label, DATA_PROBES[typeKey].run));

    const result = { ok: checks.every((c) => c.ok), checks, at: new Date().toISOString() };
    setProbeResult(result);
    if (result.ok) {
      localStorage.setItem(verifyStoreKey(typeKey, tenantId), JSON.stringify(result));
      toast('Connection verified', 'success');
    } else {
      localStorage.removeItem(verifyStoreKey(typeKey, tenantId));
      toast('Verification failed — see the checks', 'error');
    }
    setProbing(false);
  };

  const saveWebhook = async () => {
    if (!webhookForm.name.trim() || !webhookForm.url.trim() || webhookForm.events.length === 0) {
      toast('Name, URL and at least one event are required', 'error');
      return;
    }
    setSavingWebhook(true);
    try {
      const result = await integrationsApi.createWebhook({
        name: webhookForm.name.trim(),
        url: webhookForm.url.trim(),
        events: webhookForm.events,
      });
      setWebhookSecret(result.secret);
      toast('Webhook created — copy the secret now', 'success');
      onRefresh();
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to create the webhook', 'error');
    } finally {
      setSavingWebhook(false);
    }
  };

  const sendTestEvent = async (id) => {
    setWebhookTesting(true);
    try {
      await integrationsApi.testWebhook(id);
      toast('Test event delivered', 'success');
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Test delivery failed', 'error');
    } finally {
      setWebhookTesting(false);
    }
  };

  if (!catalog) return null;

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label="Integration setup progress">
        {steps.map((s, i) => {
          const isCurrent = step.key === s.key;
          return (
            <li key={s.key} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => s.state !== 'skipped' && setStepIndex(i)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition ${
                  isCurrent ? 'bg-accent/10 text-accent font-semibold' : 'text-muted hover:text-ink'
                }`}
              >
                <span
                  className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${
                    s.state === 'done'
                      ? 'bg-accent text-accent-ink'
                      : isCurrent
                        ? 'bg-ink text-bg ring-4 ring-accent/20'
                        : 'bg-line text-muted'
                  }`}
                >
                  {s.state === 'done' ? <Check size={10} /> : i + 1}
                </span>
                {s.label}
              </button>
              {i < steps.length - 1 && <span className="h-px w-4 bg-line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {doneCount} of {STEPS.length} steps complete{config ? ` · ${config.label}` : ''}
        </p>
        <button type="button" className="btn btn-ghost btn-sm gap-2" onClick={onOpenAdvanced}>
          <Zap size={14} /> Advanced
        </button>
      </div>

      {step.key === 'choose' && (
        <div className="space-y-3">
          <div>
            <h3 className="font-display font-semibold text-ink">What are you connecting?</h3>
            <p className="text-sm text-muted">Each type has its own scopes, endpoints and events. Pick one to start.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {types.map((t) => {
              const Icon = TYPE_ICON[t.type] || Zap;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => pickType(t)}
                  className="card p-4 text-left transition hover:border-accent/40 hover:bg-accent/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
                      <Icon size={16} />
                    </span>
                    <span className="badge badge-accent">{t.type}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-ink">{t.label}</p>
                  <p className="mt-1 text-xs text-muted">{t.blurb}</p>
                  <p className="mt-2 font-mono text-[10px] text-muted">{t.requiredScopes.join(' · ')}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step.key === 'system' && config && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display font-semibold text-ink">Register the {config.label} system</h3>
            <p className="text-sm text-muted">{config.blurb}</p>
          </div>
          {system ? (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{system.name}</p>
                  <p className="mono-label truncate">{system.baseUrl}</p>
                </div>
                <span className={`badge ${system.isActive ? 'badge-success' : 'badge-ghost'}`}>
                  {system.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-muted">
                Direction <span className="font-mono">{system.syncDirection}</span> · registered{' '}
                {new Date(system.createdAt).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-ghost btn-sm gap-2" onClick={onOpenAdvanced}>
                  Edit details
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm gap-2"
                  onClick={() =>
                    integrationsApi
                      .deleteExternalSystem(system.id)
                      .then(() => {
                        toast('System removed', 'success');
                        onRefresh();
                      })
                      .catch(() => toast('Failed to remove the system', 'error'))
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1" htmlFor="system-name">System name</label>
                <input
                  id="system-name"
                  className="input w-full"
                  value={systemForm.name}
                  onChange={(e) => setSystemForm({ ...systemForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1" htmlFor="system-url">Base URL</label>
                <input
                  id="system-url"
                  className="input w-full font-mono"
                  value={systemForm.baseUrl}
                  onChange={(e) => setSystemForm({ ...systemForm, baseUrl: e.target.value })}
                  placeholder="https://payroll.example.gov.ph/api"
                />
                <p className="mt-1 text-[11px] text-muted">
                  Recorded for reference — HRMS only calls out to this host when a push or poll job is configured.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1" htmlFor="system-direction">Sync direction</label>
                <select
                  id="system-direction"
                  className="select w-full"
                  value={systemForm.syncDirection}
                  onChange={(e) => setSystemForm({ ...systemForm, syncDirection: e.target.value })}
                >
                  <option value="pull">Pull from external</option>
                  <option value="push">Push to external</option>
                  <option value="bidirectional">Bidirectional</option>
                </select>
              </div>
              <button type="button" className="btn btn-primary gap-2" disabled={savingSystem} onClick={saveSystem}>
                {savingSystem ? 'Registering…' : <><Plus size={14} /> Register system</>}
              </button>
            </div>
          )}
        </div>
      )}

      {step.key === 'credentials' && config && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display font-semibold text-ink">Issue an API key</h3>
            <p className="text-sm text-muted">
              Shown once. The external system sends it as <span className="font-mono">x-api-key</span> on every request.
            </p>
          </div>
          {createdKey ? (
            <div className="card border-accent/40 bg-accent/5 p-4 space-y-3">
              <p className="text-xs text-ink flex items-center gap-2">
                <Lock size={13} className="text-accent" /> Save this key now — HRMS stores only its SHA-256 hash.
              </p>
              <div className="flex gap-2">
                <input
                  className="input flex-1 font-mono text-xs"
                  type={revealKey ? 'text' : 'password'}
                  readOnly
                  value={createdKey.key}
                  aria-label="New API key"
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setRevealKey(!revealKey)}
                  aria-label={revealKey ? 'Hide API key' : 'Reveal API key'}
                >
                  {revealKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(createdKey.key);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  aria-label="Copy API key"
                >
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="mono-label">{createdKey.scopes?.join(' · ')}</p>
              <label className="flex items-center gap-2 text-xs text-ink">
                <input type="checkbox" className="rounded border-line" checked={keySaved} onChange={(e) => setKeySaved(e.target.checked)} />
                I saved this key in the external system
              </label>
            </div>
          ) : matchingKey ? (
            <div className="card p-4 space-y-2">
              <p className="text-sm text-ink flex items-center gap-2">
                <ShieldCheck size={15} className="text-success" /> An active key with every required scope already exists
              </p>
              <p className="mono-label">
                {matchingKey.name} · {matchingKey.scopes?.join(' · ')}
              </p>
              <p className="text-xs text-muted">
                Its secret cannot be recovered. Paste the stored value in the Verify step, or issue a new key.
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-2"
                onClick={() => {
                  setCreatedKey(null);
                  setKeyName(`${config.label} integration (rotated)`);
                }}
              >
                <Key size={14} /> Issue a new key
              </button>
            </div>
          ) : (
            <div className="card p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1" htmlFor="key-name">Key name</label>
                <input id="key-name" className="input w-full" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
              </div>
              <div>
                <p className="block text-xs font-medium text-ink mb-1">Scopes</p>
                <div className="flex flex-wrap gap-2">
                  {(catalog.scopes || []).map((s) => (
                    <label
                      key={s.scope}
                      title={s.description}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
                        keyScopes.includes(s.scope) ? 'border-accent/40 bg-accent/10 text-accent' : 'border-line text-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="rounded border-line"
                        checked={keyScopes.includes(s.scope)}
                        onChange={(e) =>
                          setKeyScopes(e.target.checked ? [...keyScopes, s.scope] : keyScopes.filter((x) => x !== s.scope))
                        }
                      />
                      <span className="font-mono">{s.scope}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Required <span className="font-mono">{config.requiredScopes.join(' · ')}</span>
                  {config.recommendedScopes?.length ? (
                    <>
                      {' '}· recommended <span className="font-mono">{config.recommendedScopes.join(' · ')}</span>
                    </>
                  ) : null}
                </p>
                {keyError && <p className="mt-1 text-xs text-error">{keyError}</p>}
              </div>
              <button type="button" className="btn btn-primary gap-2" disabled={creatingKey} onClick={createKey}>
                {creatingKey ? 'Creating…' : <><Key size={14} /> Create API key</>}
              </button>
            </div>
          )}
        </div>
      )}

      {step.key === 'verify' && config && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display font-semibold text-ink">Verify the credentials</h3>
            <p className="text-sm text-muted">
              HRMS calls the real endpoints with this key — a connectivity probe plus one scoped read.
            </p>
          </div>
          <div className="card p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink mb-1" htmlFor="probe-key">API key</label>
              <input
                id="probe-key"
                className="input w-full font-mono"
                type="password"
                value={probeKey}
                onChange={(e) => setProbeKey(e.target.value)}
                placeholder="Paste the key issued in step 3"
                autoComplete="off"
              />
              <p className="mt-1 text-[11px] text-muted">Held in this form only — never written to browser storage.</p>
            </div>
            <button type="button" className="btn btn-primary gap-2" disabled={probing} onClick={runProbe}>
              {probing ? 'Verifying…' : <><Radio size={14} /> Run verification</>}
            </button>
            {probeResult && (
              <ul className="space-y-1.5">
                {probeResult.checks?.map((c) => (
                  <li key={c.label} className="flex items-start gap-2 text-xs">
                    {c.ok ? (
                      <Check size={13} className="text-success shrink-0 mt-0.5" />
                    ) : (
                      <CircleAlert size={13} className="text-error shrink-0 mt-0.5" />
                    )}
                    <span>
                      <span className="text-ink">{c.label}</span>
                      <span className="text-muted"> — {c.detail}</span>
                    </span>
                  </li>
                ))}
                <li className="mono-label">
                  {probeResult.ok ? 'Verified' : 'Failed'} {new Date(probeResult.at).toLocaleString()}
                </li>
              </ul>
            )}
          </div>
          <div className="card p-4 space-y-2">
            <p className="text-xs font-medium text-ink">Values the external system needs in its environment</p>
            <ul className="space-y-1">
              {(config.envKeys || []).map((env) => (
                <li key={env.key} className="flex flex-wrap items-baseline gap-2 text-xs">
                  <span className="font-mono text-ink">{env.key}</span>
                  <span className="text-muted">{env.hint}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {step.key === 'events' && config && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display font-semibold text-ink">Subscribe to events</h3>
            <p className="text-sm text-muted">
              Optional. HRMS pushes HMAC-signed events so the external system does not have to poll.
            </p>
          </div>
          {(config.events?.length || 0) === 0 ? (
            <p className="text-sm text-muted">
              {config.label} publishes no outbound events, so there is nothing to subscribe to. Continue to the summary.
            </p>
          ) : webhookSecret || webhook ? (
            <div className="card p-4 space-y-3">
              {webhookSecret && (
                <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 space-y-2">
                  <p className="text-xs text-ink flex items-center gap-2">
                    <Lock size={13} className="text-accent" /> Copy the signing secret — the receiver verifies HMAC-SHA256 with it.
                  </p>
                  <div className="flex gap-2">
                    <input className="input flex-1 font-mono text-xs" readOnly value={webhookSecret} aria-label="Webhook secret" />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      aria-label="Copy webhook secret"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookSecret);
                        toast('Secret copied', 'success');
                      }}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{webhookSecret ? webhookForm.name : webhook.name}</p>
                  <p className="mono-label truncate">{webhookSecret ? webhookForm.url : webhook.url}</p>
                </div>
                {!webhookSecret && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm gap-2"
                    disabled={webhookTesting}
                    onClick={() => sendTestEvent(webhook.id)}
                  >
                    <Webhook size={14} /> {webhookTesting ? 'Sending…' : 'Send test'}
                  </button>
                )}
              </div>
              <button type="button" className="btn btn-ghost btn-sm gap-2" onClick={onOpenAdvanced}>
                Manage webhooks
              </button>
            </div>
          ) : (
            <div className="card p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1" htmlFor="webhook-name">Name</label>
                <input
                  id="webhook-name"
                  className="input w-full"
                  value={webhookForm.name}
                  onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1" htmlFor="webhook-url">Delivery URL</label>
                <input
                  id="webhook-url"
                  className="input w-full font-mono"
                  value={webhookForm.url}
                  onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                  placeholder="https://payroll.example.gov.ph/api/v1/webhooks/hrms"
                />
              </div>
              <div>
                <p className="block text-xs font-medium text-ink mb-1">Events</p>
                <div className="space-y-1">
                  {(config.events || []).map((evt) => (
                    <label key={evt} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={webhookForm.events.includes(evt)}
                        onChange={(e) =>
                          setWebhookForm({
                            ...webhookForm,
                            events: e.target.checked ? [...webhookForm.events, evt] : webhookForm.events.filter((x) => x !== evt),
                          })
                        }
                      />
                      <span className="font-mono">{evt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="button" className="btn btn-primary gap-2" disabled={savingWebhook} onClick={saveWebhook}>
                {savingWebhook ? 'Creating…' : <><Webhook size={14} /> Subscribe</>}
              </button>
            </div>
          )}
        </div>
      )}

      {step.key === 'monitor' && config && (
        <div className="space-y-4">
          <div>
            <h3 className="font-display font-semibold text-ink">Setup summary</h3>
            <p className="text-sm text-muted">What the {config.label} integration is wired to right now.</p>
          </div>
          <div className="card p-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="mono-label">System</dt>
                <dd className="text-sm text-ink">
                  {system ? `${system.name} (${system.syncDirection})` : 'Not registered'}
                </dd>
              </div>
              <div>
                <dt className="mono-label">Credentials</dt>
                <dd className="text-sm text-ink">
                  {matchingKey
                    ? `${matchingKey.name} · ${matchingKey.scopes?.join(' · ')}`
                    : createdKey
                      ? `${createdKey.name} · ${createdKey.scopes?.join(' · ')}`
                      : 'None'}
                </dd>
              </div>
              <div>
                <dt className="mono-label">Last verified</dt>
                <dd className="text-sm text-ink">{verifiedAt ? new Date(verifiedAt).toLocaleString() : 'Never — run the verify step'}</dd>
              </div>
              <div>
                <dt className="mono-label">Events</dt>
                <dd className="text-sm text-ink">
                  {(config.events?.length || 0) === 0
                    ? 'Not applicable'
                    : webhook
                      ? `${webhook.name} · ${webhook.events?.join(' · ')}`
                      : 'Not subscribed'}
                </dd>
              </div>
            </dl>
          </div>
          <div className="card p-4 space-y-2">
            <p className="text-xs font-medium text-ink">Endpoints this key can reach</p>
            <ul className="space-y-1">
              {(config.endpoints || []).map((e) => (
                <li key={`${e.method} ${e.path}`} className="flex flex-wrap items-baseline gap-2 text-xs">
                  <span className="font-mono text-muted">{e.method}</span>
                  <span className="font-mono text-ink">{e.path}</span>
                  <span className="text-muted">{e.note}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-4 space-y-1.5">
            <p className="text-xs font-medium text-ink">Operations</p>
            <ul className="text-xs text-muted space-y-1">
              <li>Rotate the key every 90 days — issue a replacement in the Advanced view, then verify again.</li>
              <li>Keys are tenant-scoped and stored as SHA-256 hashes; a key cannot read another LGU&apos;s data.</li>
              <li>Every mutating call is written to the audit trail.</li>
            </ul>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-4">
        <button
          type="button"
          className="btn btn-ghost gap-2"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={stepIndex === 0}
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-3">
          {step.key === 'credentials' && createdKey && !keySaved && (
            <span className="text-xs text-muted">Confirm you saved the key to continue</span>
          )}
          <button
            type="button"
            className="btn btn-primary gap-2"
            onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
            disabled={
              stepIndex === STEPS.length - 1 ||
              (step.key === 'choose' && !typeKey) ||
              (step.key === 'credentials' && Boolean(createdKey) && !keySaved)
            }
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
