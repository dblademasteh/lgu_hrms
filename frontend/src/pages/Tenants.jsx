import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, ShieldCheck, Server, Globe, Activity, Search, Filter } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { tenantsApi } from '../api/tenants.js';

const LGU_LEVELS = [
  { value: 'PROVINCIAL', label: 'Province' },
  { value: 'CITY', label: 'City' },
  { value: 'MUNICIPAL', label: 'Municipality' },
];

const LEVEL_TONE = {
  PROVINCIAL: 'bg-accent/10 text-accent border-accent/20',
  CITY: 'bg-success/10 text-success border-success/20',
  MUNICIPAL: 'bg-warning/10 text-warning border-warning/20',
};

export default function Tenants() {
  const toast = useToast();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [confirmDel, setConfirmDel] = useState(null);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const data = await tenantsApi.list();
      setTenants(data || []);
    } catch (e) {
      toast('Failed to load tenants', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const removeTenant = async (tenant) => {
    try {
      await tenantsApi.remove(tenant.id);
      toast(`Tenant ${tenant.code} removed`, 'success');
      setTenants(l => l.filter(t => t.id !== tenant.id));
      setConfirmDel(null);
    } catch (e) {
      toast('Failed to remove tenant', 'error');
    }
  };

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.isActive !== false).length,
    provincial: tenants.filter(t => t.lguLevel === 'PROVINCIAL').length,
    city: tenants.filter(t => t.lguLevel === 'CITY').length,
    municipal: tenants.filter(t => t.lguLevel === 'MUNICIPAL').length,
  };

  const filtered = tenants.filter(t => {
    const q = search.trim().toLowerCase();
    const matchQ = !q || `${t.code} ${t.name} ${t.domain || ''}`.toLowerCase().includes(q);
    const matchL = levelFilter === 'ALL' || t.lguLevel === levelFilter;
    return matchQ && matchL;
  });

  return (
    <Layout maxWidth="max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <ShieldCheck size={20} className="text-accent" />
            Tenants
          </h1>
          <p className="text-sm text-muted mt-0.5">Manage registered LGUs and their access</p>
        </div>
        <Link to="/tenant-register" className="btn btn-primary gap-2">
          <Plus size={18} />
          Register LGU
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="text-accent" size={16} />
            <span className="mono-label text-[10px] uppercase text-muted">Total</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{stats.total}</p>
          <p className="text-xs text-muted mt-1">{stats.active} active</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="text-accent" size={16} />
            <span className="mono-label text-[10px] uppercase text-muted">Provinces</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{stats.provincial}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="text-accent" size={16} />
            <span className="mono-label text-[10px] uppercase text-muted">Cities</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{stats.city}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="text-accent" size={16} />
            <span className="mono-label text-[10px] uppercase text-muted">Municipalities</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{stats.municipal}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="text-accent" size={16} />
            <span className="mono-label text-[10px] uppercase text-muted">Active Rate</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">
            {stats.total ? Math.round((stats.active / stats.total) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-display font-semibold text-ink">Registered Tenants</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                className="input pl-9 w-64"
                placeholder="Search tenants…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden="true" />
              <select
                className="select pl-9 w-auto"
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
              >
                <option value="ALL">All levels</option>
                {LGU_LEVELS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <button type="button" className="btn btn-outline gap-2" onClick={loadTenants}>
              Refresh
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>LGU Level</th>
                <th>Domain</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-muted text-sm">Loading tenants…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <Building2 size={32} className="text-muted" />
                      <p className="text-sm text-muted font-medium">No tenants found</p>
                      <p className="text-xs text-muted">Try adjusting your search or register a new LGU.</p>
                      <Link to="/tenant-register" className="btn btn-primary gap-2 mt-2">
                        <Plus size={16} />
                        Register LGU
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} className="group">
                    <td className="font-mono font-medium">{t.code}</td>
                    <td className="font-medium">{t.name}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${LEVEL_TONE[t.lguLevel] || 'bg-bg text-muted border-line'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                        {LGU_LEVELS.find(l => l.value === t.lguLevel)?.label || t.lguLevel || '—'}
                      </span>
                    </td>
                    <td className="text-sm text-muted mono-label">{t.domain || '—'}</td>
                    <td>
                      <span className={`badge ${t.isActive === false ? 'badge-error' : 'badge-success'}`}>
                        {t.isActive === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="inline-flex gap-1">
                        <Link to={`/platform/tenants/${t.id}`} className="btn btn-ghost px-2 text-xs">
                          View
                        </Link>
                        <button type="button" className="btn btn-ghost px-2 text-xs text-error hover:text-error-ink" onClick={() => setConfirmDel(t)}>
                          Remove
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

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => removeTenant(confirmDel)}
        title="Remove tenant?"
        message={`${confirmDel?.code} · ${confirmDel?.name} will be removed. This does not delete tenant data automatically.`}
        confirmLabel="Remove"
        danger
      />
    </Layout>
  );
}
