import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { plantillaApi } from '../api/plantilla.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';

export default function Plantilla() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ itemNumber:'', positionId:'', departmentId:'', status:'VACANT' });

  const load = async () => {
    const { data } = await plantillaApi.list();
    setItems(data.items);
  };
  useEffect(()=>{ load(); },[]);

  const submit = async e => {
    e.preventDefault();
    await plantillaApi.create(form);
    toast('Plantilla item created','success');
    setOpen(false);
    load();
  };

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <h1 className="font-display text-xl font-bold">Plantilla Management</h1>
        <button className="btn btn-primary" onClick={()=>setOpen(true)}>New Item</button>
      </div>
      <div className="card p-4">
        <table className="data-table">
          <thead><tr><th>Item No</th><th>Position</th><th>Dept</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(i=>(
              <tr key={i.id}>
                <td className="font-mono">{i.itemNumber}</td>
                <td>{i.position?.title}</td>
                <td>{i.department?.name}</td>
                <td>{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={()=>setOpen(false)} title="New Plantilla Item">
        <form onSubmit={submit} className="space-y-3">
          <input className="input" placeholder="Item Number" value={form.itemNumber} onChange={e=>setForm({...form,itemNumber:e.target.value})} required />
          <input className="input" placeholder="Position ID" value={form.positionId} onChange={e=>setForm({...form,positionId:e.target.value})} required />
          <input className="input" placeholder="Department ID" value={form.departmentId} onChange={e=>setForm({...form,departmentId:e.target.value})} required />
          <button className="btn btn-primary" type="submit">Create</button>
        </form>
      </Modal>
    </Layout>
  );
}
