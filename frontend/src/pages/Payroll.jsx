import React, { useState, useEffect } from 'react';
import { X, RefreshCw, ExternalLink, Info } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { badgeTone } from '../data/mock.js';
import { payrollApi } from '../api/payroll.js';
import { getLines } from '../api/payrollDeduction.js';
import { useToast } from '../components/Toast.jsx';
import { useUserCapabilities } from '../config/permissions.js';
import { useAuthStore } from '../stores/authStore.js';

const peso = n => `₱ ${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sum = (items, key) => items.reduce((s, i) => s + Number(i?.[key] ?? 0), 0);

export default function Payroll() {
  const toast = useToast();
  const user = useAuthStore(s => s.user);
  const caps = useUserCapabilities(!!user);
  const canRun = caps.payrollRuns === true;

  const [runs, setRuns] = useState([]);
  const [runTotal, setRunTotal] = useState(0);
  const [periods, setPeriods] = useState([]);
  const [detail, setDetail] = useState(null);
  const [payslip, setPayslip] = useState(null);
  const [payslipLines, setPayslipLines] = useState([]);
  const [syncing, setSyncing] = useState(false);

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
      setPeriods(r.data?.items ?? r.data ?? []);
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

  const syncNow = async () => {
    setSyncing(true);
    try {
      const r = await payrollApi.syncFromPayroll();
      const d = r.data ?? {};
      toast(`Synced from lgu-payroll · ${d.processed ?? 0} change(s), ${d.errors ?? 0} error(s).`, d.errors ? 'error' : 'success');
      await Promise.all([loadRuns(), loadPeriods()]);
    } catch (e) {
      toast(e?.response?.data?.error?.message || 'Sync from lgu-payroll failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Payslip documents and the LDDAP bank file are issued by lgu-payroll.

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

  return (
    <Layout maxWidth="max-w-7xl">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Payroll</h1>
          <p className="text-sm text-muted mt-0.5">Read-only mirror of payroll runs computed in lgu-payroll</p>
        </div>
        {canRun && (
          <button type="button" className="btn btn-ghost gap-2" onClick={syncNow} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? 'animate-spin' : undefined} />
            {syncing ? 'Syncing…' : 'Sync from lgu-payroll'}
          </button>
        )}
      </div>

      <div className="card p-4 mb-4 flex items-start gap-3">
        <Info size={16} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-sm text-muted leading-5">
          Figures here are mirrored from <span className="font-medium text-ink">lgu-payroll</span>, which is the system of record.
          Runs, periods, approvals and posting are managed there. Use <span className="font-medium text-ink">Sync from lgu-payroll</span> to pull the latest changes.
        </p>
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
          <span className="mono-label">Mirrored from lgu-payroll</span>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th>Period</th><th>Fiscal Year</th><th>Start</th><th>End</th><th>Status</th><th>Source</th></tr>
            </thead>
            <tbody>
              {periods.map(p => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td className="font-mono">{p.fiscalYear}</td>
                  <td className="font-mono">{String(p.startDate).slice(0, 10)}</td>
                  <td className="font-mono">{String(p.endDate).slice(0, 10)}</td>
                  <td><span className={`badge ${badgeTone(p.status)}`}>{p.status}</span></td>
                  <td className="font-mono text-xs text-muted">{p.source ?? 'LOCAL'}</td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr><td colSpan={6} className="text-muted text-sm">No payroll periods mirrored yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">Payroll Runs</h3>
          <span className="mono-label">Mirrored from lgu-payroll</span>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th>Run</th><th>Period</th><th>Status</th><th>Source</th><th className="text-right">Employees</th><th className="text-right">Net Pay</th><th></th></tr>
            </thead>
            <tbody>
              {runs.map(r => {
                const net = sum(r.items ?? [], 'netPay');
                return (
                  <tr key={r.id}>
                    <td className="font-mono">{String(r.id).slice(0, 8)}</td>
                    <td className="font-medium">{r.period?.name ?? ''}</td>
                    <td><span className={`badge ${badgeTone(r.status)}`}>{r.status}</span></td>
                    <td className="font-mono text-xs text-muted">{r.source ?? 'LOCAL'}</td>
                    <td className="font-mono text-right">{(r.items?.length ?? 0).toLocaleString()}</td>
                    <td className="font-mono text-right">{peso(net)}</td>
                    <td className="text-right">
                      <button type="button" className="btn btn-ghost gap-1 px-2 text-xs" onClick={() => openDetail(r)}>
                        <ExternalLink size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
              {runs.length === 0 && (
                <tr><td colSpan={7} className="text-muted text-sm">No payroll runs mirrored yet.</td></tr>
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
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`Payroll Run · ${detail?.period?.name ?? ''}`}
        footer={
          <button type="button" className="btn btn-primary gap-2" onClick={() => setDetail(null)}><X size={16} /> Close</button>
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
              <p className="text-sm text-muted">No payroll items mirrored for this run.</p>
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
          <button type="button" className="btn btn-primary gap-2" onClick={() => setPayslip(null)}><X size={16} /> Close</button>
        }
      >
        {payslip && (
          <div>
            <table className="data-table">
              <thead><tr><th>Earnings</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                <tr><td>Basic Pay</td><td className="font-mono text-right">{peso(payslip.basicPay)}</td></tr>
                {payslipLines.filter(l => ['PERA','RATA','HAZARD_PAY','SUBSISTENCE'].includes((l.code || '').toUpperCase())).map(line => (
                  <tr key={line.id}><td>{line.description || line.code}</td><td className="font-mono text-right">{peso(line.employeeShare)}</td></tr>
                ))}
                {payslip.allowances > 0 && payslipLines.filter(l => ['PERA','RATA','HAZARD_PAY','SUBSISTENCE'].includes((l.code || '').toUpperCase())).length === 0 && (
                  <tr><td>Allowances</td><td className="font-mono text-right">{peso(payslip.allowances)}</td></tr>
                )}
              </tbody>
            </table>
            <table className="data-table mt-3">
              <thead><tr><th>Deductions</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {payslipLines.filter(l => Number(l.employeeShare) > 0 && !['PERA','RATA','HAZARD_PAY','SUBSISTENCE'].includes((l.code || '').toUpperCase())).map(line => (
                  <tr key={line.id}><td>{line.description || line.code}</td><td className="font-mono text-right">{peso(line.employeeShare)}</td></tr>
                ))}
                {payslipLines.filter(l => Number(l.employeeShare) > 0 && !['PERA','RATA','HAZARD_PAY','SUBSISTENCE'].includes((l.code || '').toUpperCase())).length === 0 && (
                  <tr><td>Statutory / other deductions</td><td className="font-mono text-right">{peso(payslip.deductions)}</td></tr>
                )}
                <tr><td className="font-semibold">Total</td><td className="font-mono text-right font-semibold">{peso(payslipLines.length ? payslipLines.reduce((s, l) => s + Number(l.employeeShare ?? 0), 0) : payslip.deductions)}</td></tr>
              </tbody>
            </table>
            <p className="text-sm mt-3 text-right"><span className="text-muted">Net Pay · </span><span className="font-mono font-semibold">{peso(payslip.netPay)}</span></p>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
