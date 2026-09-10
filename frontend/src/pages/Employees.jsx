import React, { useState, useEffect } from 'react';
import { Plus, Save, X } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import MasterTable from '../components/MasterTable.jsx';
import DetailPane from '../components/DetailPane.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { listEmployees, createEmployee, updateEmployee, deleteEmployee } from '../api/employees.js';
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
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // Bumped whenever a CSC section entry is added/removed in the edit modal,
  // so the detail pane refetches its relation tabs.
  const [sectionsVersion, setSectionsVersion] = useState(0);

  const load = async (q) => {
    setLoading(true);
    try {
      const { items = [] } = await listEmployees({ page: 1, limit: 200, search: q || undefined });
      const mapped = items.map(mapEmployee);
      setRows(mapped);
      setFiltered(mapped);
      // Keep the detail pane populated: select the first row when nothing is selected.
      setSelected(prev => {
        if (prev && mapped.some(m => m.id === prev.id)) return prev;
        return mapped[0] ?? null;
      });
    } catch {
      toast('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Debounced server-side search (backend filters by no/name).
  // Single effect: initial '' query loads the full list on mount.
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { if (searchQuery !== undefined) load(searchQuery); }, [searchQuery]);

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

      <div className="mb-4 flex gap-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employee no, name, position, dept" className="input flex-1" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-w-0">
          <MasterTable
            rows={filtered}
            selected={selected?.id ?? null}
            onSelect={setSelected}
            onEdit={openEdit}
            onDelete={setConfirmDel}
          />
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
