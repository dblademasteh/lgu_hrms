import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { listPrograms, createProgram, updateProgram, deleteProgram, listEnrollments, createEnrollment, updateEnrollment, deleteEnrollment } from '../api/training.js';
import { listEmployees } from '../api/employees.js';
import { useToast } from '../components/Toast.jsx';
import { badgeTone } from '../data/mock.js';
import { useUserCapabilities } from '../config/permissions.js';
import { useAuthStore } from '../stores/authStore.js';
import { BookOpen, User, FileText, Plus, Calendar, RefreshCw, X, Save, CheckCircle, Ban, Trash2, Award } from 'lucide-react';

const errMsg = e => e?.response?.data?.error?.message || e?.message || 'Failed';
const emptyForm = { code: '', title: '', description: '', durationHours: 0 };
const fmtDate = d => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }) : '—');
const ENROLLMENT_STATUSES = ['ENROLLED', 'COMPLETED', 'CANCELLED'];

export default function Learning() {
  const toast = useToast();
  const user = useAuthStore(s => s.user);
  const caps = useUserCapabilities(!!user);
  const canManage = caps.trainingCRUD === true;

  const [programs, setPrograms] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentsTotal, setEnrollmentsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [programSearch, setProgramSearch] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState('');
  const [enrollSelects, setEnrollSelects] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteProgramTarget, setDeleteProgramTarget] = useState(null);
  const [cancelEnrollmentTarget, setCancelEnrollmentTarget] = useState(null);
  const [deleteEnrollmentTarget, setDeleteEnrollmentTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [progs, emps, enrs] = await Promise.all([
        listPrograms({ search: programSearch || undefined }),
        listEmployees({ page: 1, limit: 200 }),
        listEnrollments({ page: 1, limit: 200, status: enrollmentStatus || undefined }),
      ]);
      setPrograms(progs.items || []);
      setEmployees(emps.items || []);
      setEnrollments(enrs.items || []);
      setEnrollmentsTotal(enrs.total ?? (enrs.items || []).length);
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(() => { load(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programSearch, enrollmentStatus]);

  const totalEnrollments = enrollmentsTotal;
  const activeEnrollments = enrollments.filter(e => e.status === 'ENROLLED').length;

  const onSubmitCreate = async e => {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim()) {
      toast('Code and title are required.', 'error');
      return;
    }
    try {
      setLoading(true);
      await createProgram({ ...form, durationHours: Number(form.durationHours) || 0 });
      toast('Training program created.', 'success');
      setShowAdd(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = p => {
    setEditing(p);
    setEditForm({ code: p.code || '', title: p.title || '', description: p.description || '', durationHours: p.durationHours ?? 0 });
  };

  const onSubmitEdit = async e => {
    e.preventDefault();
    if (!editForm.code.trim() || !editForm.title.trim()) {
      toast('Code and title are required.', 'error');
      return;
    }
    try {
      setLoading(true);
      await updateProgram(editing.id, { ...editForm, durationHours: Number(editForm.durationHours) || 0 });
      toast('Training program updated.', 'success');
      setEditing(null);
      load();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const onDeleteProgram = async () => {
    const id = deleteProgramTarget?.id;
    if (!id) return;
    try {
      await deleteProgram(id);
      toast('Training program deleted.', 'success');
      load();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const enroll = async (programId, employeeId) => {
    if (!employeeId) return;
    try {
      setLoading(true);
      await createEnrollment({ programId, employeeId, status: 'ENROLLED' });
      toast('Employee enrolled.', 'success');
      setEnrollSelects(s => ({ ...s, [programId]: '' })); // reset the picker to avoid accidental re-enroll
      load();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const completeEnrollment = async en => {
    try {
      await updateEnrollment(en.id, { status: 'COMPLETED' });
      toast('Enrollment marked as completed.', 'success');
      load();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const onCancelEnrollment = async () => {
    const id = cancelEnrollmentTarget?.id;
    if (!id) return;
    try {
      await updateEnrollment(id, { status: 'CANCELLED' });
      toast('Enrollment cancelled.', 'success');
      load();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const onDeleteEnrollment = async () => {
    const id = deleteEnrollmentTarget?.id;
    if (!id) return;
    try {
      await deleteEnrollment(id);
      toast('Enrollment deleted.', 'success');
      load();
    } catch (err) {
      toast(errMsg(err), 'error');
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
          {canManage && (
            <button className="btn btn-primary gap-2" onClick={() => setShowAdd(true)}>
              <Plus size={18} />
              New Program
            </button>
          )}
        </div>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 flex-1 min-w-56">
          <span className="mono-label text-xs uppercase text-muted">Search programs</span>
          <input
            className="input"
            placeholder="Code or title…"
            value={programSearch}
            onChange={e => setProgramSearch(e.target.value)}
            aria-label="Search programs by code or title"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="mono-label text-xs uppercase text-muted">Status</span>
          <select
            className="select w-auto"
            value={enrollmentStatus}
            onChange={e => setEnrollmentStatus(e.target.value)}
            aria-label="Filter enrollments by status"
          >
            <option value="">All statuses</option>
            {ENROLLMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

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
                {canManage && <th className="text-right">Enroll</th>}
                {canManage && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {programs.map(p => (
                <tr key={p.id}>
                  <td className="font-mono font-medium text-ink">{p.code}</td>
                  <td>{p.title}</td>
                  <td className="font-mono">{p.durationHours}</td>
                  {canManage && (
                    <td className="text-right">
                      <select
                        className="select w-auto"
                        value={enrollSelects[p.id] || ''}
                        onChange={e => enroll(p.id, e.target.value)}
                        aria-label={`Enroll employee in ${p.title}`}
                      >
                        <option value="">Enroll employee…</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.employeeNumber} · {emp.lastName}, {emp.firstName}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {canManage && (
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn btn-ghost btn-sm gap-1" onClick={() => openEdit(p)}>
                          <FileText size={14} />
                          Edit
                        </button>
                        <button className="btn btn-ghost btn-sm gap-1" onClick={() => setDeleteProgramTarget(p)}>
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {programs.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 5 : 3} className="text-muted text-sm py-8 text-center">
                    No training programs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink flex items-center gap-2">
            <Award size={18} className="text-accent" />
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
                  <th>Completed At</th>
                  {canManage && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {enrollments.map(en => (
                  <tr key={en.id}>
                    <td className="font-mono">
                      {en.employee?.employeeNumber} · {en.employee?.lastName}, {en.employee?.firstName}
                    </td>
                    <td>{en.program?.title}</td>
                    <td><span className={`badge ${badgeTone(en.status)}`}>{en.status}</span></td>
                    <td className="font-mono">{fmtDate(en.completedAt)}</td>
                    {canManage && (
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {en.status === 'ENROLLED' && (
                            <>
                              <button className="btn btn-ghost btn-sm gap-1" onClick={() => completeEnrollment(en)} title="Mark completed">
                                <CheckCircle size={14} />
                                Complete
                              </button>
                              <button className="btn btn-ghost btn-sm gap-1" onClick={() => setCancelEnrollmentTarget(en)} title="Cancel enrollment">
                                <Ban size={14} />
                                Cancel
                              </button>
                            </>
                          )}
                          <button className="btn btn-ghost btn-sm gap-1" onClick={() => setDeleteEnrollmentTarget(en)} title="Delete enrollment">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
        <form id="prog-form" onSubmit={onSubmitCreate} className="space-y-3">
          <div>
            <label className="mono-label">Code *</label>
            <input className="input" placeholder="e.g., IT-SEC-001" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div>
            <label className="mono-label">Title *</label>
            <input className="input" placeholder="Program title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="mono-label">Description</label>
            <textarea className="input" placeholder="Program description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <label className="mono-label">Duration (Hours)</label>
            <input type="number" className="input" placeholder="0" value={form.durationHours} onChange={e => setForm({ ...form, durationHours: Number(e.target.value) })} min="0" />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Training Program"
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => setEditing(null)}>
              <X size={16} />
              Cancel
            </button>
            <button type="submit" form="prog-edit-form" className="btn btn-primary gap-2">
              <Save size={16} />
              Save Changes
            </button>
          </>
        }
      >
        <form id="prog-edit-form" onSubmit={onSubmitEdit} className="space-y-3">
          <div>
            <label className="mono-label">Code *</label>
            <input className="input" placeholder="e.g., IT-SEC-001" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value })} required />
          </div>
          <div>
            <label className="mono-label">Title *</label>
            <input className="input" placeholder="Program title" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
          </div>
          <div>
            <label className="mono-label">Description</label>
            <textarea className="input" placeholder="Program description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={2} />
          </div>
          <div>
            <label className="mono-label">Duration (Hours)</label>
            <input type="number" className="input" placeholder="0" value={editForm.durationHours} onChange={e => setEditForm({ ...editForm, durationHours: Number(e.target.value) })} min="0" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteProgramTarget}
        onClose={() => setDeleteProgramTarget(null)}
        onConfirm={onDeleteProgram}
        title="Delete training program"
        message={`Delete program "${deleteProgramTarget?.code}"? Programs with existing enrollments cannot be deleted — cancel or remove its enrollments first.`}
        confirmLabel="Delete"
        danger
      />

      <ConfirmDialog
        open={!!cancelEnrollmentTarget}
        onClose={() => setCancelEnrollmentTarget(null)}
        onConfirm={onCancelEnrollment}
        title="Cancel enrollment"
        message={`Cancel ${cancelEnrollmentTarget?.employee?.lastName}, ${cancelEnrollmentTarget?.employee?.firstName}'s enrollment in "${cancelEnrollmentTarget?.program?.title}"?`}
        confirmLabel="Cancel Enrollment"
        danger
      />

      <ConfirmDialog
        open={!!deleteEnrollmentTarget}
        onClose={() => setDeleteEnrollmentTarget(null)}
        onConfirm={onDeleteEnrollment}
        title="Delete enrollment"
        message={`Delete ${deleteEnrollmentTarget?.employee?.lastName}, ${deleteEnrollmentTarget?.employee?.firstName}'s enrollment in "${deleteEnrollmentTarget?.program?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </Layout>
  );
}