import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { designationApi } from '../api/designation.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';

export default function Designation() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId:'', orderNumber:'', issuedDate:'', signedBy:'' });

  const load = async () => {
    const { data } = await designationApi.list();
    setItems(data.items);
  };
  useEffect(()=>{ load(); },[]);

  const submit = async e => {
    e.preventDefault();
    await designationApi.create(form);
    toast('Designation order created','success');
    setOpen(false);
    load();
  };

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <h1 className="font-display text-xl font-bold">Designation Orders</h1>
        <button className="btn btn-primary" onClick={()=>setOpen(true)}>New Order</button>
      </div>
      <div className="card p-4">
        <table className="data-table">
          <thead><tr><th>Order No</th><th>Employee</th><th>Issued</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(d=>(
              <tr key={d.id}>
                <td className="font-mono">{d.orderNumber}</td>
                <td>{d.employee?.firstName} {d.employee?.lastName}</td>
                <td>{d.issuedDate}</td>
                <td>{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={()=>setOpen(false)} title="New Designation Order">
        <form onSubmit={submit} className="space-y-3">
          <input className="input" placeholder="Employee ID" value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})} required />
          <input className="input" placeholder="Order Number" value={form.orderNumber} onChange={e=>setForm({...form,orderNumber:e.target.value})} required />
          <input className="input" type="date" value={form.issuedDate} onChange={e=>setForm({...form,issuedDate:e.target.value})} required />
          <input className="input" placeholder="Signed By" value={form.signedBy} onChange={e=>setForm({...form,signedBy:e.target.value})} />
          <button className="btn btn-primary" type="submit">Create</button>
        </form>
      </Modal>
    </Layout>
  );
}
