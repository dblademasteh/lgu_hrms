import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Globe, Users, Activity, ShieldCheck, Network, Save } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { useToast } from '../components/Toast.jsx';
import { tenantsApi } from '../api/tenants.js';

const LGU_LEVELS = {
  PROVINCIAL: 'Province',
  CITY: 'City',
  MUNICIPAL: 'Municipality',
};

export default function TenantDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ipsText, setIpsText] = useState('');
  const [savingIps, setSavingIps] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tenantsApi.get(id)
      .then(t => {
        if (cancelled) return;
        setTenant(t);
        setIpsText((t.allowedIps || []).join('\n'));
      })
      .catch(() => toast('Failed to load tenant', 'error'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, toast]);

  const saveAllowedIps = async () => {
    const list = ipsText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    setSavingIps(true);
    try {
      const updated = await tenantsApi.update(id, { allowedIps: list });
      setTenant(prev => ({ ...prev, ...updated }));
      setIpsText((updated.allowedIps || []).join('\n'));
      toast('On-premise access list updated', 'success');
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to update access list', 'error');
    } finally {
      setSavingIps(false);
    }
  };

  if (loading) {
    return (
      <Layout maxWidth="max-w-4xl">
        <div className="card p-8 text-center text-muted">Loading tenant…</div>
      </Layout>
    );
  }

  if (!tenant) {
    return (
      <Layout maxWidth="max-w-4xl">
        <div className="card p-8 text-center">
          <Building2 size={32} className="text-muted mx-auto mb-3" />
          <p className="text-ink font-medium mb-1">Tenant not found</p>
          <p className="text-sm text-muted mb-4">The tenant you are looking for does not exist or has been removed.</p>
          <Link to="/platform/tenants" className="btn btn-primary">Back to Tenants</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout maxWidth="max-w-4xl">
      <div className="mb-6">
        <Link to="/platform/tenants" className="btn btn-ghost gap-2 mb-3">
          <ArrowLeft size={16} />
          Back to Tenants
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
              <ShieldCheck size={20} className="text-accent" />
              {tenant.name}
            </h1>
            <p className="text-sm text-muted mt-0.5">Tenant details and configuration</p>
          </div>
          <span className={`badge ${tenant.isActive === false ? 'badge-error' : 'badge-success'}`}>
            {tenant.isActive === false ? 'Inactive' : 'Active'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="text-accent" size={16} />
            <span className="mono-label text-[10px] uppercase text-muted">LGU Level</span>
          </div>
          <p className="font-display text-lg font-bold text-ink">{LGU_LEVELS[tenant.lguLevel] || tenant.lguLevel || '—'}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="text-accent" size={16} />
            <span className="mono-label text-[10px] uppercase text-muted">Tenant Code</span>
          </div>
          <p className="font-display text-lg font-bold text-ink font-mono">{tenant.code}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="text-accent" size={16} />
            <span className="mono-label text-[10px] uppercase text-muted">Domain</span>
          </div>
          <p className="font-display text-lg font-bold text-ink">{tenant.domain || '—'}</p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-display font-semibold text-ink mb-4">Tenant Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mono-label text-[10px] uppercase text-muted mb-1">Tenant ID</p>
            <p className="text-sm text-ink font-mono">{tenant.id}</p>
          </div>
          <div>
            <p className="mono-label text-[10px] uppercase text-muted mb-1">Name</p>
            <p className="text-sm text-ink">{tenant.name}</p>
          </div>
          <div>
            <p className="mono-label text-[10px] uppercase text-muted mb-1">Code</p>
            <p className="text-sm text-ink font-mono">{tenant.code}</p>
          </div>
          <div>
            <p className="mono-label text-[10px] uppercase text-muted mb-1">LGU Level</p>
            <p className="text-sm text-ink">{LGU_LEVELS[tenant.lguLevel] || tenant.lguLevel || '—'}</p>
          </div>
          <div>
            <p className="mono-label text-[10px] uppercase text-muted mb-1">Domain</p>
            <p className="text-sm text-ink">{tenant.domain || '—'}</p>
          </div>
          <div>
            <p className="mono-label text-[10px] uppercase text-muted mb-1">Status</p>
            <p className="text-sm text-ink">{tenant.isActive === false ? 'Inactive' : 'Active'}</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="font-display font-semibold text-ink flex items-center gap-2">
              <Network size={18} className="text-accent" />
              On-Premise Access
            </h2>
            <p className="text-sm text-muted mt-1">
              Logins, PIN logins and token refreshes are only accepted from these
              networks. Leave empty to fall back to the global <code className="text-ink">ALLOWED_IPS</code> env.
            </p>
          </div>
          <span className={`badge ${(tenant.allowedIps || []).length ? 'badge-success' : 'badge-warning'}`}>
            {(tenant.allowedIps || []).length ? 'Restricted' : 'Open'}
          </span>
        </div>
        <div>
          <p className="mono-label text-[10px] uppercase text-muted mb-1">Allowed CIDRs (one per line)</p>
          <textarea
            value={ipsText}
            onChange={e => setIpsText(e.target.value)}
            rows={5}
            placeholder={'192.168.1.0/24\n203.0.113.0/24'}
            className="input w-full font-mono text-sm"
            spellCheck={false}
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-xs text-muted">
              Your source IP on this request: <code className="text-ink">{tenant.clientIp || '—'}</code>
            </p>
            <button
              type="button"
              className="btn btn-primary gap-2"
              onClick={saveAllowedIps}
              disabled={savingIps}
            >
              <Save size={16} />
              {savingIps ? 'Saving…' : 'Save Allowlist'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
