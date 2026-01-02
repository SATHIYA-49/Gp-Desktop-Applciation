import React, { useState, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState'; // Import for theme

const PaymentModal = ({ bill, onClose, onConfirm, isSubmitting }) => {
  const { darkMode } = useContext(GlobalContext); // Get theme
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    
    if (!val || val <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (val > bill.balance) {
      setError(`Amount cannot exceed the due balance of ${fmt(bill.balance)}`);
      return;
    }

    onConfirm(bill.id, val);
  };

  // --- THEME ---
  const theme = {
    modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    modalHeader: darkMode ? 'border-secondary' : 'border-0',
    inputGroupText: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-light border-end-0 fw-bold',
    input: darkMode ? 'bg-dark text-white border-secondary' : 'border-start-0 fw-bold',
    closeBtn: darkMode ? 'btn-close-white' : ''
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
      <div className="modal d-block fade show" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className={`modal-content rounded-4 ${theme.modalContent}`}>
            <div className={`modal-header pb-0 ${theme.modalHeader}`}>
              <h5 className="fw-bold m-0">Collect Payment</h5>
              <button className={`btn-close ${theme.closeBtn}`} onClick={onClose}></button>
            </div>
            <div className="modal-body p-4">
              <div className={`alert ${darkMode ? 'alert-dark border-secondary' : 'alert-light border'} d-flex justify-content-between align-items-center mb-4`}>
                <span className={`small fw-bold text-uppercase ${darkMode ? 'text-black-50' : 'text-secondary'}`}>Total Due</span>
                <span className="fs-4 fw-bold text-danger">{fmt(bill.balance)}</span>
              </div>

              <form onSubmit={handleSubmit}>
                <label className={`small fw-bold mb-2 ${darkMode ? 'text-white-50' : 'text-muted'}`}>Amount Received</label>
                <div className="input-group mb-3">
                  <span className={`input-group-text ${theme.inputGroupText}`}>₹</span>
                  <input 
                    type="number" 
                    step="0.01"
                    className={`form-control form-control-lg ${theme.input} ${error ? 'is-invalid' : ''}`} 
                    autoFocus 
                    placeholder="0.00" 
                    value={amount} 
                    onChange={e => { setAmount(e.target.value); setError(''); }} 
                  />
                </div>
                {error && <div className="text-danger small mb-3 fw-bold"><i className="bi bi-exclamation-circle me-1"></i>{error}</div>}
                
                <button disabled={isSubmitting} className="btn btn-success w-100 py-3 fw-bold rounded-3 shadow-sm">
                  {isSubmitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Processing...</> : 'CONFIRM PAYMENT'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentModal;