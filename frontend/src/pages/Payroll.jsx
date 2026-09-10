import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { badgeTone } from '../data/mock.js';
import { payrollApi } from '../api/payroll.js';
import { getLines } from '../api/payrollDeduction.js';
import { useToast } from '../components/Toast.jsx';

const peso = n => `₱ ${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sum = (items, key) => items.reduce((s, i) => s + Number(i?.[key] ?? 0), 0);

export default function Payroll() {
  const toast = useToast();
  const [runs, setRuns] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [periodId, setPeriodId] = useState('');
  const [runDate, setRunDate] = useState('');
  const [detail, setDetail] = useState(null);
  const [payslip, setPayslip] = useState(null);
  const [payslipLines, setPayslipLines] = useState([]);
  const [confirmApprove, setConfirmApprove] = useState(null);

  const loadRuns = async () => {
    try {
      const r = await payrollApi.listRuns();
      setRuns(Array.isArray(r.data) ? r.data : []);
    } catch {
      toast('Failed to load payroll runs', 'error');
    }
  };

  useEffect(() => {
    loadRuns();
    payrollApi.listPeriods().then(r => setPeriods(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!payslip) {
      setPayslipLines([]);
      return undefined;
    }
    let cancelled = false;
    getLines(payslip.id)
      .then(lines => { if (!cancelled) setPayslipLines(Array.isArray(lines) ? lines : []); })
      .catch(() => { if (!cancelled) setPayslipLines([]); });
    return () => { cancelled = true; };
  }, [payslip]);

  const createRun = async () => {
    if (!periodId || !runDate) {
      toast('Pick a period and run date.', 'error');
      return;
    }
    try {
      const r = await payrollApi.createRun({ periodId, runDate });
      setRuns(rr => [r.data, ...rr]);
      toast(`Payroll run created as DRAFT.`, 'success');
      setWizardOpen(false);
      setStep(1);
      setPeriodId('');
      setRunDate('');
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      toast(msg || 'Failed to create payroll run', 'error');
    }
  };

  const approveRun = async () => {
    if (!confirmApprove) return;
    try {
      const r = await payrollApi.approveRun(confirmApprove.id);
      setRuns(rr => rr.map(x => (x.id === confirmApprove.id ? r.data : x)));
      setDetail(d => (d?.id === confirmApprove.id ? r.data : d));
      toast('Payroll run approved.', 'success');
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      toast(msg || 'Approve failed', 'error');
    } finally {
      setConfirmApprove(null);
    }
  };

  const openDetail = async run => {
    setDetail(run);
    // Refresh with items included (list payload may be stale).
    try {
      const r = await payrollApi.getRun(run.id);
      setDetail(r.data);
    } catch {
      /* keep the list-row snapshot */
    }
  };

  const detailItems = detail?.items ?? [];
  const latestRun = runs[0];
  const latestNet = latestRun ? sum(latestRun.items ?? [], 'netPay') : 0;
  const latestHeadcount = latestRun ? (latestRun.items?.length ?? 0) : 0;

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Payroll</h1>
          <p className="text-sm text-muted mt-0.5">Payroll periods, runs and ledger entries</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => { setStep(1); setWizardOpen(true); }}>New Payroll Run</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {[
          { title: 'Net Pay · Latest Run', value: peso(latestNet) },
          { title: 'Employees Paid', value: latestHeadcount.toLocaleString() },
          { title: 'Total Runs', value: String(runs.length) },
        ].map(s => (
          <div key={s.title} className="card stat p-5">
            <p className="text-sm text-muted">{s.title}</p>
            <p className="stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">Payroll Runs</h3>
          <span className="mono-label">Ledger pattern · append-only</span>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th>Run</th><th>Period</th><th>Status</th><th className="text-right">Employees</th><th className="text-right">Net Pay</th><th></th></tr>
            </thead>
            <tbody>
              {runs.map(r => {
                const periodName = r.period?.name ?? '';
                const headcount = r.items?.length ?? 0;
                const net = sum(r.items ?? [], 'netPay');
                return (
                  <tr key={r.id}>
                    <td className="font-mono">{String(r.id).slice(0, 8)}</td>
                    <td className="font-medium">{periodName}</td>
                    <td><span className={`badge ${badgeTone(r.status)}`}>{r.status}</span></td>
                    <td className="font-mono text-right">{headcount.toLocaleString()}</td>
                    <td className="font-mono text-right">{peso(net)}</td>
                    <td className="text-right">
                      <span className="inline-flex gap-1">
                        <button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => openDetail(r)}>View</button>
                        {r.status === 'DRAFT' && (
                          <button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => setConfirmApprove(r)}>Approve</button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {runs.length === 0 && (
                <tr><td colSpan={6} className="text-muted text-sm">No payroll runs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">Latest Run · Payroll Items</h3>
          <span className="mono-label">{latestRun?.period?.name ?? 'No runs'}</span>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th className="text-right">Basic</th><th className="text-right">Allowances</th><th className="text-right">Deductions</th><th className="text-right">Net</th><th></th></tr>
            </thead>
            <tbody>
              {(latestRun?.items ?? []).map(item => (
                <tr key={item.id}>
                  <td className="font-mono text-right">{peso(item.basicPay)}</td>
                  <td className="font-mono text-right">{peso(item.allowances)}</td>
                  <td className="font-mono text-right">{peso(item.deductions)}</td>
                  <td className="font-mono text-right font-medium">{peso(item.netPay)}</td>
                  <td className="text-right"><button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => setPayslip(item)}>Payslip</button></td>
                </tr>
              ))}
              {!(latestRun?.items?.length) && (
                <tr><td colSpan={5} className="text-muted text-sm">No payroll items on file.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="New Payroll Run"
        size="lg"
        footer={
          <>
            {step > 1 && <button type="button" className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>Back</button>}
            {step < 2 && (
              <button type="button" className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!periodId || !runDate}>
                Next
              </button>
            )}
            {step === 2 && <button type="button" className="btn btn-primary" onClick={createRun}>Create Run</button>}
          </>
        }
      >
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label htmlFor="pr-period" className="block text-sm font-medium text-ink mb-1">Payroll Period *</label>
              <select id="pr-period" className="select" value={periodId} onChange={e => setPeriodId(e.target.value)}>
                <option value="" disabled>Select a period...</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pr-date" className="block text-sm font-medium text-ink mb-1">Run Date *</label>
              <input id="pr-date" type="date" className="input" value={runDate} onChange={e => setRunDate(e.target.value)} />
            </div>
            <p className="mono-label mt-3">Step 1 of 2 · Period selection</p>
          </div>
        )}
        {step === 2 && (
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-muted">Period</dt><dd className="font-medium">{periods.find(p => p.id === periodId)?.name ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Run Date</dt><dd className="font-mono">{runDate || '—'}</dd></div>
            <p className="mono-label pt-2">Step 2 of 2 · Run is created as DRAFT for approval.</p>
          </dl>
        )}
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`Payroll Run · ${detail?.period?.name ?? ''}`}
        footer={
          <>
            {detail?.status === 'DRAFT' && (
              <button type="button" className="btn btn-ghost" onClick={() => { setConfirmApprove(detail); }}>Approve Run</button>
            )}
            <button type="button" className="btn btn-primary gap-2" onClick={() => setDetail(null)}><X size={16} /> Close</button>
          </>
        }
      >
        {detail && (
          <div>
            <p className="mono-label mb-3">{detail.period?.name ?? ''} · {detail.status} · {(detail.items?.length ?? 0).toLocaleString()} employee(s)</p>
            {detailItems.length ? (
              <div className="overflow-auto">
                <table className="data-table">
                  <thead><tr><th className="text-right">Basic Pay</th><th className="text-right">Allowances</th><th className="text-right">Deductions</th><th className="text-right">Net Pay</th><th></th></tr></thead>
                  <tbody>
                    {detailItems.map(item => (
                      <tr key={item.id}>
                        <td className="font-mono text-right">{peso(item.basicPay)}</td>
                        <td className="font-mono text-right">{peso(item.allowances)}</td>
                        <td className="font-mono text-right">{peso(item.deductions)}</td>
                        <td className="font-mono text-right font-medium">{peso(item.netPay)}</td>
                        <td className="text-right"><button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => { setDetail(null); setPayslip(item); }}>Payslip</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">No payroll items on file for this run.</p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!payslip}
        onClose={() => setPayslip(null)}
        title="Payslip"
        size="sm"
        footer={<button type="button" className="btn btn-primary" onClick={() => setPayslip(null)}>Close</button>}
      >
        {payslip && (
          <div>
            <table className="data-table">
              <thead><tr><th>Earnings</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                <tr><td>Basic Pay</td><td className="font-mono text-right">{peso(payslip.basicPay)}</td></tr>
                <tr><td>Allowances</td><td className="font-mono text-right">{peso(payslip.allowances)}</td></tr>
              </tbody>
            </table>
            <table className="data-table mt-3">
              <thead><tr><th>Deductions</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {payslipLines.map(line => (
                  <tr key={line.id}><td>{line.description || line.code}</td><td className="font-mono text-right">{peso(line.employeeShare)}</td></tr>
                ))}
                {payslipLines.length === 0 && (
                  <tr><td>Statutory / other deductions</td><td className="font-mono text-right">{peso(payslip.deductions)}</td></tr>
                )}
                <tr><td className="font-semibold">Total</td><td className="font-mono text-right font-semibold">{peso(payslipLines.length ? payslipLines.reduce((s, l) => s + Number(l.employeeShare ?? 0), 0) : payslip.deductions)}</td></tr>
              </tbody>
            </table>
            <p className="text-sm mt-3 text-right"><span className="text-muted">Net Pay · </span><span className="font-mono font-semibold">{peso(payslip.netPay)}</span></p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmApprove}
        onClose={() => setConfirmApprove(null)}
        onConfirm={approveRun}
        title="Approve payroll run?"
        message={`${confirmApprove?.period?.name ?? 'This run'} will move from DRAFT to APPROVED.`}
        confirmLabel="Approve"
      />
    </Layout>
  );
}