import React, { useState } from 'react';
import Layout from '../components/Layout.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { leaveRequests, leaveCredits, badgeTone } from '../data/mock.js';
import { useToast } from '../components/Toast.jsx';

const initialsOf = name => name.split(' ').map(p => p[0]).slice(0, 2).join('');

export default function Leave() {
  const toast = useToast();
  const [requests, setRequests] = useState(leaveRequests);
  const [selectedId, setSelectedId] = useState(leaveRequests.find(r => r.status === 'Pending')?.id ?? null);
  const [confirm, setConfirm] = useState(null);

  const selected = requests.find(r => r.id === selectedId) ?? null;
  const credits = selected ? leaveCredits.find(c => c.no === selected.no) : null;
  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  const decide = (request, status) => {
    setRequests(rs => rs.map(r => (r.id === request.id ? { ...r, status } : r)));
    toast(`Leave of ${request.name} ${status.toLowerCase()}.`, status === 'Approved' ? 'success' : 'info');
  };

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Leave &amp; Appointments</h1>
          <p className="text-sm text-muted mt-0.5">Leave applications with approval pane</p>
        </div>
        <button type="button" className="btn btn-primary">File Leave</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-w-0">
          <div className="card p-5 h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-ink">Leave Applications</h3>
              <span className="mono-label">{pendingCount} pending</span>
            </div>
            <div className="overflow-auto">
              <table className="data-table">
                <thead>
                  <tr><th>Employee</th><th>Type</th><th>Period</th><th className="text-right">Days</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr
                      key={r.id}
                      data-selectable="true"
                      data-selected={selectedId === r.id ? 'true' : undefined}
                      onClick={() => setSelectedId(r.id)}
                    >
                      <td>
                        <span className="font-mono text-muted mr-2">{r.no}</span>
                        <span className="font-medium">{r.name}</span>
                      </td>
                      <td>{r.type}</td>
                      <td className="font-mono">{r.from} → {r.to}</td>
                      <td className="font-mono text-right">{r.days}</td>
                      <td><span className={`badge ${badgeTone(r.status)}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="card p-5 h-full flex flex-col">
            <h3 className="font-display font-semibold text-ink mb-4">Approval</h3>
            {selected ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent font-display font-bold flex items-center justify-center shrink-0" aria-hidden="true">
                    {initialsOf(selected.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-ink truncate">{selected.name}</p>
                    <p className="mono-label">{selected.no} · {selected.type}</p>
                  </div>
                </div>

                <dl className="text-sm space-y-2 mb-4">
                  <div className="flex justify-between"><dt className="text-muted">Period</dt><dd className="font-mono">{selected.from} → {selected.to}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Days</dt><dd className="font-mono">{selected.days}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Status</dt><dd><span className={`badge ${badgeTone(selected.status)}`}>{selected.status}</span></dd></div>
                </dl>

                {credits && (
                  <div className="border-t border-line pt-4 mb-4">
                    <p className="mono-label mb-2">Leave Credits</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div><p className="text-muted text-xs">Vacation</p><p className="font-mono">{credits.vacation}</p></div>
                      <div><p className="text-muted text-xs">Sick</p><p className="font-mono">{credits.sick}</p></div>
                      <div><p className="text-muted text-xs">Special</p><p className="font-mono">{credits.special}</p></div>
                    </div>
                  </div>
                )}

                {selected.status === 'Pending' ? (
                  <div className="flex gap-2 mt-auto pt-4">
                    <button type="button" className="btn btn-primary flex-1" onClick={() => setConfirm({ type: 'Approved' })}>Approve</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setConfirm({ type: 'Denied' })}>Deny</button>
                  </div>
                ) : (
                  <p className="mono-label mt-auto pt-4">Already {selected.status.toLowerCase()} — no further action.</p>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-center py-12">
                <p className="text-sm text-muted max-w-48">Select a leave application to review and approve.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => decide(selected, confirm.type)}
        title={confirm?.type === 'Approved' ? 'Approve leave?' : 'Deny leave?'}
        message={`${selected?.name} — ${selected?.type} (${selected?.from} → ${selected?.to}, ${selected?.days} day(s)).`}
        confirmLabel={confirm?.type === 'Approved' ? 'Approve' : 'Deny'}
        danger={confirm?.type === 'Denied'}
      />
    </Layout>
  );
}