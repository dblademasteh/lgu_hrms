import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';
import DetailPane from '../components/DetailPane.jsx';
import { useToast } from '../components/Toast.jsx';
import { listEmployees, createEmployee, updateEmployee, deleteEmployee } from '../api/employees.js';
import { Plus, Search, Users, UserCheck, UserX, Filter } from 'lucide-react';
import { badgeTone } from '../data/mock.js';

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
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', dept: 'all', status: 'all' });
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selection, setSelection] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankEmployee);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEmp, setDetailEmp] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listEmployees({ page: 1, limit: 500 });
      setRows((data.items ?? []).map(mapEmployee));
    } catch { toast('Failed to load employees','error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter(r=>r.status==='ACTIVE').length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [rows]);

  const departments = useMemo(() => {
    const map = new Map();
    rows.forEach(r => { if (r.dept && !map.has(r.dept)) map.set(r.dept, r.department); });
    return [...map.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const q = filters.search.toLowerCase();
      const matchesQ = !q || [r.fullName, r.no, r.position].some(v => (v ?? '').toLowerCase().includes(q));
      const matchesDept = filters.dept === 'all' || r.dept === filters.dept;
      const matchesStatus = filters.status === 'all' || r.status === filters.status;
      return matchesQ && matchesDept && matchesStatus;
    });
  }, [rows, filters]);

  const paged = useMemo(() => {
    const start = (page-1)*pageSize;
    return filtered.slice(start, start+pageSize);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length/pageSize));

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
    try { await deleteEmployee(emp.id); setRows(l=>l.filter(r=>r.id!==emp.id)); toast('Employee deleted','info'); }
    catch(e){ toast(e?.response?.data?.error?.message||'Delete failed','error'); }
  };

  const exportCSV = () => {
    const data = selection.size ? rows.filter(r=>selection.has(r.id)) : filtered;
    const headers = ['employeeNumber','lastName','firstName','middleName','birthDate','gender','civilStatus','address','contactNumber','email','sssNumber','philhealthNumber','pagibigNumber','tinNumber','status','departmentId','positionId','hiredDate','monthlySalary'];
    const lines = [headers.join(',')];
    data.forEach(r=>{ const e=r.raw; lines.push(headers.map(h=>`"${String(e[h]??'').replace(/"/g,'""')}"`).join(',')); });
    const blob = new Blob([lines.join('\n')],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='employees.csv'; a.click(); URL.revokeObjectURL(url);
    toast(`Exported ${data.length} employees`,'success');
  };

  return (
    <Layout title="Employees 201 File">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center"><Users/></div>
            <div><div className="text-xs text-muted uppercase tracking-wide">Total</div><div className="text-xl font-semibold">{stats.total}</div></div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center"><UserCheck/></div>
            <div><div className="text-xs text-muted uppercase tracking-wide">Active</div><div className="text-xl font-semibold">{stats.active}</div></div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center"><UserX/></div>
            <div><div className="text-xs text-muted uppercase tracking-wide">Inactive</div><div className="text-xl font-semibold">{stats.inactive}</div></div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[280px]">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input pl-10 h-11" placeholder="Search name, number, position..." value={filters.search} onChange={e=>{setFilters(f=>({...f,search:e.target.value})); setPage(1);}} />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-muted"/>
              <select className="input h-11 w-44" value={filters.dept} onChange={e=>{setFilters(f=>({...f,dept:e.target.value})); setPage(1);}}>
                <option value="all">All Departments</option>
                {departments.map(([c,n])=><option key={c} value={c}>{n||c}</option>)}
              </select>
              <select className="input h-11 w-40" value={filters.status} onChange={e=>{setFilters(f=>({...f,status:e.target.value})); setPage(1);}}>
                <option value="all">All Status</option>
                {['ACTIVE','INACTIVE','RESIGNED','RETIRED'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button className="btn btn-primary h-11 px-4" onClick={openAdd}><Plus size={18}/> New Employee</button>
          </div>

          {selection.size>0 && (
            <div className="flex items-center gap-3 mb-3 text-sm">
              <span className="text-muted">{selection.size} selected</span>
              <button className="btn btn-ghost" onClick={exportCSV}>Export CSV</button>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-line">
            <div className="overflow-auto">
              <table className="data-table w-full">
                <thead className="bg-surface/70 backdrop-blur">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="w-12 p-3"><input type="checkbox" className="accent" checked={filtered.length>0 && selection.size===filtered.length} onChange={e=>setSelection(e.target.checked? new Set(filtered.map(r=>r.id)): new Set())}/></th>
                    <th className="p-3 w-28">Employee No.</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Position</th>
                    <th className="p-3 w-36">Department</th>
                    <th className="p-3 w-24">Grade</th>
                    <th className="p-3 w-32">Hired</th>
                    <th className="p-3 w-48">Email</th>
                    <th className="p-3 w-32">Contact</th>
                    <th className="p-3 w-32">Salary</th>
                    <th className="p-3 w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {loading ? Array.from({length:8}).map((_,i)=><tr key={i} className="animate-pulse"><td colSpan={7} className="p-4"><div className="h-4 bg-surface rounded"/></td></tr>)
                    : paged.map(r=>(
                      <tr key={r.id} className="hover:bg-surface/60 transition-colors cursor-pointer" onClick={()=>{ setDetailEmp(r); setDetailOpen(true); }}>
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
                        <td className="p-3 text-sm text-muted truncate max-w-[200px]">{r.email}</td>
                        <td className="p-3 font-mono text-xs truncate max-w-[140px]">{r.contact}</td>
                        <td className="p-3 font-mono text-xs">{r.salary ? `₱${Number(r.salary).toLocaleString()}` : '—'}</td>
                        <td className="p-3"><span className={`badge ${badgeTone(r.status)} text-xs`}>{r.status}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!loading && filtered.length===0 && (
              <div className="py-16 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-3"><Users className="text-muted"/></div>
                <div className="font-medium">No employees found</div>
                <div className="text-sm text-muted mt-1">Try adjusting filters or add a new employee</div>
                <button className="btn btn-primary mt-4" onClick={openAdd}>Add Employee</button>
              </div>
            )}
          </div>

          {!loading && filtered.length>0 && (
            <div className="flex items-center justify-between pt-3 text-xs text-muted">
              <span>{filtered.length} results</span>
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
    </Layout>
  );
}
