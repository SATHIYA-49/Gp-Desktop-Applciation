import React, { useState, useEffect, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';

const ViewBills = () => {
  const { darkMode } = useContext(GlobalContext);

  // --- STATE ---
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState({ revenue: 0, profit: 0, count: 0 });
  const [filter, setFilter] = useState('daily'); // daily, weekly, monthly, custom
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [statusCategory, setStatusCategory] = useState('Accepted'); // 'Accepted' or 'Cancelled'
  
  // --- NEW: SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');

  // --- THEME ---
  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-secondary',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
    tableHeader: darkMode ? 'table-dark' : 'table-light',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-white',
  };

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

  useEffect(() => {
    if (filter !== 'custom') fetchReport();
    // eslint-disable-next-line
  }, [filter]);

  // --- FILTER DISPLAY (Status + Search) ---
  const displayedBills = bills.filter(bill => {
    // 1. Status Check
    const status = bill.invoice_status || 'Accepted'; 
    const matchesStatus = status === statusCategory;

    // 2. Search Check (Invoice # or Customer Name)
    const query = searchQuery.toLowerCase();
    const invoiceMatch = bill.invoice_no?.toString().includes(query);
    const customerMatch = bill.users?.name?.toLowerCase().includes(query);
    const matchesSearch = !searchQuery || invoiceMatch || customerMatch;

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="container-fluid p-4" style={{ minHeight: '100vh', background: theme.container }}>
      
      {/* HEADER & FILTER */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className={`fw-bold m-0 ${theme.text}`}>Sales Analytics</h3>
          <p className={`small m-0 ${theme.subText}`}>Profit & Revenue Reports</p>
        </div>

        <div className={`p-1 rounded shadow-sm border d-flex flex-wrap align-items-center ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
          {['daily', 'weekly', 'monthly'].map(f => (
            <button 
              key={f}
              className={`btn btn-sm px-3 fw-bold text-capitalize ${filter === f ? 'btn-primary' : theme.text}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
          
          <div className="border-start mx-2 ps-2 d-flex align-items-center gap-2">
            <button 
              className={`btn btn-sm fw-bold ${filter === 'custom' ? 'text-primary' : theme.text}`} 
              onClick={() => setFilter('custom')}
            >
              Custom:
            </button>
            <input 
              type="date" className={`form-control form-control-sm ${theme.input}`} 
              style={{ width: '130px' }}
              value={customRange.start} 
              onChange={e => setCustomRange({...customRange, start: e.target.value})}
            />
            <span className={theme.text}>-</span>
            <input 
              type="date" className={`form-control form-control-sm ${theme.input}`}
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

      {/* METRIC CARDS */}
      <div className="row g-3 mb-4">
        {/* REVENUE */}
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-white" style={{ background: 'linear-gradient(135deg, #1f2937, #111827)' }}>
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-white-50 text-uppercase fw-bold">Total Revenue</small>
                  <h2 className="fw-bold mb-0 text-warning">{formatINR(summary.revenue)}</h2>
                </div>
                <div className="bg-white bg-opacity-10 p-2 rounded"><i className="bi bi-wallet2 fs-4 text-warning"></i></div>
              </div>
            </div>
          </div>
        </div>

        {/* PROFIT */}
        <div className="col-md-4">
          <div className={`card h-100 border-start border-success border-5 ${theme.card}`}>
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className={`text-uppercase fw-bold ${theme.subText}`}>Net Profit</small>
                  <h2 className="fw-bold mb-0 text-success">{formatINR(summary.profit)}</h2>
                </div>
                <div className="bg-success bg-opacity-10 p-2 rounded"><i className="bi bi-graph-up-arrow fs-4 text-success"></i></div>
              </div>
            </div>
          </div>
        </div>

        {/* COUNT */}
        <div className="col-md-4">
          <div className={`card h-100 ${theme.card}`}>
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className={`text-uppercase fw-bold ${theme.subText}`}>Invoices Generated</small>
                  <h2 className={`fw-bold mb-0 ${theme.text}`}>{summary.count}</h2>
                </div>
                <div className="bg-secondary bg-opacity-10 p-2 rounded"><i className={`bi bi-receipt fs-4 ${theme.text}`}></i></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE LIST */}
      <div className={`card ${theme.card}`}>
        <div className={`card-header py-2 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2 ${theme.card}`}>
            
            {/* Left: Status Toggles */}
            <div className="d-flex gap-2">
                <button 
                    className={`btn btn-sm fw-bold px-3 ${statusCategory === 'Accepted' ? 'btn-success text-white' : 'btn-outline-secondary'}`}
                    onClick={() => setStatusCategory('Accepted')}
                >
                    <i className="bi bi-check-circle me-2"></i>Accepted
                </button>
                <button 
                    className={`btn btn-sm fw-bold px-3 ${statusCategory === 'Cancelled' ? 'btn-danger text-white' : 'btn-outline-secondary'}`}
                    onClick={() => setStatusCategory('Cancelled')}
                >
                    <i className="bi bi-x-circle me-2"></i>Cancelled
                </button>
            </div>

            {/* Right: Search Field */}
            <div className="d-flex align-items-center gap-3">
                <div className="input-group input-group-sm" style={{ width: '250px' }}>
                    <span className={`input-group-text ${darkMode ? 'bg-secondary border-secondary text-white' : 'bg-white'}`}>
                        <i className="bi bi-search"></i>
                    </span>
                    <input 
                        type="text" 
                        className={`form-control ${theme.input}`} 
                        placeholder="Search Invoice # or Name..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <small className={theme.subText}>Showing {displayedBills.length} records</small>
            </div>
        </div>

        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead className={theme.tableHeader}>
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
            <tbody className={darkMode ? 'border-secondary' : ''}>
              {loading ? (
                <tr><td colSpan="7" className={`text-center py-5 ${theme.text}`}>Loading data...</td></tr>
              ) : displayedBills.length === 0 ? (
                <tr>
                    <td colSpan="7" className={`text-center py-5 ${theme.subText}`}>
                        {searchQuery ? 'No matching bills found.' : `No ${statusCategory.toLowerCase()} bills found for this period.`}
                    </td>
                </tr>
              ) : (
                displayedBills.map(bill => (
                  <tr key={bill.id} className={theme.text} style={{ opacity: statusCategory === 'Cancelled' ? 0.7 : 1 }}>
                    <td className={`ps-4 small ${theme.subText}`}>
                      {new Date(bill.created_at || bill.sale_date).toLocaleDateString()}
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