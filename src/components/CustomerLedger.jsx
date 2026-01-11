import React from 'react';

const CustomerLedger = ({ customer, onBack, onCollectPayment, darkMode }) => {
    
    // Theme Configuration
    const theme = {
        card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm',
        text: darkMode ? 'text-white' : 'text-dark',
        subText: darkMode ? 'text-gray-400' : 'text-secondary',
        tableHeader: darkMode ? 'bg-secondary text-white' : 'bg-light text-uppercase text-secondary',
        btnClose: darkMode ? 'btn-outline-light' : 'btn-outline-dark'
    };

    // Helper
    const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

    return (
        <div className="row g-4 animate__animated animate__fadeIn">
            
            {/* 1. LEFT PANEL: PROFILE & LIFETIME STATS */}
            <div className="col-lg-4">
                <div className={`card ${theme.card} h-100 rounded-4 p-4 text-center position-relative overflow-hidden`}>
                    
                    <div className="mx-auto rounded-circle d-flex align-items-center justify-content-center text-white display-4 mb-3 shadow" 
                         style={{ width: 100, height: 100, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        {customer.name[0]}
                    </div>
                    
                    <h3 className="fw-bold m-0">{customer.name}</h3>
                    <p className={`mb-4 ${theme.subText}`}><i className="bi bi-telephone me-2"></i>{customer.phone}</p>
                    
                    <hr className="opacity-25" />

                    <div className="row g-3 text-start mt-2">
                        <div className="col-6">
                            <small className="text-uppercase fw-bold opacity-75 d-block" style={{fontSize: '0.7rem'}}>Lifetime Billed</small>
                            <h6 className="fw-bold m-0">{fmt(customer.lifetime_billed)}</h6>
                        </div>
                        <div className="col-6">
                            <small className="text-uppercase fw-bold opacity-75 d-block" style={{fontSize: '0.7rem'}}>Lifetime Paid</small>
                            <h6 className="fw-bold text-success m-0">{fmt(customer.lifetime_paid)}</h6>
                        </div>
                        <div className="col-12 mt-4">
                            <div className="p-3 rounded-3 bg-danger bg-opacity-10 border border-danger text-center">
                                <small className="text-uppercase fw-bold text-danger d-block">Current Due</small>
                                <h2 className="fw-bold text-danger m-0">{fmt(customer.total_due)}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. RIGHT PANEL: TRANSACTION TABLE */}
            <div className="col-lg-8">
                <div className={`card ${theme.card} h-100 rounded-4 overflow-hidden`}>
                    <div className="card-header bg-transparent border-0 p-4 d-flex justify-content-between align-items-center">
                        <h5 className="fw-bold m-0"><i className="bi bi-clock-history me-2"></i>Ledger History</h5>
                        
                        <button 
                            className={`btn btn-sm ${theme.btnClose} rounded-pill px-3 fw-bold`} 
                            onClick={onBack}
                        >
                            <i className="bi bi-x-lg me-2"></i>Close View
                        </button>
                    </div>
                    
                    <div className="table-responsive">
                        {/* 🔥 REMOVED 'table-hover' CLASS BELOW */}
                        <table className={`table align-middle mb-0 ${darkMode ? 'table-dark' : ''}`}>
                            <thead className={theme.tableHeader}>
                                <tr>
                                    <th className="ps-4">Date</th>
                                    <th>Invoice</th>
                                    <th>Total</th>
                                    <th>Paid</th>
                                    <th>Balance</th>
                                    <th className="text-end pe-4">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customer.bills
                                    .sort((a,b) => new Date(b.sale_date) - new Date(a.sale_date))
                                    .map(b => {
                                        const daysOld = Math.floor((new Date() - new Date(b.sale_date)) / (1000 * 60 * 60 * 24));
                                        return (
                                            <tr key={b.id} className={b.status === 'Closed' ? 'opacity-50' : ''}>
                                                <td className="ps-4">
                                                    <div className="fw-bold">{new Date(b.sale_date).toLocaleDateString()}</div>
                                                    <small className={theme.subText}>{daysOld} days ago</small>
                                                </td>
                                                <td>
                                                    <span className="badge bg-light text-dark border font-monospace">#{b.invoice_no}</span>
                                                </td>
                                                <td className="fw-bold">{fmt(b.total_amount)}</td>
                                                <td className="text-success">{fmt(b.paid_amount)}</td>
                                                <td className="text-danger fw-bold">{fmt(b.balance)}</td>
                                                <td className="text-end pe-4">
                                                    {b.status === 'Open' ? (
                                                        <button 
                                                            className="btn btn-sm btn-dark text-white fw-bold px-3 rounded-pill shadow-sm"
                                                            onClick={() => onCollectPayment(b)}
                                                        >
                                                            Pay
                                                        </button>
                                                    ) : (
                                                        <i className="bi bi-check-circle-fill text-success fs-5"></i>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerLedger;