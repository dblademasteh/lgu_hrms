import React, { useState, useEffect, useMemo, useId } from 'react';
import { Check, X, Plus, AlertCircle, Search, ChevronDown, ChevronRight, Wallet } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { leaveApi } from '../api/leave.js';
import { listEmployees } from '../api/employees.js';
import { badgeTone } from '../data/mock.js';

const LEAVE_TYPES = [
  { value: 'VACATION', label: 'Vacation' },
  { value: 'SICK', label: 'Sick' },
  { value: 'SPECIAL_PRIVILEGE', label: 'Special Privilege' },
  { value: 'SPECIAL_WOMEN', label: 'Special Women' },
  { value: 'MATERNITY', label: 'Maternity' },
  { value: 'PATERNITY', label: 'Paternity' },
  { value: 'SOLO_PARENT', label: 'Solo Parent' },
  { value: 'COMPENSATORY', label: 'Compensatory' },
];

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RECOMMENDED', label: 'Recommended' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DENIED', label: 'Denied' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const CREDIT_LABELS = {
  VACATION: 'VL',
  SICK: 'SL',
  SPECIAL_PRIVILEGE: 'SP',
  SPECIAL_WOMEN: 'SW',
  MATERNITY: 'ML',
  PATERNITY: 'PL',
  SOLO_PARENT: 'Solo',
};

const FLAG_ORDER = ['LWOP', 'Terminal', 'Forced', 'Half'];

function initialsOf(name) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('');
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function flagBadge(flag) {
  const tone = {
    LWOP: 'badge-warning',
    Terminal: 'badge-error',
    Forced: '',
    Half: 'badge-accent',
  }[flag] || '';
  const cls = tone ? `badge ${tone}` : 'badge';
  return <span className={cls}>{flag}</span>;
}

function rowFlags(r) {
  const flags = [];
  if (r.isHalfDay) flags.push('Half');
  if (r.isLwop) flags.push('LWOP');
  if (r.isTerminal) flags.push('Terminal');
  if (r.isForced) flags.push('Forced');
  if (r.studyBondMonths) flags.push(`Bond ${r.studyBondMonths}mo`);
  return flags;
}

function actionConfig(status) {
  switch (status) {
    case 'PENDING':
      return {
        primary: { type: 'Approved', label: 'Approve', icon: Check, className: 'btn-primary' },
        secondary: [
          { type: 'Recommended', label: 'Recommend', icon: ChevronRight },
          { type: 'Denied', label: 'Deny', icon: X, danger: true },
        ],
        hint: 'Pending recommendation or direct approval.',
      };
    case 'RECOMMENDED':
      return {
        primary: { type: 'Approved', label: 'Approve', icon: Check, className: 'btn-primary' },
        secondary: [
          { type: 'Denied', label: 'Deny', icon: X, danger: true },
        ],
        hint: 'Recommended. Final decision required.',
      };
    case 'APPROVED':
    case 'DENIED':
    case 'CANCELLED':
      return null;
    default:
      return null;
  }
}

