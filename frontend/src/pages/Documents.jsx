import React, { useEffect, useCallback, useState } from 'react';
import { FileText, Archive, Pencil, Download, Search, Upload } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { listEmployees } from '../api/employees.js';
import { documentsApi } from '../api/documents.js';
import { useAuthStore } from '../stores/authStore.js';
import { usePagedList } from '../hooks/usePagedList.js';

const STATUS_ORDER = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED'];
const DOCUMENT_TYPES = ['OFFICE_ORDER', 'POLICY', 'MSB_CONSTITUTION', 'LD_PLAN', 'MINUTES', 'RESOLUTION', 'MEMO', 'AGREEMENT_MOA', 'SERVICE_RECORD', 'PAYSLIP', 'OTHER'];
const DOCUMENT_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED'];

function badgeForStatus(status) {
  const tones = {
    DRAFT: 'badge-ghost',
    PENDING_REVIEW: 'badge-warning',
    APPROVED: 'badge-info',
    REJECTED: 'badge-error',
    PUBLISHED: 'badge-success',
    ARCHIVED: 'badge',
  };
  return tones[status] || 'badge';
}

const TRANSITION_LABELS = {
  DRAFT: { PENDING_REVIEW: 'Submit for Review', ARCHIVED: 'Archive' },
  PENDING_REVIEW: { APPROVED: 'Approve', REJECTED: 'Reject' },
  APPROVED: { PUBLISHED: 'Publish', REJECTED: 'Reject' },
  REJECTED: { PENDING_REVIEW: 'Resubmit', ARCHIVED: 'Archive' },
  PUBLISHED: { ARCHIVED: 'Archive' },
};

function labelForStatus(status) {
  return STATUS_ORDER.includes(status)
    ? {
        DRAFT: 'Draft',
        PENDING_REVIEW: 'Pending Review',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
        PUBLISHED: 'Published',
        ARCHIVED: 'Archived',
      }[status]
    : status;
}

function transitionLabel(docStatus, nextStatus) {
  return TRANSITION_LABELS[docStatus]?.[nextStatus] || labelForStatus(nextStatus);
}

