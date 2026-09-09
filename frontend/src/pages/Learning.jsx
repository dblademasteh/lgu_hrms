import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { listPrograms, createProgram, deleteProgram, listEnrollments, createEnrollment } from '../api/training.js';
import { listEmployees } from '../api/employees.js';
import { useNavigate } from 'react-router-dom';

export default function Learning(){
  const [programs, setPrograms] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code:'', title:'', description:'', durationHours:0 });
  const navigate = useNavigate();

  const load = async () => {
    setPrograms((await listPrograms({})).items || []);
    setEmployees((await listEmployees({ page:1 })).items || []);
    setEnrollments((await listEnrollments({ page:1 })).items || []);
  };
  useEffect(()=>{ load(); },[]);

  const onSubmit = async (e)=>{
    e.preventDefault();
    await createProgram(form);
    setShowAdd(false); setForm({ code:'', title:'', description:'', durationHours:0 });
    load();
  };

  const enroll = async (programId, employeeId)=>{
    await createEnrollment({ programId, employeeId, status:'ENROLLED' });
    load();
  };

  return (
    <Layout>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Learning & Development</h1>
          <p className="text-sm text-muted mt-0.5">Training programs and enrollments</p>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 h-full">
      <div className="col-span-12 lg:col-span-7 card p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Training Programs</h2>
          <button className="btn btn-primary" onClick={()=>setShowAdd(v=>!v)}>New Program</button>
        </div>
        {showAdd && (
          <form onSubmit={onSubmit} className="mb-4 grid grid-cols-2 gap-3">
            <input className="input col-span-1" placeholder="Code" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} required/>
            <input className="input col-span-1" placeholder="Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required/>
            <input className="input col-span-2" placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/>
            <input className="input" type="number" placeholder="Hours" value={form.durationHours} onChange={e=>setForm({...form, durationHours:Number(e.target.value)})}/>
            <div className="col-span-2 flex gap-2">
              <button className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        )}
        <div className="overflow-auto">
          <table className="data-table w-full">
            <thead><tr><th>Code</th><th>Title</th><th>Hours</th><th>Enroll</th></tr></thead>
            <tbody>
              {programs.map(p=>(
                <tr key={p.id}>
                  <td className="mono-label">{p.code}</td>
                  <td>{p.title}</td>
                  <td>{p.durationHours||0}</td>
                  <td>
                    <select onChange={e=>e.target.value && enroll(p.id, e.target.value)} defaultValue="">
                      <option value="">-- employee --</option>
                      {employees.map(e=> <option key={e.id} value={e.id}>{e.employeeNumber} {e.firstName} {e.lastName}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-5 card p-4">
        <h2 className="text-lg font-semibold mb-3">Enrollments</h2>
        <table className="data-table w-full">
          <thead><tr><th>Employee</th><th>Program</th><th>Status</th></tr></thead>
          <tbody>
            {enrollments.map(en=>(
              <tr key={en.id}>
                <td>{en.employee?.employeeNumber}</td>
                <td>{en.program?.title}</td>
                <td><span className="badge badge-accent">{en.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </Layout>
  );
}
