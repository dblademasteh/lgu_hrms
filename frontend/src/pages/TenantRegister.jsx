import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { Landmark, Plus } from 'lucide-react';
import Layout from '../components/Layout.jsx';

const LGU_LEVELS = [
  { value: 'PROVINCIAL', label: 'Province' },
  { value: 'CITY', label: 'City' },
  { value: 'MUNICIPAL', label: 'Municipality' },
];

export default function TenantRegister() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [lguLevel, setLguLevel] = useState('PROVINCIAL');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast('Code and name are required', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.post('/tenants', {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        domain: domain.trim() || undefined,
        lguLevel,
      });
      toast('Tenant registered successfully', 'success');
      navigate('/platform');
    } catch (err) {
      toast(err?.response?.data?.error?.message || 'Could not create tenant', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout maxWidth="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
          <Landmark size={20} className="text-accent" />
          Register New LGU
        </h1>
        <p className="text-sm text-muted mt-0.5">Create a new tenant for an LGU. This portal is for platform operators only.</p>
      </div>

      <div className="card p-6">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="tenant-code" className="block text-sm font-medium mb-1">Tenant Code</label>
            <input
              id="tenant-code"
              className="input h-12"
              placeholder="e.g. BATAAN"
              value={code}
              onChange={e => setCode(e.target.value)}
            />
            <p className="text-xs text-muted mt-1">Short uppercase code, e.g. BATAAN</p>
          </div>
          <div>
            <label htmlFor="tenant-name" className="block text-sm font-medium mb-1">LGU Name</label>
            <input
              id="tenant-name"
              className="input h-12"
              placeholder="Bataan Province LGU"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tenant-level" className="block text-sm font-medium mb-1">LGU Level</label>
              <select
                id="tenant-level"
                className="select h-12"
                value={lguLevel}
                onChange={e => setLguLevel(e.target.value)}
              >
                {LGU_LEVELS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted mt-1">Determines the default org structure to seed.</p>
            </div>
            <div>
              <label htmlFor="tenant-domain" className="block text-sm font-medium mb-1">Domain / Subdomain</label>
              <input
                id="tenant-domain"
                className="input h-12"
                placeholder="bataan.hrms.local"
                value={domain}
                onChange={e => setDomain(e.target.value)}
              />
              <p className="text-xs text-muted mt-1">Optional. Used for tenant routing.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={loading} className="btn btn-primary h-12">
              {loading ? 'Creating…' : <><Plus size={16} /> Create Tenant</>}
            </button>
            <button type="button" className="btn btn-ghost h-12" onClick={() => navigate('/platform')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
