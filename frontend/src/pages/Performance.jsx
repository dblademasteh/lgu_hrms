import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { listPerformanceReviews } from '../api/performance.js';
import { useToast } from '../components/Toast.jsx';
import { FileText, User, Star } from 'lucide-react';
import RatingStars from '../components/RatingStars.jsx';

export default function Performance() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listPerformanceReviews({ page: 1, limit: 100 });
      const items = (data.items ?? []).map(r => ({
        id: r.id,
        name: r.employee ? `${r.employee.lastName}, ${r.employee.firstName}` : '—',
        dept: r.employee?.department?.name ?? '',
        year: r.reviewYear,
        type: r.reviewType,
        rating: r.rating ?? 0,
        adjectival: r.adjectivalRating,
        status: r.status,
      }));
      setRows(items);
    } catch {
      toast('Failed to load performance reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalCount = rows.length;
  const ipcrCount = rows.filter(r => r.type === 'IPCR').length;
  const opcrCount = rows.filter(r => r.type === 'OPCR').length;

  return (
    <Layout title="Performance Reviews">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <FileText size={20} className="text-accent" />
            Performance
          </h1>
          <p className="text-sm text-muted mt-0.5">IPCR/OPCR reviews — use IPCR page for full SPMS editor</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Total Reviews</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{totalCount}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">IPCR</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{ipcrCount}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">OPCR</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{opcrCount}</p>
        </div>
      </div>

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
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.name}</td>
                    <td><span className="badge badge-info">{r.type}</span></td>
                    <td className="font-mono">{r.year}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <RatingStars rating={r.rating} />
                        <span className="text-xs text-muted">{r.adjectival?.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td><span className="badge">{r.status}</span></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted text-sm py-8 text-center">No performance reviews recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
