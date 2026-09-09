import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { getEssProfile, getEssPayslips, getEssLeaveRequests, createEssLeaveRequest, getEssAttendance } from '../api/ess.js';

export default function ESS(){
  const [profile, setProfile] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);

  useEffect(()=>{
    getEssProfile().then(setProfile).catch(()=>{});
    getEssPayslips().then(setPayslips).catch(()=>{});
    getEssLeaveRequests().then(setLeaves).catch(()=>{});
    getEssAttendance('2026-09').then(setAttendance).catch(()=>{});
  },[]);

  return (
    <Layout title="Employee Self-Service">
      <div className="grid gap-4">
        <div className="card p-4">
          <h2 className="font-display text-lg">Profile</h2>
          {profile ? (
            <div className="mt-2 text-sm">
              <p><span className="text-muted">Name:</span> {profile.firstName} {profile.middleName} {profile.lastName}</p>
              <p><span className="text-muted">Employee No:</span> {profile.employeeNumber}</p>
              <p><span className="text-muted">Dept:</span> {profile.department?.name}</p>
              <p><span className="text-muted">Position:</span> {profile.position?.title}</p>
            </div>
          ) : <p className="text-muted text-sm">Loading profile…</p>}
        </div>

        <div className="card p-4">
          <h2 className="font-display text-lg">Payslips</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead><tr><th>Period</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Net</th></tr></thead>
              <tbody>
                {payslips.map(p=>(
                  <tr key={p.id}>
                    <td>{p.run?.period?.name}</td>
                    <td className="font-mono">{Number(p.basicPay).toLocaleString()}</td>
                    <td className="font-mono">{Number(p.allowances).toLocaleString()}</td>
                    <td className="font-mono">{Number(p.deductions).toLocaleString()}</td>
                    <td className="font-mono">{Number(p.netPay).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-display text-lg">Leave Requests</h2>
          <ul className="mt-2 text-sm list-disc pl-5">
            {leaves.map(l=>(
              <li key={l.id}>{l.type} {new Date(l.fromDate).toLocaleDateString()} – {new Date(l.toDate).toLocaleDateString()} <span className="badge">{l.status}</span></li>
            ))}
          </ul>
        </div>

        <div className="card p-4">
          <h2 className="font-display text-lg">Attendance</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead><tr><th>Date</th><th>Time In</th><th>Time Out</th><th>Hours</th></tr></thead>
              <tbody>
                {attendance.map(a=>(
                  <tr key={a.id}>
                    <td>{new Date(a.date).toLocaleDateString()}</td>
                    <td>{a.timeIn ? new Date(a.timeIn).toLocaleTimeString() : ''}</td>
                    <td>{a.timeOut ? new Date(a.timeOut).toLocaleTimeString() : ''}</td>
                    <td className="font-mono">{a.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
