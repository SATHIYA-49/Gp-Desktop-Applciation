import React, { useContext, useState, useMemo } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';

const Accounts = () => {
  const { debtors, billingHistory, loadDebtors, loadReports, loadBilling } = useContext(GlobalContext);
  
  // --- STATE ---
  const [view, setView] = useState('summary'); // 'summary' or 'details'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- HELPER ---
  const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  // --- DATA PROCESSING ---
  const customerSummary = useMemo(() => {
    const summary = {};

    // 1. Process Open Bills
    debtors.forEach(bill => {
      const cid = bill.customer_id;
      if (!summary[cid]) {
        summary[cid] = { 
          id: cid, 
          name: bill.users?.name || 'Unknown', 
          phone: bill.users?.phone, 
          openCount: 0, closedCount: 0, totalDue: 0, bills: [] 
        };
      }
      summary[cid].openCount += 1;
      summary[cid].totalDue += bill.balance;
      summary[cid].bills.push({ ...bill, status: 'Open' });
    });

    // 2. Process Closed Bills
    billingHistory.forEach(bill => {
      if (bill.payment_status === 'Paid') {
        const cid = bill.customer_id;
        if (!summary[cid]) {
            summary[cid] = { 
                id: cid, 
                name: bill.users?.name || 'Unknown', 
                phone: bill.users?.phone, 
                openCount: 0, closedCount: 0, totalDue: 0, bills: [] 
            };
        }
        summary[cid].closedCount += 1;
        summary[cid].bills.push({ ...bill, status: 'Closed' });
      }
    });

    return Object.values(summary);
  }, [debtors, billingHistory]);

  const filteredCustomers = customerSummary.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOpenAccounts = filteredCustomers.filter(c => c.openCount > 0).length;
  const totalClosedAccounts = filteredCustomers.filter(c => c.openCount === 0 && c.closedCount > 0).length;

  // --- HANDLERS ---
  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    setView('details');
  };

  const handleBackToSummary = () => {
    setSelectedCustomer(null);
    setView('summary');
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if(!payAmount) return;
    setIsSubmitting(true);
    try {
      await apiClient.post('/billing/pay-due', { sale_id: selectedBill.id, amount_paying: parseFloat(payAmount) });
      loadDebtors(); loadBilling(); loadReports(); 
      setSelectedBill(null); setPayAmount('');
    } catch (err) { 
      alert("Failed: " + (err.response?.data?.detail || "Error")); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="container-fluid p-4" style={{ maxWidth: '1600px' }}>
      
      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
            <h3 className="fw-bold text-dark m-0">Accounts Receivable</h3>
            <p className="text-secondary small m-0 mt-1">Manage customer ledgers and outstanding dues.</p>
        </div>
        
        {view === 'details' && (
            <button className="btn btn-light border shadow-sm fw-bold px-3" onClick={handleBackToSummary}>
                <i className="bi bi-arrow-left me-2"></i>Back to List
            </button>
        )}
      </div>

      {/* VIEW 1: SUMMARY DASHBOARD */}
      {view === 'summary' && (
        <>
            {/* SUMMARY CARDS */}
            <div className="row g-4 mb-4">
                <div className="col-md-6">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body p-4 d-flex align-items-center justify-content-between border-start border-danger border-5 rounded-end">
                            <div>
                                <h6 className="text-secondary text-uppercase small fw-bold mb-1">Customers with Dues</h6>
                                <h2 className="m-0 fw-bold text-dark">{totalOpenAccounts}</h2>
                            </div>
                            <div className="bg-danger-subtle p-3 rounded-circle text-danger">
                                <i className="bi bi-exclamation-circle fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body p-4 d-flex align-items-center justify-content-between border-start border-success border-5 rounded-end">
                            <div>
                                <h6 className="text-secondary text-uppercase small fw-bold mb-1">Fully Settled Accounts</h6>
                                <h2 className="m-0 fw-bold text-dark">{totalClosedAccounts}</h2>
                            </div>
                            <div className="bg-success-subtle p-3 rounded-circle text-success">
                                <i className="bi bi-check-circle fs-4"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN LIST CARD */}
            <div className="card border-0 shadow-sm">
                {/* Search Header */}
                <div className="card-header bg-white py-3 border-bottom-0">
                    <div className="row">
                        <div className="col-md-4">
                            <div className="input-group">
                                <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-secondary"></i></span>
                                <input 
                                    className="form-control bg-light border-start-0 ps-0" 
                                    placeholder="Search customer name..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="ps-4 py-3 text-secondary small text-uppercase fw-bold">Customer Name</th>
                                <th className="py-3 text-secondary small text-uppercase fw-bold text-center">Open Bills</th>
                                <th className="py-3 text-secondary small text-uppercase fw-bold text-center">Closed Bills</th>
                                <th className="pe-4 py-3 text-secondary small text-uppercase fw-bold text-end">Total Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-5 text-muted">No accounts found.</td></tr>
                            ) : (
                                filteredCustomers.map(c => (
                                    <tr key={c.id} style={{cursor: 'pointer'}} onClick={() => handleCustomerClick(c)}>
                                        <td className="ps-4 py-3">
                                            <div className="fw-bold text-dark">{c.name}</div>
                                            <small className="text-muted">{c.phone || 'No Phone'}</small>
                                        </td>
                                        <td className="text-center py-3">
                                            {c.openCount > 0 
                                                ? <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-3 py-2">{c.openCount} Pending</span> 
                                                : <span className="text-muted small">-</span>}
                                        </td>
                                        <td className="text-center py-3">
                                            <span className="badge bg-light text-secondary border px-3 py-2">{c.closedCount} Paid</span>
                                        </td>
                                        <td className="text-end pe-4 py-3">
                                            {c.totalDue > 0 
                                                ? <span className="fs-6 fw-bold text-danger">{formatINR(c.totalDue)}</span> 
                                                : <span className="fs-6 fw-bold text-success"><i className="bi bi-check2-all me-1"></i>Settled</span>
                                            }
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
      )}

      {/* VIEW 2: CUSTOMER LEDGER DETAILS */}
      {view === 'details' && selectedCustomer && (
        <div className="card shadow-sm border-0">
            {/* Ledger Header */}
            <div className="card-header bg-white p-4 border-bottom">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold fs-4" style={{width: '56px', height: '56px'}}>
                            {selectedCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 className="fw-bold m-0 text-dark">{selectedCustomer.name}</h4>
                            <div className="text-secondary small"><i className="bi bi-telephone me-1"></i> {selectedCustomer.phone}</div>
                        </div>
                    </div>
                    <div className="text-md-end bg-light p-3 rounded border">
                        <small className="d-block text-secondary fw-bold text-uppercase" style={{fontSize: '0.7rem'}}>Total Outstanding</small>
                        <span className={`fs-3 fw-bold ${selectedCustomer.totalDue > 0 ? 'text-danger' : 'text-success'}`}>
                            {formatINR(selectedCustomer.totalDue)}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="table-responsive">
                <table className="table align-middle mb-0">
                    <thead className="bg-light">
                        <tr>
                            <th className="ps-4 py-3 text-secondary small text-uppercase">Date</th>
                            <th className="py-3 text-secondary small text-uppercase">Invoice #</th>
                            <th className="py-3 text-secondary small text-uppercase">Bill Amount</th>
                            <th className="py-3 text-secondary small text-uppercase">Paid</th>
                            <th className="py-3 text-secondary small text-uppercase">Balance</th>
                            <th className="py-3 text-secondary small text-uppercase">Status</th>
                            <th className="text-end pe-4 py-3 text-secondary small text-uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedCustomer.bills.sort((a,b) => new Date(b.sale_date) - new Date(a.sale_date)).map(bill => (
                            <tr key={bill.id} className={bill.status === 'Closed' ? 'bg-light bg-opacity-50' : ''}>
                                <td className="ps-4 py-3 text-secondary">{new Date(bill.sale_date).toLocaleDateString()}</td>
                                <td className="py-3"><span className="font-monospace fw-bold small bg-white border px-2 py-1 rounded">#{bill.invoice_no}</span></td>
                                <td className="py-3 fw-bold">{formatINR(bill.total_amount)}</td>
                                <td className="py-3 text-success">{formatINR(bill.paid_amount)}</td>
                                <td className="py-3 text-danger fw-bold">{formatINR(bill.balance)}</td>
                                <td className="py-3">
                                    {bill.status === 'Open' 
                                        ? <span className="badge bg-danger-subtle text-danger border border-danger-subtle">Unpaid</span>
                                        : <span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span>
                                    }
                                </td>
                                <td className="text-end pe-4 py-3">
                                    {bill.status === 'Open' ? (
                                        <button className="btn btn-sm btn-dark fw-bold px-3" onClick={() => setSelectedBill(bill)}>
                                            Collect Payment
                                        </button>
                                    ) : (
                                        <span className="text-muted small"><i className="bi bi-check2-circle"></i> Closed</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {selectedBill && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow-lg border-0">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Collect Payment</h5>
                  <button className="btn-close" onClick={() => setSelectedBill(null)}></button>
                </div>
                <div className="modal-body p-4">
                  <div className="alert alert-light border d-flex justify-content-between align-items-center mb-4">
                    <span className="text-secondary small fw-bold">BALANCE DUE</span>
                    <span className="fs-4 fw-bold text-danger">{formatINR(selectedBill.balance)}</span>
                  </div>
                  
                  <form onSubmit={handlePay}>
                    <label className="small fw-bold text-secondary mb-2">Amount Paying Now</label>
                    <div className="input-group mb-4">
                        <span className="input-group-text bg-light border-end-0 fw-bold">₹</span>
                        <input 
                        type="number" 
                        className="form-control form-control-lg border-start-0 fw-bold" 
                        value={payAmount} 
                        onChange={e => setPayAmount(e.target.value)} 
                        placeholder="0.00" 
                        autoFocus 
                        />
                    </div>
                    <button disabled={isSubmitting} className="btn btn-success w-100 py-3 fw-bold shadow-sm">
                      {isSubmitting ? 'Processing...' : 'CONFIRM PAYMENT'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Accounts;