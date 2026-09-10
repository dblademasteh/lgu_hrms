import React, { useState, useEffect } from 'react';
import { Plus, Save, X } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { badgeTone } from '../data/mock.js';
import DetailPane from '../components/DetailPane.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
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
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Server-side filtering
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [departments, setDepartments] = useState([]);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;
  
  // Bumped whenever a CSC section entry is added/removed in the edit modal,
  // so the detail pane refetches its relation tabs.
  const [sectionsVersion, setSectionsVersion] = useState(0);

  const load = async (params) => {
    setLoading(true);
    try {
      const { data } = await listEmployees({ 
        page: params.page || 1, 
        limit: params.limit || pageSize, 
        search: params.search,
        departmentId: params.departmentId,
        status: params.status
      });
      const items = data?.items || data || [];
      const totalRecords = data?.total || items.length;
      const mapped = items.map(mapEmployee);
      setRows(mapped);
      setTotal(totalRecords);
      
      // Keep the detail pane populated: select the first row when nothing is selected.
      setSelected(prev => {
        if (prev && mapped.some(m => m.id === prev.id)) return prev;
        return mapped[0] ?? null;
      });
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
  
  // Refetch when filters change
  useEffect(() => {
    load({
      page,
      search: searchQuery || undefined,
      departmentId: filterDept || undefined,
      status: filterStatus || undefined
    });
  }, [searchQuery, filterDept, filterStatus, page]);
  
  // Initial load
  useEffect(() => {
    load({ page: 1 });
  }, []);

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
      setFiltered(l => {
        const next = l.filter(r => r.id !== emp.id);
        // Keep the detail pane on a live row after delete.
        setSelected(prev => (prev?.id === emp.id ? (next[0] ?? null) : prev));
        return next;
      });
      toast(`Employee ${emp.name} deleted.`, 'info');
    } catch (e) {
      const msg = e?.response?.data?.error?.message;
      toast(msg || 'Delete failed', 'error');
    }
  };

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Employees 201 File</h1>
          <p className="text-sm text-muted mt-0.5">CSC-compliant personnel master with Personal, Service, Appointment & Payroll history</p>
        </div>
        <button type="button" className="btn btn-primary gap-2" onClick={openAdd}>
          <Plus size={16} />
          Add Employee
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search employee no, name, position…"
          className="input flex-1 min-w-40"
          aria-label="Search employees"
        />
        <select
          value={filterDept}
          onChange={e => { setFilterDept(e.target.value); setPage(1); }}
          className="input w-auto"
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}\n        </select>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="input w-auto"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-w-0">
          <div className="card p-4 h-full flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-ink">Employees</h2>
              <span className="mono-label">Page {page} of {Math.ceil(total / pageSize)}</span>
            </div>
            
            <div className="overflow-auto flex-1 min-h-0">
              <table className="data-table">
                <thead>
                  <tr><th>No.</th><th>Name</th><th>Position</th><th>Dept</th><th>Status</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {rows.map(e => (
                    <tr
                      key={e.id}
                      data-selectable="true"
                      data-selected={selected?.id === e.id ? 'true' : undefined}
                      onClick={() => setSelected(e)}
                    >
                      <td className="font-mono">{e.no}</td>
                      <td className="font-medium">{e.fullName}</td>
                      <td>{e.position}</td>
                      <td className="font-mono">{e.dept}</td>
                      <td><span className={`badge ${badgeTone(e.status)}`}>{e.status}</span></td>
                      <td className="text-right">
                        <span className="inline-flex gap-1">
                          <button type="button" className="btn btn-ghost px-2 text-xs" onClick={e2 => { e2.stopPropagation(); openEdit(e); }}>Edit</button>
                          <button type="button" className="btn btn-ghost px-2 text-xs text-error" onClick={e2 => { e2.stopPropagation(); setConfirmDel(e); }}>Delete</button>
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="text-muted text-sm py-8">No employees match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex items-center justify-between pt-3">
              <span className="mono-label">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost px-3 text-xs" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                <button type="button" className="btn btn-ghost px-3 text-xs" disabled={page >= Math.ceil(total / pageSize) || loading} onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}>Next</button>
              </div>
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <DetailPane employee={selected} onEdit={openEdit} refreshKey={sectionsVersion} />
        </div>
      </div>

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
