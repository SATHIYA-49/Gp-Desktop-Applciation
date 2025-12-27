import React, { useContext, useState, useEffect, useRef } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import Swal from 'sweetalert2'; 

// ==========================================
// 1. REUSABLE SEARCHABLE SELECT COMPONENT (FIXED)
// ==========================================
const SearchableSelect = ({ options, value, onChange, placeholder, label, theme, darkMode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    // Find the currently selected object to display its label
    const selectedItem = options.find(opt => opt.value === value);

    // Filter options based on search text
    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase()) || 
        opt.subLabel?.toLowerCase().includes(search.toLowerCase())
    );

    // Close dropdown if clicked outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearch(''); // Reset search on close
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="mb-1" ref={wrapperRef}>
            <label className={`small fw-bold mb-1 ${theme.subText}`}>{label}</label>
            <div className="position-relative">
                {/* Input Field Wrapper */}
                <div 
                    className={`input-group ${theme.input} border rounded overflow-hidden`} 
                    onClick={() => setIsOpen(!isOpen)} // Toggle when clicking the arrow/container
                    style={{cursor: 'text'}}
                >
                    <input 
                        type="text" 
                        className={`form-control border-0 shadow-none ${theme.input}`} 
                        placeholder={selectedItem ? selectedItem.label : placeholder}
                        value={isOpen ? search : (selectedItem ? selectedItem.label : '')}
                        
                        // --- BUG FIX: STOP PROPAGATION ---
                        onClick={(e) => {
                            e.stopPropagation(); // Stop click from bubbling to parent (which toggles close)
                            setIsOpen(true);     // Force open
                        }}
                        
                        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        style={{backgroundColor: 'transparent'}}
                    />
                    <span className={`input-group-text border-0 bg-transparent ${theme.subText}`}>
                        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
                    </span>
                </div>

                {/* Dropdown List */}
                {isOpen && (
                    <div 
                        className="position-absolute w-100 shadow-lg rounded mt-1 overflow-auto custom-scrollbar" 
                        style={{
                            maxHeight: '220px', 
                            zIndex: 1050, 
                            top: '100%', 
                            backgroundColor: darkMode ? '#1e293b' : '#fff', 
                            border: darkMode ? '1px solid #475569' : '1px solid #dee2e6'
                        }}
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div 
                                    key={opt.value} 
                                    className={`p-2 border-bottom ${theme.text}`}
                                    style={{
                                        cursor: 'pointer', 
                                        borderColor: darkMode ? '#334155' : '#f1f5f9',
                                        backgroundColor: opt.value === value ? (darkMode ? '#334155' : '#e9ecef') : 'transparent'
                                    }}
                                    onMouseDown={() => {
                                        onChange(opt.value); // Pass ID back to parent
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = opt.value === value ? (darkMode ? '#334155' : '#e9ecef') : 'transparent'}
                                >
                                    <div className="fw-bold small">{opt.label}</div>
                                    {opt.subLabel && <div style={{fontSize: '0.7rem'}} className={theme.subText}>{opt.subLabel}</div>}
                                </div>
                            ))
                        ) : (
                            <div className={`p-3 text-center small ${theme.subText}`}>No results found</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


// ==========================================
// 2. MAIN BILLING COMPONENT
// ==========================================
const Billing = () => {
  const { customers, products, billingHistory, loadBilling, loadDebtors, loadReports, darkMode } = useContext(GlobalContext);

  // --- STATES ---
  const [custId, setCustId] = useState('');
  
  // Service States
  const [scheduleService, setScheduleService] = useState(false);
  const [serviceDate, setServiceDate] = useState('');
  const [serviceType, setServiceType] = useState('Installation');

  // Cart States
  const [prodId, setProdId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);       
  const [discount, setDiscount] = useState('');
  const [applyDiscount, setApplyDiscount] = useState(false);
  
  // Warranty States
  const [hasWarranty, setHasWarranty] = useState(false); 
  const [warrantyFile, setWarrantyFile] = useState(null); 

  const [cart, setCart] = useState([]);
  const [paid, setPaid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [paidError, setPaidError] = useState(''); 

  // --- THEME ENGINE ---
  const theme = {
    container: darkMode ? 'bg-dark' : 'bg-light',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-secondary',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm',
    cardHeader: darkMode ? 'bg-dark border-secondary' : 'bg-white border-0',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-white border-light',
    inputReadOnly: darkMode ? 'bg-dark text-white-50 border-secondary' : 'bg-light text-dark',
    inputGroupText: darkMode ? 'bg-dark text-white border-secondary' : 'bg-light text-dark',
    tableHead: darkMode ? 'table-dark' : 'table-light',
    paymentBox: darkMode ? 'bg-dark border-secondary' : 'bg-light border',
    listGroupItem: darkMode ? 'bg-dark text-white border-secondary' : 'bg-white text-dark',
    badge: darkMode ? 'bg-secondary text-white' : 'bg-light text-dark'
  };

  // --- PREPARE DATA FOR SEARCH COMPONENT ---
  const customerOptions = customers.map(c => ({
      value: c.id,
      label: c.name,
      subLabel: c.phone
  }));

  const productOptions = products.map(p => ({
      value: p.id,
      label: p.name,
      subLabel: `Stock: ${p.stock_quantity} | ₹${p.sell_price}`
  }));

  // --- HELPERS ---
  const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);

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
  
  // New Handler for Searchable Product Select
  const handleProductSelect = (selectedId) => {
    setProdId(selectedId);
    const p = products.find(i => i.id === selectedId);
    if (p) { 
      setSelectedProduct(p); 
      setPrice(p.sell_price); 
      setDiscount(''); 
      setQty(1); 
      setHasWarranty(false); 
      setWarrantyFile(null); 
      setErrorMsg(''); 
    } else { 
      setSelectedProduct(null); 
      setPrice(0); 
    }
  };

  const handleQtyChange = (val) => {
    if (val === '' || isNaN(val)) {
        setQty('');
        return;
    }
    const num = parseInt(val);
    if (num > 0) setQty(num);
  };

  const incrementQty = () => setQty((prev) => (prev ? parseInt(prev) + 1 : 1));
  const decrementQty = () => setQty((prev) => (prev > 1 ? parseInt(prev) - 1 : 1));

  const handleDiscountChange = (e) => {
    const val = e.target.value;
    if (val === '' || val < 0) {
        setDiscount('');
    } else {
        setDiscount(parseFloat(val));
    }
  };

  const addToCart = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    const requestedQty = parseInt(qty) || 1;
    const currentStock = selectedProduct.stock_quantity || 0; 

    if (requestedQty > currentStock) {
        return setErrorMsg(`Insufficient Stock! Available: ${currentStock} only.`);
    }

    if (hasWarranty && !warrantyFile) {
      return setErrorMsg("Please upload the Warranty Card image.");
    }

    const finalDiscount = applyDiscount ? (parseFloat(discount) || 0) : 0;
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
    setProdId(''); setQty(1); setPrice(0); setDiscount(''); 
    setSelectedProduct(null); setErrorMsg('');
    setHasWarranty(false); setWarrantyFile(null); 
  };

  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));

  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);
  
  const handlePaidChange = (e) => {
      const val = e.target.value;
      if(val === '') {
        setPaid('');
        setPaidError('');
        return;
      }
      const numVal = parseFloat(val);
      setPaid(numVal);
      if (numVal > grandTotal) {
          setPaidError(`Paid amount cannot exceed Total (${formatINR(grandTotal)})`);
      } else {
          setPaidError('');
      }
  };

  const balance = Math.max(0, grandTotal - (parseFloat(paid) || 0));

  const handleSubmit = async () => {
    if (cart.length === 0) return Swal.fire('Error', "Cart is empty!", 'warning');
    if (!custId) return Swal.fire('Error', "Select a customer.", 'warning');
    if ((parseFloat(paid) || 0) > grandTotal) return Swal.fire('Error', "Paid amount is greater than total!", 'error'); 
    
    if (scheduleService && !serviceDate) return Swal.fire('Error', "Please select a Service Date.", 'warning');

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
      setCart([]); setPaid(''); setCustId(''); 
      setScheduleService(false); setServiceDate(''); setServiceType('Installation');
      setPaidError('');
      
      Swal.fire({
          icon: 'success',
          title: 'Invoice Created!',
          text: 'Bill saved successfully.',
          background: darkMode ? '#1e293b' : '#fff',
          color: darkMode ? '#fff' : '#545454',
          timer: 2000,
          showConfirmButton: false
      });

    } catch (err) { 
      Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.response?.data?.detail || "Failed",
          background: darkMode ? '#1e293b' : '#fff',
          color: darkMode ? '#fff' : '#545454',
      });
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const toggleStatus = async (saleId) => {
    const result = await Swal.fire({
        title: 'Change Status?',
        text: "Toggle between Accepted/Cancelled",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, change it',
        background: darkMode ? '#1e293b' : '#fff',
        color: darkMode ? '#fff' : '#545454',
    });

    if(result.isConfirmed) {
        try {
            await apiClient.put(`/billing/${saleId}/status`);
            loadBilling(); 
            Swal.fire({
                title: 'Updated',
                text: 'Status changed.',
                icon: 'success',
                background: darkMode ? '#1e293b' : '#fff',
                color: darkMode ? '#fff' : '#545454',
            });
        } catch (err) {
            Swal.fire('Error', 'Failed to update status', 'error');
        }
    }
  };

  const setReminder = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setServiceDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className={`container-fluid p-4 custom-scrollbar`} style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa' }}>
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className={`fw-bold m-0 ${theme.text}`}>Billing & Invoicing</h3>
          <p className={`small m-0 ${theme.subText}`}>Create new sales and manage invoices.</p>
        </div>
      </div>

      <div className="row g-4">
        {/* LEFT: INVOICE BUILDER */}
        <div className="col-lg-8">
          <div className={`card h-100 ${theme.card}`}>
            <div className={`card-header pt-4 pb-0 ${theme.cardHeader}`}>
              <h5 className={`fw-bold m-0 ${theme.text}`}><i className="bi bi-receipt me-2 text-primary"></i>New Invoice</h5>
            </div>
            <div className="card-body p-4">
              
              {/* 1. SEARCHABLE CUSTOMER SELECTION */}
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <SearchableSelect 
                    label="Select Customer"
                    placeholder="Search name or phone..."
                    options={customerOptions}
                    value={custId}
                    onChange={setCustId}
                    theme={theme}
                    darkMode={darkMode}
                  />
                </div>
                
                {/* SERVICE SCHEDULER TOGGLE */}
                <div className="col-md-6 d-flex align-items-center pt-2">
                    <div className="form-check form-switch ps-0 mt-3">
                        <label className={`form-check-label fw-bold ms-5 ${theme.text}`} htmlFor="serviceToggle">Schedule Service?</label>
                        <input className="form-check-input ms-2" type="checkbox" id="serviceToggle" checked={scheduleService} onChange={e => setScheduleService(e.target.checked)} style={{transform: 'scale(1.2)'}}/>
                    </div>
                </div>
              </div>

              {/* 2. OPTIONAL SERVICE DETAILS */}
              {scheduleService && (
                   <div className={`p-3 rounded border border-dashed mb-4 animate__animated animate__fadeIn ${darkMode ? 'border-secondary' : 'bg-light'}`}>
                      <div className="row g-3">
                          <div className="col-md-6">
                              <label className={`small fw-bold ${theme.subText}`}>Service Date</label>
                              <div className="input-group">
                                  <input type="date" className={`form-control ${theme.input}`} value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                                  <button className={`btn small ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`} type="button" onClick={() => setReminder(90)}>+3M</button>
                              </div>
                          </div>
                          <div className="col-md-6">
                              <label className={`small fw-bold ${theme.subText}`}>Task Type</label>
                              <select className={`form-select ${theme.input}`} value={serviceType} onChange={e => setServiceType(e.target.value)}>
                                  <option value="Installation">Installation</option>
                                  <option value="General Service">General Service</option>
                                  <option value="Repair">Repair</option>
                              </select>
                          </div>
                      </div>
                   </div>
              )}

              <hr className={`opacity-25 my-4 ${darkMode ? 'text-white' : 'text-muted'}`}/>

              {/* 3. ADD PRODUCTS FORM */}
              <form onSubmit={addToCart} className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className={`fw-bold m-0 ${theme.text}`}>Add Items</h6>
                    <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" id="discSwitch" checked={applyDiscount} onChange={() => setApplyDiscount(!applyDiscount)} />
                        <label className={`form-check-label small ${theme.subText}`} htmlFor="discSwitch">Enable Discount</label>
                    </div>
                </div>

                <div className="row g-3 align-items-end">
                  
                  {/* SEARCHABLE PRODUCT SELECT */}
                  <div className="col-md-4">
                    <SearchableSelect 
                        label="Product"
                        placeholder="Search product..."
                        options={productOptions}
                        value={prodId}
                        onChange={handleProductSelect}
                        theme={theme}
                        darkMode={darkMode}
                    />
                    {selectedProduct && <div className={`small mt-1 ${theme.subText}`}>Stock: {selectedProduct.stock_quantity} | Net: ₹{selectedProduct.net_price}</div>}
                  </div>
                  
                  {/* Price (Read Only) */}
                  <div className="col-md-2">
                    <label className={`small fw-bold mb-1 ${theme.subText}`}>MRP</label>
                    <div className="input-group">
                        <span className={`input-group-text border-end-0 ${theme.inputGroupText}`}>₹</span>
                        <input type="text" className={`form-control border-start-0 fw-bold ${theme.inputReadOnly}`} value={price} readOnly />
                    </div>
                  </div>

                  {/* Discount */}
                  {applyDiscount && (
                    <div className="col-md-2 animate__animated animate__fadeIn">
                      <label className={`small fw-bold mb-1 ${theme.subText}`}>Discount</label>
                      <div className="input-group">
                          <span className={`input-group-text ${theme.inputGroupText}`}>₹</span>
                          <input type="number" className={`form-control ${theme.input}`} value={discount} onChange={handleDiscountChange} placeholder="0" />
                      </div>
                    </div>
                  )}

                  {/* Quantity Stepper */}
                  <div className="col-md-2">
                    <label className={`small fw-bold mb-1 ${theme.subText}`}>Qty</label>
                    <div className="input-group">
                        <button type="button" className={`btn px-2 ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`} onClick={decrementQty}>-</button>
                        <input type="number" className={`form-control text-center px-1 ${theme.input}`} value={qty} onChange={(e) => handleQtyChange(e.target.value)} min="1" required />
                        <button type="button" className={`btn px-2 ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`} onClick={incrementQty}>+</button>
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="col-md-2">
                    <button className="btn btn-primary w-100 fw-bold" disabled={!selectedProduct}>
                        <i className="bi bi-plus-lg"></i> Add
                    </button>
                  </div>
                </div>

                {/* Warranty Upload */}
                {selectedProduct && (
                    <div className={`mt-3 p-2 border rounded d-flex align-items-center gap-3 ${darkMode ? 'border-secondary' : 'bg-light'}`}>
                        <div className="form-check mb-0">
                            <input className="form-check-input" type="checkbox" id="warrCheck" checked={hasWarranty} onChange={e => setHasWarranty(e.target.checked)} />
                            <label className={`form-check-label small fw-bold ${theme.text}`} htmlFor="warrCheck">Has Warranty?</label>
                        </div>
                        {hasWarranty && (
                            <input type="file" className={`form-control form-control-sm w-auto ${theme.input}`} accept="image/*" onChange={e => setWarrantyFile(e.target.files[0])} />
                        )}
                    </div>
                )}
                
                {errorMsg && <div className="alert alert-danger py-1 px-2 mt-2 small"><i className="bi bi-exclamation-circle me-1"></i>{errorMsg}</div>}
              </form>

              {/* 4. CART TABLE */}
              <div className={`table-responsive border rounded-3 mb-4 ${darkMode ? 'border-secondary' : ''}`}>
                <table className={`table table-hover mb-0 align-middle text-center ${darkMode ? 'table-dark' : ''}`}>
                  <thead className={`${theme.tableHead} small text-uppercase`}>
                    <tr><th className="text-start ps-4">Item</th><th>Price</th><th>Disc</th><th>Qty</th><th className="text-end pe-4">Total</th><th></th></tr>
                  </thead>
                  <tbody>
                    {cart.length === 0 ? (
                      <tr><td colSpan="6" className={`py-5 ${theme.subText}`}>No items added to bill yet.</td></tr>
                    ) : (
                      cart.map((item, idx) => (
                        <tr key={idx} className={darkMode ? 'border-secondary' : ''}>
                          <td className={`text-start ps-4 fw-bold ${theme.text}`}>
                              {item.product_name}
                              {item.warranty_image && <span className="badge bg-info ms-2" style={{fontSize: '0.6rem'}}>WARRANTY</span>}
                          </td>
                          <td className={theme.text}>₹{item.unit_price}</td>
                          <td className="text-danger">{item.discount > 0 ? `-₹${item.discount}` : '-'}</td>
                          <td className={theme.text}>{item.quantity}</td>
                          <td className={`text-end pe-4 fw-bold ${theme.text}`}>₹{item.total.toLocaleString('en-IN')}</td>
                          <td><button className="btn btn-sm text-danger" onClick={() => removeFromCart(idx)}><i className="bi bi-trash"></i></button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 5. PAYMENT SECTION */}
              <div className="row justify-content-end">
                <div className="col-md-5">
                    <div className={`p-3 rounded border ${theme.paymentBox}`}>
                        <div className={`d-flex justify-content-between mb-2 ${theme.text}`}>
                            <span>Subtotal:</span>
                            <span className="fw-bold">₹{grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="input-group mb-2">
                            <span className={`input-group-text fw-bold ${theme.inputGroupText}`}>Paid ₹</span>
                            <input 
                                type="number" 
                                className={`form-control fw-bold ${theme.input} ${paidError ? 'is-invalid' : ''}`} 
                                value={paid} 
                                onChange={handlePaidChange} 
                                placeholder="0"
                            />
                        </div>
                        {paidError && <small className="text-danger d-block mb-2">{paidError}</small>}
                        
                        <div className="d-flex justify-content-between border-top pt-2">
                            <span className="fs-5 fw-bold text-danger">Balance Due:</span>
                            <span className="fs-5 fw-bold text-danger">₹{balance.toLocaleString('en-IN')}</span>
                        </div>
                        
                        <button className="btn btn-success w-100 mt-3 py-2 fw-bold shadow-sm" onClick={handleSubmit} disabled={isSubmitting || cart.length === 0}>
                            {isSubmitting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-check-lg me-2"></i>}
                            GENERATE BILL
                        </button>
                    </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT: RECENT BILLS */}
        <div className="col-lg-4">
          <div className={`card h-100 ${theme.card}`}>
            <div className={`card-header pt-4 pb-2 ${theme.cardHeader} d-flex justify-content-between align-items-center`}>
              <h6 className={`fw-bold m-0 ${theme.text}`}>Today's Activity</h6>
              <span className={`badge ${theme.badge}`}>{getTodayStr()}</span>
            </div>
            <div className="card-body p-0">
                <div className="list-group list-group-flush">
                    {todaysBills.length === 0 ? (
                        <div className={`text-center py-5 ${theme.subText}`}>No bills generated today.</div>
                    ) : (
                        todaysBills.map(b => (
                            <div key={b.id} className={`list-group-item d-flex justify-content-between align-items-center py-3 ${theme.listGroupItem}`}>
                                <div>
                                    <div className={`fw-bold ${theme.text}`}>{b.users?.name || 'Unknown'}</div>
                                    <small className={theme.subText}>Inv: #{b.invoice_no}</small>
                                </div>
                                <div className="text-end">
                                    <div className={`fw-bold ${theme.text}`}>₹{b.total_amount.toLocaleString('en-IN')}</div>
                                    <span 
                                        onClick={() => toggleStatus(b.id)}
                                        className={`badge ${b.invoice_status === 'Cancelled' ? 'bg-danger' : 'bg-success'} pointer`}
                                        style={{cursor: 'pointer'}}
                                    >
                                        {b.invoice_status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
          </div>
        </div>

      </div>

      {/* STYLES */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? '#475569' : '#cbd5e1'}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${darkMode ? '#64748b' : '#94a3b8'}; }
      `}</style>
    </div>
  );
};

export default Billing;