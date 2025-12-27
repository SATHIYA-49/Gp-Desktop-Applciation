import React, { useState, useEffect, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const FinancialReports = () => {
  const { darkMode } = useContext(GlobalContext);

  // --- STATE ---
  const [summary, setSummary] = useState({ revenue: 0, profit: 0 });
  const [totalReceivables, setTotalReceivables] = useState(0);
  
  // Data for Charts/Tables
  const [reportBills, setReportBills] = useState([]); // <--- NEW: Stores bills for download
  const [topDebtors, setTopDebtors] = useState([]); 
  const [allDebtors, setAllDebtors] = useState([]); 
  const [paymentStats, setPaymentStats] = useState([]);

  // UI State
  const [filter, setFilter] = useState('monthly'); 
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false); // <--- NEW: For Download Spinner
  const [showReportModal, setShowReportModal] = useState(false); // Debtors Modal

  // --- THEME ---
  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-secondary',
    card: darkMode ? 'bg-dark border border-secondary' : 'bg-white border shadow-sm',
    tableHeader: darkMode ? 'table-dark' : 'table-light',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-white',
    modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    modalHeader: darkMode ? 'border-secondary bg-dark' : 'border-bottom bg-white',
    btnClose: darkMode ? 'btn-close-white' : ''
  };

  const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // --- FETCH DATA ---
  const fetchFinancials = async () => {
    setLoading(true);
    try {
      // 1. Fetch Sales/Profit (Filtered by Date)
      let url = `/billing/report?period=${filter}`;
      if (filter === 'custom' && customRange.start && customRange.end) {
        url += `&start_date=${customRange.start}&end_date=${customRange.end}`;
      }
      
      const res = await apiClient.get(url);
      setSummary(res.data.summary);
      
      // Store bills for download & charts
      const bills = res.data.bills || [];
      setReportBills(bills); 

      // Calculate Payment Modes
      const modes = {};
      bills.forEach(bill => {
          const mode = bill.payment_mode || 'Cash';
          modes[mode] = (modes[mode] || 0) + parseFloat(bill.paid_amount || 0);
      });
      setPaymentStats(Object.keys(modes).map(key => ({ name: key, value: modes[key] })));

      // 2. Fetch Customers (Snapshot)
      const customersRes = await apiClient.get('/customers'); 
      const customers = customersRes.data || [];
      
      const totalBalance = customers.reduce((acc, curr) => acc + (parseFloat(curr.balance) || 0), 0);
      setTotalReceivables(totalBalance);

      // Filter Debtors
      const debtorsList = customers
        .filter(c => parseFloat(c.balance) > 0)
        .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
      
      setAllDebtors(debtorsList); 
      setTopDebtors(debtorsList.slice(0, 5)); 

    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filter !== 'custom') fetchFinancials();
    // eslint-disable-next-line
  }, [filter]);

  // --- DOWNLOAD FUNCTIONS ---

  // 1. Download Sales Report (Date Range)
  const downloadSalesReport = async () => {
    setDownloading(true);
    
    // Simulate a small delay for the loading animation effect
    await new Promise(resolve => setTimeout(resolve, 800));

    const headers = ["Date", "Invoice No", "Customer", "Items Qty", "Payment Mode", "Total Amount", "Profit"];
    const rows = reportBills.map(b => [
        new Date(b.created_at || b.sale_date).toLocaleDateString(),
        b.invoice_no,
        b.users?.name || 'Walk-in',
        b.items?.length || 0,
        b.payment_mode,
        b.total_amount,
        b.calculated_profit
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sales_Report_${filter}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setDownloading(false);
  };

  // 2. Download Debtors Report (Snapshot)
  const downloadDebtorsReport = async () => {
    setDownloading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const headers = ["Customer Name", "Phone Number", "Address", "Pending Balance"];
    const rows = allDebtors.map(c => [
        c.name, 
        c.phone, 
        c.address ? `"${c.address}"` : "-", 
        c.balance
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Debtors_List_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloading(false);
  };

  const totalReceived = (summary.revenue || 0) - totalReceivables;

  return (
    <div 
      className="container-fluid p-4 custom-scrollbar" 
      style={{ 
        height: '100vh', 
        background: theme.container,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
    >
      
      {/* --- LOADING OVERLAY --- */}
      {downloading && (
        <div 
            style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.7)', zIndex: 9999,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                color: '#fff'
            }}
        >
            <div className="spinner-border text-light mb-3" style={{width: '3rem', height: '3rem'}} role="status"></div>
            <h5 className="fw-bold">Generating Report...</h5>
            <small>Please wait while we prepare your file.</small>
        </div>
      )}

      {/* HEADER & FILTERS */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-5 gap-3 animate__animated animate__fadeInDown">
        <div>
          <h3 className={`fw-bold m-0 ${theme.text}`}>Financial Reports</h3>
          <p className={`small m-0 ${theme.subText}`}>Net Profit & Sales Analytics</p>
        </div>

        <div className={`p-1 rounded shadow-sm border d-flex flex-wrap align-items-center ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
          {['daily', 'weekly', 'monthly', 'yearly'].map(f => (
            <button 
              key={f}
              className={`btn btn-sm px-3 fw-bold text-capitalize ${filter === f ? 'btn-primary' : theme.text}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
          
          <div className="border-start mx-2 ps-2 d-flex align-items-center gap-2">
            <button className={`btn btn-sm fw-bold ${filter === 'custom' ? 'text-primary' : theme.text}`} onClick={() => setFilter('custom')}>Custom:</button>
            <input type="date" className={`form-control form-control-sm ${theme.input}`} style={{width: '130px'}} value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} />
            <span className={theme.text}>-</span>
            <input type="date" className={`form-control form-control-sm ${theme.input}`} style={{width: '130px'}} value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} />
            <button className="btn btn-sm btn-primary" onClick={fetchFinancials} disabled={filter !== 'custom'}><i className="bi bi-arrow-right"></i></button>
          </div>

          {/* MAIN DOWNLOAD BUTTON */}
          <div className="border-start ms-2 ps-2">
            <button className="btn btn-sm btn-success fw-bold" onClick={downloadSalesReport} title="Download Sales Report for selected period">
                <i className="bi bi-download me-2"></i>Export
            </button>
          </div>
        </div>
      </div>

      {/* --- METRIC CARDS ROW --- */}
      <div className="row g-4 mb-5 animate__animated animate__fadeInUp">
        <div className="col-md-3">
            <div className={`card h-100 p-4 ${theme.card}`} style={{ borderLeft: '5px solid #3b82f6', borderRadius: '8px' }}>
                <h6 className="text-secondary fw-bold text-uppercase mb-2" style={{fontSize: '0.75rem'}}>Total Sales ({filter})</h6>
                {loading ? <div className="spinner-border spinner-border-sm text-primary"></div> : (
                    <h2 className={`fw-bold mb-0 ${theme.text}`}>{formatINR(summary.revenue)}</h2>
                )}
                <small className="text-primary mt-2 d-block">Gross Revenue</small>
            </div>
        </div>
        <div className="col-md-3">
            <div className={`card h-100 p-4 ${theme.card}`} style={{ borderLeft: '5px solid #10b981', borderRadius: '8px' }}>
                <h6 className="text-secondary fw-bold text-uppercase mb-2" style={{fontSize: '0.75rem'}}>Total Received</h6>
                {loading ? <div className="spinner-border spinner-border-sm text-success"></div> : (
                    <h2 className={`fw-bold mb-0 ${theme.text}`}>{formatINR(totalReceived < 0 ? 0 : totalReceived)}</h2>
                )}
                <small className="text-success mt-2 d-block">Cash Collected</small>
            </div>
        </div>
        <div className="col-md-3">
            <div className={`card h-100 p-4 ${theme.card}`} style={{ borderLeft: '5px solid #f59e0b', borderRadius: '8px' }}>
                <h6 className="text-secondary fw-bold text-uppercase mb-2" style={{fontSize: '0.75rem'}}>Pending (Credits)</h6>
                {loading ? <div className="spinner-border spinner-border-sm text-warning"></div> : (
                    <h2 className={`fw-bold mb-0 ${theme.text}`}>{formatINR(totalReceivables)}</h2>
                )}
                <small className="text-warning mt-2 d-block">Outstanding Balance</small>
            </div>
        </div>
        <div className="col-md-3">
            <div className={`card h-100 p-4 ${theme.card}`} style={{ borderLeft: '5px solid #8b5cf6', borderRadius: '8px' }}>
                <h6 className="text-secondary fw-bold text-uppercase mb-2" style={{fontSize: '0.75rem'}}>Net Profit ({filter})</h6>
                {loading ? <div className="spinner-border spinner-border-sm text-info"></div> : (
                    <h2 className={`fw-bold mb-0 ${theme.text}`}>{formatINR(summary.profit)}</h2>
                )}
                <small className="text-info mt-2 d-block">Pure Margin</small>
            </div>
        </div>
      </div>

      {/* --- BOTTOM SECTION --- */}
      <div className="row g-4 animate__animated animate__fadeInUp" style={{animationDelay: '0.2s'}}>
          
          {/* 1. TOP DEBTORS */}
          <div className="col-md-8">
              <div className={`card h-100 ${theme.card}`}>
                  <div className={`card-header py-3 ${theme.card} border-bottom d-flex justify-content-between align-items-center`}>
                      <h6 className="m-0 fw-bold"><i className="bi bi-person-exclamation me-2 text-warning"></i>Top 5 Pending Payments</h6>
                      <button className="btn btn-sm btn-outline-primary fw-bold" onClick={() => setShowReportModal(true)}>
                        View Full Report
                      </button>
                  </div>
                  <div className="table-responsive">
                      <table className="table mb-0 align-middle">
                          <thead className={theme.tableHeader}>
                              <tr>
                                  <th className="ps-4">Customer Name</th>
                                  <th>Phone</th>
                                  <th className="text-end pe-4">Balance</th>
                              </tr>
                          </thead>
                          <tbody className={darkMode ? 'border-secondary' : ''}>
                              {topDebtors.length === 0 ? (
                                  <tr><td colSpan="3" className={`text-center py-4 ${theme.subText}`}>No pending payments found.</td></tr>
                              ) : (
                                  topDebtors.map(c => (
                                      <tr key={c.id} className={theme.text}>
                                          <td className="ps-4 fw-bold">{c.name}</td>
                                          <td className={theme.subText}>{c.phone}</td>
                                          <td className="text-end pe-4 fw-bold text-danger">{formatINR(c.balance)}</td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          {/* 2. PAYMENT MODE */}
          <div className="col-md-4">
              <div className={`card h-100 ${theme.card} p-4`}>
                  <h6 className="fw-bold mb-3"><i className="bi bi-wallet2 me-2 text-success"></i>Collection by Mode</h6>
                  <div style={{ width: '100%', height: 250 }}>
                    {paymentStats.length > 0 ? (
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={paymentStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {paymentStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '8px' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className={`h-100 d-flex align-items-center justify-content-center ${theme.subText}`}>No sales data for {filter}</div>
                    )}
                  </div>
              </div>
          </div>
      </div>

      {/* =========================================
          FULL REPORT MODAL (DEBTORS)
         ========================================= */}
      {showReportModal && (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
            <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
                <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                    <div className={`modal-content ${theme.modalContent}`}>
                        <div className={`modal-header ${theme.modalHeader}`}>
                            <h5 className="modal-title fw-bold"><i className="bi bi-file-earmark-spreadsheet me-2"></i>Accounts Receivable Report</h5>
                            <button type="button" className={`btn-close ${theme.btnClose}`} onClick={() => setShowReportModal(false)}></button>
                        </div>
                        <div className="modal-body p-4 printable-report">
                            <div className="text-center mb-4 d-none d-print-block">
                                <h2>Golden Power Enterprise</h2>
                                <h5>Accounts Receivable Aging Report</h5>
                                <p className="text-muted">Generated on: {new Date().toLocaleDateString()}</p>
                            </div>

                            <div className="table-responsive border rounded">
                                <table className={`table table-striped mb-0 ${darkMode ? 'table-dark' : ''}`}>
                                    <thead className={theme.tableHeader}>
                                        <tr>
                                            <th className="ps-3">#</th>
                                            <th>Customer Name</th>
                                            <th>Phone Number</th>
                                            <th>Address</th>
                                            <th className="text-end pe-3">Outstanding Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allDebtors.length === 0 ? (
                                            <tr><td colSpan="5" className="text-center py-4">No outstanding accounts.</td></tr>
                                        ) : (
                                            allDebtors.map((c, idx) => (
                                                <tr key={c.id}>
                                                    <td className="ps-3">{idx + 1}</td>
                                                    <td className="fw-bold">{c.name}</td>
                                                    <td>{c.phone}</td>
                                                    <td className="small text-truncate" style={{maxWidth: '150px'}}>{c.address || '-'}</td>
                                                    <td className="text-end pe-3 fw-bold text-danger">{formatINR(c.balance)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    {allDebtors.length > 0 && (
                                        <tfoot className={darkMode ? 'border-secondary' : 'table-light'}>
                                            <tr>
                                                <td colSpan="4" className="text-end fw-bold py-3">Total Receivables:</td>
                                                <td className="text-end pe-3 fw-bold fs-5 text-danger">{formatINR(totalReceivables)}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                        <div className={`modal-footer ${theme.modalHeader}`}>
                            <button className="btn btn-secondary" onClick={() => setShowReportModal(false)}>Close</button>
                            <button className="btn btn-success fw-bold" onClick={downloadDebtorsReport}>
                                <i className="bi bi-file-earmark-excel me-2"></i>Download List
                            </button>
                            <button className="btn btn-primary fw-bold" onClick={() => window.print()}>
                                <i className="bi bi-printer me-2"></i>Print Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* Styles */}
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar { width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(150, 150, 150, 0.3); border-radius: 20px; }
          
          @media print {
            body * { visibility: hidden; }
            .printable-report, .printable-report * { visibility: visible; }
            .printable-report { position: fixed; left: 0; top: 0; width: 100%; color: black !important; background: white !important; }
            .d-none.d-print-block { display: block !important; }
          }
        `}
      </style>

    </div>
  );
};

export default FinancialReports;