export default function Leave() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [credits, setCredits] = useState(null);
  const [note, setNote] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCredits, setShowCredits] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  const [form, setForm] = useState({
    employeeId: '',
    type: 'VACATION',
    fromDate: '',
    toDate: '',
    reason: '',
    isHalfDay: false,
    isLwop: false,
    isTerminal: false,
    isForced: false,
    advanceNoticed: false,
    documentUrl: '',
    studyBondMonths: '',
  });

  const formId = useId();

  useEffect(() => {
    leaveApi.listRequests()
      .then(r => setRequests(r.data))
      .catch(() => toast('Failed to load leave requests', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    listEmployees({ limit: 200 })
      .then(r => setEmployeeOptions(r.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selected?.employeeId) {
      leaveApi.listCredits(selected.employeeId).then(r => setCredits(r.data)).catch(() => setCredits(null));
    } else {
      setCredits(null);
    }
  }, [selected]);

  const filtered = useMemo(() => {
    let result = requests;
    if (statusFilter !== 'ALL') result = result.filter(r => r.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => {
        const emp = r.employee ?? {};
        const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.toLowerCase();
        const no = (emp.employeeNumber ?? '').toLowerCase();
        return name.includes(q) || no.includes(q) || r.type.toLowerCase().includes(q);
      });
    }
    return result;
  }, [requests, statusFilter, searchQuery]);

  const decide = async (request, action) => {
    if (!request) return;
    try {
      if (action === 'Monetized') {
        const r = await leaveApi.monetize(request.id, { note: note || undefined });
        setRequests(rs => rs.map(x => x.id === request.id ? r.data : x));
        setSelected(r.data);
        setNote('');
        toast('Leave monetized.', 'success');
        return;
      }
      const statusMap = { Approved: 'APPROVED', Denied: 'DENIED', Recommended: 'RECOMMENDED' };
      const r = await leaveApi.updateRequest(request.id, { status: statusMap[action], note: note || undefined });
      setRequests(rs => rs.map(x => x.id === request.id ? r.data : x));
      setSelected(r.data);
      setNote('');
      toast(`Leave ${action.toLowerCase()}.`, action === 'Approved' || action === 'Recommended' ? 'success' : 'info');
    } catch { toast('Failed to update leave', 'error'); }
  };

  const validateForm = () => {
    const e = {};
    if (!form.employeeId) e.employeeId = 'Employee ID is required';
    if (!form.fromDate) e.fromDate = 'From date is required';
    if (!form.toDate) e.toDate = 'To date is required';
    if (form.fromDate && form.toDate && form.toDate < form.fromDate) e.toDate = 'To date cannot be before from date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openNew = () => {
    setForm({
      employeeId: '',
      type: 'VACATION',
      fromDate: '',
      toDate: '',
      reason: '',
      isHalfDay: false,
      isLwop: false,
      isTerminal: false,
      isForced: false,
      advanceNoticed: false,
      documentUrl: '',
      studyBondMonths: '',
    });
    setErrors({});
    setShowNewModal(true);
  };

  const submitNew = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        studyBondMonths: form.studyBondMonths ? Number(form.studyBondMonths) : null,
      };
      const r = await leaveApi.createRequest(payload);
      setRequests(rs => [r.data, ...rs]);
      setSelected(r.data);
      setShowNewModal(false);
      toast('Leave request filed.', 'success');
    } catch (err) {
      toast(err?.response?.data?.error?.message || 'Failed to file leave', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const counts = useMemo(() => {
    const c = { ALL: requests.length };
    for (const r of requests) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [requests]);

  return (
    <Layout maxWidth="max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Leave</h1>
          <p className="text-xs text-muted mt-0.5">CSC Omnibus Rules</p>
        </div>
        <button type="button" className="btn btn-primary gap-1.5 h-8 px-3 text-sm" onClick={openNew}>
          <Plus size={14} /> New Request
        </button>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search employee, type…"
              className="input h-8 text-sm pl-8"
              aria-label="Search leave requests"
            />
          </div>
          <span className="mono-label text-xs">{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
        </div>
        <div className="tabbar" role="tablist" aria-label="Filter by leave status">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.value}
              className={`tab ${statusFilter === tab.value ? 'tab-active' : ''}`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">{counts[tab.value] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-muted text-sm">Loading…</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Period</th>
                  <th className="text-right">Days</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const emp = r.employee ?? {};
                  const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || '—';
                  const no = emp.employeeNumber ?? '';
                  const from = formatDate(r.fromDate);
                  const to = formatDate(r.toDate);
                  const flags = rowFlags(r);
                  return (
                    <tr
                      key={r.id}
                      data-selectable="true"
                      data-selected={selected?.id === r.id ? 'true' : undefined}
                      onClick={() => setSelected(r)}
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-accent/10 text-accent font-display font-bold flex items-center justify-center shrink-0 text-xs" aria-hidden="true">
                            {initialsOf(name)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-sm text-ink block truncate">{name}</span>
                            <span className="font-mono text-muted text-xs">{no}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm">{r.type.replace(/_/g, ' ')}</td>
                      <td className="font-mono text-xs">{from} → {to}</td>
                      <td className="font-mono text-right text-xs">{r.days}{r.isHalfDay ? ' (½)' : ''}</td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className={`badge ${badgeTone(r.status)}`}>{r.status}</span>
                          <div className="flex flex-wrap gap-1">
                            {flags.map(f => flagBadge(f))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan="5" className="text-center text-muted py-6 text-sm">No leave requests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <Modal
          open={!!selected}
          onClose={() => { setSelected(null); setShowCredits(false); }}
          title="Leave Details"
          size="sm"
          footer={
            (() => {
              const actions = actionConfig(selected.status);
              if (!actions) return null;
              if (selected.status === 'APPROVED' && selected.isTerminal && !selected.monetized) {
                return (
                  <button type="button" className="btn btn-primary w-full h-8 text-xs gap-1.5" onClick={() => setConfirm({ type: 'Monetized' })}>
                    Monetize
                  </button>
                );
              }
              return (
                <>
                  {actions.secondary.map(a => (
                    <button
                      key={a.type}
                      type="button"
                      className={`btn btn-ghost h-8 px-2.5 text-xs gap-1.5 ${a.danger ? 'text-error hover:text-error' : ''}`}
                      onClick={() => setConfirm({ type: a.type })}
                    >
                      <a.icon size={12} />
                      {a.label}
                    </button>
                  ))}
                  <button type="button" className={`btn ${actions.primary.className} h-8 px-3 text-xs gap-1.5`} onClick={() => setConfirm({ type: actions.primary.type })}>
                    <actions.primary.icon size={12} />
                    {actions.primary.label}
                  </button>
                </>
              );
            })()
          }
        >
          {(() => {
            const emp = selected.employee ?? {};
            const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || '—';
            const no = emp.employeeNumber ?? '';
            const from = formatDate(selected.fromDate);
            const to = formatDate(selected.toDate);
            const flags = rowFlags(selected);
            const actions = actionConfig(selected.status);
            return (
              <div className="space-y-3">
                {actions && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-accent/5 border border-accent/10">
                    <AlertCircle size={14} className="text-accent mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-xs text-muted leading-relaxed">{actions.hint}</p>
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent font-display font-bold flex items-center justify-center shrink-0 text-sm" aria-hidden="true">
                    {initialsOf(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold text-sm text-ink truncate">{name}</p>
                    <p className="mono-label text-xs">{no} · {selected.type.replace(/_/g, ' ')}</p>
                  </div>
                  <span className={`badge ${badgeTone(selected.status)}`}>{selected.status}</span>
                </div>

                {flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {flags.map(f => flagBadge(f))}
                  </div>
                )}

                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="contents">
                    <dt className="text-muted">Period</dt>
                    <dd className="font-mono text-right">{from} → {to}</dd>
                    <dt className="text-muted">Days</dt>
                    <dd className="font-mono text-right">{selected.days}{selected.isHalfDay ? ' (half)' : ''}</dd>
                  </div>
                  {selected.isLwop && (
                    <>
                      <dt className="text-muted">Type</dt>
                      <dd className="text-right"><span className="badge badge-accent">LWOP</span></dd>
                    </>
                  )}
                  {selected.isTerminal && (
                    <>
                      <dt className="text-muted">Mode</dt>
                      <dd className="text-right"><span className="badge badge-error">Terminal</span></dd>
                    </>
                  )}
                  {selected.isForced && (
                    <>
                      <dt className="text-muted">Mode</dt>
                      <dd className="text-right"><span className="badge">Forced</span></dd>
                    </>
                  )}
                  {selected.studyBondMonths && (
                    <>
                      <dt className="text-muted">Bond</dt>
                      <dd className="font-mono text-right">{selected.studyBondMonths} months</dd>
                    </>
                  )}
                  {selected.decisionNote && (
                    <>
                      <dt className="text-muted">Note</dt>
                      <dd className="text-right text-xs truncate max-w-[200px]" title={selected.decisionNote}>{selected.decisionNote}</dd>
                    </>
                  )}
                </dl>

                {selected.status === 'APPROVED' && selected.isTerminal && !selected.monetized && (
                  <p className="text-xs text-muted mb-2">
                    Monetization is computed automatically (CSC MC 2 s.2016): unused days × salary / 22 × 0.0481927.
                  </p>
                )}

                {(selected.status === 'PENDING' || selected.status === 'RECOMMENDED') && (
                  <div>
                    <label htmlFor={`${formId}-modal-note`} className="block text-xs text-muted mb-0.5">Note (optional)</label>
                    <textarea
                      id={`${formId}-modal-note`}
                      className="input mb-2 text-sm"
                      rows={2}
                      placeholder="Reason for decision"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    />
                  </div>
                )}

                {credits && (
                  <div className="border-t border-line pt-2">
                    <button
                      className="flex items-center justify-between w-full text-left"
                      onClick={() => setShowCredits(!showCredits)}
                    >
                      <span className="mono-label text-xs flex items-center gap-1.5">
                        <Wallet size={12} className="text-muted" aria-hidden="true" />
                        Leave Credits
                      </span>
                      <ChevronDown size={14} className={`text-muted transition-transform duration-150 ${showCredits ? 'rotate-180' : ''}`} />
                    </button>
                    {showCredits && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                        {Object.entries(CREDIT_LABELS).map(([key, label]) => {
                          const cr = credits.find(x => x.type === key);
                          const balance = cr ? cr.balance : 0;
                          const low = balance <= 2 && balance > 0;
                          const zero = balance <= 0;
                          return (
                            <div key={key} className="flex justify-between items-center">
                              <span className="text-muted">{label}</span>
                              <span className={`font-mono ${low ? 'text-warning' : zero ? 'text-error' : ''}`}>{balance}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="New Leave Request"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-1.5 h-8 px-2.5 text-sm" onClick={() => setShowNewModal(false)} disabled={submitting}>
              <X size={14} />
              Cancel
            </button>
            <button type="submit" form={formId} className="btn btn-primary gap-1.5 h-8 px-3 text-sm" disabled={submitting}>
              <Check size={14} />
              {submitting ? 'Saving…' : 'File Leave'}
            </button>
          </>
        }
      >
        <form id={formId} onSubmit={submitNew} className="space-y-2.5" noValidate>
          <div>
            <label htmlFor={`${formId}-emp`} className="block text-xs font-medium text-ink mb-0.5">Employee *</label>
            <select
              id={`${formId}-emp`}
              className={`select ${errors.employeeId ? 'border-error' : ''}`}
              value={form.employeeId}
              onChange={e => {
                setForm(f => ({ ...f, employeeId: e.target.value }));
                if (errors.employeeId) setErrors(er => ({ ...er, employeeId: undefined }));
              }}
              aria-invalid={!!errors.employeeId}
              aria-describedby={errors.employeeId ? `${formId}-emp-error` : undefined}
            >
              <option value="">— select employee —</option>
              {employeeOptions.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.employeeNumber} · {emp.firstName} {emp.lastName}</option>
              ))}
            </select>
            {errors.employeeId && (
              <p id={`${formId}-emp-error`} className="text-error text-xs mt-0.5">{errors.employeeId}</p>
            )}
          </div>
          <div>
            <label htmlFor={`${formId}-type`} className="block text-xs font-medium text-ink mb-0.5">Leave Type</label>
            <select
              id={`${formId}-type`}
              className="select"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            >
              {LEAVE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`${formId}-from`} className="block text-xs font-medium text-ink mb-0.5">From *</label>
              <input
                id={`${formId}-from`}
                type="date"
                className={`input ${errors.fromDate ? 'input-error' : ''}`}
                value={form.fromDate}
                onChange={e => {
                  setForm(f => ({ ...f, fromDate: e.target.value }));
                  if (errors.fromDate) setErrors(e => ({ ...e, fromDate: undefined }));
                }}
                aria-invalid={!!errors.fromDate}
                aria-describedby={errors.fromDate ? `${formId}-from-error` : undefined}
              />
              {errors.fromDate && (
                <p id={`${formId}-from-error`} className="text-error text-xs mt-0.5">{errors.fromDate}</p>
              )}
            </div>
            <div>
              <label htmlFor={`${formId}-to`} className="block text-xs font-medium text-ink mb-0.5">To *</label>
              <input
                id={`${formId}-to`}
                type="date"
                className={`input ${errors.toDate ? 'input-error' : ''}`}
                value={form.toDate}
                onChange={e => {
                  setForm(f => ({ ...f, toDate: e.target.value }));
                  if (errors.toDate) setErrors(e => ({ ...e, toDate: undefined }));
                }}
                aria-invalid={!!errors.toDate}
                aria-describedby={errors.toDate ? `${formId}-to-error` : undefined}
              />
              {errors.toDate && (
                <p id={`${formId}-to-error`} className="text-error text-xs mt-0.5">{errors.toDate}</p>
              )}
            </div>
          </div>
          <div>
            <label htmlFor={`${formId}-reason`} className="block text-xs font-medium text-ink mb-0.5">Reason</label>
            <textarea
              id={`${formId}-reason`}
              className="input"
              rows={2}
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <details className="group">
            <summary className="text-xs font-medium text-muted cursor-pointer select-none hover:text-ink transition-colors list-none flex items-center gap-1">
              <ChevronDown size={12} className="transition-transform duration-150 group-open:rotate-180" />
              More options
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={form.isHalfDay} onChange={e => setForm(f => ({ ...f, isHalfDay: e.target.checked }))} />
                Half-day
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={form.isLwop} onChange={e => setForm(f => ({ ...f, isLwop: e.target.checked }))} />
                LWOP
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={form.isTerminal} onChange={e => setForm(f => ({ ...f, isTerminal: e.target.checked }))} />
                Terminal
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={form.isForced} onChange={e => setForm(f => ({ ...f, isForced: e.target.checked }))} />
                Forced
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={form.advanceNoticed} onChange={e => setForm(f => ({ ...f, advanceNoticed: e.target.checked }))} />
                Advance Notice
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label htmlFor={`${formId}-bond`} className="block text-xs font-medium text-ink mb-0.5">Study Bond (mo)</label>
                <input id={`${formId}-bond`} className="input" type="number" min="0" max="60" value={form.studyBondMonths} onChange={e => setForm(f => ({ ...f, studyBondMonths: e.target.value }))} />
              </div>
              <div>
                <label htmlFor={`${formId}-doc`} className="block text-xs font-medium text-ink mb-0.5">Document URL</label>
                <input id={`${formId}-doc`} className="input" value={form.documentUrl} onChange={e => setForm(f => ({ ...f, documentUrl: e.target.value }))} placeholder="https://…" />
              </div>
            </div>
          </details>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => decide(selected, confirm.type)}
        title={
          confirm?.type === 'Approved' ? 'Approve leave?' :
          confirm?.type === 'Denied' ? 'Deny leave?' :
          confirm?.type === 'Recommended' ? 'Recommend leave?' :
          confirm?.type === 'Monetized' ? 'Monetize terminal leave?' : 'Confirm'
        }
        message={`${selected?.employee?.firstName} ${selected?.employee?.lastName} — ${selected?.type?.replace(/_/g, ' ')} (${selected?.fromDate ? formatDate(selected.fromDate) : ''} → ${selected?.toDate ? formatDate(selected.toDate) : ''}, ${selected?.days} day(s)).`}
        confirmLabel={
          confirm?.type === 'Approved' ? 'Approve' :
          confirm?.type === 'Denied' ? 'Deny' :
          confirm?.type === 'Recommended' ? 'Recommend' :
          confirm?.type === 'Monetized' ? 'Monetize' : 'Confirm'
        }
        danger={confirm?.type === 'Denied'}
      />
    </Layout>
  );
}
