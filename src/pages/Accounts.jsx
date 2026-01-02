import React, { useContext, useState, useMemo } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import PaymentModal from '../components/PaymentModal'; // Import the new modal

const Accounts = () => {
  const { debtors, billingHistory, loadDebtors, loadReports, loadBilling } = useContext(GlobalContext);
  
  // --- STATE ---
  const [selectedCustomer, setSelectedCustomer] = useState(null); 
  const [selectedBill, setSelectedBill] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // --- HELPER ---
  const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  // --- DATA PROCESSING ---
  const customers = useMemo(() => {
    const map = {};
    const process = (bill, isPaid) => {
      const id = bill.customer_id;
      if (!bill.users) return; 

      if (!map[id]) map[id] = { ...bill.users, id, open: 0, closed: 0, due: 0, bills: [] };
      
      if (!isPaid) { map[id].open++; map[id].due += bill.balance; }
      else { map[id].closed++; }
      
      map[id].bills.push({ ...bill, status: isPaid ? 'Closed' : 'Open' });
    };

    debtors.forEach(b => process(b, false));
    billingHistory.filter(b => b.payment_status === 'Paid').forEach(b => process(b, true));
    
    return Object.values(map);
  }, [debtors, billingHistory]);

  // Filtering & Pagination Logic
  const filtered = customers.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const stats = {
    open: filtered.filter(c => c.open > 0).length,
    closed: filtered.filter(c => c.open === 0 && c.closed > 0).length
  };

  // --- HANDLERS ---
  const handlePaymentConfirm = async (billId, amount) => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/billing/pay-due', { sale_id: billId, amount_paying: amount });
      
      // Refresh Data
      loadDebtors(); loadBilling(); loadReports();
      
      // Update Local View (Optimistic UI)
      setSelectedCustomer(prev => ({ ...prev, due: prev.due - amount }));
      
      // Close Modal
      setSelectedBill(null);
    } catch (err) { 
        alert("Error: " + (err.response?.data?.detail || "Payment failed")); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

  return (
    <div className="container-fluid p-4" style={{ maxWidth: '1600px' }}>
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
            <h3 className="fw-bold m-0 text-dark">Accounts Receivable</h3>
            <p className="text-secondary small m-0">Manage customer ledgers and outstanding dues.</p>
        </div>
        {selectedCustomer && (
            <button className="btn btn-light border fw-bold shadow-sm px-3 rounded-pill" onClick={() => setSelectedCustomer(null)}>
                <i className="bi bi-arrow-left me-2"></i>Back to List
            </button>
        )}
      </div>

      {/* VIEW 1: SUMMARY DASHBOARD */}
      {!selectedCustomer && (
        <>
            <div className="row g-4 mb-4">
                {[
                    { label: 'Customers with Dues', val: stats.open, color: 'danger', icon: 'exclamation-circle' },
                    { label: 'Settled Accounts', val: stats.closed, color: 'success', icon: 'check-circle' }
                ].map((s, i) => (
                    <div key={i} className="col-md-6">
                        <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                            <div className={`card-body p-4 d-flex justify-content-between border-start border-${s.color} border-5`}>
                                <div><h6 className="text-uppercase small text-secondary fw-bold">{s.label}</h6><h2 className="m-0 fw-bold">{s.val}</h2></div>
                                <div className={`bg-${s.color}-subtle p-3 rounded-circle text-${s.color}`}><i className={`bi bi-${s.icon} fs-4`}></i></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="card-header bg-white py-3 border-0">
                    <div className="position-relative" style={{maxWidth:'350px'}}>
                        <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                        {/* 🔥 ROUNDED SEARCH BAR */}
                        <input 
                            className="form-control bg-light ps-5 rounded-pill border-0 py-2" 
                            placeholder="Search customer by name..." 
                            value={searchTerm} 
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                        />
                    </div>
                </div>
                
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light text-secondary small text-uppercase">
                            <tr>
                                <th className="ps-4 py-3">Customer</th>
                                <th className="text-center py-3">Open Bills</th>
                                <th className="text-center py-3">Closed</th>
                                <th className="text-end pe-4 py-3">Total Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-5 text-muted">No accounts found.</td></tr> 
                            ) : (
                                currentItems.map(c => (
                                <tr key={c.id} style={{cursor: 'pointer'}} onClick={() => setSelectedCustomer(c)}>
                                    <td className="ps-4 fw-bold py-3">
                                        <div className="d-flex align-items-center">
                                            <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold me-3" style={{width:40, height:40}}>
                                                {c.name.charAt(0)}
                                            </div>
                                            <div>
                                                {c.name}
                                                <div className="small text-muted fw-normal">{c.phone}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-center">{c.open > 0 ? <span className="badge bg-danger-subtle text-danger px-3 py-2 rounded-pill">{c.open} Pending</span> : '-'}</td>
                                    <td className="text-center"><span className="badge bg-light text-secondary border px-3 py-2 rounded-pill">{c.closed} Paid</span></td>
                                    <td className={`text-end pe-4 fw-bold ${c.due > 0 ? 'text-danger' : 'text-success'}`}>{c.due > 0 ? fmt(c.due) : 'Settled'}</td>
                                </tr>
                            )))}
                        </tbody>
                    </table>
                </div>

                {/* 🔥 PAGINATION FOOTER */}
                {totalPages > 1 && (
                    <div className="card-footer bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                        <small className="text-muted">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filtered.length)} of {filtered.length}</small>
                        <nav>
                            <ul className="pagination pagination-sm mb-0">
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link border-0 rounded-circle me-1" onClick={() => setCurrentPage(prev => prev - 1)}><i className="bi bi-chevron-left"></i></button>
                                </li>
                                <li className="page-item active">
                                    <span className="page-link border-0 rounded-pill px-3 bg-primary">{currentPage}</span>
                                </li>
                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link border-0 rounded-circle ms-1" onClick={() => setCurrentPage(prev => prev + 1)}><i className="bi bi-chevron-right"></i></button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>
        </>
      )}

      {/* VIEW 2: DETAILS */}
      {selectedCustomer && (
        <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
            <div className="card-header bg-white p-4 d-flex flex-wrap gap-3 justify-content-between align-items-center border-bottom">
                <div className="d-flex align-items-center gap-3">
                    <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold display-6" style={{width:64, height:64}}>{selectedCustomer.name[0]}</div>
                    <div><h4 className="fw-bold m-0">{selectedCustomer.name}</h4><small className="text-secondary"><i className="bi bi-telephone me-1"></i>{selectedCustomer.phone}</small></div>
                </div>
                <div className="text-end bg-light p-3 rounded-4">
                    <small className="text-uppercase fw-bold text-secondary d-block mb-1">Total Outstanding</small>
                    <div className={`fs-3 fw-bold ${selectedCustomer.due > 0 ? 'text-danger':'text-success'}`}>{fmt(selectedCustomer.due)}</div>
                </div>
            </div>
            
            <div className="table-responsive">
                <table className="table align-middle mb-0">
                    <thead className="bg-light text-secondary small text-uppercase">
                        <tr><th className="ps-4 py-3">Date</th><th>Invoice #</th><th>Total Bill</th><th>Paid</th><th>Balance</th><th>Status</th><th className="text-end pe-4">Action</th></tr>
                    </thead>
                    <tbody>
                        {selectedCustomer.bills.sort((a,b) => new Date(b.sale_date) - new Date(a.sale_date)).map(b => (
                            <tr key={b.id} className={b.status === 'Closed' ? 'bg-light bg-opacity-50' : ''}>
                                <td className="ps-4 text-secondary">{new Date(b.sale_date).toLocaleDateString()}</td>
                                <td className="font-monospace fw-bold small bg-white border px-2 py-1 rounded d-inline-block mt-1">#{b.invoice_no}</td>
                                <td className="fw-bold">{fmt(b.total_amount)}</td>
                                <td className="text-success">{fmt(b.paid_amount)}</td>
                                <td className="text-danger fw-bold">{fmt(b.balance)}</td>
                                <td>
                                    <span className={`badge rounded-pill px-3 py-2 bg-${b.status === 'Open' ? 'danger' : 'success'}-subtle text-${b.status === 'Open' ? 'danger' : 'success'} border border-${b.status === 'Open' ? 'danger' : 'success'}-subtle`}>
                                        {b.status === 'Open' ? 'Unpaid' : 'Settled'}
                                    </span>
                                </td>
                                <td className="text-end pe-4">
                                    {b.status === 'Open' ? (
                                        <button className="btn btn-sm btn-dark fw-bold px-3 rounded-pill shadow-sm" onClick={() => setSelectedBill(b)}>Collect Payment</button>
                                    ) : (
                                        <span className="text-muted small"><i className="bi bi-check-all me-1"></i>Closed</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* REUSABLE PAYMENT MODAL COMPONENT */}
      {selectedBill && (
        <PaymentModal 
            bill={selectedBill} 
            onClose={() => setSelectedBill(null)} 
            onConfirm={handlePaymentConfirm} 
            isSubmitting={isSubmitting} 
        />
      )}

    </div>
  );
};

export default Accounts;