import React, { useState, useEffect, useContext, useMemo } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';

const ViewBills = () => {
  const { darkMode } = useContext(GlobalContext);

  // --- STATE ---
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('daily');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  
  const [statusCategory, setStatusCategory] = useState('Accepted'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 
  
  const [selectedBill, setSelectedBill] = useState(null);

  // --- THEME ---
  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-muted',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
    headerBg: darkMode ? 'bg-dark border-secondary' : 'bg-white border-bottom',
    tableHover: darkMode ? 'table-dark' : 'table-hover',
    modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    closeBtn: darkMode ? 'btn-close-white' : ''
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
      setBills(res.data.bills || []);
      setCurrentPage(1); 
    } catch (err) {
      console.error(err);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filter !== 'custom') fetchReport();
    // eslint-disable-next-line
  }, [filter]);

  // --- FILTER & PAGINATION ---
  const displayedBills = useMemo(() => {
    return bills.filter(bill => {
        const status = bill.invoice_status || 'Accepted'; 
        const matchesStatus = status === statusCategory;
        const query = searchQuery.toLowerCase();
        
        // Safe Access for Search
        const custName = (bill.users?.name || bill.customers?.name || '').toLowerCase();
        const custPhone = (bill.users?.phone || bill.customers?.phone || '').toString();
        const invNo = (bill.invoice_no || '').toString();

        return matchesStatus && (
            !searchQuery || 
            invNo.includes(query) || 
            custName.includes(query) || 
            custPhone.includes(query)
        );
    });
  }, [bills, statusCategory, searchQuery]);

  const totalPages = Math.ceil(displayedBills.length / itemsPerPage);
  const currentItems = displayedBills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- SAFE CUSTOMER DATA EXTRACTION ---
  const getCustomerData = (bill) => {
      if (!bill) return { name: 'Unknown', phone: 'N/A', address: 'N/A' };
      // Check 'users' OR 'customers' OR 'customer' object from backend join
      return bill.users || bill.customers || bill.customer || { name: 'Unknown Customer', phone: 'No Phone', address: '-' };
  };

  return (
    <div className="container-fluid p-4" style={{ minHeight: '100vh', background: theme.container }}>
      
      {/* 1. INVOICE DETAILS MODAL */}
      {selectedBill && (
          (() => {
            const cust = getCustomerData(selectedBill); // Get safe data
            return (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
                    <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className={`modal-content rounded-4 ${theme.modalContent}`}>
                                <div className={`modal-header py-3 ${theme.headerBg}`}>
                                    <h5 className="modal-title fw-bold">Invoice #{selectedBill.invoice_no}</h5>
                                    <button type="button" className={`btn-close ${theme.closeBtn}`} onClick={() => setSelectedBill(null)}></button>
                                </div>
                                <div className="modal-body p-4">
                                    {/* Info Grid */}
                                    <div className="row g-4 mb-4">
                                        <div className="col-md-6">
                                            <h6 className={`text-uppercase small fw-bold mb-2 ${theme.subText}`}>Customer Details</h6>
                                            <div className={`p-3 rounded border bg-opacity-10 ${darkMode ? 'bg-secondary border-secondary' : 'bg-light border-light'}`}>
                                                <div className="fw-bold fs-5">{cust.name}</div>
                                                <div className="small mt-1"><i className="bi bi-telephone me-2 opacity-50"></i>{cust.phone || 'N/A'}</div>
                                                <div className="small mt-1 text-truncate"><i className="bi bi-geo-alt me-2 opacity-50"></i>{cust.address || 'No Address'}</div>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <h6 className={`text-uppercase small fw-bold mb-2 ${theme.subText}`}>Invoice Summary</h6>
                                            <div className={`p-3 rounded border bg-opacity-10 h-100 d-flex flex-column justify-content-center ${darkMode ? 'bg-secondary border-secondary' : 'bg-light border-light'}`}>
                                                <div className="d-flex justify-content-between mb-1">
                                                    <span className="small">Date:</span>
                                                    <span className="fw-bold">{new Date(selectedBill.created_at || selectedBill.sale_date).toLocaleDateString()}</span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span className="small">Status:</span>
                                                    <span className={`badge ${selectedBill.invoice_status === 'Cancelled' ? 'bg-danger' : 'bg-success'}`}>
                                                        {selectedBill.invoice_status || 'Valid'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    <div className="table-responsive border rounded mb-4">
                                        <table className={`table mb-0 align-middle ${darkMode ? 'table-dark' : ''}`}>
                                            <thead className={darkMode ? 'bg-secondary' : 'bg-light'}>
                                                <tr>
                                                    <th className="ps-3 py-2">Item</th>
                                                    <th className="text-center py-2">Qty</th>
                                                    <th className="text-end py-2">Price</th>
                                                    <th className="text-end pe-3 py-2">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedBill.items?.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="ps-3">
                                                            <div className="d-flex align-items-center">
                                                                {/* Product Name */}
                                                                <div className="fw-bold small">{item.product_name}</div>
                                                                
                                                                {/* Warranty Image Logic (Thumbnail) */}
                                                                {item.warranty_image && (
                                                                    <div className="ms-2">
                                                                        <a 
                                                                            href={item.warranty_image} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer"
                                                                            title="View Warranty Card"
                                                                        >
                                                                            <img 
                                                                                src={item.warranty_image} 
                                                                                alt="Warranty" 
                                                                                className="rounded border shadow-sm"
                                                                                style={{ 
                                                                                    width: '35px', 
                                                                                    height: '35px', 
                                                                                    objectFit: 'cover',
                                                                                    cursor: 'zoom-in'
                                                                                }} 
                                                                            />
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Warranty Badge Text */}
                                                            {item.warranty_image && (
                                                                <div className="text-success" style={{fontSize: '0.65rem'}}>
                                                                    <i className="bi bi-check-circle-fill me-1"></i>
                                                                    Warranty Attached
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="text-center">{item.quantity}</td>
                                                        <td className="text-end">{formatINR(item.unit_price)}</td>
                                                        <td className="text-end pe-3 fw-bold">{formatINR(item.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totals */}
                                    <div className="d-flex justify-content-end">
                                        <div style={{ minWidth: '200px' }}>
                                            <div className="d-flex justify-content-between mb-1">
                                                <span className={theme.subText}>Subtotal:</span>
                                                <span className="fw-bold">{formatINR(selectedBill.total_amount)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                                                <span className={theme.subText}>Paid:</span>
                                                <span className="text-success fw-bold">{formatINR(selectedBill.paid_amount || selectedBill.total_amount)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="fs-5 fw-bold">Total:</span>
                                                <span className="fs-4 fw-bold text-primary">{formatINR(selectedBill.total_amount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={`modal-footer ${theme.headerBg} py-2`}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedBill(null)}>Close</button>
                                    <button className="btn btn-primary btn-sm"><i className="bi bi-printer me-2"></i>Print Invoice</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            );
         })()
      )}

      {/* 2. HEADER & CONTROLS */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className={`fw-bold m-0 ${theme.text}`}>Invoice History</h3>
          <p className={`small m-0 ${theme.subText}`}>Track all sales and billing records.</p>
        </div>

        {/* Filter Toolbar */}
        <div className={`d-flex align-items-center gap-2 p-1 rounded border ${darkMode ? 'border-secondary' : 'bg-white'}`}>
            <select className={`form-select form-select-sm fw-bold border-0 ${theme.input}`} value={filter} onChange={(e) => setFilter(e.target.value)} style={{width: '110px'}}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
            </select>
            
            {filter === 'custom' && (
                <div className="d-flex gap-1">
                    <input type="date" className={`form-control form-control-sm ${theme.input}`} value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} />
                    <input type="date" className={`form-control form-control-sm ${theme.input}`} value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} />
                    <button className="btn btn-primary btn-sm px-2" onClick={fetchReport}><i className="bi bi-arrow-right"></i></button>
                </div>
            )}
        </div>
      </div>

      {/* 3. MAIN TABLE CARD */}
      <div className={`card overflow-hidden ${theme.card}`}>
        
        {/* Card Header: Search & Tabs */}
        <div className={`card-header border-0 py-3 ${theme.headerBg}`}>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div className="nav nav-pills">
                    <button className={`nav-link py-1 px-3 small fw-bold ${statusCategory === 'Accepted' ? 'active bg-success' : 'text-secondary'}`} onClick={() => {setStatusCategory('Accepted'); setCurrentPage(1);}}>Valid</button>
                    <button className={`nav-link py-1 px-3 small fw-bold ${statusCategory === 'Cancelled' ? 'active bg-danger' : 'text-secondary'}`} onClick={() => {setStatusCategory('Cancelled'); setCurrentPage(1);}}>Cancelled</button>
                </div>
                <div className="position-relative" style={{width: '250px'}}>
                    <i className={`bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 ${theme.subText}`}></i>
                    <input 
                        type="text" className={`form-control form-control-sm rounded-pill ps-5 ${theme.input}`} 
                        placeholder="Search Invoice, Name..." 
                        value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                </div>
            </div>
        </div>

        {/* Table Content */}
        <div className="table-responsive" style={{ minHeight: '300px' }}>
            <table className={`table mb-0 align-middle ${theme.tableHover}`}>
                <thead className={darkMode ? 'table-dark' : 'bg-light'}>
                    <tr>
                        <th className="ps-4 py-3 text-secondary small text-uppercase">Date</th>
                        <th className="py-3 text-secondary small text-uppercase">Inv #</th>
                        <th className="py-3 text-secondary small text-uppercase">Customer</th>
                        <th className="py-3 text-secondary small text-uppercase text-center">Items</th>
                        <th className="py-3 text-secondary small text-uppercase text-end">Total</th>
                        <th className="pe-4 py-3 text-secondary small text-uppercase text-end">Status</th>
                    </tr>
                </thead>
                <tbody className={darkMode ? 'border-secondary' : 'border-light'}>
                    {loading ? (
                        <tr><td colSpan="6" className="text-center py-5 text-muted">Loading records...</td></tr>
                    ) : currentItems.length === 0 ? (
                        <tr><td colSpan="6" className="text-center py-5 text-muted">No records found.</td></tr>
                    ) : (
                        currentItems.map(bill => {
                            const cust = getCustomerData(bill); // Use safe getter
                            return (
                                <tr key={bill.id} onClick={() => setSelectedBill(bill)} style={{cursor: 'pointer'}}>
                                    <td className={`ps-4 small fw-bold ${theme.text}`}>{new Date(bill.created_at || bill.sale_date).toLocaleDateString()}</td>
                                    <td><span className="font-monospace small bg-secondary bg-opacity-10 px-2 py-1 rounded">#{bill.invoice_no}</span></td>
                                    <td>
                                        <div className="fw-bold small">{cust.name}</div>
                                        <div className={`small ${theme.subText}`} style={{fontSize:'0.7rem'}}>{cust.phone}</div>
                                    </td>
                                    <td className="text-center"><span className="badge bg-secondary bg-opacity-25 text-body border border-secondary border-opacity-25">{bill.items?.length || 0}</span></td>
                                    <td className="text-end fw-bold">{formatINR(bill.total_amount)}</td>
                                    <td className="text-end pe-4">
                                        <span className={`badge ${bill.invoice_status === 'Cancelled' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'} border border-opacity-25`}>
                                            {bill.invoice_status || 'Valid'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
            <div className={`card-footer py-3 d-flex justify-content-between align-items-center ${theme.headerBg}`}>
                <div className={`small ${theme.subText}`}>Page {currentPage} of {totalPages}</div>
                <div className="btn-group btn-group-sm">
                    <button className="btn btn-outline-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
                    <button className="btn btn-outline-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ViewBills;