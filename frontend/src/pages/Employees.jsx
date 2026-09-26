import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';
import DetailPane from '../components/DetailPane.jsx';
import { useToast } from '../components/Toast.jsx';
import { listEmployees, createEmployee, updateEmployee, deleteEmployee } from '../api/employees.js';
import { departmentsApi } from '../api/departments.js';
import { Plus, Search, Users, UserCheck, UserX, Filter, Download, Trash2, X, ChevronDown } from 'lucide-react';
import { badgeTone } from '../data/mock.js';

const PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 200; // backend list cap per request
const EXPORT_MAX_PAGES = 50;  // hard cap 10,000 rows on export-all

const initialsOf = name => (name ?? '').split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('') || '—';

const blankEmployee = { employeeNumber: '', firstName: '', lastName: '', middleName: '', birthDate: '', gender: '', civilStatus: '', address: '', contactNumber: '', email: '', sssNumber: '', philhealthNumber: '', pagibigNumber: '', tinNumber: '', status: 'ACTIVE', departmentId: '', positionId: '', hiredDate: '', monthlySalary: '' };

function mapEmployee(e) {
  const fullName = `${e.lastName}, ${e.firstName}${e.middleName ? ' ' + e.middleName : ''}`;
  return {
    id: e.id,
    employeeNumber: e.employeeNumber,
    no: e.employeeNumber,
    fullName,
    name: fullName,
    position: e.position?.title ?? '',
    department: e.department?.name ?? '',
    dept: e.department?.code ?? '',
    status: e.status,
    sg: e.position?.salaryGrade ? `SG ${e.position.salaryGrade}` : '',
    hired: e.hiredDate ? String(e.hiredDate).slice(0,10) : '',
    email: e.email ?? '',
    contact: e.contactNumber ?? '',
    salary: e.monthlySalary ?? '',
    raw: e,
  };
}

