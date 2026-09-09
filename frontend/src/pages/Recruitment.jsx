import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { listApplicants, createApplicant } from '../api/recruitment.js';
import { departmentsApi } from '../api/departments.js';
import { api } from '../api/client.js';

export default function Recruitment(){
  const [applicants, setApplicants] = useState([]);
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', appliedPositionId:'', appliedDepartmentId:'' });

  const load = async ()=>{
    setApplicants((await listApplicants({})).items || []);
    setPositions([]);
    try {
      const { data } = await departmentsApi.list();
      setDepartments(data || []);
    } catch {
      setDepartments([]);
    }
  };
  useEffect(()=>{ load(); },[]);

  const onSubmit = async (e)=>{
    e.preventDefault();
    await createApplicant(form);
    setShowAdd(false); setForm({ firstName:'', lastName:'', email:'', phone:'', appliedPositionId:'', appliedDepartmentId:'' });
    load();
  };

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Recruitment</h1>
          <p className="text-sm text-muted mt-0.5">Applicants and eligibility tracking</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowAdd(v=>!v)}>New Applicant</button>
      </div>
      {showAdd && (
        <form onSubmit={onSubmit} className="card p-4 mb-4 grid grid-cols-2 gap-3">
          <input className="input" placeholder="First Name" value={form.firstName} onChange={e=>setForm({...form, firstName:e.target.value})} required/>
          <input className="input" placeholder="Last Name" value={form.lastName} onChange={e=>setForm({...form, lastName:e.target.value})} required/>
          <input className="input" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
          <input className="input" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
          <select className="input" value={form.appliedPositionId} onChange={e=>setForm({...form, appliedPositionId:e.target.value})}>
            <option value="">Select Position</option>
            {positions.map(p=> <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select className="input" value={form.appliedDepartmentId} onChange={e=>setForm({...form, appliedDepartmentId:e.target.value})}>
            <option value="">Select Department</option>
            {departments.map(d=> <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <div className="col-span-2 flex gap-2">
            <button className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </form>
      )}
      <div className="card p-4">
        <table className="data-table w-full">
          <thead><tr><th>Name</th><th>Email</th><th>Position</th><th>Status</th></tr></thead>
          <tbody>
            {applicants.map(a=>(
              <tr key={a.id}>
                <td>{a.firstName} {a.lastName}</td>
                <td>{a.email}</td>
                <td>{a.position?.title}</td>
                <td><span className="badge badge-accent">{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
