import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { listPerformanceReviews, createPerformanceReview, updatePerformanceReview, deletePerformanceReview } from '../api/performance.js';
import { useToast } from '../components/Toast.jsx';
import { badgeTone } from '../data/mock.js';
import { FileText, User, Calendar, Star, StarHalf, Star as StarOutline, Trash2 } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'IPCR', label: 'IPCR' },
  { value: 'OPCR', label: 'OPCR' },
  { value: 'PDP', label: 'PDP' },
  { value: 'IDP', label: 'IDP' },
];

export default function Performance() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ employeeId: '', employeeName: '', reviewYear: new Date().getFullYear(), reviewType: 'IPCR', rating: '', comments: '' });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listPerformanceReviews({ page: 1, limit: 100 });
      const items = (data.items ?? []).map(r => ({
        id: r.id,
        employeeId: r.employeeId,
        name: r.employee ? `${r.employee.lastName}, ${r.employee.firstName}` : '—',
        dept: r.employee?.department?.name ?? '',
        year: r.reviewYear,
        type: r.reviewType,
        rating: r.rating ?? 0,
        status: r.status,
      }));
      setRows(items);
    } catch {
      toast('Failed to load performance reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ employeeId: '', employeeName: '', reviewYear: new Date().getFullYear(), reviewType: 'IPCR', rating: '', comments: '' });
    setModalOpen(true);
  };

  const openEdit = row => {
    setEditing(row);
    setForm({
      employeeId: row.employeeId ?? '',
      employeeName: row.name ?? '',
      reviewYear: row.year ?? new Date().getFullYear(),
      reviewType: row.type ?? 'IPCR',
      rating: row.rating === '-' ? '' : row.rating,
      comments: '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deletePerformanceReview(id);
      setRows(l => l.filter(x => x.id !== id));
      toast('Review deleted.', 'info');
      setDeleting(null);
    } catch {
      toast('Failed to delete review', 'error');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updatePerformanceReview(editing.id, {
          employeeId: form.employeeId,
          reviewYear: form.reviewYear,
          reviewType: form.reviewType,
          rating: form.rating,
          comments: form.comments,
        });
        toast('Review updated', 'success');
      } else {
        await createPerformanceReview(form);
        toast('Review created', 'success');
      }
      setModalOpen(false);
      load();
    } catch {
      toast('Save failed', 'error');
    }
  };

  // Summary stats
  const totalCount = rows.length;
  const ipcrCount = rows.filter(r => r.type === 'IPCR').length;
  const opcrCount = rows.filter(r => r.type === 'OPCR').length;

  // Helper to render star rating
  const renderRating = (rating) => {
    const num = Number(rating) || 0;
    const fullStars = Math.floor(num);
    const hasHalf = num - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => <Star key={`full-${i}`} size={14} fill="currentColor" className="text-amber-400" />)}
        {hasHalf && <StarHalf size={14} fill="currentColor" className="text-amber-400" />}
        {[...Array(emptyStars)].map((_, i) => <StarOutline key={`empty-${i}`} size={14} className="text-gray-300" />)}
      </div>
    );
  };

  return (
    <Layout title="Performance Reviews">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <FileText size={20} className="text-accent" />
            Performance
          </h1>
          <p className="text-sm text-muted mt-0.5">IPCR/OPCR employee reviews and ratings</p>
        </div>
        <button type="button" className="btn btn-primary gap-2" onClick={openAdd}>
          <span className="inline-block">+</span>
          New Review
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Total Reviews</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{totalCount}</p>
          <p className="text-xs text-muted">Records on file</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">IPCR</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{ipcrCount}</p>
          <p className="text-xs text-muted">Individual reviews</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">OPCR</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{opcrCount}</p>
          <p className="text-xs text-muted">Org reviews</p>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink flex items-center gap-2">
            <FileText size={18} className="text-accent" />
            Review Records
          </h3>
          <span className="mono-label">{rows.length} reviews</span>
        </div>
        {loading ? (
          <p className="text-muted text-sm py-8 text-center">Loading appraisals…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Year</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const statusBadge = badgeTone(r.status);
                  return (
                    <tr key={r.id}>
                      <td className="font-medium">{r.name}</td>
                      <td><span className="badge badge-info">{r.type}</span></td>
                      <td className="font-mono">{r.year}</td>
                      <td>{renderRating(r.rating)}</td>
                      <td><span className={`badge ${statusBadge}`}>{r.status}</span></td>
                      <td className="text-right">
                        <span className="inline-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-ghost px-2 text-xs"
                            aria-label={`Edit ${r.name}`}
                            onClick={() => openEdit(r)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost px-2 text-xs text-error hover:text-error-ink"
                            aria-label={`Delete ${r.name}`}
                            onClick={() => setDeleting(r)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-muted text-sm py-8 text-center">
                      No performance reviews recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New/Edit Review Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Review' : 'New Review'}
        size="md"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-1" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="perf-form" className="btn btn-primary gap-1">
              {editing ? 'Save Changes' : 'Create Review'}
            </button>
          </>
        }
      >
        <form id="perf-form" onSubmit={submit} className="space-y-3">
          <div>
            <label className="mono-label">Employee ID</label>
            <input className="input" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required />
          </div>
          <div>
            <label className="mono-label">Employee Name</label>
            <input className="input" value={form.employeeName} onChange={e => setForm({ ...form, employeeName: e.target.value })} placeholder="Last, First" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mono-label">Year</label>
              <input type="number" className="input" value={form.reviewYear} onChange={e => setForm({ ...form, reviewYear: Number(e.target.value) })} required />
            </div>
            <div>
              <label className="mono-label">Type</label>
              <select className="select" value={form.reviewType} onChange={e => setForm({ ...form, reviewType: e.target.value })} required>
                {TYPE_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mono-label">Rating (1-5)</label>
            <input type="number" step="0.1" className="input" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} />
          </div>
          <div>
            <label className="mono-label">Comments</label>
            <textarea className="input" value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} rows={3} placeholder="Performance notes..." />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => handleDelete(deleting.id)}
        title="Delete Review"
        message={`Delete performance review for ${deleting?.name || 'this record'}?`}
        confirmLabel="Delete"
        danger
      />
    </Layout>
  );
}
