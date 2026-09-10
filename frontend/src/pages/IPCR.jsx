import Layout from '../components/Layout.jsx';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { badgeTone } from '../data/mock.js';
import { FileText, User, Calendar, Star, StarHalf, Star as StarOutline } from 'lucide-react';
import { useToast } from '../components/Toast.jsx';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending', className: 'badge-warning' },
  { value: 'IN_PROGRESS', label: 'In Progress', className: 'badge-info' },
  { value: 'COMPLETED', label: 'Completed', className: 'badge-success' },
  { value: 'OVERDUE', label: 'Overdue', className: 'badge-error' },
];

export default function IPCR(){
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    api.get('/performance').then(r=>setReviews(r.data.items ?? [])).catch(()=>setError(true)).finally(()=>setLoading(false));
  },[]);

  const totalCount = reviews.length;
  const pendingCount = reviews.filter(r => r.status === 'PENDING').length;
  const completedCount = reviews.filter(r => r.status === 'COMPLETED').length;
  const ipcrCount = reviews.filter(r => r.reviewType === 'IPCR').length;
  const opcrCount = reviews.filter(r => r.reviewType === 'OPCR').length;

  // Helper to render star rating
  const renderRating = (rating) => {
    if (!rating || rating === '-') return <span className="text-muted">—</span>;
    const num = Number(rating);
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
    <Layout title="IPCR/OPCR Appraisal">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <FileText size={20} className="text-accent" />
            IPCR/OPCR Appraisal
          </h1>
          <p className="text-sm text-muted mt-0.5">Individual performance commitments and ratings</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-4">
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
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="text-accent" size={16} />
            <span className="text-xs mono-label uppercase text-muted">Completed</span>
          </div>
          <p className="font-display text-2xl font-bold text-ink">{completedCount}</p>
          <p className="text-xs text-muted">Finished reviews</p>
        </div>
      </div>

      {/* Appraisals Table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink flex items-center gap-2">
            <FileText size={18} className="text-accent" />
            Appraisals
          </h3>
          <span className="mono-label">{totalCount} reviews</span>
        </div>
        {loading ? (
          <p className="text-muted text-sm py-8 text-center">Loading appraisals…</p>
        ) : error ? (
          <p className="text-sm text-error py-8 text-center">Failed to load appraisals.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map(r=>(
                  <tr key={r.id}>
                    <td>
                      {r.employee 
                        ? `${r.employee.lastName}, ${r.employee.firstName}`
                        : <span className="text-muted">—</span>
                      }
                    </td>
                    <td><span className={`badge badge-info`}>{r.reviewType}</span></td>
                    <td className="font-mono">{r.reviewYear}</td>
                    <td><span className={`badge ${badgeTone(r.status)}`}>{r.status}</span></td>
                    <td>{renderRating(r.rating)}</td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted text-sm py-8 text-center">
                      No appraisals on file.
                    </td>
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
