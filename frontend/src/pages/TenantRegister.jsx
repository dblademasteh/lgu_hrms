import React, { useState } from 'react';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { Landmark } from 'lucide-react';

export default function TenantRegister() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast('Code and name are required', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.post('/tenants', { code: code.trim().toUpperCase(), name: name.trim(), domain: domain.trim() || undefined });
      toast('Tenant registered successfully', 'success');
      setCode(''); setName(''); setDomain('');
    } catch (err) {
      toast(err?.response?.data?.error?.message || 'Could not create tenant', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-surface border border-line rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-ink text-bg grid place-items-center">
            <Landmark size={18}/>
          </div>
          <div>
            <p className="font-display font-bold">LGU HRMS</p>
            <p className="mono-label text-xs text-muted">Tenant Onboarding Portal</p>
          </div>
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">Register New LGU</h1>
        <p className="text-sm text-muted mb-6">Create a new tenant for an LGU. Registration is restricted to platform operators.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tenant Code</label>
            <input className="input h-12" placeholder="e.g. BATAAN" value={code} onChange={e=>setCode(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">LGU Name</label>
            <input className="input h-12" placeholder="Bataan Province LGU" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Domain / Subdomain</label>
            <input className="input h-12" placeholder="bataan.hrms.local" value={domain} onChange={e=>setDomain(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full h-12">
            {loading ? 'Creating…' : 'Create Tenant'}
          </button>
        </form>
        <p className="mono-label text-[10px] text-muted mt-6">After creation, run seedTenant for initial data. Default password is admin123.</p>
      </div>
    </div>
  );
}
