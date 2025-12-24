import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';

const Reports = () => {
  const { reports } = useContext(GlobalContext);
  const total = reports.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between mb-4">
        <h3 className="fw-bold">Financial Reports</h3>
        <div className="bg-success text-white px-4 py-2 rounded"><small>TOTAL</small><h3 className="m-0 fw-bold">${total.toFixed(2)}</h3></div>
      </div>
      <div className="card border-0 shadow-sm">
        <table className="table table-hover mb-0">
          <thead className="table-light"><tr><th>Date</th><th>Customer</th><th>Ref</th><th>Amount</th></tr></thead>
          <tbody>
            {reports.map(log => (
              <tr key={log.id}>
                <td>{new Date(log.payment_date).toLocaleDateString()}</td>
                <td className="fw-bold">{log.users?.name}</td>
                <td>#{log.sales?.invoice_no}</td>
                <td className="fw-bold text-success">+${log.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default Reports;