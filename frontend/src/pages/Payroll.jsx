import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import { ledgerEntries, deductionLines, badgeTone } from '../data/mock.js';
import { payrollApi } from '../api/payroll.js';
import { useToast } from '../components/Toast.jsx';

const peso = n => `₱ ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const parsePeso = str => parseFloat(String(str).replace(/[^\d.]/g, '')) || 0;
const totalDeductions = deductionLines.reduce((s, d) => s + d.amount, 0);

export default function Payroll() {
  const toast = useToast();
  const [runs, setRuns] = useState([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [period, setPeriod] = useState('');
  const [detail, setDetail] = useState(null);
  const [payslip, setPayslip] = useState(null);

  useEffect(() => {
    payrollApi.listRuns().then(r => setRuns(r.data)).catch(() => toast('Failed to load payroll runs', 'error'));
  }, []);

  const createRun = async () => {
    try {
      const r = await payrollApi.createRun({ period: period.trim() || 'Custom period' });
      setRuns(rr => [r.data, ...rr]);
      toast(`Payroll run ${r.data.id} created as DRAFT.`, 'success');
      setWizardOpen(false);
      setStep(1);
      setPeriod('');
    } catch { toast('Failed to create payroll run', 'error'); }
  };

  const detailEntries = detail ? ledgerEntries.filter(e => e.run === detail.id) : [];

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
          { title: 'Net Pay · This Month', value: '₱ 18.4M' },
          { title: 'Employees Paid', value: '1,248' },
          { title: 'Runs This Month', value: String(runs.length) },
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
                const period = r.period ?? {};
                const periodName = period.name ?? r.periodName ?? '';
                const headcount = r.items ? r.items.length : (r.headcount ?? 0);
                const net = r.netPay != null ? peso(Number(r.netPay)) : (r.net ?? '—');
                return (
                  <tr key={r.id}>
                    <td className="font-mono">{r.id}</td>
                    <td className="font-medium">{periodName}</td>
                    <td><span className={`badge ${badgeTone(r.status)}`}>{r.status}</span></td>
                    <td className="font-mono text-right">{headcount.toLocaleString()}</td>
                    <td className="font-mono text-right">{net}</td>
                    <td className="text-right"><button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => setDetail(r)}>View</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">Ledger Entries</h3>
          <span className="mono-label">PR-2026-08B</span>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr><th>Employee</th><th className="text-right">Gross</th><th className="text-right">Deductions</th><th className="text-right">Net</th><th>Run</th><th></th></tr>
            </thead>
            <tbody>
              {ledgerEntries.map(e => (
                <tr key={e.employee}>
                  <td className="font-mono">{e.employee}</td>
                  <td className="font-mono text-right">{e.gross}</td>
                  <td className="font-mono text-right">{e.deductions}</td>
                  <td className="font-mono text-right font-medium">{e.net}</td>
                  <td className="font-mono">{e.run}</td>
                  <td className="text-right"><button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => setPayslip(e)}>Payslip</button></td>
                </tr>
              ))}
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
            {step < 3 && (
              <button type="button" className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={step === 1 && !period.trim()}>
                Next
              </button>
            )}
            {step === 3 && <button type="button" className="btn btn-primary" onClick={createRun}>Create Run</button>}
          </>
        }
      >
        {step === 1 && (
          <div>
            <label htmlFor="pr-period" className="block text-sm font-medium text-ink mb-1">Payroll Period *</label>
            <input id="pr-period" className="input" value={period} onChange={e => setPeriod(e.target.value)} placeholder="e.g. Sep 16–30, 2026" />
            <p className="mono-label mt-3">Step 1 of 3 · Period selection</p>
          </div>
        )}
        {step === 2 && (
          <div>
            <p className="mono-label mb-2">Step 2 of 3 · Computed items preview</p>
            <div className="overflow-auto">
              <table className="data-table">
                <thead><tr><th>Employee</th><th className="text-right">Gross</th><th className="text-right">Net</th></tr></thead>
                <tbody>
                  {ledgerEntries.map(e => (
                    <tr key={e.employee}><td className="font-mono">{e.employee}</td><td className="font-mono text-right">{e.gross}</td><td className="font-mono text-right">{e.net}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mono-label mt-3">Sample computation — actual figures wire to the payroll engine.</p>
          </div>
        )}
        {step === 3 && (
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-muted">Period</dt><dd className="font-medium">{period}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Employees</dt><dd className="font-mono">{ledgerEntries.length}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Total Gross</dt><dd className="font-mono">{peso(previewGross)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Total Deductions</dt><dd className="font-mono">{peso(totalDeductions)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2"><dt className="text-muted font-medium">Net Payable</dt><dd className="font-mono font-semibold">{peso(previewNet)}</dd></div>
            <p className="mono-label pt-2">Step 3 of 3 · Run is created as DRAFT for approval.</p>
          </dl>
        )}
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`Payroll Run · ${detail?.id ?? ''}`}
        footer={<button type="button" className="btn btn-primary" onClick={() => setDetail(null)}>Close</button>}
      >
        {detail && (
          <div>
            <p className="mono-label mb-3">{detail.period} · {detail.status} · {detail.headcount.toLocaleString()} employees</p>
            {detailEntries.length ? (
              <div className="overflow-auto">
                <table className="data-table">
                  <thead><tr><th>Employee</th><th className="text-right">Gross</th><th className="text-right">Deductions</th><th className="text-right">Net</th><th></th></tr></thead>
                  <tbody>
                    {detailEntries.map(e => (
                      <tr key={e.employee}>
                        <td className="font-mono">{e.employee}</td>
                        <td className="font-mono text-right">{e.gross}</td>
                        <td className="font-mono text-right">{e.deductions}</td>
                        <td className="font-mono text-right font-medium">{e.net}</td>
                        <td className="text-right"><button type="button" className="btn btn-ghost px-3 text-xs" onClick={() => setPayslip(e)}>Payslip</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">No ledger entries on file for this run in the sample data.</p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!payslip}
        onClose={() => setPayslip(null)}
        title={`Payslip · ${payslip?.employee ?? ''}`}
        size="sm"
        footer={<button type="button" className="btn btn-primary" onClick={() => setPayslip(null)}>Close</button>}
      >
        {payslip && (
          <div>
            <table className="data-table">
              <thead><tr><th>Earnings</th><th className="text-right">Amount</th></tr></thead>
              <tbody><tr><td>Gross Pay</td><td className="font-mono text-right">{payslip.gross}</td></tr></tbody>
            </table>
            <table className="data-table mt-3">
              <thead><tr><th>Deductions</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {deductionLines.map(d => (
                  <tr key={d.label}><td>{d.label}</td><td className="font-mono text-right">{peso(d.amount)}</td></tr>
                ))}
                <tr><td className="font-semibold">Total</td><td className="font-mono text-right font-semibold">{peso(totalDeductions)}</td></tr>
              </tbody>
            </table>
            <p className="text-sm mt-3 text-right"><span className="text-muted">Net Pay · </span><span className="font-mono font-semibold">{payslip.net}</span></p>
            <p className="mono-label mt-2">Sample figures — wires to the payroll API.</p>
          </div>
        )}
      </Modal>
    </Layout>
  );
}