function labelForType(type) {
  return {
    OFFICE_ORDER: 'Office Order',
    POLICY: 'Policy',
    MSB_CONSTITUTION: 'MSB Constitution',
    LD_PLAN: 'L&D Plan',
    MINUTES: 'Minutes',
    RESOLUTION: 'Resolution',
    MEMO: 'Memo',
    AGREEMENT_MOA: 'Agreement/MOA',
    SERVICE_RECORD: 'Service Record',
    PAYSLIP: 'Payslip',
    OTHER: 'Other',
  }[type] ?? type;
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${i === 0 || n >= 10 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

export default function Documents() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [stats, setStats] = useState({});
  const [employees, setEmployees] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const [errors, setErrors] = useState({});
  const [empSearch, setEmpSearch] = useState('');
  const [workflow, setWorkflow] = useState(null);

  const fetchDocs = useCallback((opts) => documentsApi.list(opts).then((r) => r.data), []);
  const {
    items: documents,
    total,
    page,
    setPage,
    loading,
    filters,
    setFilter,
    reload,
    limit,
  } = usePagedList(fetchDocs, { type: '', status: '', search: '' }, 20);

  useEffect(() => {
    documentsApi.stats().then((res) => setStats(res.data || {})).catch(() => {});
  }, [page, filters]);

  useEffect(() => {
    listEmployees({ limit: 200, status: 'ACTIVE' })
      .then((res) => setEmployees(res.employees || res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    documentsApi.workflow()
      .then((res) => setWorkflow(res.data || res))
      .catch(() => {});
  }, []);

  const canDo = (doc, nextStatus) => {
    if (!workflow?.[doc?.status]) return false;
    return workflow[doc.status].next?.includes(nextStatus) || false;
  };

  const openEdit = (doc) => {
    setEditing(doc);
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await documentsApi.remove(deleting.id);
      toast('Document archived', 'success');
    } catch (e) {
      toast(e.response?.data?.error?.message || e.message || 'Archive failed', 'error');
    } finally {
      setDeleting(null);
    }
    reload();
  };

  const handleStatus = async (doc, nextStatus) => {
    if (!canDo(doc, nextStatus)) return;
    setErrors({});
    try {
      await documentsApi.setStatus(doc.id, nextStatus);
      toast(`Status → ${labelForStatus(nextStatus)}`, 'success');
      reload();
    } catch (e) {
      toast(e.response?.data?.error?.message || e.message || 'Status update failed', 'error');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const { data } = await documentsApi.download(doc.id);
      const objectUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      const ext = doc.url?.includes('.') ? `.${doc.url.split('.').pop()}` : '';
      link.href = objectUrl;
      link.download = `${doc.title}${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      toast(e.message || 'Download failed', 'error');
    }
  };

  const [form, setForm] = useState({
    title: '',
    type: 'MEMO',
    description: '',
    relatedEmployeeId: '',
    file: null,
  });

  const resetForm = () => {
    setForm({ title: '', description: '', type: 'MEMO', relatedEmployeeId: '', file: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    try {
      if (editing) {
        await documentsApi.update(editing.id, form, form.file);
        toast('Document updated', 'success');
      } else {
        await documentsApi.create(form, form.file);
        toast('Document created', 'success');
      }
      setShowForm(false);
      resetForm();
      reload();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Save failed';
      toast(msg, 'error');
      const details = err.response?.data?.details;
      if (Array.isArray(details)) {
        const map = {};
        details.forEach((d) => {
          const key = d.path?.[0] || d.field || 'form';
          map[key] = d.message;
        });
        setErrors(map);
      } else {
        setErrors({ form: msg });
      }
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Layout>
      <div className="p-card space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText size={20} />
            <h1 className="font-display text-ink">Documents</h1>
          </div>
          <button type="button" className="btn btn-primary gap-2 h-11" onClick={openNew}>
            <Upload size={16} /> Upload
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm text-muted mb-1">Type</label>
            <select
              className="select w-full min-h-[44px]"
              value={filters.type}
              onChange={(e) => setFilter({ type: e.target.value })}
            >
              <option value="">All types</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>{labelForType(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Status</label>
            <select
              className="select w-full min-h-[44px]"
              value={filters.status}
              onChange={(e) => setFilter({ status: e.target.value })}
            >
              <option value="">All statuses</option>
              {DOCUMENT_STATUSES.slice().reverse().map((s) => (
                <option key={s} value={s}>{labelForStatus(s)}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-muted mb-1">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-muted" />
              <input
                type="text"
                className="input w-full pl-9 min-h-[44px]"
                placeholder="Search title or type..."
                value={filters.search}
                onChange={(e) => setFilter({ search: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {DOCUMENT_STATUSES.map((s) => (
            <div key={s} className="rounded-xl border border-line bg-surface p-3 flex flex-col gap-1.5">
              <span className={`badge ${badgeForStatus(s)} self-start`}>{labelForStatus(s)}</span>
              <span className="font-display text-2xl text-ink leading-none">{stats[s] ?? 0}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col" className="hidden md:table-cell">Version</th>
                <th scope="col" className="hidden md:table-cell">Effective</th>
                <th scope="col">Employee</th>
                <th scope="col" className="hidden lg:table-cell">Date</th>
                <th scope="col" className="hidden lg:table-cell">Size</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 && loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j}><div className="skeleton h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted">No documents found</td>
                  </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="font-medium">{doc.title}</td>
                    <td className="text-sm">{labelForType(doc.type)}</td>
                    <td>
                      <span className={`badge ${badgeForStatus(doc.status)}`}>
                        {labelForStatus(doc.status)}
                      </span>
                    </td>
                    <td className="text-sm hidden md:table-cell">{doc.version || '—'}</td>
                    <td className="text-sm hidden md:table-cell">
                      {doc.effectiveDate ? new Date(doc.effectiveDate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' }) : '—'}
                    </td>
                    <td className="text-sm">
                      {doc.relatedEmployee
                        ? `${doc.relatedEmployee.firstName} ${doc.relatedEmployee.lastName}`
                        : '—'}
                    </td>
                    <td className="font-mono text-sm hidden lg:table-cell">
                      {doc.publishedAt ? new Date(doc.publishedAt).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' }) : '—'}
                    </td>
                    <td className="text-sm text-muted hidden lg:table-cell">
                      {formatBytes(doc.fileSize)}
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {doc.url && (
                          <button
                            type="button"
                            className="btn btn-ghost px-3 h-11 text-xs min-w-[44px]"
                            onClick={() => handleDownload(doc)}
                            aria-label="Download"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                        )}
                        {/* Status transitions */}
                        {STATUS_ORDER.map((s) => {
                          if (s === doc.status) return null;
                          if (s === 'ARCHIVED') return null;
                          if (!canDo(doc, s)) return null;
                          return (
                            <button
                              key={s}
                              type="button"
                              className="btn btn-ghost px-3 h-11 text-xs min-w-[44px]"
                              onClick={() => handleStatus(doc, s)}
                              title={`→ ${labelForStatus(s)}`}
                            >
                              {transitionLabel(doc.status, s)}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className="btn btn-ghost px-3 h-11 text-xs min-w-[44px]"
                          onClick={() => openEdit(doc)}
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        {canDo(doc, 'ARCHIVED') && (
                          <button
                            type="button"
                            className="btn btn-ghost px-3 h-11 text-xs text-error min-w-[44px]"
                            onClick={() => setDeleting(doc)}
                            aria-label="Archive"
                            title="Archive"
                          >
                            <Archive size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted">
            <span>{total} documents</span>
            <div className="inline-flex items-center gap-2">
              <button
                className="btn btn-ghost btn-sm h-11"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Prev
              </button>
              <span className="font-mono">{page} / {totalPages}</span>
              <button
                className="btn btn-ghost btn-sm h-11"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" role="presentation" onClick={() => setShowForm(false)}>
          <div className="modal-box modal-lg" role="dialog" aria-modal="true" aria-label={editing ? 'Edit Document' : 'Add Document'} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head border-b border-line px-4 py-3">
              <h3 className="font-display font-semibold text-ink">
                {editing ? 'Edit Document' : 'Add New Document'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {errors.form && (
                <div className="rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-sm text-error">{errors.form}</div>
              )}
              <div>
                <label htmlFor="d-title" className="block text-sm text-muted mb-1">Title *</label>
                <input
                  id="d-title"
                  type="text"
                  className={`input w-full ${errors.title ? 'input-error' : ''}`}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? 'd-title-error' : undefined}
                />
                {errors.title && <p id="d-title-error" className="text-error text-xs mt-0.5">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="d-type" className="block text-sm text-muted mb-1">Type *</label>
                  <select
                    id="d-type"
                    className={`select w-full ${errors.type ? 'input-error' : ''}`}
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    required
                    aria-invalid={!!errors.type}
                    aria-describedby={errors.type ? 'd-type-error' : undefined}
                  >
                    {DOCUMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{labelForType(t)}</option>
                    ))}
                  </select>
                  {errors.type && <p id="d-type-error" className="text-error text-xs mt-0.5">{errors.type}</p>}
                </div>
                <div>
                  <label htmlFor="d-emp" className="block text-sm text-muted mb-1">Related Employee</label>
                  <input
                    type="text"
                    className="input w-full mb-1"
                    placeholder="Search employees…"
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                  />
                  <select
                    id="d-emp"
                    className={`select w-full ${errors.relatedEmployeeId ? 'input-error' : ''}`}
                    value={form.relatedEmployeeId}
                    onChange={(e) => { setForm({ ...form, relatedEmployeeId: e.target.value }); setEmpSearch(''); }}
                    aria-invalid={!!errors.relatedEmployeeId}
                    aria-describedby={errors.relatedEmployeeId ? 'd-emp-error' : undefined}
                  >
                    <option value="">— none —</option>
                    {(empSearch
                      ? employees.filter((emp) => {
                          const q = empSearch.toLowerCase();
                          return (
                            emp.employeeNumber?.toLowerCase().includes(q) ||
                            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q)
                          );
                        })
                      : employees
                    ).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeNumber} · {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                  {errors.relatedEmployeeId && <p id="d-emp-error" className="text-error text-xs mt-0.5">{errors.relatedEmployeeId}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="d-desc" className="block text-sm text-muted mb-1">Description</label>
                <textarea
                  id="d-desc"
                  className="input w-full"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description..."
                />
              </div>

              <div>
                <label htmlFor="d-file" className="block text-sm text-muted mb-1">
                  File {editing ? '' : '*'}
                </label>
                <input
                  id="d-file"
                  type="file"
                  className={`input w-full text-sm min-h-[44px] ${errors.file ? 'input-error' : ''}`}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg"
                  onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })}
                  {...(editing ? {} : { required: true })}
                  aria-invalid={!!errors.file}
                  aria-describedby={errors.file ? 'd-file-error' : undefined}
                />
                {editing && <span className="text-xs text-muted">Leave empty to keep existing file</span>}
                {errors.file && <p id="d-file-error" className="text-error text-xs mt-0.5">{errors.file}</p>}
                {form.file && !errors.file && (
                  <p className="text-xs text-muted mt-1">Selected: {form.file.name} ({formatBytes(form.file.size)})</p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-outline gap-2" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary gap-2">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Archive document?"
        message={`${deleting?.title ?? ''} — it will be archived and retained for the audit trail.`}
        confirmLabel="Archive"
        danger
      />
    </Layout>
  );
}
