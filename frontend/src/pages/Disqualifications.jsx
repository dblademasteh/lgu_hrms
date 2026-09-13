import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import { disqualificationApi } from '../api/disqualifications.js';
import { useToast } from '../components/Toast.jsx';
import { ShieldAlert, Filter, Download, FileText, X, Save } from 'lucide-react';

const DISQUALIFICATION_TYPES = [
  'VIOLATION_OF_CSC_RULES',
  'CRIMINAL_CONVICTION',
  'MORAL_TURPITUDE',
  'FRAUD',
  'MISCONDUCT',
  'OTHER'
];

const DISQUALIFICATION_REASONS = [
  'GROSS_MISCONDUCT',
  'HARRASSMENT',
  'EMBEZZLEMENT',
  'FRAUDULENT_MISREPRESENTATION',
  'SUBSTANCE_ABUSE',
  'POLITICAL_PARTISANISM',
  'OTHER_GROUNDS'
];

export default function Disqualifications() {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeNumber: '',
    firstName: '',
    lastName: '',
    type: '',
    reason: '',
    date: '',
    validity: '',
    remarks: '',
    isBarred: false
  });

  useEffect(() => {
    fetchRecords();
  }, [page]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = { 
        page, 
        limit: 50,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        reason: reasonFilter || undefined,
        search: search || undefined
      };
      const response = await disqualificationApi.list(params);
      setRecords(response.data.records || []);
    } catch (err) {
      toast('Failed to load disqualification records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    setPage(1);
    fetchRecords();
  };

  const handleExport = async () => {
    try {
      const params = {
        type: typeFilter || undefined,
        reason: reasonFilter || undefined,
        isBarred: statusFilter ? statusFilter === 'active' : undefined
      };
      const response = await disqualificationApi.getReport(params);
      const csv = response.data.records.map(r => 
        `${r.employee.employeeNumber},${r.employee.firstName} ${r.employee.lastName},${r.type},${r.reason},${r.date},${r.isBarred ? 'Active' : 'Expired'}`
      ).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dibar-report.csv';
      a.click();
    } catch (err) {
      toast('Failed to export report', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await disqualificationApi.update(editingRecord.id, formData);
        toast('Disqualification record updated', 'success');
      } else {
        await disqualificationApi.create(formData);
        toast('Disqualification record created', 'success');
      }
      setShowForm(false);
      setEditingRecord(null);
      setFormData({
        employeeId: '',
        employeeNumber: '',
        firstName: '',
        lastName: '',
        type: '',
        reason: '',
        date: '',
        validity: '',
        remarks: '',
        isBarred: false
      });
      fetchRecords();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to save record';
      toast(msg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await disqualificationApi.delete(id);
        toast('Record deleted', 'success');
        fetchRecords();
      } catch (err) {
        toast('Failed to delete record', 'error');
      }
    }
  };

  const formatType = (type) => type.replace(/_/g, ' ');
  const formatReason = (reason) => reason.replace(/_/g, ' ');

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <ShieldAlert size={20} className="text-error" />
            DIBAR Records
          </h1>
          <p className="text-sm text-muted mt-0.5">CS Form No. 8 - Disqualified, Barred, or Disqualified Individuals</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline gap-2" onClick={handleExport}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-primary gap-2" onClick={() => setShowForm(true)}>
            <FileText size={16} /> Add Record
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by name or employee number..."
              className="input w-64 pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFilterChange()}
            />
          </div>
          
          <select 
            className="select w-auto"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); handleFilterChange(); }}
          >
            <option value="">All Status</option>
            <option value="active">Active Disqualifications</option>
            <option value="expired">Expired/Completed</option>
          </select>

          <select
            className="select w-auto"
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); handleFilterChange(); }}
          >
            <option value="">All Types</option>
            {DISQUALIFICATION_TYPES.map(t => (
              <option key={t} value={t}>{formatType(t)}</option>
            ))}
          </select>

          <select
            className="select w-auto"
            value={reasonFilter}
            onChange={e => { setReasonFilter(e.target.value); handleFilterChange(); }}
          >
            <option value="">All Reasons</option>
            {DISQUALIFICATION_REASONS.map(r => (
              <option key={r} value={r}>{formatReason(r)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="card p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : (
          <>
            <div className="overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Emp #</th>
                    <th>Type</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th>Valid Until</th>
                    <th>Barred</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted">No DIBAR records found</td>
                    </tr>
                  ) : (
                    records.map(r => (
                      <tr key={r.id}>
                        <td className="font-medium">
                          {r.employee?.firstName} {r.employee?.lastName}
                        </td>
                        <td className="font-mono">{r.employee?.employeeNumber || '—'}</td>
                        <td><span className="badge badge-warning">{formatType(r.type)}</span></td>
                        <td>{formatReason(r.reason)}</td>
                        <td className="font-mono">{r.date || '—'}</td>
                        <td className="font-mono">{r.validity || 'None'}</td>
                        <td>{r.isBarred ? 'Yes' : 'No'}</td>
                         <td>
                           <span className={`badge ${r.isBarred ? 'badge-error' : 'badge-success'}`}>
                             {r.isBarred ? 'Barred' : 'Inactive'}
                           </span>
                         </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" role="presentation" onClick={() => setShowForm(false)}>
          <div className="modal-box" role="dialog" aria-modal="true" aria-label="Add Disqualification Record" onClick={e => e.stopPropagation()}>
            <div className="modal-head border-b border-line px-4 py-3">
              <h3 className="font-display font-semibold text-ink">
                {editingRecord ? 'Edit DIBAR Record' : 'Add New DIBAR Record'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Employee Number</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={formData.employeeNumber}
                    onChange={e => setFormData({ ...formData, employeeNumber: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Last Name</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">First Name</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Type</label>
                  <select
                    className="select w-full"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="">Select type</option>
                    {DISQUALIFICATION_TYPES.map(t => (
                      <option key={t} value={t}>{formatType(t)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Reason</label>
                <select
                  className="select w-full"
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  required
                >
                  <option value="">Select reason</option>
                  {DISQUALIFICATION_REASONS.map(r => (
                    <option key={r} value={r}>{formatReason(r)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Date</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Valid Until</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={formData.validity}
                    onChange={e => setFormData({ ...formData, validity: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted mb-1">Remarks</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isBarred"
                  checked={formData.isBarred}
                  onChange={e => setFormData({ ...formData, isBarred: e.target.checked })}
                />
                <label htmlFor="isBarred" className="text-sm">Mark as Barred (affects recruitment)</label>
              </div>

              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-outline gap-2" onClick={() => setShowForm(false)}>
                  <X size={16} /> Cancel
                </button>
                <button type="submit" className="btn btn-primary gap-2">
                  <Save size={16} /> {editingRecord ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}