import React, { useContext, useState } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom'; // 1. Import Hook

const Billing = () => {
  const { customers, products, billingHistory, loadBilling, loadDebtors, loadReports } = useContext(GlobalContext);
  const navigate = useNavigate(); // 2. Initialize Hook

  // --- STATES ---
  const [custId, setCustId] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [prodId, setProdId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);       
  const [discount, setDiscount] = useState(0); 
  const [cart, setCart] = useState([]);
  const [paid, setPaid] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // --- DISCOUNT TOGGLE STATE ---
  const [applyDiscount, setApplyDiscount] = useState(false);

  // --- HELPERS ---
  const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);

  // --- HANDLERS ---
  const handleProductChange = (e) => {
    const pid = e.target.value;
    setProdId(pid);
    const p = products.find(i => i.id === pid);
    if (p) { 
      setSelectedProduct(p); 
      setPrice(p.sell_price); 
      setDiscount(0); 
      setQty(1); 
      setErrorMsg(''); 
    } else { 
      setSelectedProduct(null); 
      setPrice(0); 
    }
  };

  const handleToggleDiscount = () => {
    setApplyDiscount(!applyDiscount);
    if (applyDiscount) setDiscount(0); // Reset discount to 0 if turning off
  };

  const addToCart = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    // Logic: If toggle is OFF, force discount to 0
    const finalDiscount = applyDiscount ? parseFloat(discount) : 0;
    const finalUnitPrice = price - finalDiscount;
    
    // VALIDATION
    if (finalUnitPrice < selectedProduct.net_price) return setErrorMsg(`Price below Net Price (${formatINR(selectedProduct.net_price)})`);
    if (finalUnitPrice > selectedProduct.sell_price) return setErrorMsg(`Price above MRP (${formatINR(selectedProduct.sell_price)})`);

    // CREATE ITEM OBJECT
    const newItem = {
      product_id: prodId,
      product_name: selectedProduct.name,
      quantity: parseInt(qty),
      unit_price: parseFloat(price),
      net_price: selectedProduct.net_price,
      discount: finalDiscount,
      final_price: finalUnitPrice,
      total: finalUnitPrice * parseInt(qty)
    };

    setCart([...cart, newItem]);
    
    // RESET INPUTS
    setProdId(''); setQty(1); setPrice(0); setDiscount(0); setSelectedProduct(null); setErrorMsg('');
  };

  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));

  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);
  const balance = grandTotal - paid;

  // --- CREATE INVOICE ---
  const handleSubmit = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    if (!custId) return alert("Select a customer.");
    
    setIsSubmitting(true);
    try {
      await apiClient.post('/billing/create', {
        customer_id: custId, 
        items: cart, 
        paid_amount: parseFloat(paid) || 0, 
        next_service_date: serviceDate || null
      });
      
      loadBilling(); loadDebtors(); loadReports();
      setCart([]); setPaid(0); setCustId('');
      alert("Bill Created Successfully!");
    } catch (err) { 
      alert("Error: " + (err.response?.data?.detail || "Failed")); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  // --- TOGGLE BILL STATUS ---
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
    <div className="container-fluid p-4">
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
              
              {/* Customer Select */}
              <div className="row g-3 mb-4 p-3 bg-light rounded border border-dashed">
                <div className="col-md-7">
                  <label className="small fw-bold text-secondary mb-1">Customer</label>
                  <select className="form-select" value={custId} onChange={(e) => setCustId(e.target.value)}>
                    <option value="">Select...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-md-5">
                  <label className="small fw-bold text-secondary mb-1">Service Date</label>
                  <input type="date" className="form-control" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
                </div>
              </div>

              {/* Add Item Form */}
              <form onSubmit={addToCart} className="mb-4">
                
                {/* Discount Toggle Switch */}
                <div className="d-flex justify-content-end mb-2">
                  <div className="form-check form-switch">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="discountSwitch"
                      checked={applyDiscount}
                      onChange={handleToggleDiscount}
                      style={{ cursor: 'pointer' }}
                    />
                    <label className="form-check-label small fw-bold text-secondary" htmlFor="discountSwitch">
                      Apply Discount?
                    </label>
                  </div>
                </div>

                <div className="row g-3 align-items-end">
                  {/* Product */}
                  <div className={applyDiscount ? "col-md-4" : "col-md-5"}>
                    <label className="small fw-bold text-muted mb-1">Product</label>
                    <select className="form-select" value={prodId} onChange={handleProductChange} required>
                      <option value="">Choose...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  {/* MRP */}
                  <div className="col-md-2">
                    <label className="small fw-bold text-muted mb-1">MRP</label>
                    <input type="text" className="form-control bg-white text-secondary" value={price} readOnly />
                  </div>

                  {/* Discount Field */}
                  {applyDiscount && (
                    <div className="col-md-2">
                      <label className="small fw-bold text-muted mb-1">Discount</label>
                      <input 
                        type="number" 
                        className="form-control border-warning" 
                        value={discount} 
                        onChange={e => setDiscount(e.target.value)} 
                        min="0" 
                        placeholder="0"
                      />
                    </div>
                  )}

                  {/* Qty */}
                  <div className="col-md-2">
                    <label className="small fw-bold text-muted mb-1">Qty</label>
                    <input type="number" className="form-control fw-bold" value={qty} onChange={e => setQty(e.target.value)} min="1" required />
                  </div>

                  {/* Add Button */}
                  <div className={applyDiscount ? "col-md-2" : "col-md-3"}>
                    <button className="btn btn-warning w-100 fw-bold text-dark" disabled={!selectedProduct}>
                      <i className="bi bi-plus-lg"></i> Add
                    </button>
                  </div>
                </div>
                {errorMsg && <div className="text-danger small fw-bold mt-2">{errorMsg}</div>}
              </form>

              {/* Cart Table */}
              <div className="table-responsive mb-4 border rounded">
                <table className="table table-hover mb-0 text-center align-middle">
                  <thead className="table-light">
                    <tr>
                      <th className="text-start ps-3">Product</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.length === 0 ? (
                      <tr><td colSpan="5" className="py-4 text-muted">Cart is empty.</td></tr>
                    ) : (
                      cart.map((item, index) => (
                        <tr key={index}>
                          <td className="text-start ps-3 fw-bold">{item.product_name}</td>
                          <td>
                            {item.unit_price} 
                            {item.discount > 0 && <span className="text-danger small ms-1">(-{item.discount})</span>}
                          </td>
                          <td>{item.quantity}</td>
                          <td className="fw-bold">{formatINR(item.total)}</td>
                          <td>
                            <button className="btn btn-sm btn-light text-danger border-0" onClick={() => removeFromCart(index)}>
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="row justify-content-end">
                <div className="col-md-6">
                  <div className="bg-light p-3 rounded">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-bold">Grand Total:</span>
                      <span className="fw-bold fs-5">{formatINR(grandTotal)}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="text-muted small fw-bold">PAID:</span>
                      <input type="number" className="form-control w-50" value={paid} onChange={e => setPaid(e.target.value)} />
                    </div>
                    <div className="border-top pt-2 d-flex justify-content-between text-danger">
                      <span className="fw-bold">Due:</span>
                      <span className="fw-bold fs-4">{formatINR(balance)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleSubmit} 
                    className="btn btn-dark w-100 mt-3 py-3 fw-bold shadow-sm" 
                    disabled={cart.length === 0 || isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : 'GENERATE INVOICE'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT: HISTORY */}
        <div className="col-lg-4">
          <div className="card shadow-sm h-100 overflow-hidden">
            {/* Header with View All Button */}
            <div className="card-header py-3 bg-white d-flex justify-content-between align-items-center">
              <h6 className="fw-bold m-0 text-secondary small">RECENT INVOICES</h6>
              <button 
                className="btn btn-sm btn-light border small py-0" 
                onClick={() => navigate('/view-bills')}
              >
                View All <i className="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th className="ps-3">ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th className="text-end pe-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map(h => {
                    const isCancelled = h.invoice_status === 'Cancelled';
                    return (
                      <tr key={h.id} style={{ opacity: isCancelled ? 0.5 : 1, textDecoration: isCancelled ? 'line-through' : 'none' }}>
                        <td className="ps-3"><span className="badge bg-light text-dark border">#{h.invoice_no}</span></td>
                        <td><div className="fw-bold small">{h.users?.name}</div></td>
                        <td className="fw-bold small">{formatINR(h.total_amount)}</td>
                        <td className="text-end pe-3">
                          <div className="form-check form-switch d-flex justify-content-end">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              style={{ cursor: 'pointer', backgroundColor: isCancelled ? '#dc3545' : '#198754', borderColor: isCancelled ? '#dc3545' : '#198754' }}
                              checked={!isCancelled} 
                              onChange={() => toggleStatus(h.id)}
                            />
                          </div>
                          <small style={{ fontSize: '0.65rem' }} className={isCancelled ? 'text-danger fw-bold' : 'text-success fw-bold'}>
                            {isCancelled ? 'CANCELLED' : 'ACCEPTED'}
                          </small>
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
    </div>
  );
};

export default Billing;