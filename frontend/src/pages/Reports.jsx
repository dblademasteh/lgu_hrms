import React from 'react';
import Layout from '../components/Layout.jsx';
import { reports } from '../data/reports.js';
import { useToast } from '../components/Toast.jsx';

export default function Reports() {
  const toast = useToast();

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Reports</h1>
          <p className="text-sm text-muted mt-0.5">COA-formatted and operational exports</p>
        </div>
        <span className="mono-label">pdfmake · ExcelJS</span>
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