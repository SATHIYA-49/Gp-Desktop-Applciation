import React, { useState, useEffect, useContext, useCallback } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';

// --- DEBOUNCE HOOK ---
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const ViewBills = () => {
  const { darkMode } = useContext(GlobalContext);

  // --- STATE ---
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' or 'today'
  const [statusCategory, setStatusCategory] = useState('Accepted'); 
  
  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1); // eslint-disable-line no-unused-vars
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500); // 500ms delay
  
  const [selectedBill, setSelectedBill] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

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

  // --- 1. FETCH LIST (Paginated) ---
  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      // 🔥 Server-side Pagination & Search Params
      // We now send 'status' to the server so pagination works correctly across tabs
      const params = {
        page: currentPage,
        limit: 10, 
        filter: filter, 
        status: statusCategory, // <--- 🔥 FIX: Send status to server
        search: debouncedSearch
      };

      const res = await apiClient.get('/billing/history', { params });
      
      const list = res.data.data || [];
      setBills(list);
      
      // Calculate simplified total pages logic
      setTotalPages(list.length === 10 ? currentPage + 1 : currentPage);

    } catch (err) {
      console.error("Fetch Error:", err);
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter, debouncedSearch, statusCategory]); // <--- 🔥 FIX: Added statusCategory dependency

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // --- 2. FETCH SINGLE BILL DETAILS ---
  const openBillDetails = async (bill) => {
      setDetailsLoading(true);
      try {
          const res = await apiClient.get(`/billing/${bill.id}`); 
          setSelectedBill(res.data);
      } catch (err) {
          setSelectedBill(bill); 
      } finally {
          setDetailsLoading(false);
      }
  };

  // --- SAFE DATA ---
  const getCustomerData = (bill) => {
      if (!bill) return { name: 'Unknown', phone: 'N/A' };
      return bill.users || { name: 'Unknown', phone: 'N/A' };
  };

  return (
    <div className="container-fluid p-4" style={{ minHeight: '100vh', background: theme.container }}>
      
      {/* 1. DETAIL MODAL */}
      {selectedBill && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className={`modal-content ${theme.modalContent}`}>
                    <div className={`modal-header ${theme.headerBg}`}>
                        <h5 className="modal-title">Invoice #{selectedBill.invoice_no}</h5>
                        <button className={`btn-close ${theme.closeBtn}`} onClick={() => setSelectedBill(null)}></button>
                    </div>
                    <div className="modal-body p-4">
                        {detailsLoading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
                            <>
                                <div className="row mb-4">
                                    <div className="col-6">
                                        <h6 className="text-muted small text-uppercase">Customer</h6>
                                        <div className="fw-bold fs-5">{getCustomerData(selectedBill).name}</div>
                                        <div className="small opacity-75">{getCustomerData(selectedBill).phone}</div>
                                    </div>
                                    <div className="col-6 text-end">
                                        <h6 className="text-muted small text-uppercase">Total Amount</h6>
                                        <div className="fw-bold fs-4 text-primary">{formatINR(selectedBill.total_amount)}</div>
                                        <span className={`badge ${selectedBill.invoice_status === 'Cancelled' ? 'bg-danger' : 'bg-success'}`}>
                                            {selectedBill.invoice_status || 'Paid'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="table-responsive border rounded">
                                    <table className={`table mb-0 ${theme.tableHover}`}>
                                        <thead className={darkMode ? 'table-dark' : 'table-light'}>
                                            <tr><th className="ps-3">Item</th><th className="text-center">Qty</th><th className="text-end pe-3">Price</th></tr>
                                        </thead>
                                        <tbody>
                                            {(selectedBill.items || []).map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="ps-3">{item.product_name}</td>
                                                    <td className="text-center">{item.quantity}</td>
                                                    <td className="text-end pe-3">{formatINR(item.total || item.final_price)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                    <div className={`modal-footer ${theme.headerBg}`}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedBill(null)}>Close</button>
                        <button className="btn btn-primary btn-sm"><i className="bi bi-printer me-2"></i>Print</button>
                    </div>
                </div>
            </div>
          </div>
      )}

      {/* 2. HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className={`fw-bold m-0 ${theme.text}`}>Invoice History</h3>
          <p className={`small m-0 ${theme.subText}`}>Server-side paginated records.</p>
        </div>
        <div className="d-flex gap-2">
            <select className={`form-select form-select-sm fw-bold ${theme.input}`} value={filter} onChange={(e) => {setFilter(e.target.value); setCurrentPage(1);}} style={{width: '120px'}}>
                <option value="all">All Time</option>
                <option value="today">Today Only</option>
            </select>
        </div>
      </div>

      {/* 3. TABLE CARD */}
      <div className={`card overflow-hidden ${theme.card}`}>
        <div className={`card-header border-0 py-3 ${theme.headerBg}`}>
            <div className="d-flex justify-content-between align-items-center">
                {/* Status Tabs */}
                <div className="btn-group">
                    {/* 🔥 FIX: Reset Page to 1 when switching tabs */}
                    <button 
                        className={`btn btn-sm ${statusCategory === 'Accepted' ? 'btn-primary' : 'btn-outline-secondary'}`} 
                        onClick={() => { setStatusCategory('Accepted'); setCurrentPage(1); }}
                    >
                        Valid
                    </button>
                    <button 
                        className={`btn btn-sm ${statusCategory === 'Cancelled' ? 'btn-danger' : 'btn-outline-secondary'}`} 
                        onClick={() => { setStatusCategory('Cancelled'); setCurrentPage(1); }}
                    >
                        Cancelled
                    </button>
                </div>
                {/* Search */}
                <input 
                    type="text" 
                    className={`form-control form-control-sm rounded-pill ps-3 ${theme.input}`} 
                    style={{width: '250px'}}
                    placeholder="Search Invoice #..." 
                    value={searchQuery} 
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
            </div>
        </div>

        <div className="table-responsive" style={{ minHeight: '300px' }}>
            <table className={`table mb-0 align-middle ${theme.tableHover}`}>
                <thead className={darkMode ? 'table-dark' : 'bg-light'}>
                    <tr>
                        <th className="ps-4 py-3">Date</th>
                        <th>Inv #</th>
                        <th>Customer</th>
                        <th className="text-end">Total</th>
                        <th className="text-end pe-4">Status</th>
                    </tr>
                </thead>
                <tbody className={darkMode ? 'border-secondary' : ''}>
                    {loading ? ( 
                        <tr><td colSpan="5" className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></td></tr> 
                    ) : 
                    bills.length === 0 ? ( 
                        <tr><td colSpan="5" className="text-center py-5 text-muted">No records found.</td></tr> 
                    ) : 
                    (
                        // 🔥 FIX: Removed .filter() here. We rely on the server data directly.
                        bills.map(bill => (
                            <tr key={bill.id} onClick={() => openBillDetails(bill)} style={{cursor: 'pointer'}}>
                                {/* 🔥 FIX: Updated date format for consistency */}
                                <td className={`ps-4 fw-bold small ${theme.text}`}>{new Date(bill.sale_date).toLocaleDateString('en-IN')}</td>
                                <td><span className="badge bg-secondary bg-opacity-25 text-body border border-secondary border-opacity-25">#{bill.invoice_no}</span></td>
                                <td>
                                    <div className="fw-bold small">{getCustomerData(bill).name}</div>
                                    <div className="small opacity-50" style={{fontSize:'0.7rem'}}>{getCustomerData(bill).phone}</div>
                                </td>
                                <td className="text-end fw-bold">{formatINR(bill.total_amount)}</td>
                                <td className="text-end pe-4">
                                    <span className={`badge ${bill.invoice_status === 'Cancelled' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}`}>
                                        {bill.invoice_status || 'Valid'}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* PAGINATION */}
        <div className={`card-footer py-3 d-flex justify-content-between align-items-center ${theme.headerBg}`}>
            <small className={theme.subText}>Page {currentPage}</small>
            <div className="btn-group btn-group-sm">
                <button className="btn btn-outline-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
                <button className="btn btn-outline-secondary" disabled={bills.length < 10} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBills;