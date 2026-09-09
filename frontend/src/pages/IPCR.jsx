import Layout from '../components/Layout.jsx';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function IPCR(){
  const [reviews, setReviews] = useState([]);
  useEffect(()=>{
    api.get('/performance').then(r=>setReviews(r.data.reviews||[])).catch(()=>{});
  },[]);
  return (
    <Layout title="IPCR/OPCR Appraisal">
      <div className="card p-4">
        <h2 className="font-display text-lg">Appraisals</h2>
        <table className="data-table w-full text-sm mt-2">
          <thead><tr><th>Employee</th><th>Period</th><th>Status</th><th>Rating</th></tr></thead>
          <tbody>
            {reviews.map(r=>(
              <tr key={r.id}>
                <td>{r.employeeId}</td>
                <td>{r.period}</td>
                <td>{r.status}</td>
                <td>{r.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
