import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Save, X, ChevronDown } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { badgeTone } from '../data/mock.js';
import EmployeeForm from '../components/EmployeeForm.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmployeeProfileModal from '../components/EmployeeProfileModal.jsx';
import { listEmployees, createEmployee, updateEmployee, deleteEmployee } from '../api/employees.js';
import { departmentsApi } from '../api/departments.js';
import { useToast } from '../components/Toast.jsx';

const blankEmployee = { employeeNumber: '', firstName: '', lastName: '', middleName: '', birthDate: '', gender: '', civilStatus: '', address: '', contactNumber: '', email: '', status: 'ACTIVE', departmentId: '', positionId: '', hiredDate: '' };

function mapEmployee(e) {
  const fullName = `${e.lastName}, ${e.firstName}${e.middleName ? ' ' + e.middleName : ''}`;
  const toDateInput = v => (v ? String(v).slice(0, 10) : '');
  return {
    id: e.id,
    employeeNumber: e.employeeNumber,
    no: e.employeeNumber,
    itemNo: e.itemNo ?? e.position?.itemNo ?? '',
    firstName: e.firstName,
    lastName: e.lastName,
    middleName: e.middleName ?? '',
    fullName,
    name: fullName,
    position: e.position?.title ?? '',
    department: e.department?.name ?? '',
    dept: e.department?.code ?? '',
    status: e.status,
    sg: e.position?.salaryGrade ? `SG ${e.position.salaryGrade}` : '',
    step: e.position?.step ?? e.step ?? '',
    appointmentType: e.appointmentType ?? e.position?.appointmentType ?? '',
    hired: e.hiredDate?.slice(0, 10),
    email: e.email ?? '',
    contact: e.contactNumber ?? '',
    // Raw fields the edit form needs (date inputs want YYYY-MM-DD).
    // Seed rows store gender/civilStatus as 'Male'/'Single'; the API contract
    // requires MALE/SINGLE so normalize here to keep the selects + validation happy.
    departmentId: e.departmentId ?? '',
    positionId: e.positionId ?? '',
    birthDate: toDateInput(e.birthDate),
    hiredDate: toDateInput(e.hiredDate),
    gender: (e.gender ?? '').toUpperCase(),
    civilStatus: (e.civilStatus ?? '').toUpperCase(),
    address: e.address ?? '',
    contactNumber: e.contactNumber ?? '',
    raw: e
  };
}

