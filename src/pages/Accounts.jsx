import React, { useContext, useState, useMemo } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import PaymentModal from '../components/PaymentModal'; 
import CustomerLedger from '../components/CustomerLedger'; 

const Accounts = () => {
    // Global State & Theme
    const { debtors, billingHistory, loadDebtors, loadReports, loadBilling, darkMode } = useContext(GlobalContext);
    
    // Local State
    const [selectedCustomer, setSelectedCustomer] = useState(null); 
    const [selectedBill, setSelectedBill] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Theme Config
    const theme = {
        bg: darkMode ? '#0f172a' : '#f8f9fa',
        text: darkMode ? 'text-white' : 'text-dark',
        subText: darkMode ? 'text-gray-400' : 'text-secondary',
        card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm',
        tableHeader: darkMode ? 'bg-secondary text-white' : 'bg-light text-uppercase text-secondary',
        input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-white border-0 shadow-sm',
        rowHover: darkMode ? 'hover:bg-gray-700' : 'hover:bg-light'
    };

    const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

    // --- DATA PROCESSING (Aggregating Customers) ---
    const customers = useMemo(() => {
        const map = {};
        const process = (bill, isPaid) => {
            const id = bill.customer_id;
            if (!bill.users) return; 

            if (!map[id]) {
                map[id] = { 
                    ...bill.users, 
                    id, 
                    open_count: 0, 
                    closed_count: 0, 
                    total_due: 0,
                    lifetime_billed: 0, 
                    lifetime_paid: 0, 
                    bills: [] 
                };
            }
            
            map[id].lifetime_billed += bill.total_amount;
            map[id].lifetime_paid += bill.paid_amount;
            map[id].bills.push({ ...bill, status: isPaid ? 'Closed' : 'Open' });

            if (!isPaid) { 
                map[id].open_count++; 
                map[id].total_due += bill.balance; 
            } else { 
                map[id].closed_count++; 
            }
        };

        debtors.forEach(b => process(b, false));
        billingHistory.filter(b => b.payment_status === 'Paid').forEach(b => process(b, true));
        
        return Object.values(map);
    }, [debtors, billingHistory]);

    // --- FILTERING & PAGINATION ---
    const filtered = customers.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const stats = {
        customers_due: filtered.filter(c => c.total_due > 0).length,
        total_outstanding: filtered.reduce((sum, c) => sum + c.total_due, 0)
    };

    // --- HANDLERS ---
    const handlePaymentConfirm = async (billId, amount) => {
        setIsSubmitting(true);
        try {
            await apiClient.post('/accounts/pay-due', { sale_id: billId, amount_paying: amount });
            
            // Refresh Global Data
            loadDebtors(); loadBilling(); loadReports();
            
            // Optimistic Update
            setSelectedCustomer(prev => {
                if(!prev) return null;
                return { 
                    ...prev, 
                    total_due: prev.total_due - amount,
                    lifetime_paid: prev.lifetime_paid + Number(amount),
                    bills: prev.bills.map(b => b.id === billId ? {
                        ...b, 
                        paid_amount: b.paid_amount + Number(amount),
                        balance: b.balance - amount,
                        status: (b.balance - amount) <= 0 ? 'Closed' : 'Open'
                    } : b)
                };
            });
            
            setSelectedBill(null);
        } catch (err) { 
            alert("Error: " + (err.response?.data?.detail || "Payment failed")); 
        } finally { 
            setIsSubmitting(false); 
        }
    };

    return (
        <div className="container-fluid p-4" style={{ minHeight: '100vh', background: theme.bg }}>
            
            {/* --- PAGE HEADER --- */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className={`fw-bold m-0 ${theme.text}`}>Accounts & Ledger</h3>
                    <p className={`small m-0 ${theme.subText}`}>Track debts, payments, and customer history.</p>
                </div>
            </div>

            {/* --- MAIN CONTENT SWITCHER --- */}
            {selectedCustomer ? (
                // RENDER THE CHILD COMPONENT
                <CustomerLedger 
                    customer={selectedCustomer}
                    onBack={() => setSelectedCustomer(null)}
                    onCollectPayment={(bill) => setSelectedBill(bill)}
                    darkMode={darkMode}
                />
            ) : (
                // --- VIEW 1: MAIN DASHBOARD (List of Customers) ---
                <div className="animate__animated animate__fadeIn">
                    {/* STATS ROW */}
                    <div className="row g-4 mb-4">
                        <div className="col-md-6 col-lg-4">
                            <div className={`card h-100 ${theme.card} border-start border-danger border-5`}>
                                <div className="card-body">
                                    <h6 className="text-uppercase small fw-bold opacity-75">Total Outstanding</h6>
                                    <h2 className="display-6 fw-bold text-danger m-0">{fmt(stats.total_outstanding)}</h2>
                                    <small className={theme.subText}>Money waiting to be collected</small>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-lg-4">
                            <div className={`card h-100 ${theme.card} border-start border-primary border-5`}>
                                <div className="card-body">
                                    <h6 className="text-uppercase small fw-bold opacity-75">Active Debtors</h6>
                                    <h2 className="display-6 fw-bold text-primary m-0">{stats.customers_due}</h2>
                                    <small className={theme.subText}>Customers with pending bills</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SEARCH & TABLE */}
                    <div className={`card ${theme.card} overflow-hidden rounded-4`}>
                        <div className="card-header border-0 bg-transparent p-3">
                            <div className="position-relative" style={{ maxWidth: '400px' }}>
                                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 opacity-50"></i>
                                <input 
                                    className={`form-control ps-5 rounded-pill py-2 ${theme.input}`}
                                    placeholder="Search customer..." 
                                    value={searchTerm} 
                                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                                />
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className={`table align-middle mb-0 ${darkMode ? 'table-dark' : 'table-hover'}`}>
                                <thead className={theme.tableHeader}>
                                    <tr>
                                        <th className="ps-4 py-3">Customer Profile</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-end pe-4">Total Due</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.length === 0 ? (
                                        <tr><td colSpan="3" className="text-center py-5 opacity-50">No customers found.</td></tr> 
                                    ) : (
                                        currentItems.map(c => (
                                            <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedCustomer(c)}>
                                                <td className="ps-4 py-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold me-3 text-white fs-5`} 
                                                             style={{ width: 45, height: 45, background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}>
                                                            {c.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className={`fw-bold ${theme.text}`}>{c.name}</div>
                                                            <div className="small text-secondary">{c.phone}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    {c.total_due > 0 ? 
                                                        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger px-3 rounded-pill">{c.open_count} Pending</span> 
                                                        : 
                                                        <span className="badge bg-success bg-opacity-10 text-success border border-success px-3 rounded-pill">Settled</span>
                                                    }
                                                </td>
                                                <td className={`text-end pe-4 fw-bold fs-5 ${c.total_due > 0 ? 'text-danger' : 'text-success'}`}>
                                                    {fmt(c.total_due)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINATION */}
                        {totalPages > 1 && (
                            <div className="card-footer border-0 bg-transparent py-3 d-flex justify-content-between align-items-center">
                                <small className={theme.subText}>Page {currentPage} of {totalPages}</small>
                                <div>
                                    <button disabled={currentPage === 1} className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'} me-1 rounded-circle`} onClick={() => setCurrentPage(prev => prev - 1)}><i className="bi bi-chevron-left"></i></button>
                                    <button disabled={currentPage === totalPages} className={`btn btn-sm ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'} rounded-circle`} onClick={() => setCurrentPage(prev => prev + 1)}><i className="bi bi-chevron-right"></i></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL */}
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