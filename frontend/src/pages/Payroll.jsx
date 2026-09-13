import React, { useState, useEffect } from 'react';
import { X, Plus, Check, ExternalLink, Printer, Lock } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { badgeTone } from '../data/mock.js';
import { payrollApi } from '../api/payroll.js';
import { getLines } from '../api/payrollDeduction.js';
import { useToast } from '../components/Toast.jsx';
import { useUserCapabilities } from '../config/permissions.js';

const peso = n => `₱ ${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sum = (items, key) => items.reduce((s, i) => s + Number(i?.[key] ?? 0), 0);

const emptyPeriod = { name: '', startDate: '', endDate: '', fiscalYear: new Date().getFullYear() };

export default function Payroll() {
  const toast = useToast();
  const caps = useUserCapabilities();
  const canRun = caps.payrollRuns === true;

  const [runs, setRuns] = useState([]);
  const [runTotal, setRunTotal] = useState(0);
  const [periods, setPeriods] = useState([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [periodId, setPeriodId] = useState('');
  const [runDate, setRunDate] = useState('');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodDraft, setPeriodDraft] = useState(emptyPeriod);
  const [detail, setDetail] = useState(null);
  const [payslip, setPayslip] = useState(null);
  const [payslipLines, setPayslipLines] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);

  const loadRuns = async () => {
    try {
      const r = await payrollApi.listRuns();
      const data = r.data ?? {};
      const list = Array.isArray(data) ? data : data.items ?? [];
      setRuns(list);
      setRunTotal(Array.isArray(data) ? data.length : data.total ?? list.length);
    } catch {
      toast('Failed to load payroll runs', 'error');
    }
  };

  const loadPeriods = async () => {
    try {
      const r = await payrollApi.listPeriods();
      setPeriods(Array.isArray(r.data) ? r.data : []);
    } catch {
      /* periods degrade silently */
    }
  };

  useEffect(() => {
    loadRuns();
    loadPeriods();
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

  const replaceRun = (updated, id) => {
    setRuns(rr => rr.map(x => (x.id === id ? updated : x)));
    setDetail(d => (d?.id === id ? updated : d));
  };

  const createPeriod = async () => {
    if (!periodDraft.name || !periodDraft.startDate || !periodDraft.endDate || !periodDraft.fiscalYear) {
      toast('Fill in period name, dates and fiscal year.', 'error');
      return;
    }
    try {
      const r = await payrollApi.createPeriod(periodDraft);
      setPeriods(pp => [r.data, ...pp]);
      toast(`Payroll period "${r.data.name}" created.`, 'success');
      setPeriodOpen(false);
      setPeriodDraft(emptyPeriod);
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to create period', 'error');
    }
  };

  const createRun = async () => {
    if (!periodId || !runDate) {
      toast('Pick a period and run date.', 'error');
      return;
    }
    try {
      const r = await payrollApi.createRun({ periodId, runDate });
      setRuns(rr => [r.data, ...rr]);
      toast('Payroll run created as DRAFT.', 'success');
      setWizardOpen(false);
      setStep(1);
      setPeriodId('');
      setRunDate('');
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Failed to create payroll run', 'error');
    }
  };

  const runAction = async () => {
    const target = confirmAction;
    if (!target) return;
    const { kind, run, item } = target;
    try {
      if (kind === 'approve') {
        const r = await payrollApi.approveRun(run.id);
        replaceRun(r.data, run.id);
        toast('Payroll run approved.', 'success');
      } else if (kind === 'generate') {
        const r = await payrollApi.generateRun(run.id);
        replaceRun(r.data, run.id);
        toast(`Run generated for ${r.data.items?.length ?? 0} employee(s).`, 'success');
      } else if (kind === 'post') {
        const r = await payrollApi.postRun(run.id);
        replaceRun(r.data, run.id);
        toast(`Run posted — ledger written (${r.data.ledgerEntries?.length ?? 0} entries).`, 'success');
      } else if (kind === 'close') {
        await payrollApi.closePeriod(run.id);
        await loadPeriods();
        toast('Period closed — no more runs can be added.', 'success');
      }
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Action failed', 'error');
    } finally {
      setConfirmAction(null);
    }
  };

  const printPayslip = item => {
    const url = payrollApi.payslipPrintUrl(item.id);
    window.open(url, '_blank', 'noopener');
  };

  const openDetail = async run => {
    setDetail(run);
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

  const runActions = (run, inModal = false) => (
    <span className="inline-flex gap-1">
      <button type="button" className="btn btn-ghost gap-1 px-2 text-xs" onClick={() => openDetail(run)}>
        <ExternalLink size={14} />
        View
      </button>
      {canRun && run.status === 'DRAFT' && (
        <>
          <button type="button" className="btn btn-ghost gap-1 px-2 text-xs" onClick={() => setConfirmAction({ kind: 'generate', run })}>
            <Check size={14} />
            Generate
          </button>
          <button type="button" className="btn btn-ghost gap-1 px-2 text-xs" onClick={() => setConfirmAction({ kind: 'approve', run })}>
            <Check size={14} />
            Approve
          </button>
        </>
      )}
      {canRun && run.status === 'APPROVED' && (
        <button type="button" className="btn btn-ghost gap-1 px-2 text-xs" onClick={() => setConfirmAction({ kind: 'post', run })}>
          <Lock size={14} />
          Post
        </button>
      )}
      {inModal && (run.status === 'POSTED') && (
        <span className="badge bg-success/10 text-success border-success/20">Immutable</span>
      )}
    </span>
  );

  return (
    <Layout maxWidth="max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Payroll</h1>
          <p className="text-sm text-muted mt-0.5">Payroll periods, runs and ledger entries</p>
        </div>
        <div className="flex gap-2">
          {canRun && (
            <button type="button" className="btn btn-ghost gap-2" onClick={() => { setPeriodDraft(emptyPeriod); setPeriodOpen(true); }}>
              <Plus size={16} />
              New Period
            </button>
          )}
          {canRun && (
            <button type="button" className="btn btn-primary gap-2" onClick={() => { setStep(1); setWizardOpen(true); }}>
              <Plus size={16} />
              New Payroll Run
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {[
          { title: 'Net Pay · Latest Run', value: peso(latestNet) },
          { title: 'Employees Paid', value: latestHeadcount.toLocaleString() },
          { title: 'Total Runs', value: String(runTotal) },
        ].map(s => (
          <div key={s.title} className="card stat p-5">
            <p className="text-sm text-muted">{s.title}</p>
            <p className="stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">Payroll Periods</h3>
          <span className="mono-label">Closed periods are locked</span>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th>Period</th><th>Fiscal Year</th><th>Start</th><th>End</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {periods.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td className="font-mono">{p.fiscalYear}</td>
                  <td className="font-mono">{String(p.startDate).slice(0, 10)}</td>
                  <td className="font-mono">{String(p.endDate).slice(0, 10)}</td>
                  <td><span className={`badge ${badgeTone(p.status)}`}>{p.status}</span></td>
                  <td className="text-right">
                    {canRun && p.status === 'OPEN' && (
                      <button type="button" className="btn btn-ghost gap-1 px-2 text-xs" onClick={() => setConfirmAction({ kind: 'close', run: p })}>
                        <Lock size={14} />
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr><td colSpan={6} className="text-muted text-sm">No payroll periods yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
                const net = sum(r.items ?? [], 'netPay');
                return (
                  <tr key={r.id}>
                    <td className="font-mono">{String(r.id).slice(0, 8)}</td>
                    <td className="font-medium">{r.period?.name ?? ''}</td>
                    <td><span className={`badge ${badgeTone(r.status)}`}>{r.status}</span></td>
                    <td className="font-mono text-right">{(r.items?.length ?? 0).toLocaleString()}</td>
                    <td className="font-mono text-right">{peso(net)}</td>
                    <td className="text-right">{runActions(r)}</td>
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
              <tr><th>Employee</th><th className="text-right">Basic</th><th className="text-right">Allowances</th><th className="text-right">Deductions</th><th className="text-right">Net</th><th></th></tr>
            </thead>
            <tbody>
              {(latestRun?.items ?? []).map(item => (
                <tr key={item.id}>
                  <td className="font-medium">{item.employee?.fullName || `${item.employee?.firstName ?? ''} ${item.employee?.lastName ?? ''}` || '—'}</td>
                  <td className="font-mono text-right">{peso(item.basicPay)}</td>
                  <td className="font-mono text-right">{peso(item.allowances)}</td>
                  <td className="font-mono text-right">{peso(item.deductions)}</td>
                  <td className="font-mono text-right font-medium">{peso(item.netPay)}</td>
                  <td className="text-right">
                    <button type="button" className="btn btn-ghost gap-1 px-2 text-xs" onClick={() => setPayslip(item)}>
                      <ExternalLink size={14} />
                      Payslip
                    </button>
                  </td>
                </tr>
              ))}
              {!(latestRun?.items?.length) && (
                <tr><td colSpan={6} className="text-muted text-sm">No payroll items on file.</td></tr>
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
            {step > 1 && <button type="button" className="btn btn-ghost gap-2" onClick={() => setStep(s => s - 1)}><X size={16} />Back</button>}
            {step < 2 && (
              <button type="button" className="btn btn-primary gap-2" onClick={() => setStep(s => s + 1)} disabled={!periodId || !runDate}>
                <Check size={16} />
                Next
              </button>
            )}
            {step === 2 && <button type="button" className="btn btn-primary gap-2" onClick={createRun}><Plus size={16} />Create Run</button>}
          </>
        }
      >
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label htmlFor="pr-period" className="block text-sm font-medium text-ink mb-1">Payroll Period *</label>
              <select id="pr-period" className="select" value={periodId} onChange={e => setPeriodId(e.target.value)}>
                <option value="" disabled>Select a period...</option>
                {periods.filter(p => p.status === 'OPEN').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {!periods.some(p => p.status === 'OPEN') && <p className="text-sm text-muted mt-1">No open periods — create one first.</p>}
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
            <p className="mono-label pt-2">Step 2 of 2 · Run is created as DRAFT for generation.</p>
          </dl>
        )}
      </Modal>

      <Modal
        open={periodOpen}
        onClose={() => setPeriodOpen(false)}
        title="New Payroll Period"
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => setPeriodOpen(false)}><X size={16} />Cancel</button>
            <button type="button" className="btn btn-primary gap-2" onClick={createPeriod}><Plus size={16} />Create Period</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="pp-name" className="block text-sm font-medium text-ink mb-1">Period Name *</label>
            <input id="pp-name" type="text" className="input" placeholder="e.g. November 2026" value={periodDraft.name} onChange={e => setPeriodDraft(d => ({ ...d, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pp-start" className="block text-sm font-medium text-ink mb-1">Start Date *</label>
              <input id="pp-start" type="date" className="input" value={periodDraft.startDate} onChange={e => setPeriodDraft(d => ({ ...d, startDate: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="pp-end" className="block text-sm font-medium text-ink mb-1">End Date *</label>
              <input id="pp-end" type="date" className="input" value={periodDraft.endDate} onChange={e => setPeriodDraft(d => ({ ...d, endDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label htmlFor="pp-fy" className="block text-sm font-medium text-ink mb-1">Fiscal Year *</label>
            <input id="pp-fy" type="number" min="2000" max="2100" className="input" value={periodDraft.fiscalYear} onChange={e => setPeriodDraft(d => ({ ...d, fiscalYear: Number(e.target.value) }))} />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`Payroll Run · ${detail?.period?.name ?? ''}`}
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => setConfirmAction({ kind: 'generate', run: detail })} disabled={!canRun || detail?.status !== 'DRAFT'}>
              <Check size={16} />
              Generate Items
            </button>
            {detail?.status === 'DRAFT' && (
              <button type="button" className="btn btn-ghost gap-2" onClick={() => setConfirmAction({ kind: 'approve', run: detail })} disabled={!canRun}>
                <Check size={16} />
                Approve Run
              </button>
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
                  <thead><tr><th>Employee</th><th className="text-right">Basic Pay</th><th className="text-right">Allowances</th><th className="text-right">Deductions</th><th className="text-right">Net Pay</th><th></th></tr></thead>
                  <tbody>
                    {detailItems.map(item => (
                      <tr key={item.id}>
                        <td className="font-medium">{(item.employee?.firstName ?? '') + ' ' + (item.employee?.lastName ?? '') || '—'}</td>
                        <td className="font-mono text-right">{peso(item.basicPay)}</td>
                        <td className="font-mono text-right">{peso(item.allowances)}</td>
                        <td className="font-mono text-right">{peso(item.deductions)}</td>
                        <td className="font-mono text-right font-medium">{peso(item.netPay)}</td>
                        <td className="text-right">
                          <button type="button" className="btn btn-ghost gap-1 px-2 text-xs" onClick={() => setPayslip(item)}>
                            <ExternalLink size={14} />
                            Payslip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">No payroll items yet — run Generate Items.</p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!payslip}
        onClose={() => setPayslip(null)}
        title="Payslip"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => payslip && printPayslip(payslip)}>
              <Printer size={16} />
              Print
            </button>
            <button type="button" className="btn btn-primary gap-2" onClick={() => setPayslip(null)}><X size={16} /> Close</button>
          </>
        }
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
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={runAction}
        title="Confirm payroll action"
        message={
          confirmAction?.kind === 'generate'
            ? `${confirmAction?.run?.period?.name ?? 'This run'} will have items computed from each employee's monthly salary, contribution/tax rules, due loan amortizations and tardiness deductions. Existing items are replaced.`
            : confirmAction?.kind === 'approve'
              ? `${confirmAction?.run?.period?.name ?? 'This run'} will move from DRAFT to APPROVED. Runs with no generated items cannot be approved.`
              : confirmAction?.kind === 'post'
                ? `${confirmAction?.run?.period?.name ?? 'This run'} will move to POSTED: an append-only ledger is written, payslips are issued and due loan amortizations are marked paid. POSTED runs are immutable.`
                : `${confirmAction?.run?.name ?? 'This period'} will be closed and can no longer receive new runs.`
        }
        confirmLabel="Confirm"
        danger={confirmAction?.kind === 'post' || confirmAction?.kind === 'close'}
      />
    </Layout>
  );
}