export default function Employees() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Employee profile modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileEmployee, setProfileEmployee] = useState(null);
  
  // Server-side filtering
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [filterDept, setFilterDept] = useState(searchParams.get('dept') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterSg, setFilterSg] = useState(searchParams.get('sg') || '');
  const [filterAppt, setFilterAppt] = useState(searchParams.get('appt') || '');
  const [departments, setDepartments] = useState([]);
  
  // Pagination state
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [total, setTotal] = useState(0);
  const pageSize = 50;
  
  // Bumped whenever a CSC section entry is added/removed in the edit modal,
  // so the detail pane refetches its relation tabs.
  const [sectionsVersion, setSectionsVersion] = useState(0);

  const load = async (params) => {
    setLoading(true);
    try {
      const data = await listEmployees({ 
        page: params.page || 1, 
        limit: params.limit || pageSize, 
        search: params.search,
        departmentId: params.departmentId,
        status: params.status,
        salaryGrade: params.salaryGrade,
        appointmentType: params.appointmentType
      });
      const items = data?.items || data || [];
      const totalRecords = data?.total || items.length;
      const mapped = items.map(mapEmployee);
      setRows(mapped);
      setTotal(totalRecords);
    } catch (e) {
      toast('Failed to load employees: ' + (e?.response?.data?.error?.message || e.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load departments for filter dropdown
  useEffect(() => {
    departmentsApi.list()
      .then(r => setDepartments(r.data || r || []))
      .catch(() => []);
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (filterDept) params.set('dept', filterDept);
    if (filterStatus) params.set('status', filterStatus);
    if (filterSg) params.set('sg', filterSg);
    if (filterAppt) params.set('appt', filterAppt);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [searchQuery, filterDept, filterStatus, filterSg, filterAppt, page]);
  
  // Refetch when filters change
  useEffect(() => {
    load({
      page,
      search: searchQuery || undefined,
      departmentId: filterDept || undefined,
      status: filterStatus || undefined,
      salaryGrade: filterSg || undefined,
      appointmentType: filterAppt || undefined
    });
  }, [searchQuery, filterDept, filterStatus, filterSg, filterAppt, page]);
  
  // Initial load
  useEffect(() => {
    load({ page: 1 });
  }, []);

  const openProfile = (employee) => {
    setProfileEmployee(employee);
    setProfileModalOpen(true);
  };

  const closeProfile = () => {
    setProfileModalOpen(false);
    setProfileEmployee(null);
  };

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = e => { setEditing(e); setFormOpen(true); };

  // The edit form writes back raw fields (birthDate/hiredDate as YYYY-MM-DD,
  // departmentId/positionId). Strip the mapped display fields so Zod doesn't choke.
  const EDITABLE_FIELDS = ['employeeNumber', 'firstName', 'lastName', 'middleName', 'birthDate', 'gender', 'civilStatus', 'address', 'contactNumber', 'email', 'status', 'departmentId', 'positionId', 'hiredDate'];
  const toPayload = emp => Object.fromEntries(
    EDITABLE_FIELDS.filter(k => emp[k] !== undefined).map(k => [k, emp[k] === '' && !['employeeNumber', 'firstName', 'lastName', 'birthDate', 'gender', 'civilStatus', 'address', 'departmentId', 'positionId', 'hiredDate'].includes(k) ? null : emp[k]])
  );

  const submit = async emp => {
    try {
      if (editing) {
        await updateEmployee(editing.id, toPayload(emp));
        toast(`Employee ${emp.lastName} updated.`, 'success');
      } else {
        await createEmployee(toPayload(emp));
        toast(`Employee ${emp.lastName} added.`, 'success');
      }
      setFormOpen(false);
      setEditing(null);
      await load(searchQuery);
    } catch (e) {
      const details = e?.response?.data?.error?.details?.map(d => `${d.path}: ${d.message}`).join('; ');
      const msg = details || e?.response?.data?.error?.message;
      toast(msg || 'Save failed', 'error');
    }
  };

  const remove = async emp => {
    try {
      await deleteEmployee(emp.id);
      setRows(l => l.filter(r => r.id !== emp.id));
      // If the deleted employee's profile is open, close it
      if (profileEmployee?.id === emp.id) {
        closeProfile();
      }
      toast(`Employee ${emp.name} deleted.`, 'info');
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      toast(msg || 'Delete failed', 'error');
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold text-ink">Employees 201 File</h1>
            <p className="text-xs text-muted mt-0.5 truncate">CSC-compliant personnel master</p>
          </div>
          <button type="button" className="btn btn-primary gap-1.5 h-9 px-3 text-sm" onClick={openAdd}>
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search no, name, position…"
            className="input h-9 flex-1 min-w-[220px]"
            aria-label="Search employees"
          />
          <div className="relative">
            <select
              value={filterDept}
              onChange={e => { setFilterDept(e.target.value); setPage(1); }}
              className="input h-9 w-[170px] appearance-none pr-8"
              aria-label="Filter by department"
            >
              <option value="">All depts</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"/>
          </div>
          <div className="relative">
            <select
              value={filterSg}
              onChange={e => { setFilterSg(e.target.value); setPage(1); }}
              className="input h-9 w-[110px] appearance-none pr-8"
              aria-label="Filter by SG"
            >
              <option value="">All SG</option>
              {Array.from({length:33},(_,i)=>i+1).map(n=><option key={n} value={n}>SG {n}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"/>
          </div>
          <div className="relative">
            <select
              value={filterAppt}
              onChange={e => { setFilterAppt(e.target.value); setPage(1); }}
              className="input h-9 w-[150px] appearance-none pr-8"
              aria-label="Filter by appointment"
            >
              <option value="">All appt</option>
              <option value="REGULAR">Regular</option>
              <option value="COT">Contractual</option>
              <option value="CASUAL">Casual</option>
              <option value="PROVISIONAL">Provisional</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"/>
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="input h-9 w-[120px] appearance-none pr-8"
              aria-label="Filter by status"
            >
              <option value="">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"/>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        <div className="min-w-0">
          <div className="card p-3 h-full flex flex-col min-h-0">
            <div className="overflow-auto flex-1 min-h-0">
              <table className="data-table text-sm">
                <thead className="sticky top-0 bg-bg/95 backdrop-blur">
                  <tr className="text-[11px] uppercase tracking-wide text-muted">
                    <th className="text-left w-[90px]">No.</th>
                    <th className="text-left min-w-[180px]">Name</th>
                    <th className="text-left hidden lg:table-cell w-[120px]">Item</th>
                    <th className="text-left hidden md:table-cell">Position</th>
                    <th className="text-left hidden sm:table-cell w-[80px]">Dept</th>
                    <th className="text-left hidden xl:table-cell w-[90px]">SG/Step</th>
                    <th className="text-left hidden xl:table-cell w-[120px]">Appt Type</th>
                    <th className="text-left w-[80px]">Status</th>
                    <th className="text-right w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(e => (
                    <tr
                      key={e.id}
                      data-selectable="true"
                      onClick={() => openProfile(e)}
                      className="group cursor-pointer hover:bg-accent/5 transition-colors"
                    >
                      <td className="font-mono text-xs">{e.no}</td>
                      <td className="font-medium truncate max-w-[220px]">{e.fullName}</td>
                      <td className="hidden lg:table-cell font-mono text-xs text-muted">{e.itemNo || '—'}</td>
                      <td className="hidden md:table-cell truncate max-w-[200px]">{e.position}</td>
                      <td className="hidden sm:table-cell font-mono text-xs text-muted">{e.dept || '—'}</td>
                      <td className="hidden xl:table-cell font-mono text-xs">{e.sg}{e.step ? `/${e.step}` : ''}</td>
                      <td className="hidden xl:table-cell text-xs text-muted">{e.appointmentType || '—'}</td>
                      <td><span className={`badge text-[10px] ${badgeTone(e.status)}`}>{e.status}</span></td>
                       <td className="text-right">
                         <span className="inline-flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                           <button type="button" className="btn btn-ghost px-3 h-9 text-xs min-w-[64px]" onClick={e2 => { e2.stopPropagation(); openEdit(e); }} aria-label="Edit employee">Edit</button>
                           <button type="button" className="btn btn-ghost px-3 h-9 text-xs text-error min-w-[64px]" onClick={e2 => { e2.stopPropagation(); setConfirmDel(e); }} aria-label="Delete employee">Delete</button>
                         </span>
                       </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={9} className="text-muted text-xs py-10 text-center">No employees match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-line text-[11px]">
              <span className="mono-label">{total ? `${(page-1)*pageSize+1}–${Math.min(page*pageSize,total)} of ${total}` : '0 results'}</span>
              <div className="flex gap-1">
                <button type="button" className="btn btn-ghost h-9 px-3 text-xs" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                <button type="button" className="btn btn-ghost h-9 px-3 text-xs" disabled={page >= Math.ceil(total / pageSize) || loading} onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={profileModalOpen}
        onClose={closeProfile}
        title={profileEmployee ? `Employee Profile · ${profileEmployee.name}` : 'Employee Profile'}
        size="xl"
      >
        <EmployeeProfileModal
          employee={profileEmployee}
          onEdit={openEdit}
          refreshKey={sectionsVersion}
        />
      </Modal>

      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? `Edit Employee · ${editing.name}` : 'Add Employee'}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost gap-2" onClick={() => { setFormOpen(false); setEditing(null); }}>
              <X size={16} />
              Cancel
            </button>
            <button type="submit" form="employee-form" className="btn btn-primary gap-2">
              <Save size={16} />
              {editing ? 'Save Changes' : 'Add Employee'}
            </button>
          </>
        }
      >
        <EmployeeForm
          key={editing?.id ?? 'new'}
          formId="employee-form"
          initial={editing ?? blankEmployee}
          submitLabel={editing ? 'Save Changes' : 'Add Employee'}
          onSubmit={submit}
          onSectionsChange={() => setSectionsVersion(v => v + 1)}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => remove(confirmDel)}
        title="Delete employee?"
        message={`${confirmDel?.name} (${confirmDel?.no}) will be removed from the directory. This is a soft delete and will be recorded in the audit trail.`}
        confirmLabel="Delete"
        danger
      />
    </Layout>
  );
}
