import React, { useState, useEffect, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';

const ViewBills = () => {
  const { darkMode } = useContext(GlobalContext);

  // --- STATE ---
  const [bills, setBills] = useState([]);
  const [filter, setFilter] = useState('daily'); // daily, weekly, monthly, custom
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [statusCategory, setStatusCategory] = useState('Accepted'); // 'Accepted' or 'Cancelled'
  
  // --- SEARCH & PAGINATION STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); 
  
  // --- MODAL STATE ---
  const [selectedBill, setSelectedBill] = useState(null);

  // --- THEME ---
  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-secondary',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
    tableHeader: darkMode ? 'table-dark' : 'table-light',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-white',
    modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    modalHeader: darkMode ? 'border-secondary bg-dark' : 'border-bottom bg-white',
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
      setBills(res.data.bills);
      // We don't need summary anymore for UI, but API might still return it
      setCurrentPage(1); 
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

    // 2. Search Check (Invoice #, Customer Name, Phone)
    const query = searchQuery.toLowerCase();
    const invoiceMatch = bill.invoice_no?.toString().includes(query);
    const customerMatch = bill.users?.name?.toLowerCase().includes(query);
    const phoneMatch = bill.users?.phone?.toString().includes(query);
    
    const matchesSearch = !searchQuery || invoiceMatch || customerMatch || phoneMatch;

    return matchesStatus && matchesSearch;
  });

  // --- PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = displayedBills.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(displayedBills.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="container-fluid p-4" style={{ minHeight: '100vh', background: theme.container }}>
      
      {/* 1. BILL DETAILS MODAL */}
      {selectedBill && (
         <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050, backdropFilter: 'blur(2px)' }}></div>
            <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className={`modal-content rounded-4 ${theme.modalContent}`}>
                        <div className={`modal-header py-3 ${theme.modalHeader}`}>
                            <div>
                                <h5 className="modal-title fw-bold">Invoice Details</h5>
                                <span className="badge bg-primary">#{selectedBill.invoice_no}</span>
                            </div>
                            <button type="button" className={`btn-close ${theme.closeBtn}`} onClick={() => setSelectedBill(null)}></button>
                        </div>
                        <div className="modal-body p-4">
                            {/* Header Info */}
                            <div className="row mb-4">
                                <div className="col-6">
                                    <h6 className={`fw-bold small text-uppercase ${theme.subText}`}>Customer Info</h6>
                                    <div className="fw-bold fs-5">{selectedBill.users?.name}</div>
                                    <div className="small"><i className="bi bi-telephone me-1"></i> {selectedBill.users?.phone}</div>
                                    <div className="small text-truncate" style={{maxWidth: '250px'}}>{selectedBill.users?.address || 'No Address'}</div>
                                </div>
                                <div className="col-6 text-end">
                                    <h6 className={`fw-bold small text-uppercase ${theme.subText}`}>Bill Info</h6>
                                    <div className="small">Date: <strong>{new Date(selectedBill.created_at || selectedBill.sale_date).toLocaleDateString()}</strong></div>
                                    <div className="small mt-1">
                                        Status: {selectedBill.invoice_status === 'Cancelled' ? <span className="text-danger fw-bold">Cancelled</span> : <span className="text-success fw-bold">Valid</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="table-responsive border rounded mb-3">
                                <table className={`table mb-0 ${darkMode ? 'table-dark' : ''}`}>
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="ps-3">Item</th>
                                            <th className="text-center">Qty</th>
                                            <th className="text-end">Price</th>
                                            <th className="text-end pe-3">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedBill.items?.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="ps-3">
                                                    <div className="fw-bold">{item.product_name}</div>
                                                    {item.warranty_image && <span className="badge bg-info text-dark" style={{fontSize: '0.6rem'}}>Warranty Included</span>}
                                                </td>
                                                <td className="text-center">{item.quantity}</td>
                                                <td className="text-end">{formatINR(item.unit_price)}</td>
                                                <td className="text-end pe-3 fw-bold">{formatINR(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Financial Summary */}
                            <div className="d-flex justify-content-end">
                                <div style={{width: '250px'}}>
                                    <div className="d-flex justify-content-between mb-1">
                                        <span className={theme.subText}>Subtotal:</span>
                                        <span className="fw-bold">{formatINR(selectedBill.total_amount)}</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-1">
                                        <span className={theme.subText}>Paid:</span>
                                        <span className="text-success fw-bold">{formatINR(selectedBill.paid_amount || selectedBill.total_amount)}</span>
                                    </div>
                                    <div className="border-top pt-2 mt-2 d-flex justify-content-between">
                                        <span className="fw-bold fs-5">Total:</span>
                                        <span className="fw-bold fs-5 text-primary">{formatINR(selectedBill.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`modal-footer ${theme.modalHeader}`}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedBill(null)}>Close</button>
                            <button className="btn btn-primary btn-sm"><i className="bi bi-printer me-1"></i> Print</button>
                        </div>
                    </div>
                </div>
            </div>
         </>
      )}

      {/* HEADER & FILTER */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className={`fw-bold m-0 ${theme.text}`}>Invoice History</h3>
          <p className={`small m-0 ${theme.subText}`}>Manage and track all generated bills.</p>
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

      {/* REMOVED STAT CARDS SECTION HERE */}

      {/* TABLE LIST */}
      <div className={`card ${theme.card}`}>
        <div className={`card-header py-2 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2 ${theme.card}`}>
            
            {/* Left: Status Toggles */}
            <div className="d-flex gap-2">
                <button 
                    className={`btn btn-sm fw-bold px-3 ${statusCategory === 'Accepted' ? 'btn-success text-white' : 'btn-outline-secondary'}`}
                    onClick={() => { setStatusCategory('Accepted'); setCurrentPage(1); }}
                >
                    <i className="bi bi-check-circle me-2"></i>Accepted
                </button>
                <button 
                    className={`btn btn-sm fw-bold px-3 ${statusCategory === 'Cancelled' ? 'btn-danger text-white' : 'btn-outline-secondary'}`}
                    onClick={() => { setStatusCategory('Cancelled'); setCurrentPage(1); }}
                >
                    <i className="bi bi-x-circle me-2"></i>Cancelled
                </button>
            </div>

            {/* Right: Search Field */}
            <div className="d-flex align-items-center gap-3">
                <div className="input-group input-group-sm" style={{ width: '300px' }}>
                    <span className={`input-group-text ${darkMode ? 'bg-secondary border-secondary text-white' : 'bg-white'}`}>
                        <i className="bi bi-search"></i>
                    </span>
                    <input 
                        type="text" 
                        className={`form-control ${theme.input}`} 
                        placeholder="Search Bill #, Name or Phone..." 
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <small className={theme.subText}>{displayedBills.length} records found</small>
            </div>
        </div>

        <div className="table-responsive">
          <table className="table mb-0 align-middle table-hover">
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
              ) : currentItems.length === 0 ? (
                <tr>
                    <td colSpan="7" className={`text-center py-5 ${theme.subText}`}>
                        {searchQuery ? 'No matching bills found.' : `No ${statusCategory.toLowerCase()} bills found for this period.`}
                    </td>
                </tr>
              ) : (
                currentItems.map(bill => (
                  <tr 
                    key={bill.id} 
                    className={theme.text} 
                    style={{ opacity: statusCategory === 'Cancelled' ? 0.7 : 1, cursor: 'pointer' }}
                    onClick={() => setSelectedBill(bill)}
                  >
                    <td className={`ps-4 small ${theme.subText}`}>
                      {new Date(bill.created_at || bill.sale_date).toLocaleDateString()}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border font-monospace">#{bill.invoice_no}</span>
                    </td>
                    <td>
                        <div className="fw-bold">{bill.users?.name}</div>
                        <small className={theme.subText}>{bill.users?.phone}</small>
                    </td>
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

        {/* PAGINATION CONTROLS */}
        {displayedBills.length > itemsPerPage && (
            <div className={`card-footer border-top-0 py-3 d-flex justify-content-end align-items-center gap-2 ${theme.card}`}>
                <span className={`small me-3 ${theme.subText}`}>Page {currentPage} of {totalPages}</span>
                <button 
                    className="btn btn-sm btn-outline-secondary" 
                    onClick={() => paginate(currentPage - 1)} 
                    disabled={currentPage === 1}
                >
                    Previous
                </button>
                <button 
                    className="btn btn-sm btn-outline-secondary" 
                    onClick={() => paginate(currentPage + 1)} 
                    disabled={currentPage === totalPages}
                >
                    Next
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ViewBills;