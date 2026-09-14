import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Globe, Users, Activity, ShieldCheck } from 'lucide-react';
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tenantsApi.list()
      .then(list => {
        if (cancelled) return;
        const found = list.find(t => t.id === id);
        setTenant(found || null);
      })
      .catch(() => toast('Failed to load tenant', 'error'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, toast]);

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
    </Layout>
  );
}
