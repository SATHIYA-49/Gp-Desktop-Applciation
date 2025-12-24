import React, { useContext, useState} from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

const Billing = () => {
  const { customers, products, billingHistory, loadBilling, loadDebtors, loadReports, darkMode } = useContext(GlobalContext);
  const navigate = useNavigate();

  // --- STATES ---
  const [custId, setCustId] = useState('');
  
  // --- SERVICE SCHEDULING STATES ---
  const [scheduleService, setScheduleService] = useState(false);
  const [serviceDate, setServiceDate] = useState('');
  const [serviceType, setServiceType] = useState('Installation');

  // Cart Item States
  const [prodId, setProdId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);       
  const [discount, setDiscount] = useState(0); 
  const [applyDiscount, setApplyDiscount] = useState(false);
  
  // Warranty States
  const [hasWarranty, setHasWarranty] = useState(false); 
  const [warrantyFile, setWarrantyFile] = useState(null); 

  const [cart, setCart] = useState([]);
  const [paid, setPaid] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Error & Success Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [paidError, setPaidError] = useState(''); 
  const [successMsg, setSuccessMsg] = useState(''); 

  // --- HELPERS ---
  const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);

  // --- FILTER: GET ONLY TODAY'S BILLS ---
  const getTodayStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const dLocal = new Date(d.getTime() - (offset*60*1000));
    return dLocal.toISOString().split('T')[0];
  };

  const todaysBills = billingHistory.filter(h => {
     const billDate = h.sale_date || h.created_at || '';
     return billDate.startsWith(getTodayStr());
  });

  // --- HANDLERS ---
  const setReminder = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const formatted = date.toISOString().split('T')[0];
    setServiceDate(formatted);
  };

  const handleProductChange = (e) => {
    const pid = e.target.value;
    setProdId(pid);
    const p = products.find(i => i.id === pid);
    if (p) { 
      setSelectedProduct(p); 
      setPrice(p.sell_price); 
      setDiscount(0); 
      setQty(1); 
      setHasWarranty(false); 
      setWarrantyFile(null); 
      setErrorMsg(''); 
    } else { 
      setSelectedProduct(null); 
      setPrice(0); 
    }
  };

  const addToCart = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    // --- STOCK VALIDATION ---
    const requestedQty = parseInt(qty);
    const currentStock = selectedProduct.stock_quantity || 0; 

    if (requestedQty > currentStock) {
        return setErrorMsg(`Insufficient Stock! Available: ${currentStock} only.`);
    }

    if (hasWarranty && !warrantyFile) {
      return setErrorMsg("Please upload the Warranty Card image.");
    }

    const finalDiscount = applyDiscount ? parseFloat(discount) : 0;
    const finalUnitPrice = price - finalDiscount;
    
    if (finalUnitPrice < selectedProduct.net_price) return setErrorMsg(`Price below Net Price (${formatINR(selectedProduct.net_price)})`);
    if (finalUnitPrice > selectedProduct.sell_price) return setErrorMsg(`Price above MRP (${formatINR(selectedProduct.sell_price)})`);

    const newItem = {
      product_id: prodId,
      product_name: selectedProduct.name,
      quantity: requestedQty,
      unit_price: parseFloat(price),
      net_price: selectedProduct.net_price,
      discount: finalDiscount,
      final_price: finalUnitPrice,
      total: finalUnitPrice * requestedQty,
      warranty_image: hasWarranty ? warrantyFile : null 
    };

    setCart([...cart, newItem]);
    setProdId(''); setQty(1); setPrice(0); setDiscount(0); 
    setSelectedProduct(null); setErrorMsg('');
    setHasWarranty(false); setWarrantyFile(null); 
  };

  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));

  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);
  
  // --- PAID AMOUNT HANDLER & VALIDATION ---
  const handlePaidChange = (e) => {
      const val = parseFloat(e.target.value) || 0;
      setPaid(val);
      
      if (val > grandTotal) {
          setPaidError(`Paid amount cannot exceed Total (${formatINR(grandTotal)})`);
      } else {
          setPaidError('');
      }
  };

  // Calculate Balance
  const balance = Math.max(0, grandTotal - paid);

  // --- CREATE INVOICE ---
  const handleSubmit = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    if (!custId) return alert("Select a customer.");
    if (paid > grandTotal) return alert("Paid amount is greater than total!"); 
    
    if (scheduleService && !serviceDate) return alert("Please select a Service Date or uncheck the schedule box.");

    setIsSubmitting(true);
    try {
      const billData = {
        customer_id: custId, 
        items: cart.map(item => ({...item, warranty_image: null})), 
        paid_amount: parseFloat(paid) || 0, 
        next_service_date: scheduleService ? serviceDate : null,
        service_type: scheduleService ? serviceType : null 
      };

      await apiClient.post('/billing/create', billData);
      
      loadBilling(); loadDebtors(); loadReports();
      
      // Reset Form
      setCart([]); setPaid(0); setCustId(''); 
      setScheduleService(false); setServiceDate(''); setServiceType('Installation');
      setPaidError('');
      
      // Show Success Message
      setSuccessMsg("Bill Created Successfully!");
      setTimeout(() => setSuccessMsg(''), 3000); 

    } catch (err) { 
      alert("Error: " + (err.response?.data?.detail || "Failed")); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const toggleStatus = async (saleId) => {
    if(!window.confirm("Change bill status? (Cancel/Accept)")) return;
    try {
      await apiClient.put(`/billing/${saleId}/status`);
      loadBilling(); 
    } catch (err) {
      alert("Error updating status");
    }
  };

  return (
    <div 
      className="container-fluid p-4 custom-scrollbar" 
      style={{ 
        height: '100vh', 
        overflowY: 'auto', 
        overflowX: 'hidden' 
      }}
    >
      
      {/* SUCCESS ALERT */}
      {successMsg && (
        <div className="alert alert-success d-flex align-items-center shadow-sm mb-4 animate__animated animate__fadeInDown" role="alert">
            <i className="bi bi-check-circle-fill fs-4 me-3"></i>
            <div>
                <strong>Success!</strong> {successMsg}
            </div>
            <button type="button" className="btn-close ms-auto" onClick={() => setSuccessMsg('')}></button>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold m-0">Billing & Invoicing</h3>
          <p className="text-secondary small m-0">Multi-product system.</p>
        </div>
      </div>

      <div className="row g-4">
        {/* LEFT: INVOICE BUILDER */}
        <div className="col-lg-8">
          <div className="card shadow-sm h-100">
            <div className="card-header border-0 pt-4 pb-0 bg-white">
              <h5 className="fw-bold m-0"><i className="bi bi-cart-plus me-2 text-warning"></i>Create Bill</h5>
            </div>
            <div className="card-body p-4">
              
              {/* CUSTOMER & SERVICE SECTION */}
              <div className="row g-3 mb-4 p-3 bg-light rounded border border-dashed">
                <div className="col-md-5">
                  <label className="small fw-bold text-secondary mb-1">Customer</label>
                  <select className="form-select" value={custId} onChange={(e) => setCustId(e.target.value)}>
                    <option value="">Select...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="col-md-7">
                  <div className="d-flex align-items-center mb-2">
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="scheduleServiceCheck" checked={scheduleService} onChange={(e) => setScheduleService(e.target.checked)} style={{ cursor: 'pointer' }} />
                        <label className="form-check-label small fw-bold text-dark ms-2" htmlFor="scheduleServiceCheck">Schedule Service Task?</label>
                      </div>
                  </div>
                  {scheduleService && (
                      <div className="row g-2 animate__animated animate__fadeIn">
                          <div className="col-6">
                              <label className="small fw-bold text-muted">Service Date</label>
                              <input type="date" className="form-control form-control-sm" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
                          </div>
                          <div className="col-6">
                              <label className="small fw-bold text-muted">Task Type</label>
                              <select className="form-select form-select-sm" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                                  <option value="Installation">Installation</option>
                                  <option value="General Service">General Service</option>
                                  <option value="Repair">Repair</option>
                                  <option value="Inspection">Inspection</option>
                              </select>
                          </div>
                          <div className="col-12 d-flex gap-1 mt-1">
                            <button type="button" onClick={() => setReminder(1)} className="btn btn-outline-secondary btn-sm flex-fill py-0" style={{fontSize: '0.7rem'}}>Tomorrow</button>
                            <button type="button" onClick={() => setReminder(30)} className="btn btn-outline-secondary btn-sm flex-fill py-0" style={{fontSize: '0.7rem'}}>+30 Days</button>
                            <button type="button" onClick={() => setReminder(90)} className="btn btn-outline-secondary btn-sm flex-fill py-0" style={{fontSize: '0.7rem'}}>+90 Days</button>
                          </div>
                      </div>
                  )}
                </div>
              </div>

              {/* ADD ITEM FORM */}
              <form onSubmit={addToCart} className="mb-4">
                <div className="d-flex justify-content-end mb-2">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="discountSwitch" checked={applyDiscount} onChange={() => setApplyDiscount(!applyDiscount)} style={{ cursor: 'pointer' }} />
                    <label className="form-check-label small fw-bold text-secondary" htmlFor="discountSwitch">Apply Discount?</label>
                  </div>
                </div>

                <div className="row g-3 align-items-end">
                  <div className="col-md-5">
                    <label className="small fw-bold text-muted mb-1">Product</label>
                    <select className="form-select" value={prodId} onChange={handleProductChange} required>
                      <option value="">Choose...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  
                  {/* PRICE & STOCK DISPLAY */}
                  <div className="col-md-2">
                    <div className="d-flex justify-content-between">
                        <label className="small fw-bold text-muted mb-1">MRP</label>
                        {selectedProduct && (
                            <span className="badge bg-light text-dark border small" style={{fontSize: '0.65rem'}}>
                                Stock: {selectedProduct.stock_quantity || 0}
                            </span>
                        )}
                    </div>
                    <input type="text" className="form-control bg-white text-secondary" value={price} readOnly />
                  </div>

                  {applyDiscount && (
                    <div className="col-md-2">
                      <label className="small fw-bold text-muted mb-1">Discount</label>
                      <input type="number" className="form-control border-warning" value={discount} onChange={e => setDiscount(e.target.value)} min="0" placeholder="0" />
                    </div>
                  )}
                  <div className="col-md-2">
                    <label className="small fw-bold text-muted mb-1">Qty</label>
                    <input type="number" className="form-control fw-bold" value={qty} onChange={e => setQty(e.target.value)} min="1" required />
                  </div>
                  <div className="col-md-3">
                    <button className="btn btn-warning w-100 fw-bold text-dark" disabled={!selectedProduct}><i className="bi bi-plus-lg"></i> Add</button>
                  </div>
                </div>

                {selectedProduct && (
                    <div className="mt-3 p-2 border rounded bg-light">
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="warrantyCheck" checked={hasWarranty} onChange={(e) => setHasWarranty(e.target.checked)} />
                            <label className="form-check-label small fw-bold text-dark" htmlFor="warrantyCheck">Upload Warranty Card?</label>
                        </div>
                        {hasWarranty && (
                            <div className="mt-2">
                                <input type="file" className="form-control form-control-sm" accept="image/*" onChange={(e) => setWarrantyFile(e.target.files[0])} required={hasWarranty} />
                            </div>
                        )}
                    </div>
                )}
                
                {errorMsg && <div className="text-danger small fw-bold mt-2 animate__animated animate__shakeX">{errorMsg}</div>}
              </form>

              {/* CART TABLE */}
              <div className="table-responsive mb-4 border rounded">
                <table className="table table-hover mb-0 text-center align-middle">
                  <thead className="table-light">
                    <tr><th className="text-start ps-3">Product</th><th>W.Card</th><th>Price</th><th>Qty</th><th>Total</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {cart.length === 0 ? (
                      <tr><td colSpan="6" className="py-4 text-muted">Cart is empty.</td></tr>
                    ) : (
                      cart.map((item, index) => (
                        <tr key={index}>
                          <td className="text-start ps-3 fw-bold">{item.product_name}</td>
                          <td>{item.warranty_image ? <i className="bi bi-image text-primary"></i> : <span className="text-muted small">-</span>}</td>
                          <td>{item.unit_price} {item.discount > 0 && <span className="text-danger small ms-1">(-{item.discount})</span>}</td>
                          <td>{item.quantity}</td>
                          <td className="fw-bold">{formatINR(item.total)}</td>
                          <td><button className="btn btn-sm btn-light text-danger border-0" onClick={() => removeFromCart(index)}><i className="bi bi-x-lg"></i></button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* TOTALS */}
              <div className="row justify-content-end">
                <div className="col-md-6">
                  <div className="bg-light p-3 rounded">
                    <div className="d-flex justify-content-between mb-2">
                        <span className="fw-bold">Grand Total:</span>
                        <span className="fw-bold fs-5">{formatINR(grandTotal)}</span>
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-muted small fw-bold">PAID:</span>
                        <input 
                            type="number" 
                            className={`form-control w-50 ${paidError ? 'is-invalid' : ''}`} 
                            value={paid} 
                            onChange={handlePaidChange} 
                        />
                    </div>
                    {/* Error Message for Paid Amount */}
                    {paidError && <div className="text-end text-danger small fw-bold mb-2">{paidError}</div>}

                    <div className="border-top pt-2 d-flex justify-content-between text-danger">
                        <span className="fw-bold">Due:</span>
                        <span className="fw-bold fs-4">{formatINR(balance)}</span>
                    </div>
                  </div>
                  
                  {/* Disable button if there's a paidError */}
                  <button 
                    onClick={handleSubmit} 
                    className="btn btn-dark w-100 mt-3 py-3 fw-bold shadow-sm" 
                    disabled={cart.length === 0 || isSubmitting || !!paidError}
                  >
                    {isSubmitting ? 'Processing...' : 'GENERATE INVOICE'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: HISTORY (TODAY ONLY) */}
        <div className="col-lg-4">
          <div className="card shadow-sm h-100 overflow-hidden">
            <div className="card-header py-3 bg-white d-flex justify-content-between align-items-center">
              <h6 className="fw-bold m-0 text-secondary small">TODAY'S INVOICES</h6>
              <button className="btn btn-sm btn-light border small py-0" onClick={() => navigate('/view-bills')}>View All <i className="bi bi-arrow-right ms-1"></i></button>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead><tr><th className="ps-3">ID</th><th>Customer</th><th>Amount</th><th className="text-end pe-3">Action</th></tr></thead>
                <tbody>
                  {todaysBills.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-4 text-muted small">No bills created today.</td></tr>
                  ) : (
                      todaysBills.map(h => {
                        const isCancelled = h.invoice_status === 'Cancelled';
                        return (
                          <tr key={h.id} style={{ opacity: isCancelled ? 0.5 : 1, textDecoration: isCancelled ? 'line-through' : 'none' }}>
                            <td className="ps-3"><span className="badge bg-light text-dark border">#{h.invoice_no}</span></td>
                            <td><div className="fw-bold small">{h.users?.name}</div></td>
                            <td className="fw-bold small">{formatINR(h.total_amount)}</td>
                            <td className="text-end pe-3">
                              <div className="form-check form-switch d-flex justify-content-end">
                                <input className="form-check-input" type="checkbox" style={{ cursor: 'pointer', backgroundColor: isCancelled ? '#dc3545' : '#198754', borderColor: isCancelled ? '#dc3545' : '#198754' }} checked={!isCancelled} onChange={() => toggleStatus(h.id)} />
                              </div>
                              <small style={{ fontSize: '0.65rem' }} className={isCancelled ? 'text-danger fw-bold' : 'text-success fw-bold'}>{isCancelled ? 'CANCELLED' : 'ACCEPTED'}</small>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- CSS FOR TRANSPARENT SCROLLBAR --- */}
      <style>
        {`
          /* For Webkit Browsers (Chrome, Edge, Safari) */
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px; /* Slim width */
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent; /* Invisible track */
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(150, 150, 150, 0.3); /* Subtle semi-transparent grey */
            border-radius: 20px; /* Rounded pill shape */
            border: 2px solid transparent; /* Creates padding around thumb */
            background-clip: content-box;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(150, 150, 150, 0.6); /* Slightly darker on hover */
          }

          /* Hide scrollbar for Firefox but keep scroll */
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(150, 150, 150, 0.3) transparent;
          }
        `}
      </style>
    </div>
  );
};

export default Billing;