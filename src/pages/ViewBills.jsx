import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

const ViewBills = () => {
  // --- STATE ---
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState({ revenue: 0, profit: 0, count: 0 });
  const [filter, setFilter] = useState('daily'); // daily, weekly, monthly, custom
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  
  // --- NEW: CATEGORY FILTER STATE ---
  const [statusCategory, setStatusCategory] = useState('Accepted'); // Options: 'Accepted', 'Cancelled'

  // --- HELPERS ---
  const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);

  // --- FETCH DATA ---
  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = `/billing/report?period=${filter}`;
      if (filter === 'custom' && customRange.start && customRange.end) {
        url += `&start_date=${customRange.start}&end_date=${customRange.end}`;
      }
      
      const res = await apiClient.get(url);
      setBills(res.data.bills);
      setSummary(res.data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when filter changes
  useEffect(() => {
    if (filter !== 'custom') fetchReport();
  }, [filter]);

  // --- FILTER BILLS FOR TABLE ---
  const displayedBills = bills.filter(bill => {
    // If invoice_status is missing, assume 'Accepted'
    const status = bill.invoice_status || 'Accepted'; 
    return status === statusCategory;
  });

  return (
    <div className="container-fluid p-4">
      
      {/* 1. HEADER & DATE FILTER SECTION */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold m-0">Sales Analytics</h3>
          <p className="text-secondary small m-0">Profit & Revenue Reports</p>
        </div>

        {/* DATE FILTER BUTTONS */}
        <div className="bg-white p-1 rounded shadow-sm border d-flex flex-wrap align-items-center">
          {['daily', 'weekly', 'monthly'].map(f => (
            <button 
              key={f}
              className={`btn btn-sm px-3 fw-bold text-capitalize ${filter === f ? 'btn-dark' : 'text-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
          
          <div className="border-start mx-2 ps-2 d-flex align-items-center gap-2">
            <button 
              className={`btn btn-sm fw-bold ${filter === 'custom' ? 'text-primary' : 'text-secondary'}`} 
              onClick={() => setFilter('custom')}
            >
              Custom:
            </button>
            <input 
              type="date" className="form-control form-control-sm" 
              style={{ width: '130px' }}
              value={customRange.start} 
              onChange={e => setCustomRange({...customRange, start: e.target.value})}
            />
            <span className="text-muted">-</span>
            <input 
              type="date" className="form-control form-control-sm"
              style={{ width: '130px' }} 
              value={customRange.end} 
              onChange={e => setCustomRange({...customRange, end: e.target.value})}
            />
            <button className="btn btn-sm btn-primary" onClick={fetchReport} disabled={filter !== 'custom'}>
              <i className="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DATA CARDS (Profit & Revenue) */}
      <div className="row g-3 mb-4">
        {/* REVENUE CARD */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-white" style={{ background: 'linear-gradient(135deg, #1f2937, #111827)' }}>
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-white-50 text-uppercase fw-bold">Total Revenue</small>
                  <h2 className="fw-bold mb-0 text-warning">{formatINR(summary.revenue)}</h2>
                </div>
                <div className="bg-white bg-opacity-10 p-2 rounded">
                  <i className="bi bi-wallet2 fs-4 text-warning"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PROFIT CARD */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-white border-start border-success border-5">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-secondary text-uppercase fw-bold">Net Profit</small>
                  <h2 className="fw-bold mb-0 text-success">{formatINR(summary.profit)}</h2>
                </div>
                <div className="bg-success bg-opacity-10 p-2 rounded">
                  <i className="bi bi-graph-up-arrow fs-4 text-success"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COUNT CARD */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-white">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-secondary text-uppercase fw-bold">Invoices Generated</small>
                  <h2 className="fw-bold mb-0 text-dark">{summary.count}</h2>
                </div>
                <div className="bg-light p-2 rounded">
                  <i className="bi bi-receipt fs-4 text-secondary"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DETAILED LIST WITH CATEGORY TABS */}
      <div className="card border-0 shadow-sm">
        
        {/* Category Header */}
        <div className="card-header bg-white py-2 border-bottom d-flex justify-content-between align-items-center">
            <div className="d-flex gap-2">
                <button 
                    className={`btn btn-sm fw-bold px-3 ${statusCategory === 'Accepted' ? 'btn-success text-white' : 'btn-light text-secondary border'}`}
                    onClick={() => setStatusCategory('Accepted')}
                >
                    <i className="bi bi-check-circle me-2"></i>Accepted Bills
                </button>
                <button 
                    className={`btn btn-sm fw-bold px-3 ${statusCategory === 'Cancelled' ? 'btn-danger text-white' : 'btn-light text-secondary border'}`}
                    onClick={() => setStatusCategory('Cancelled')}
                >
                    <i className="bi bi-x-circle me-2"></i>Cancelled Bills
                </button>
            </div>
            <small className="text-secondary">Showing {filter} records</small>
        </div>

        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Date</th>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Status</th>
                <th>Revenue</th>
                <th className="text-end pe-4">Profit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-5">Loading data...</td></tr>
              ) : displayedBills.length === 0 ? (
                <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                        No {statusCategory.toLowerCase()} bills found for this period.
                    </td>
                </tr>
              ) : (
                displayedBills.map(bill => (
                  <tr key={bill.id} style={{ opacity: statusCategory === 'Cancelled' ? 0.7 : 1 }}>
                    <td className="ps-4 text-secondary small">
                      {new Date(bill.sale_date).toLocaleDateString()}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border font-monospace">#{bill.invoice_no}</span>
                    </td>
                    <td className="fw-bold">{bill.users?.name}</td>
                    <td>
                      <span className="badge bg-secondary">{bill.items ? bill.items.length : 0} Items</span>
                    </td>
                    <td>
                      {bill.invoice_status === 'Cancelled' 
                        ? <span className="badge bg-danger">Cancelled</span> 
                        : <span className="badge bg-success">Valid</span>
                      }
                    </td>
                    <td className="fw-bold">{formatINR(bill.total_amount)}</td>
                    <td className="text-end pe-4 fw-bold text-success">
                      +{formatINR(bill.calculated_profit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ViewBills;