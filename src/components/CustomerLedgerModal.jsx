import React, { useEffect, useState, useContext } from 'react';
import apiClient from '../api/client';
import { GlobalContext } from '../context/GlobalState';

const CustomerLedgerModal = ({ customerId, onClose }) => {
  const { darkMode } = useContext(GlobalContext); // <--- GET THEME
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // --- THEME STYLES ---
  const theme = {
    modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    modalHeader: darkMode ? 'border-secondary' : 'border-bottom',
    cardBg: darkMode ? 'bg-secondary bg-opacity-25' : 'bg-light',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-muted',
    tableHeader: darkMode ? 'table-dark' : 'table-light',
    tableBodyText: darkMode ? 'text-white' : 'text-dark',
    closeBtn: darkMode ? 'btn-close-white' : ''
  };

  useEffect(() => {
    if (!customerId) return;
    const fetchLedger = async () => {
      try {
        const res = await apiClient.get(`/customers/${customerId}/ledger`);
        setData(res.data);
      } catch (err) {
        alert("Failed to load ledger");
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [customerId, onClose]);

  if (!customerId) return null;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className={`modal-content ${theme.modalContent}`}>
            
            {/* HEADER */}
            <div className={`modal-header ${theme.modalHeader} pb-0`}>
              <h5 className="modal-title fw-bold">Customer Ledger</h5>
              <button type="button" className={`btn-close ${theme.closeBtn}`} onClick={onClose}></button>
            </div>

            <div className="modal-body p-4">
              {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
              ) : data ? (
                <>
                  {/* SUMMARY CARD */}
                  <div className={`card ${theme.cardBg} border-0 mb-4`}>
                    <div className="card-body d-flex justify-content-between align-items-center">
                      <div>
                        <h4 className={`fw-bold mb-1 ${theme.text}`}>{data.customer.name}</h4>
                        <p className={`mb-0 ${theme.subText}`}><i className="bi bi-telephone me-2"></i>{data.customer.phone}</p>
                      </div>
                      <div className="text-end">
                        <small className={`text-uppercase fw-bold ${theme.subText}`} style={{fontSize: '0.7rem'}}>Total Due</small>
                        <h3 className={`fw-bold m-0 ${data.total_due > 0 ? 'text-danger' : 'text-success'}`}>
                          ₹{data.total_due.toFixed(2)}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* UNPAID BILLS TABLE */}
                  <h6 className={`fw-bold text-uppercase small mb-3 ${theme.subText}`}>Outstanding Bills</h6>
                  <div className="table-responsive border rounded-3 overflow-hidden">
                    <table className="table mb-0 align-middle">
                      <thead className={theme.tableHeader}>
                        <tr>
                          <th className="ps-4">Date</th>
                          <th>Products</th>
                          <th className="text-end">Bill Total</th>
                          <th className="text-end pe-4 text-danger">Balance Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.bills.length === 0 ? (
                          <tr><td colSpan="4" className={`text-center py-4 ${theme.subText}`}>No pending bills. Clean record! 🎉</td></tr>
                        ) : (
                          data.bills.map((bill) => (
                            <tr key={bill.id}>
                              <td className={`ps-4 ${theme.subText}`}>{new Date(bill.sale_date).toLocaleDateString()}</td>
                              <td className={theme.tableBodyText}>
                                {Array.isArray(bill.items) 
                                  ? bill.items.map(i => i.product_name).join(", ") 
                                  : (bill.products?.name || "Unknown Product")
                                }
                              </td>
                              <td className={`text-end fw-medium ${theme.tableBodyText}`}>₹{bill.total_amount}</td>
                              <td className="text-end pe-4 fw-bold text-danger">₹{bill.balance}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center text-danger">Error loading data.</div>
              )}
            </div>
            
            <div className={`modal-footer border-top-0 ${darkMode ? 'border-secondary' : ''}`}>
              <button className="btn btn-secondary px-4" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerLedgerModal;