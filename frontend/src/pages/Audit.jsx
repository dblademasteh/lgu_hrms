import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { auditApi } from '../api/audit.js';
import { badgeTone } from '../data/mock.js';

export default function Audit() {
  const toast = useToast();
  const [entity, setEntity] = useState('all');
  const [logs, setLogs] = useState([]);
  const [detail, setDetail] = useState(null);
  const [entities, setEntities] = useState(['all']);

  useEffect(() => {
    auditApi.list({ entity }).then(r => {
      setLogs(r.data.data);
      const ents = ['all', ...Array.from(new Set(r.data.data.map(l => l.entity)))];
      setEntities(ents);
    }).catch(()=>toast('Failed to load audit logs','error'));
  }, [entity]);

  const detailInfo = detail ? { before: detail.before, after: detail.after } : null;

  const exportCsv = () => {
    if (!logs.length) {
      toast('Nothing to export.', 'info');
      return;
    }
    const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['timestamp', 'user', 'action', 'entity', 'entityId', 'ip'],
      ...logs.map(l => [
        l.timestamp ? new Date(l.timestamp).toISOString() : '',
        l.user?.username ?? l.user ?? '',
        l.action ?? '',
        l.entity ?? '',
        l.entityId ?? '',
        l.ip ?? '',
      ]),
    ];
    const blob = new Blob([rows.map(r => r.map(cell).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${logs.length} audit entr${logs.length === 1 ? 'y' : 'ies'}.`, 'success');
  };

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Audit Trail</h1>
          <p className="text-sm text-muted mt-0.5">Immutable, append-only record of every action</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h3 className="font-display font-semibold text-ink">Audit Log</h3>
          <label className="flex items-center gap-2">
            <span className="mono-label">Entity</span>
            <select className="select w-auto" value={entity} onChange={e => setEntity(e.target.value)} aria-label="Filter by entity">
              {entities.map(en => <option key={en} value={en}>{en}</option>)}
            </select>
          </label>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>IP</th><th></th></tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td className="font-mono">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="font-mono">{l.user?.username ?? l.user ?? '—'}</td>
                  <td><span className={`badge ${badgeTone(l.action)}`}>{l.action}</span></td>
                  <td className="font-mono">{l.entity}</td>
                  <td className="font-mono text-muted">{l.ip}</td>
                  <td className="text-right">
                    <button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => setDetail(l)}>Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`Audit Entry · ${detail?.entity ?? ''}`}
        footer={<button type="button" className="btn btn-primary" onClick={() => setDetail(null)}>Close</button>}
      >
        {detail && (
          <div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
              <div><dt className="mono-label">Timestamp</dt><dd className="font-mono mt-0.5">{new Date(detail.timestamp).toLocaleString()}</dd></div>
              <div><dt className="mono-label">User</dt><dd className="font-mono mt-0.5">{detail.user?.username ?? detail.user ?? '—'}</dd></div>
              <div><dt className="mono-label">Action</dt><dd className="mt-0.5"><span className={`badge ${badgeTone(detail.action)}`}>{detail.action}</span></dd></div>
              <div><dt className="mono-label">IP Address</dt><dd className="font-mono mt-0.5">{detail.ip}</dd></div>
            </dl>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="card p-3">
                <p className="mono-label mb-2">Before</p>
                <pre className="text-xs overflow-auto">{detailInfo?.before ? JSON.stringify(detailInfo.before, null, 2) : '—'}</pre>
              </div>
              <div className="card p-3">
                <p className="mono-label mb-2">After</p>
                <pre className="text-xs overflow-auto">{detailInfo?.after ? JSON.stringify(detailInfo.after, null, 2) : '—'}</pre>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}