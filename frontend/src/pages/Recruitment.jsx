import React, { useEffect, useState } from 'react';
import { User, Search, Plus, Mail, Phone, MapPin, Briefcase, RefreshCw, X, Save, CheckCircle } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { listApplicants, createApplicant, hireApplicant, updateApplicant } from '../api/recruitment.js';
import { departmentsApi } from '../api/departments.js';
import { positionsApi } from '../api/positions.js';
import { useToast } from '../components/Toast.jsx';
import { badgeTone } from '../data/mock.js';

const APPLICANT_STATUSES = [
  { value: 'NEW', label: 'New', className: 'badge-accent' },
  { value: 'APPLIED', label: 'Applied', className: 'badge-accent' },
  { value: 'SCREENED', label: 'Screened', className: 'badge-warning' },
  { value: 'SHORTLISTED', label: 'Shortlisted', className: 'badge-info' },
  { value: 'INTERVIEWED', label: 'Interviewed', className: 'badge-info' },
  { value: 'OFFERED', label: 'Offered', className: 'badge-accent' },
  { value: 'HIRED', label: 'Hired', className: 'badge-success' },
  { value: 'REJECTED', label: 'Rejected', className: 'badge-error' },
];

export default function Recruitment(){
  const toast = useToast();
  const [applicants, setApplicants] = useState([]);
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', appliedPositionId:'', appliedDepartmentId:'' });

  const load = async ()=>{
    try {
      const params = { search: search || undefined, status: statusFilter || undefined };
      const data = await listApplicants(params);
      setApplicants(data.items || []);
    } catch {
      toast('Failed to load applicants', 'error');
    }
    try {
      const { data } = await positionsApi.list();
      setPositions(data || []);
    } catch {
      setPositions([]);
    }
    try {
      const { data } = await departmentsApi.list();
      setDepartments(data || []);
    } catch {
      setDepartments([]);
    }
  };
  useEffect(()=>{ load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search, statusFilter]);

  const newCount = applicants.filter(a => a.status === 'NEW').length;
  const hiredCount = applicants.filter(a => a.status === 'HIRED').length;

  const onSubmit = async (e)=>{
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast('First and last name are required.', 'error');
      return;
    }
    try {
      await createApplicant({
        ...form,
        appliedPositionId: form.appliedPositionId || null,
        appliedDepartmentId: form.appliedDepartmentId || null,
        email: form.email || null,
        phone: form.phone || null,
        status: 'NEW',
      });
      toast('Applicant added.', 'success');
      setShowAdd(false);
      setForm({ firstName:'', lastName:'', email:'', phone:'', appliedPositionId:'', appliedDepartmentId:'' });
      load();
    } catch (err) {
      const msg = err?.response?.data?.error?.message;
      toast(msg || 'Failed to add applicant', 'error');
    }
  };

  return (
    <Layout title="Recruitment">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <User size={20} className="text-accent" />
            Recruitment
          </h1>
          <p className="text-sm text-muted mt-0.5">Applicants and eligibility tracking</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={load} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
          <button className="btn btn-primary gap-2" onClick={()=>setShowAdd(v=>!v)}>
            <Plus size={18} />
            New Applicant
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">New App.</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{newCount}</p>
          <p className="text-xs text-muted">Awaiting review</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Hired</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{hiredCount}</p>
          <p className="text-xs text-muted">Successfully hired</p>
        </div>
      </div>

      {/* New Applicant Form */}
      {showAdd && (
        <div className="card p-4 mb-4">
          <form onSubmit={onSubmit} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">First Name *</label>
                <input 
                  className="input" 
                  placeholder="First name"
                  value={form.firstName} 
                  onChange={e=>setForm({...form, firstName:e.target.value})} 
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Last Name *</label>
                <input 
                  className="input" 
                  placeholder="Last name"
                  value={form.lastName} 
                  onChange={e=>setForm({...form, lastName:e.target.value})} 
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Email</label>
                <input 
                  className="input" 
                  type="email"
                  placeholder="email@example.com"
                  value={form.email} 
                  onChange={e=>setForm({...form, email:e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Phone</label>
                <input 
                  className="input" 
                  type="tel"
                  placeholder="Mobile number"
                  value={form.phone} 
                  onChange={e=>setForm({...form, phone:e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Position</label>
                <select 
                  className="select" 
                  value={form.appliedPositionId} 
                  onChange={e=>setForm({...form, appliedPositionId:e.target.value})}
                >
                  <option value="">Select position</option>
                  {positions.map(p=> (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.salaryGrade ? `(SG-${p.salaryGrade})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Department</label>
                <select 
                  className="select" 
                  value={form.appliedDepartmentId} 
                  onChange={e=>setForm({...form, appliedDepartmentId:e.target.value})}
                >
                  <option value="">Select department</option>
                  {departments.map(d=> (
                    <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn btn-primary gap-2">
                <Save size={16} />
                Save Applicant
              </button>
              <button type="button" className="btn btn-ghost gap-2" onClick={()=>setShowAdd(false)}>
                <X size={16} /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { key:'NEW', label:'New' },
          { key:'SCREENED', label:'Screened' },
          { key:'SHORTLISTED', label:'Shortlisted' },
          { key:'INTERVIEWED', label:'Interviewed' },
          { key:'OFFERED', label:'Offered' },
          { key:'HIRED', label:'Hired' },
        ].map(col=> {
          const items = applicants.filter(a => a.status === col.key);
          return (
            <div key={col.key} className="card p-3 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <span className="text-xs mono-label">{items.length}</span>
              </div>
              <div className="space-y-2 overflow-y-auto">
                {items.map(a=>(
                  <div key={a.id} className="rounded-lg border border-line p-3 bg-surface hover:bg-surface/80">
                    <div className="font-medium text-sm">{a.firstName} {a.lastName}</div>
                    <div className="text-xs text-muted">{a.position?.title || '—'}</div>
                    <div className="text-xs text-muted">{a.email || '—'}</div>
                    {a.status !== 'HIRED' && a.status !== 'REJECTED' && (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-1">
                          <select className="select text-xs h-7" value={a.status} onChange={async e=>{
                            try {
                              await updateApplicant(a.id, { status: e.target.value });
                              load();
                            } catch {}
                          }}>
                            {APPLICANT_STATUSES.map(s=> <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <button className="btn btn-ghost h-7 px-2 text-xs" onClick={async ()=>{
                            try {
                              await hireApplicant(a.id);
                              toast('Applicant hired', 'success');
                              load();
                            } catch (err) {
                              toast(err?.response?.data?.error?.message || 'Failed to hire', 'error');
                            }
                          }}><CheckCircle size={12}/> Hire</button>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <input type="number" placeholder="Elig" className="input text-xs h-7" value={a.eligibilityScore||''} onChange={async e=>{
                            await updateApplicant(a.id, { eligibilityScore: Number(e.target.value)||null });
                          }}/>
                          <input type="number" placeholder="Screen" className="input text-xs h-7" value={a.screeningScore||''} onChange={async e=>{
                            await updateApplicant(a.id, { screeningScore: Number(e.target.value)||null });
                          }}/>
                          <input type="number" placeholder="Interv" className="input text-xs h-7" value={a.interviewScore||''} onChange={async e=>{
                            await updateApplicant(a.id, { interviewScore: Number(e.target.value)||null });
                          }}/>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {items.length === 0 && <div className="text-xs text-muted text-center py-6">Empty</div>}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
