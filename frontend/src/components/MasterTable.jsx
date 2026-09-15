import React, { useMemo, useState } from 'react';
import { badgeTone } from '../data/mock.js';

const PAGE_SIZE = 5;

export default function MasterTable({ rows = [], selected = null, onSelect = () => {}, onEdit = () => {}, onDelete = () => {}, selection = new Set(), onSelectChange = () => {}, columns = [] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => {
      const hay = columns.map(c => {
        const v = c.render ? '' : r[c.key];
        return String(v ?? '');
      }).join(' ').toLowerCase();
      const extra = `${r.name ?? ''} ${r.no ?? ''} ${r.position ?? ''}`.toLowerCase();
      return hay.includes(q) || extra.includes(q);
    });
  }, [rows, search, columns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allSelected = rows.length > 0 && selection.size === rows.length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 mb-3">
        <input
          type="search"
          className="input flex-1"
          placeholder="Search…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="overflow-auto min-h-0 flex-1">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10"><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={e => { if (e.target.checked) onSelectChange(new Set(rows.map(r => r.id))); else onSelectChange(new Set()); }} /></th>
              {columns.map(c => <th key={c.key} style={c.width ? { width: c.width } : {}}>{c.label}</th>)}
              <th className="w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.id} onClick={() => onSelect(r)} className="cursor-pointer hover:bg-surface">
                <td onClick={ev => ev.stopPropagation()}>
                  <input type="checkbox" checked={selection.has(r.id)} onChange={ev => {
                    const next = new Set(selection);
                    if (ev.target.checked) next.add(r.id); else next.delete(r.id);
                    onSelectChange(next);
                  }} />
                </td>
                {columns.map(c => (
                  <td key={c.key}>
                    {c.render ? c.render(r) : r[c.key]}
                  </td>
                ))}
                <td className="text-right" onClick={ev => ev.stopPropagation()}>
                  <span className="inline-flex gap-1 justify-end">
                    <button className="btn btn-ghost px-2 text-xs" onClick={() => onEdit(r)}>Edit</button>
                    <button className="btn btn-ghost px-2 text-xs" onClick={() => onDelete(r)}>Delete</button>
                  </span>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={columns.length + 2} className="text-muted text-sm py-6 text-center">No records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-3">
        <span className="mono-label">{filtered.length} of {rows.length}</span>
        <div className="flex gap-2">
          <button className="btn btn-ghost px-3 text-xs" disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <button className="btn btn-ghost px-3 text-xs" disabled={safePage >= pageCount} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