export default function Employees() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [head, setHead] = useState({ total: 0, active: 0 });
  const [filters, setFilters] = useState({ search: '', dept: 'all', status: 'all' });
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState(new Set());
  const [departments, setDepartments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankEmployee);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEmp, setDetailEmp] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);

  // Server-side list: search/dept/status/page are validated by `listEmployeesSchema`
  // and executed by the backend (DEPARTMENT_HEAD dept-scope enforced there). The
  // page renders the returned page only; `total` (whole filter scope) drives
  // pagination — at 1k+ employees every row stays reachable.
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listEmployees({
        page,
        limit: PAGE_SIZE,
        search: filters.search || undefined,
        departmentId: filters.dept === 'all' ? undefined : filters.dept,
        status: filters.status === 'all' ? undefined : filters.status,
      });
      setRows((data.items ?? []).map(mapEmployee));
      setTotal(data.total ?? (data.items?.length ?? 0));
    } catch { toast('Failed to load employees','error'); }
    finally { setLoading(false); }
  }, [page, filters, toast]);
  useEffect(() => { load(); }, [load]);

  // Debounced search commit (300ms): typing never fires a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => (f.search === searchInput ? f : { ...f, search: searchInput }));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Tenant headcount (server-side, filter-independent) for the stat cards.
  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const [all, active] = await Promise.all([
          listEmployees({ page: 1, limit: 1 }),
          listEmployees({ page: 1, limit: 1, status: 'ACTIVE' }),
        ]);
        if (!stale) setHead({ total: all.total ?? 0, active: active.total ?? 0 });
      } catch { /* list load toasts the failure; cards stay at zero */ }
    })();
    return () => { stale = true; };
  }, []);

  // Departments for the filter picker — all units, not just those on page 1.
  useEffect(() => {
    departmentsApi.list().then(setDepartments).catch(() => toast('Failed to load departments','error'));
  }, [toast]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openAdd = () => { setEditing(null); setForm(blankEmployee); setModalOpen(true); };
  const openEdit = emp => {
    setEditing(emp);
    const e = emp.raw ?? emp;
    setForm({
      id: e.id, employeeNumber: e.employeeNumber||'', firstName: e.firstName||'', lastName: e.lastName||'', middleName: e.middleName||'',
      birthDate: (e.birthDate??'').slice(0,10), gender:(e.gender??'').toUpperCase(), civilStatus:(e.civilStatus??'').toUpperCase(),
      address:e.address||'', contactNumber:e.contactNumber||'', email:e.email||'', sssNumber:e.sssNumber||'', philhealthNumber:e.philhealthNumber||'',
      pagibigNumber:e.pagibigNumber||'', tinNumber:e.tinNumber||'', status:e.status||'ACTIVE', departmentId:e.departmentId||'',
      positionId:e.positionId||'', hiredDate:(e.hiredDate??'').slice(0,10), monthlySalary:e.monthlySalary??''
    });
    setModalOpen(true);
  };
  const save = async () => {
    try {
      if (editing) { await updateEmployee(editing.id, form); toast('Employee updated','success'); }
      else { await createEmployee(form); toast('Employee created','success'); }
      setModalOpen(false); load();
    } catch(e){ toast(e?.response?.data?.error?.message||'Save failed','error'); }
  };
  const remove = async emp => {
    try {
      await deleteEmployee(emp.id);
      setRows(l=>l.filter(r=>r.id!==emp.id));
      setSelection(s=>{ const n=new Set(s); n.delete(emp.id); return n; });
      setHead(h=>({ total: Math.max(0, h.total-1), active: emp.status==='ACTIVE' ? Math.max(0, h.active-1) : h.active }));
      toast('Employee deleted','info');
    }
    catch(e){ toast(e?.response?.data?.error?.message||'Delete failed','error'); }
  };

  const bulkDelete = async () => {
    if (!bulkAction) return;
    const ids = Array.from(selection);
    let deleted = 0;
    for (const id of ids) {
      const emp = rows.find(r => r.id === id);
      if (emp) {
        try {
          await deleteEmployee(id);
          deleted++;
        } catch {}
      }
    }
    if (deleted > 0) {
      setRows(l => l.filter(r => !selection.has(r.id)));
      setSelection(new Set());
      setBulkAction(null);
      setHead(h => ({ total: Math.max(0, h.total - deleted), active: h.active }));
      toast(`${deleted} employee${deleted > 1 ? 's' : ''} deleted`, 'success');
    }
  };

  const buildFilters = () => ({
    search: filters.search || undefined,
    departmentId: filters.dept === 'all' ? undefined : filters.dept,
    status: filters.status === 'all' ? undefined : filters.status,
  });

  const exportCSV = async () => {
    try {
      let data = selection.size ? rows.filter(r=>selection.has(r.id)) : null;
      if (!data) {
        // Export-all under the active filters: loop pages (backend caps limit at 200).
        const all = [];
        for (let p = 1; p <= EXPORT_MAX_PAGES; p++) {
          const res = await listEmployees({ page: p, limit: EXPORT_PAGE_SIZE, ...buildFilters() });
          const items = res.items ?? [];
          all.push(...items);
          if (items.length < EXPORT_PAGE_SIZE || all.length >= (res.total ?? 0)) break;
        }
        data = all.map(mapEmployee);
      }
      if (!data.length) { toast('Nothing to export','info'); return; }
      const headers = ['employeeNumber','lastName','firstName','middleName','birthDate','gender','civilStatus','address','contactNumber','email','sssNumber','philhealthNumber','pagibigNumber','tinNumber','status','departmentId','positionId','hiredDate','monthlySalary'];
      const lines = [headers.join(',')];
      data.forEach(r=>{ const e=r.raw; lines.push(headers.map(h=>`"${String(e[h]??'').replace(/"/g,'""')}"`).join(',')); });
      const blob = new Blob([lines.join('\n')],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='employees.csv'; a.click(); URL.revokeObjectURL(url);
      toast(`Exported ${data.length} employees`,'success');
    } catch { toast('Export failed','error'); }
  };

  return (
    <Layout title="Employees 201 File">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center"><Users/></div>
            <div><div className="text-xs text-muted uppercase tracking-wide">Total</div><div className="text-xl font-semibold">{head.total}</div></div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center"><UserCheck/></div>
            <div><div className="text-xs text-muted uppercase tracking-wide">Active</div><div className="text-xl font-semibold">{head.active}</div></div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center"><UserX/></div>
            <div><div className="text-xs text-muted uppercase tracking-wide">Inactive</div><div className="text-xl font-semibold">{Math.max(0, head.total - head.active)}</div></div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[280px]">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input pl-10 h-11" placeholder="Search name, number, position..." value={searchInput} onChange={e=>setSearchInput(e.target.value)} />
            </div>
            <button type="button" className="btn btn-ghost h-11 px-3 gap-2" onClick={()=>setShowFilters(v=>!v)}>
              <Filter size={16}/> Filters
              {(filters.dept !== 'all' || filters.status !== 'all') && <span className="w-2 h-2 rounded-full bg-accent"/>}
              <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}/>
            </button>
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary h-11 px-4" onClick={exportCSV}><Download size={18}/> Export CSV</button>
              <button className="btn btn-primary h-11 px-4" onClick={openAdd}><Plus size={18}/> New Employee</button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-bg rounded-lg border border-line">
              <select className="input h-10 w-44" value={filters.dept} onChange={e=>{setFilters(f=>({...f,dept:e.target.value})); setPage(1);}}>
                <option value="all">All Departments</option>
                {departments.map(d=><option key={d.id} value={d.id}>{d.name || d.code}</option>)}
              </select>
              <select className="input h-10 w-40" value={filters.status} onChange={e=>{setFilters(f=>({...f,status:e.target.value})); setPage(1);}}>
                <option value="all">All Status</option>
                {['ACTIVE','INACTIVE','RESIGNED','RETIRED'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {selection.size > 0 && (
            <div className="flex items-center justify-between gap-3 mb-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
              <span className="text-sm font-medium text-ink">{selection.size} selected</span>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost text-xs text-error" onClick={()=>setBulkAction('delete')}>
                  <Trash2 size={14}/> Delete
                </button>
                <button className="btn btn-ghost text-xs" onClick={()=>setSelection(new Set())}>
                  <X size={14}/> Clear
                </button>
              </div>
            </div>
          )}

          {/* Mobile card layout */}
          <div className="md:hidden space-y-3">
            {loading ? Array.from({length:5}).map((_,i)=><div key={i} className="card p-4 animate-pulse"><div className="h-4 bg-surface rounded mb-2"/><div className="h-4 bg-surface rounded w-2/3"/></div>)
              : rows.map(r=>(
                <div key={r.id} className="card p-4 hover:bg-bg/50 transition-colors cursor-pointer" onClick={()=>{ setDetailEmp(r); setDetailOpen(true); }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent font-display font-bold flex items-center justify-center text-sm">{initialsOf(r.fullName)}</div>
                      <div>
                        <div className="font-medium text-sm">{r.fullName}</div>
                        <div className="text-xs text-muted font-mono">{r.no}</div>
                      </div>
                    </div>
                    <input type="checkbox" className="accent mt-1" checked={selection.has(r.id)} onChange={e=>{e.stopPropagation(); const n=new Set(selection); e.target.checked? n.add(r.id): n.delete(r.id); setSelection(n);}}/>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted">Dept:</span> <span className="font-medium">{r.dept || '—'}</span></div>
                    <div><span className="text-muted">Position:</span> <span className="font-medium truncate">{r.position || '—'}</span></div>
                    <div><span className="text-muted">Status:</span> <span className={`badge ${badgeTone(r.status)} text-[10px]`}>{r.status}</span></div>
                    <div><span className="text-muted">Salary:</span> <span className="font-medium">{r.salary ? `₱${Number(r.salary).toLocaleString()}` : '—'}</span></div>
                  </div>
                </div>
              ))}
            {!loading && rows.length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-3"><Users className="text-muted"/></div>
                <div className="font-medium">No employees found</div>
                <div className="text-sm text-muted mt-1">Try adjusting filters or add a new employee</div>
                <button className="btn btn-primary mt-4" onClick={openAdd}>Add Employee</button>
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-line">
            <div className="overflow-auto">
              <table className="data-table w-full">
                <thead className="bg-surface/70 backdrop-blur">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="w-12 p-3"><input type="checkbox" className="accent" checked={rows.length>0 && selection.size===rows.length} onChange={e=>setSelection(e.target.checked? new Set(rows.map(r=>r.id)): new Set())}/></th>
                    <th className="p-3 w-28">Employee No.</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Position</th>
                    <th className="p-3 w-36">Department</th>
                    <th className="p-3 w-24">Grade</th>
                    <th className="p-3 w-32">Hired</th>
                    <th className="p-3 w-32">Contact</th>
                    <th className="p-3 w-32">Salary</th>
                    <th className="p-3 w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {loading ? Array.from({length:8}).map((_,i)=><tr key={i} className="animate-pulse"><td colSpan={10} className="p-4"><div className="h-4 bg-surface rounded"/></td></tr>)
                    : rows.map(r=>(
                      <tr key={r.id} className="hover:bg-bg/50 transition-colors cursor-pointer" onClick={()=>{ setDetailEmp(r); setDetailOpen(true); }}>
                        <td className="p-3" onClick={e=>e.stopPropagation()}><input type="checkbox" className="accent" checked={selection.has(r.id)} onChange={e=>{const n=new Set(selection); e.target.checked? n.add(r.id): n.delete(r.id); setSelection(n);}}/></td>
                        <td className="p-3 font-mono text-xs text-muted">{r.no}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent font-display font-bold flex items-center justify-center text-sm">{initialsOf(r.fullName)}</div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{r.fullName}</div>
                              <div className="text-xs text-muted truncate">{r.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted truncate max-w-[220px]">{r.position}</td>
                        <td className="p-3 font-mono text-xs">{r.dept}</td>
                        <td className="p-3 font-mono text-xs">{r.sg}</td>
                        <td className="p-3 font-mono text-xs">{r.hired}</td>
                        <td className="p-3 font-mono text-xs truncate max-w-[140px]">{r.contact}</td>
                        <td className="p-3 font-mono text-xs">{r.salary ? `₱${Number(r.salary).toLocaleString()}` : '—'}</td>
                        <td className="p-3"><span className={`badge ${badgeTone(r.status)} text-xs`}>{r.status}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!loading && rows.length === 0 && (
              <div className="py-16 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-3"><Users className="text-muted"/></div>
                <div className="font-medium">No employees found</div>
                <div className="text-sm text-muted mt-1">Try adjusting filters or add a new employee</div>
                <button className="btn btn-primary mt-4" onClick={openAdd}>Add Employee</button>
              </div>
            )}
          </div>

          {!loading && total > 0 && (
            <div className="flex items-center justify-between pt-3 text-xs text-muted">
              <span>{total} results</span>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost h-9 px-3" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button>
                <span className="px-2">Page {page} of {totalPages}</span>
                <button className="btn btn-ghost h-9 px-3" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Employee':'New Employee'} size="lg">
        <EmployeeForm formId="emp-form" initial={form} submitLabel={editing?'Update':'Create'} onSubmit={save} />
      </Modal>

      <Modal open={detailOpen} onClose={()=>setDetailOpen(false)} title="Employee 201 File" size="lg">
        {detailEmp && <DetailPane employee={detailEmp} onEdit={()=>{setDetailOpen(false); openEdit(detailEmp);}} />}
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={()=>setConfirmDel(null)} onConfirm={()=>{remove(confirmDel); setConfirmDel(null);}} title="Delete employee?" message={`${confirmDel?.name??''} will be removed.`} confirmLabel="Delete" danger />

      <ConfirmDialog open={bulkAction==='delete'} onClose={()=>setBulkAction(null)} onConfirm={bulkDelete} title="Delete selected employees?" message={`${selection.size} employees will be permanently deleted.`} confirmLabel="Delete All" danger />
    </Layout>
  );
}