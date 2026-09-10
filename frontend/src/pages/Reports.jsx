import React, { useState } from 'react';
import Layout from '../components/Layout.jsx';
import { reports } from '../data/reports.js';
import { reportsApi } from '../api/reports.js';
import { useToast } from '../components/Toast.jsx';

const peso = n => `₱ ${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Reports() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const r = await reportsApi.payrollSummary();
      setSummary(r.data.data);
      toast('Payroll summary loaded.', 'success');
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      toast(msg || 'Failed to load payroll summary', 'error');
    } finally {
      setLoadingSummary(false);
    }
  };

  const downloadSummaryCsv = () => {
    if (!summary) {
      toast('Load the payroll summary first.', 'info');
      return;
    }
    const rows = [
      ['runId', 'period', 'runDate', 'status', 'headcount', 'totalBasicPay', 'totalAllowances', 'totalDeductions', 'totalNetPay'],
      [summary.runId, summary.period?.name ?? '', summary.runDate ?? '', summary.status, summary.headcount, summary.totalBasicPay, summary.totalAllowances, summary.totalDeductions, summary.totalNetPay],
    ];
    const blob = new Blob([rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Payroll summary CSV downloaded.', 'success');
  };

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Reports</h1>
          <p className="text-sm text-muted mt-0.5">COA-formatted and operational exports</p>
        </div>
        <span className="mono-label">pdfmake · ExcelJS</span>
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-semibold text-ink">Payroll Summary · Live</h3>
            <p className="text-sm text-muted mt-0.5">Aggregated from payroll items via <span className="font-mono">GET /reports/payroll-summary</span></p>
          </div>
          <span className="inline-flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={loadSummary} disabled={loadingSummary}>
              {loadingSummary ? 'Loading…' : 'Load Summary'}
            </button>
            <button type="button" className="btn btn-primary" onClick={downloadSummaryCsv} disabled={!summary}>Download CSV</button>
          </span>
        </div>
        {summary ? (
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-sm">
            <div><dt className="mono-label">Period</dt><dd className="font-medium mt-0.5">{summary.period?.name ?? '—'}</dd></div>
            <div><dt className="mono-label">Status</dt><dd className="mt-0.5">{summary.status}</dd></div>
            <div><dt className="mono-label">Headcount</dt><dd className="font-mono mt-0.5">{Number(summary.headcount ?? 0).toLocaleString()}</dd></div>
            <div><dt className="mono-label">Total Net Pay</dt><dd className="font-mono mt-0.5 font-semibold">{peso(summary.totalNetPay)}</dd></div>
            <div><dt className="mono-label">Basic Pay</dt><dd className="font-mono mt-0.5">{peso(summary.totalBasicPay)}</dd></div>
            <div><dt className="mono-label">Allowances</dt><dd className="font-mono mt-0.5">{peso(summary.totalAllowances)}</dd></div>
            <div><dt className="mono-label">Deductions</dt><dd className="font-mono mt-0.5">{peso(summary.totalDeductions)}</dd></div>
            <div><dt className="mono-label">Generated</dt><dd className="font-mono mt-0.5">{summary.runDate ? String(summary.runDate).slice(0, 10) : '—'}</dd></div>
          </dl>
        ) : (
          <p className="text-sm text-muted">No summary loaded yet — click “Load Summary”.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <div key={r.id} className="card p-5 flex flex-col">
            <span className="mono-label">{r.type === 'PDF' ? 'PDF Document' : 'Excel Workbook'}</span>
            <h3 className="font-display font-semibold text-ink mt-2">{r.title}</h3>
            <p className="text-sm text-muted mt-1 flex-1">{r.desc}</p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={() => toast(`${r.title} generation queued — renders via pdfmake/ExcelJS once wired.`, 'info')}
              >
                Generate
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => toast(`Preview for ${r.title} will open the report viewer once wired.`, 'info')}
              >
                Preview
              </button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}