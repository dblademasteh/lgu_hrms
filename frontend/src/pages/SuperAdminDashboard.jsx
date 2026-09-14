import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Server, Globe, Building2, Users, Activity, Plus, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout.jsx';
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

export default function SuperAdminDashboard() {
  const toast = useToast();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenants();
  }, []);

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

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.isActive !== false).length,
    provincial: tenants.filter(t => t.lguLevel === 'PROVINCIAL').length,
    city: tenants.filter(t => t.lguLevel === 'CITY').length,
    municipal: tenants.filter(t => t.lguLevel === 'MUNICIPAL').length,
  };

  const recentTenants = [...tenants]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <Layout maxWidth="max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
            <ShieldCheck size={22} className="text-accent" />
            Platform Dashboard
          </h1>
          <p className="text-sm text-muted mt-1">Tenant and platform overview</p>
        </div>
        <Link to="/tenant-register" className="btn btn-primary gap-2">
          <Plus size={18} />
          Register LGU
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center">
              <Server size={20} />
            </div>
            <span className="mono-label text-[10px] uppercase text-muted">Total</span>
          </div>
          <p className="font-display text-3xl font-bold text-ink">{stats.total}</p>
          <p className="text-xs text-muted mt-1">{stats.active} active</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center">
              <Globe size={20} />
            </div>
            <span className="mono-label text-[10px] uppercase text-muted">Provinces</span>
          </div>
          <p className="font-display text-3xl font-bold text-ink">{stats.provincial}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center">
              <Building2 size={20} />
            </div>
            <span className="mono-label text-[10px] uppercase text-muted">Cities</span>
          </div>
          <p className="font-display text-3xl font-bold text-ink">{stats.city}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center">
              <Users size={20} />
            </div>
            <span className="mono-label text-[10px] uppercase text-muted">Municipalities</span>
          </div>
          <p className="font-display text-3xl font-bold text-ink">{stats.municipal}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-ink">Quick Actions</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/platform/tenants" className="card p-4 hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent grid place-items-center">
                  <Building2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-ink text-sm">Manage Tenants</p>
                  <p className="text-xs text-muted mt-0.5">View, search, and manage all registered LGUs</p>
                </div>
                <ArrowRight size={16} className="text-muted shrink-0" />
              </div>
            </Link>
            <Link to="/tenant-register" className="card p-4 hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 text-success grid place-items-center">
                  <Plus size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-ink text-sm">Register New LGU</p>
                  <p className="text-xs text-muted mt-0.5">Onboard a new province, city, or municipality</p>
                </div>
                <ArrowRight size={16} className="text-muted shrink-0" />
              </div>
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-ink">Active Rate</h2>
            <Activity className="text-accent" size={18} />
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-line" />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-accent"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - (stats.total ? stats.active / stats.total : 0))}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="font-display text-2xl font-bold text-ink">
                    {stats.total ? Math.round((stats.active / stats.total) * 100) : 0}%
                  </p>
                  <p className="text-[10px] text-muted mono-label uppercase">Active</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted text-center mt-3">
            {stats.active} of {stats.total} tenants active
          </p>
        </div>
      </div>

      {recentTenants.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-ink">Recently Added</h2>
            <Link to="/platform/tenants" className="text-xs text-accent hover:underline underline-offset-2">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>LGU Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTenants.map(t => (
                  <tr key={t.id}>
                    <td className="font-mono font-medium">{t.code}</td>
                    <td className="font-medium">{t.name}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${LEVEL_TONE[t.lguLevel] || 'bg-bg text-muted border-line'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                        {LGU_LEVELS.find(l => l.value === t.lguLevel)?.label || t.lguLevel || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${t.isActive === false ? 'badge-error' : 'badge-success'}`}>
                        {t.isActive === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
