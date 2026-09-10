import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { listPrograms, createProgram, listEnrollments, createEnrollment } from '../api/training.js';
import { listEmployees } from '../api/employees.js';
import { useToast } from '../components/Toast.jsx';
import { badgeTone } from '../data/mock.js';
import { BookOpen, User, FileText, Plus, Calendar, RefreshCw, X, Save } from 'lucide-react';
import Modal from '../components/Modal.jsx';

export default function Learning(){
  const toast = useToast();
  const [programs, setPrograms] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code:'', title:'', description:'', durationHours:0 });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [progs, emps, enrs] = await Promise.all([
        listPrograms({}),
        listEmployees({ page: 1 }),
        listEnrollments({ page: 1 }),
      ]);
      setPrograms(progs.items || []);
      setEmployees(emps.items || []);
      setEnrollments(enrs.items || []);
    } catch {
      toast('Failed to load training data', 'error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(()=>{ load(); },[]);

  const totalEnrollments = enrollments.length;
  const activeEnrollments = enrollments.filter(e => e.status === 'ENROLLED').length;
  const completedEnrollments = enrollments.filter(e => e.status === 'COMPLETED').length;

  const onSubmit = async (e)=>{
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim()) {
      toast('Code and title are required.', 'error');
      return;
    }
    try {
      setLoading(true);
      await createProgram({ ...form, durationHours: Number(form.durationHours) || 0 });
      toast('Training program created.', 'success');
      setShowAdd(false); setForm({ code:'', title:'', description:'', durationHours:0 });
      load();
    } catch (err) {
      const msg = err?.response?.data?.error?.message;
      toast(msg || 'Failed to create program', 'error');
    } finally {
      setLoading(false);
    }
  };

  const enroll = async (programId, employeeId)=>{
    if (!employeeId) return;
    try {
      setLoading(true);
      await createEnrollment({ programId, employeeId, status:'ENROLLED' });
      toast('Employee enrolled.', 'success');
      load();
    } catch (err) {
      const msg = err?.response?.data?.error?.message;
      toast(msg || 'Enrollment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Learning & Development">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <BookOpen size={20} className="text-accent" />
            Learning & Development
          </h1>
          <p className="text-sm text-muted mt-0.5">Training programs and employee enrollments</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={load} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
          <button className="btn btn-primary gap-2" onClick={()=>setShowAdd(true)}>
            <Plus size={18} />
            New Program
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Programs</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{programs.length}</p>
          <p className="text-xs text-muted">Training courses</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Enrollments</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{totalEnrollments}</p>
          <p className="text-xs text-muted">Total enrollments</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Active</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{activeEnrollments}</p>
          <p className="text-xs text-muted">Currently enrolled</p>
        </div>
      </div>

      {/* Programs Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink flex items-center gap-2">
            <FileText size={18} className="text-accent" />
            Training Programs
          </h3>
          <span className="mono-label">{programs.length} programs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Hours</th>
                <th className="text-right">Enroll</th>
              </tr>
            </thead>
            <tbody>
              {programs.map(p=>(
                <tr key={p.id}>
                  <td className="font-mono font-medium text-ink">{p.code}</td>
                  <td>{p.title}</td>
                  <td className="font-mono">{p.durationHours}</td>
                  <td className="text-right">
                    <select onChange={e=>e.target.value && enroll(p.id, e.target.value)} defaultValue="">
                      <option value="">Enroll employee…</option>
                      {employees.map(e=> (
                        <option key={e.id} value={e.id}>
                          {e.employeeNumber} · {e.lastName}, {e.firstName}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {programs.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted text-sm py-8 text-center">
                    No training programs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enrollments Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink flex items-center gap-2">
            <User size={18} className="text-accent" />
            Enrollments
          </h3>
          <span className="mono-label">{totalEnrollments} enrollments</span>
        </div>
        {enrollments.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">No enrollments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Program</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map(en=>(
                  <tr key={en.id}>
                    <td className="font-mono">
                      {en.employee?.employeeNumber} · {en.employee?.lastName}, {en.employee?.firstName}
                    </td>
                    <td>{en.program?.title}</td>
                    <td><span className={`badge ${badgeTone(en.status)}`}>{en.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Program Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="New Training Program"
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => setShowAdd(false)}>
              <X size={16} />
              Cancel
            </button>
            <button type="submit" form="prog-form" className="btn btn-primary gap-2">
              <Save size={16} />
              Create Program
            </button>
          </>
        }
      >
        <form id="prog-form" onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="mono-label">Code *</label>
            <input className="input" placeholder="e.g., IT-SEC-001" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} required />
          </div>
          <div>
            <label className="mono-label">Title *</label>
            <input className="input" placeholder="Program title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required />
          </div>
          <div>
            <label className="mono-label">Description</label>
            <textarea className="input" placeholder="Program description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} rows={2} />
          </div>
          <div>
            <label className="mono-label">Duration (Hours)</label>
            <input type="number" className="input" placeholder="0" value={form.durationHours} onChange={e=>setForm({...form, durationHours:Number(e.target.value)})} min="0" />
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
