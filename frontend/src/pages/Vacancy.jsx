import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { vacancyApi } from '../api/vacancy.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';

export default function Vacancy() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ plantillaItemId:'', title:'', description:'', qualifications:'', status:'OPEN' });

  const load = async () => {
    const { data } = await vacancyApi.list();
    setItems(data.items);
  };
  useEffect(()=>{ load(); },[]);

  const submit = async e => {
    e.preventDefault();
    await vacancyApi.create(form);
    toast('Vacancy created','success');
    setOpen(false);
    load();
  };

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <h1 className="font-display text-xl font-bold">Vacancy Publication</h1>
        <button className="btn btn-primary" onClick={()=>setOpen(true)}>New Vacancy</button>
      </div>
      <div className="card p-4">
        <table className="data-table">
          <thead><tr><th>Title</th><th>Plantilla Item</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(v=>(
              <tr key={v.id}>
                <td>{v.title}</td>
                <td className="font-mono">{v.plantillaItem?.itemNumber}</td>
                <td>{v.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={()=>setOpen(false)} title="New Vacancy">
        <form onSubmit={submit} className="space-y-3">
          <input className="input" placeholder="Plantilla Item ID" value={form.plantillaItemId} onChange={e=>setForm({...form,plantillaItemId:e.target.value})} required />
          <input className="input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required />
          <input className="input" placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
          <button className="btn btn-primary" type="submit">Create</button>
        </form>
      </Modal>
    </Layout>
  );
}
