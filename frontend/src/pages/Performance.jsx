import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import MasterTable from '../components/MasterTable.jsx';
import Modal from '../components/Modal.jsx';
import { listPerformanceReviews, createPerformanceReview, updatePerformanceReview } from '../api/performance.js';
import { useToast } from '../components/Toast.jsx';

export default function Performance() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ employeeId: '', reviewYear: 2026, reviewType: 'IPCR', rating: '', comments: '' });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listPerformanceReviews({ page: 1, limit: 50 });
      const mapped = data.items.map(r => ({
        id: r.id,
        employee: `${r.employee.lastName}, ${r.employee.firstName}`,
        dept: r.employee.department?.name ?? '',
        year: r.reviewYear,
        type: r.reviewType,
        rating: r.rating ?? '-',
        status: r.status,
      }));
      setRows(mapped);
    } catch {
      toast('Failed to load performance reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ employeeId: '', reviewYear: 2026, reviewType: 'IPCR', rating: '', comments: '' });
    setModalOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updatePerformanceReview(editing.id, form);
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

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Performance</h1>
          <p className="text-sm text-muted mt-0.5">IPCR/OPCR reviews</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>New Review</button>
      </div>

      {loading ? <div>Loading...</div> : <MasterTable rows={rows} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Review' : 'New Review'} size="md">
        <form id="perf-form" onSubmit={submit} className="space-y-3">
          <div>
            <label className="mono-label">Employee ID</label>
            <input className="input" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mono-label">Year</label>
              <input type="number" className="input" value={form.reviewYear} onChange={e => setForm({ ...form, reviewYear: Number(e.target.value) })} required />
            </div>
            <div>
              <label className="mono-label">Type</label>
              <input className="input" value={form.reviewType} onChange={e => setForm({ ...form, reviewType: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="mono-label">Rating</label>
            <input type="number" step="0.01" className="input" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} />
          </div>
          <div>
            <label className="mono-label">Comments</label>
            <textarea className="input" value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} />
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
