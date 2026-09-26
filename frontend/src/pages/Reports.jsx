import React, { useState } from 'react';
import Layout from '../components/Layout.jsx';
import { reportsApi } from '../api/reports.js';
import { useToast } from '../components/Toast.jsx';
import { FileText, Download, BarChart3 } from 'lucide-react';

const peso = n => `₱ ${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Helper: trigger a CSV blob download from an axios response
function downloadCsvBlob(response, filename) {
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const fname = match ? match[1] : `${filename}.csv`;
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Report templates (now backed by real endpoints)
const REPORT_TEMPLATES = [
  {
    id: 'payroll-register',
    title: 'COA Payroll Register',
    desc: 'Per-employee payroll breakdown with deduction codes for government accounting.',
    icon: <FileText size={16} />,
    download: (api) => api.payrollRegister({ format: 'csv' }),
  },
  {
    id: 'payroll-journal',
    title: 'Payroll Journal',
    desc: 'Debit/credit ledger entries derived from the payroll ledger, for COA reconciliation.',
    icon: <BarChart3 size={16} />,
    download: (api) => api.payrollJournal({ format: 'csv' }),
  },
  {
    id: 'employee-master-list',
    title: 'Employee Master List',
    desc: 'Full personnel directory with statutory numbers, position and bank details.',
    icon: <FileText size={16} />,
    download: (api) => api.employeeMasterList({ format: 'csv' }),
  },
];

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
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Payroll summary CSV downloaded.', 'success');
  };

  return (
    <Layout maxWidth="max-w-7xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Reports & Exports</h1>
          <p className="text-sm text-muted mt-1">COA-formatted payroll and HR exports</p>
        </div>
        <span className="mono-label">CSV exports</span>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-display font-semibold text-ink text-lg">Payroll Summary · Live</h3>
            <p className="text-sm text-muted mt-0.5">Aggregated from payroll items via <span className="font-mono">GET /reports/payroll-summary</span></p>
          </div>
          <span className="inline-flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={loadSummary} disabled={loadingSummary}>
              {loadingSummary ? 'Loading…' : 'Refresh'}
            </button>
            <button type="button" className="btn btn-primary gap-2" onClick={downloadSummaryCsv} disabled={!summary}>
              <Download size={16}/> Download CSV
            </button>
          </span>
        </div>
        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label:'Period', value: summary.period?.name ?? '—' },
              { label:'Status', value: summary.status },
              { label:'Headcount', value: Number(summary.headcount ?? 0).toLocaleString() },
              { label:'Net Pay', value: peso(summary.totalNetPay), highlight:true },
              { label:'Basic Pay', value: peso(summary.totalBasicPay) },
              { label:'Allowances', value: peso(summary.totalAllowances) },
              { label:'Deductions', value: peso(summary.totalDeductions) },
              { label:'Generated', value: summary.runDate ? String(summary.runDate).slice(0,10) : '—' },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-line bg-surface/50 p-3">
                <div className="mono-label text-[10px] uppercase tracking-wide text-muted">{k.label}</div>
                <div className={`mt-1 font-mono ${k.highlight ? 'font-semibold text-ink' : 'text-ink'}`}>{k.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No summary loaded yet — click “Refresh”.</div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-ink">Standard Reports</h2>
        <span className="mono-label text-xs">{REPORT_TEMPLATES.length} templates</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TEMPLATES.map(r => (
          <div key={r.id} className="card p-5 flex flex-col hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <span className="mono-label">{r.id === 'payroll-register' ? 'CSV Export' : r.id === 'payroll-journal' ? 'CSV Export' : 'CSV Export'}</span>
              {r.icon}
            </div>
            <h3 className="font-display font-semibold text-ink mt-3">{r.title}</h3>
            <p className="text-sm text-muted mt-1 flex-1">{r.desc}</p>
            <button
              type="button"
              className="btn btn-primary gap-2 mt-4"
              onClick={async () => {
                try {
                  const res = await r.download(reportsApi);
                  downloadCsvBlob(res, r.id);
                  toast(`${r.title} CSV downloaded.`, 'success');
                } catch (e) {
                  const msg = e?.response?.data?.error?.message || e.message;
                  toast(msg || `Failed to generate ${r.title}`, 'error');
                }
              }}
            >
              <Download size={16} /> Download CSV
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}