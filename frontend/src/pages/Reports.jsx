import React, { useState } from 'react';
import Layout from '../components/Layout.jsx';
import { reports } from '../data/reports.js';
import { reportsApi } from '../api/reports.js';
import { useToast } from '../components/Toast.jsx';
import { FileText, ExternalLink, Download } from 'lucide-react';

const peso = n => `₱ ${Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Reports() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [preview, setPreview] = useState(null);

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
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Reports & Exports</h1>
          <p className="text-sm text-muted mt-1">COA-formatted payroll, attendance and HR exports</p>
        </div>
        <span className="mono-label">pdfmake · ExcelJS</span>
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
        <div className="mono-label text-xs">3 templates</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <div key={r.id} className="card p-5 flex flex-col hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <span className="mono-label">{r.type === 'PDF' ? 'PDF Document' : 'Excel Workbook'}</span>
              <FileText size={16} className="text-muted"/>
            </div>
            <h3 className="font-display font-semibold text-ink mt-3">{r.title}</h3>
            <p className="text-sm text-muted mt-1 flex-1">{r.desc}</p>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                className="btn btn-primary flex-1 gap-2"
                onClick={() => toast(`${r.title} generation queued — renders via pdfmake/ExcelJS once wired.`, 'info')}
              >
                <FileText size={16} /> Generate
              </button>
              <button
                type="button"
                className="btn btn-ghost gap-2"
                onClick={() => setPreview(r)}
              >
                <ExternalLink size={16} /> Preview
              </button>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>setPreview(null)}>
          <div className="bg-surface border border-line rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-line">
              <div>
                <h3 className="font-display font-semibold text-ink">{preview.title}</h3>
                <p className="mono-label text-xs text-muted">{preview.type === 'PDF' ? 'PDF Document' : 'Excel Workbook'} · Preview</p>
              </div>
              <button className="btn btn-ghost" onClick={()=>setPreview(null)}>Close</button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <div className="rounded-xl border border-dashed border-line p-8 text-center text-muted">
                <FileText size={40} className="mx-auto mb-3 opacity-60"/>
                <p className="font-medium text-ink mb-1">Preview not yet generated</p>
                <p className="text-sm text-muted">This preview will render the {preview.type} via pdfmake/ExcelJS once the backend report endpoint is wired. For now, use Generate to trigger creation.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button className="btn btn-primary" onClick={()=>{toast(`${preview.title} generation queued.`, 'info'); setPreview(null);}}>Generate</button>
                  <button className="btn btn-ghost" onClick={()=>setPreview(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}