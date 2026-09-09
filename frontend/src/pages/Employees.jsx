import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import MasterTable from '../components/MasterTable.jsx';
import DetailPane from '../components/DetailPane.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { listEmployees } from '../api/employees.js';
import { useToast } from '../components/Toast.jsx';

const blankEmployee = { no: '', name: '', position: '', dept: 'PGO', status: 'Probationary', sg: '', hired: '', email: '', contact: '' };

export default function Employees() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEmployees({ page: 1, limit: 50 }).then(({ items = [] }) => {
      const mapped = items.map(e => ({
        id: e.id,
        no: e.employeeNumber,
        name: `${e.lastName}, ${e.firstName}${e.middleName ? ' ' + e.middleName : ''}`,
        position: e.position?.title ?? '',
        dept: e.department?.name ?? '',
        status: e.status,
        sg: e.position?.salaryGrade ? `SG ${e.position.salaryGrade}` : '',
        hired: e.hiredDate?.slice(0,10),
        email: e.email ?? '',
        contact: e.contactNumber ?? '',
      }));
      setRows(mapped);
      setLoading(false);
    }).catch(() => {
      toast('Failed to load employees', 'error');
      setLoading(false);
    });
  }, []);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = e => { setEditing(e); setFormOpen(true); };

  const submit = emp => {
    if (rows.some(r => r.no === emp.no.trim() && r.id !== editing?.id)) {
      toast(`Employee no. ${emp.no} already exists.`, 'error');
      return;
    }
    if (editing) {
      setRows(l => l.map(r => (r.id === editing.id ? { ...r, ...emp } : r)));
      setSelected(prev => (prev?.id === editing.id ? { ...prev, ...emp } : prev));
      toast(`Employee ${emp.name} updated.`, 'success');
    } else {
      const created = { ...emp, id: Math.max(0, ...rows.map(r => r.id)) + 1 };
      setRows(l => [...l, created]);
      toast(`Employee ${emp.name} added.`, 'success');
    }
    setFormOpen(false);
  };

  const remove = emp => {
    setRows(l => l.filter(r => r.id !== emp.id));
    setSelected(prev => (prev?.id === emp.id ? null : prev));
    toast(`Employee ${emp.name} deleted.`, 'info');
  };

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Employees</h1>
          <p className="text-sm text-muted mt-0.5">Master-detail personnel directory</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAdd}>Add Employee</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-w-0">
          <MasterTable
            rows={rows}
            selected={selected?.id ?? null}
            onSelect={setSelected}
            onEdit={openEdit}
            onDelete={setConfirmDel}
          />
        </div>
        <div className="min-w-0">
          <DetailPane employee={selected} />
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit Employee · ${editing.name}` : 'Add Employee'}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" form="employee-form" className="btn btn-primary">{editing ? 'Save Changes' : 'Add Employee'}</button>
          </>
        }
      >
        <EmployeeForm
          formId="employee-form"
          initial={editing ?? blankEmployee}
          submitLabel={editing ? 'Save Changes' : 'Add Employee'}
          onSubmit={submit}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => remove(confirmDel)}
        title="Delete employee?"
        message={`${confirmDel?.name} (${confirmDel?.no}) will be removed from the directory. This action will be recorded in the audit trail once wired to the backend.`}
        confirmLabel="Delete"
        danger
      />
    </Layout>
  );
}
