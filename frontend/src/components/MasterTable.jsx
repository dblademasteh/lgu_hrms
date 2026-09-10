import React, { useMemo, useState } from 'react';
import { badgeTone } from '../data/mock.js';

const PAGE_SIZE = 5;

export default function MasterTable({ rows = [], selected = null, onSelect = () => {}, onEdit = () => {}, onDelete = () => {} }) {
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [page, setPage] = useState(1);

  // Department options derived from the live rows (mock codes don't match the DB).
  const deptOptions = useMemo(() => {
    const seen = new Map();
    for (const e of rows) {
      const key = e.dept || e.department || '';
      if (key && !seen.has(key)) seen.set(key, e.department || key);
    }
    return [...seen.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(e => {
      const hay = `${e.name ?? ''} ${e.no ?? ''} ${e.position ?? ''}`.toLowerCase();
      const matchQ = !q || hay.includes(q);
      const rowDept = e.dept ?? e.department ?? '';
      const matchD = dept === 'all' || rowDept === dept;
      return matchQ && matchD;
    });
  }, [rows, search, dept]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="card p-4 h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-ink">Employees</h2>
        <span className="mono-label">{filtered.length} of {rows.length} records</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="search"
          className="input flex-1 min-w-40"
          placeholder="Search name, number, position…"
          aria-label="Search employees"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="input w-auto"
          aria-label="Filter by department"
          value={dept}
          onChange={e => { setDept(e.target.value); setPage(1); }}
        >
          <option value="all">All departments</option>
          {deptOptions.map(([code, name]) => <option key={code} value={code}>{name === code ? code : `${code} · ${name}`}</option>)}
        </select>
      </div>

      <div className="overflow-auto min-h-0">
        <table className="data-table">
          <thead>
            <tr><th>No.</th><th>Name</th><th>Position</th><th>Dept</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {pageRows.map(e => (
              <tr
                key={e.id}
                data-selectable="true"
                data-selected={selected === e.id ? 'true' : undefined}
                onClick={() => onSelect(e)}
              >
                <td className="font-mono">{e.no}</td>
                <td className="font-medium">{e.name}</td>
                <td>{e.position}</td>
                <td className="font-mono">{e.dept}</td>
                <td><span className={`badge ${badgeTone(e.status)}`}>{e.status}</span></td>
                <td className="text-right">
                  <span className="inline-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost px-2 text-xs"
                      aria-label={`Edit ${e.name}`}
                      onClick={ev => { ev.stopPropagation(); onEdit(e); }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost px-2 text-xs"
                      aria-label={`Delete ${e.name}`}
                      onClick={ev => { ev.stopPropagation(); onDelete(e); }}
                    >
                      Delete
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={6} className="text-muted text-sm">No employees match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-3 mt-auto">
        <span className="mono-label">Page {safePage} of {pageCount}</span>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost px-3 text-xs" disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <button type="button" className="btn btn-ghost px-3 text-xs" disabled={safePage >= pageCount} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
