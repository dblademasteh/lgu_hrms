import React, { useEffect, useCallback, useState } from 'react';
import { Activity, Download, Eye, Clock, FileText } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { documentsApi } from '../api/documents.js';
import { usePagedList } from '../hooks/usePagedList.js';

const ACTIONS = ['VIEWED', 'DOWNLOADED', 'PRINTED', 'EXPORTED'];

function badgeForAction(action) {
  const tones = {
    VIEWED: 'badge-info',
    DOWNLOADED: 'badge-success',
    PRINTED: 'badge-warning',
    EXPORTED: 'badge',
  };
  return tones[action] || 'badge';
}

function labelForAction(action) {
  return { VIEWED: 'Viewed', DOWNLOADED: 'Downloaded', PRINTED: 'Printed', EXPORTED: 'Exported' }[action] ?? action;
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DocumentsTracking() {
  const toast = useToast();

  const [timeline, setTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const fetchTracking = useCallback((opts) => documentsApi.tracking(opts).then((r) => r.data), []);
  const {
    items,
    total,
    page,
    setPage,
    loading,
    filters,
    setFilter,
    reload,
    limit,
  } = usePagedList(fetchTracking, { action: '', from: '', to: '' }, 30);

  const openTimeline = async (row) => {
    setTimeline({ document: row.document, events: [] });
    setTimelineLoading(true);
    try {
      const { data } = await documentsApi.documentTimeline(row.documentId);
      setTimeline(data);
    } catch (e) {
      toast(e.message || 'Failed to load timeline', 'error');
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (filters.action) params.action = filters.action;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const { data } = await documentsApi.trackingExport(params);
      const objectUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'document-access-tracking.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      toast(e.message || 'Export failed', 'error');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Layout>
      <div className="p-card space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Activity size={20} />
            <h1 className="font-display text-ink">Document Access Tracking</h1>
          </div>
          <button type="button" className="btn btn-outline gap-2" onClick={handleExport}>
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="t-action" className="block text-sm text-muted mb-1">Action</label>
            <select
              id="t-action"
              className="select w-full min-h-[44px]"
              value={filters.action}
              onChange={(e) => setFilter({ action: e.target.value })}
            >
              <option value="">All actions</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{labelForAction(a)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="t-from" className="block text-sm text-muted mb-1">From</label>
              <input
                id="t-from"
                type="date"
                className="input w-full min-h-[44px]"
                value={filters.from}
                onChange={(e) => setFilter({ from: e.target.value })}
              />
          </div>
          <div>
            <label htmlFor="t-to" className="block text-sm text-muted mb-1">To</label>
              <input
                id="t-to"
                type="date"
                className="input w-full min-h-[44px]"
                value={filters.to}
                onChange={(e) => setFilter({ to: e.target.value })}
              />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Action</th>
                <th scope="col">Document</th>
                <th scope="col">Actor</th>
                <th scope="col">IP</th>
                <th scope="col" className="text-right">Track</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j}><div className="skeleton h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted">No access events found</td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td className="text-sm whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                    <td>
                      <span className={`badge ${badgeForAction(row.action)}`}>{labelForAction(row.action)}</span>
                    </td>
                    <td>
                      <span className="font-medium">{row.document?.title ?? '—'}</span>
                      <span className="block text-xs text-muted">{row.document?.status ?? ''}</span>
                    </td>
                    <td className="text-sm">
                      {row.actor?.username ?? <span className="text-muted">Public</span>}
                      {row.actor?.role && <span className="block text-xs text-muted">{row.actor.role}</span>}
                    </td>
                    <td className="font-mono text-xs">{row.ip ?? '—'}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-ghost px-3 h-11 text-xs gap-1 min-w-[44px]"
                        onClick={() => openTimeline(row)}
                        title="View full document timeline"
                      >
                        <Clock size={16} /> Timeline
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted">
            <span>{total} events</span>
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

      <Modal
        open={!!timeline}
        onClose={() => setTimeline(null)}
        title={timeline?.document?.title ? `Timeline — ${timeline.document.title}` : 'Timeline'}
        size="lg"
      >
        {timelineLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}
          </div>
        ) : (timeline?.events || []).length === 0 ? (
          <p className="text-muted text-sm">No events recorded for this document yet.</p>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-line" aria-hidden="true" />
            <ol className="space-y-4">
              {timeline.events.map((ev) => {
                const isAccess = ev.kind === 'ACCESS';
                const dateLabel = new Date(ev.at).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' });
                return (
                  <li key={ev.id} className="relative">
                    <span className={`absolute -left-4 top-1.5 h-2.5 w-2.5 rounded-full border-2 ${
                      isAccess ? 'border-accent bg-accent' : 'border-muted bg-surface'
                    }`} aria-hidden="true" />
                    <div className={`rounded-lg border p-3 ${
                      isAccess ? 'border-accent/20 bg-accent/5' : 'border-line bg-surface'
                    }`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`badge ${isAccess ? badgeForAction(ev.action) : 'badge-ghost'}`}>
                          {isAccess ? labelForAction(ev.action) : 'Workflow'}
                        </span>
                        <span className="text-[10px] text-muted mono-label">{dateLabel}</span>
                      </div>
                      <p className="text-sm text-ink break-words">
                        {isAccess ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Eye size={14} /> {labelForAction(ev.action)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <FileText size={14} /> {ev.action}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {ev.actor ?? 'Public'} · {formatDateTime(ev.at)}{ev.ip ? ` · ${ev.ip}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
