import React, { useContext, useState, useEffect, useRef } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import Swal from 'sweetalert2'; 

// ==========================================
// 1. REUSABLE SEARCHABLE SELECT COMPONENT
// ==========================================
const SearchableSelect = ({ options, value, onChange, placeholder, label, theme, darkMode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    const safeOptions = Array.isArray(options) ? options : [];
    const selectedItem = safeOptions.find(opt => opt.value === value);

    const filteredOptions = safeOptions.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase()) || 
        opt.subLabel?.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearch(''); 
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="mb-1" ref={wrapperRef}>
            <label className={`small fw-bold mb-1 ${theme.subText}`}>{label}</label>
            <div className="position-relative">
                <div 
                    className={`input-group ${theme.input} border rounded overflow-hidden`} 
                    onClick={() => setIsOpen(!isOpen)} 
                    style={{cursor: 'text'}}
                >
                    <input 
                        type="text" 
                        className={`form-control border-0 shadow-none ${theme.input}`} 
                        placeholder={selectedItem ? selectedItem.label : placeholder}
                        value={isOpen ? search : (selectedItem ? selectedItem.label : '')}
                        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        style={{backgroundColor: 'transparent'}}
                    />
                    <span className={`input-group-text border-0 bg-transparent ${theme.subText}`}>
                        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
                    </span>
                </div>
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
                                    onMouseDown={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
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
  const { customers, billingHistory, loadBilling, loadDebtors, loadReports, darkMode } = useContext(GlobalContext);

  const [products, setProducts] = useState([]); 
  const [custId, setCustId] = useState('');
  
  const [scheduleService, setScheduleService] = useState(false);
  const [serviceDate, setServiceDate] = useState('');
  const [serviceType, setServiceType] = useState('Installation');

  // Cart States
  const [prodId, setProdId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);       
  const [discount, setDiscount] = useState('');
  const [applyDiscount, setApplyDiscount] = useState(false);
  
  // WARRANTY STATES
  const [enableWarranty, setEnableWarranty] = useState(false);
  const [warrantyDuration, setWarrantyDuration] = useState('');
  const [warrantyUnit, setWarrantyUnit] = useState('Months'); 
  // REMOVED: warrantyImageFile state (unused)
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null); 

  const [cart, setCart] = useState([]);
  const [paid, setPaid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [paidError, setPaidError] = useState(''); 

  const fetchProducts = async () => {
    try {
        const res = await apiClient.get('/inventory/products?limit=500&status=active');
        if (res.data && Array.isArray(res.data.data)) {
            setProducts(res.data.data);
        } else {
            setProducts([]);
        }
    } catch (err) {
        setProducts([]);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

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

  const customerOptions = (customers || []).map(c => ({ value: c.id, label: c.name, subLabel: c.phone }));
  const productOptions = (products || []).map(p => ({ value: p.id, label: p.name, subLabel: `Stock: ${p.stock_quantity} | ₹${p.sell_price}` }));
  const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);
  
  const getTodayStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const dLocal = new Date(d.getTime() - (offset*60*1000));
    return dLocal.toISOString().split('T')[0];
  };

  const todaysBills = (billingHistory || []).filter(h => {
     const billDate = h.sale_date || h.created_at || '';
     return billDate.startsWith(getTodayStr());
  });

  const handleProductSelect = (selectedId) => {
    setProdId(selectedId);
    const p = products.find(i => i.id === selectedId);
    if (p) { 
      setSelectedProduct(p); setPrice(p.sell_price); setDiscount(''); setQty(1); setErrorMsg(''); 
      setWarrantyDuration(''); setWarrantyUnit('Months'); 
      setUploadedImageUrl(null);
    } else { 
      setSelectedProduct(null); setPrice(0); 
    }
  };

  const handleQtyChange = (val) => {
    if (val === '' || isNaN(val)) { setQty(''); return; }
    const num = parseInt(val);
    if (num > 0) setQty(num);
  };

  const incrementQty = () => setQty((prev) => (prev ? parseInt(prev) + 1 : 1));
  const decrementQty = () => setQty((prev) => (prev > 1 ? parseInt(prev) - 1 : 1));

  const handleDiscountChange = (e) => {
    const val = e.target.value;
    setDiscount(val === '' || val < 0 ? '' : parseFloat(val));
  };

  const getRealtimeStock = (prod) => {
    if(!prod) return 0;
    const inCartQty = cart.reduce((total, item) => item.product_id === prod.id ? total + item.quantity : total, 0);
    return Math.max(0, prod.stock_quantity - inCartQty);
  };

  const handleImageSelect = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append("file", file);
      try {
          Swal.showLoading();
          // Updated to new route
          const res = await apiClient.post("/warranty/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
          setUploadedImageUrl(res.data.url);
          Swal.close();
      } catch (err) {
          Swal.fire('Error', 'Failed to upload image.', 'error');
      }
  };

  const addToCart = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    const requestedQty = parseInt(qty) || 1;
    const availableStock = getRealtimeStock(selectedProduct);

    if (requestedQty > availableStock) {
        return setErrorMsg(`Insufficient Stock! Only ${availableStock} remaining.`);
    }

    const finalDiscount = applyDiscount ? (parseFloat(discount) || 0) : 0;
    const finalUnitPrice = price - finalDiscount;
    
    if (finalUnitPrice < selectedProduct.net_price) return setErrorMsg(`Price below Net Price (${formatINR(selectedProduct.net_price)})`);
    
    const newItem = {
      product_id: prodId,
      product_name: selectedProduct.name,
      quantity: requestedQty,
      unit_price: parseFloat(price),
      net_price: selectedProduct.net_price,
      discount: finalDiscount,
      final_price: finalUnitPrice,
      total: finalUnitPrice * requestedQty,
      warranty_image: (enableWarranty && uploadedImageUrl) ? uploadedImageUrl : null,
      warranty_duration: (enableWarranty && warrantyDuration) ? parseInt(warrantyDuration) : 0,
      warranty_unit: (enableWarranty && warrantyDuration) ? warrantyUnit : null
    };

    setCart(prevCart => {
        const existingIdx = prevCart.findIndex(item => 
            item.product_id === newItem.product_id && 
            item.final_price === newItem.final_price &&
            item.warranty_image === newItem.warranty_image && 
            item.warranty_duration === newItem.warranty_duration &&
            item.warranty_unit === newItem.warranty_unit
        );

        if (existingIdx > -1) {
            const newCart = [...prevCart];
            const existingItem = newCart[existingIdx];
            newCart[existingIdx] = { ...existingItem, quantity: existingItem.quantity + newItem.quantity, total: existingItem.total + newItem.total };
            return newCart;
        } else {
            return [...prevCart, newItem];
        }
    });

    setProdId(''); setQty(1); setPrice(0); setDiscount(''); 
    setWarrantyDuration(''); setEnableWarranty(false); setApplyDiscount(false);
    setUploadedImageUrl(null); 
    setSelectedProduct(null); setErrorMsg('');
  };

  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));

  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);
  
  const handlePaidChange = (e) => {
      const val = e.target.value;
      if(val === '') { setPaid(''); setPaidError(''); return; }
      const numVal = parseFloat(val);
      setPaid(numVal);
      setPaidError(numVal > grandTotal ? `Paid amount cannot exceed Total` : '');
  };

  const balance = Math.max(0, grandTotal - (parseFloat(paid) || 0));

  const handleSubmit = async () => {
    if (cart.length === 0) return Swal.fire('Error', "Cart is empty!", 'warning');
    if (!custId) return Swal.fire('Error', "Select a customer.", 'warning');
    if ((parseFloat(paid) || 0) > grandTotal) return Swal.fire('Error', "Paid amount is greater than total!", 'error'); 
    
    setIsSubmitting(true);
    try {
      const billData = {
        customer_id: custId, items: cart, paid_amount: parseFloat(paid) || 0, 
        next_service_date: scheduleService ? serviceDate : null, service_type: scheduleService ? serviceType : null 
      };

      await apiClient.post('/billing/create', billData);
      loadBilling(); loadDebtors(); loadReports(); fetchProducts(); 
      setCart([]); setPaid(''); setCustId(''); setScheduleService(false);
      Swal.fire({ icon: 'success', title: 'Invoice Created!', timer: 2000, showConfirmButton: false });
    } catch (err) { 
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.detail || "Failed" });
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
                text: 'Status changed successfully.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: darkMode ? '#1e293b' : '#fff',
                color: darkMode ? '#fff' : '#545454',
            });
        } catch (err) {
            Swal.fire('Error', 'Failed to update status', 'error');
        }
    }
  };

  // REMOVED: unused setReminder function

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
              
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <SearchableSelect label="Select Customer" placeholder="Search name or phone..." options={customerOptions} value={custId} onChange={setCustId} theme={theme} darkMode={darkMode} />
                </div>
                <div className="col-md-6 d-flex align-items-center pt-2">
                    <div className="form-check form-switch ps-0 mt-3">
                        <label className={`form-check-label fw-bold ms-5 ${theme.text}`} htmlFor="serviceToggle">Schedule Service?</label>
                        <input className="form-check-input ms-2" type="checkbox" id="serviceToggle" checked={scheduleService} onChange={e => setScheduleService(e.target.checked)} style={{transform: 'scale(1.2)'}}/>
                    </div>
                </div>
              </div>

              {scheduleService && (
                    <div className={`p-3 rounded border border-dashed mb-4 animate__animated animate__fadeIn ${darkMode ? 'border-secondary' : 'bg-light'}`}>
                      <div className="row g-3">
                          <div className="col-md-6">
                              <label className={`small fw-bold ${theme.subText}`}>Service Date</label>
                              <input type="date" className={`form-control ${theme.input}`} value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
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

              <form onSubmit={addToCart} className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className={`fw-bold m-0 ${theme.text}`}>Add Items</h6>
                    <div className="d-flex gap-3">
                        <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="discSwitch" checked={applyDiscount} onChange={() => setApplyDiscount(!applyDiscount)} />
                            <label className={`form-check-label small ${theme.subText}`} htmlFor="discSwitch">Discount</label>
                        </div>
                        <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="warrantySwitch" checked={enableWarranty} onChange={() => setEnableWarranty(!enableWarranty)} />
                            <label className={`form-check-label small ${theme.subText}`} htmlFor="warrantySwitch">Warranty</label>
                        </div>
                    </div>
                </div>

                <div className="row g-3 align-items-end">
                  
                  <div className={applyDiscount || enableWarranty ? "col-md-3" : "col-md-4"}>
                    <SearchableSelect label="Product" placeholder="Search product..." options={productOptions} value={prodId} onChange={handleProductSelect} theme={theme} darkMode={darkMode} />
                    {selectedProduct && (
                        <div className={`small mt-1 fw-bold ${getRealtimeStock(selectedProduct) === 0 ? 'text-danger' : 'text-success'}`}>
                            Stock: {getRealtimeStock(selectedProduct)} 
                            <span className="text-muted fw-normal ms-2">| Net: ₹{selectedProduct.net_price}</span>
                        </div>
                    )}
                  </div>
                  
                  <div className="col-md-2">
                    <label className={`small fw-bold mb-1 ${theme.subText}`}>MRP</label>
                    <div className="input-group">
                        <span className={`input-group-text border-end-0 ${theme.inputGroupText}`}>₹</span>
                        <input type="text" className={`form-control border-start-0 fw-bold ${theme.inputReadOnly}`} value={price} readOnly />
                    </div>
                  </div>

                  <div className="col-md-2">
                    <label className={`small fw-bold mb-1 ${theme.subText}`}>Qty</label>
                    <div className="input-group">
                        <button type="button" className={`btn px-2 ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`} onClick={decrementQty}>-</button>
                        <input type="number" className={`form-control text-center px-1 ${theme.input}`} value={qty} onChange={(e) => handleQtyChange(e.target.value)} min="1" required />
                        <button type="button" className={`btn px-2 ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'}`} onClick={incrementQty}>+</button>
                    </div>
                  </div>

                  {applyDiscount && (
                    <div className="col-md-2 animate__animated animate__fadeIn">
                      <label className={`small fw-bold mb-1 ${theme.subText}`}>Discount</label>
                      <input type="number" className={`form-control ${theme.input}`} value={discount} onChange={handleDiscountChange} placeholder="0" />
                    </div>
                  )}

                  {enableWarranty && (
                    <div className="col-md-3 animate__animated animate__fadeIn">
                        <label className={`small fw-bold mb-1 ${theme.subText}`}>Warranty Info</label>
                        <div className="input-group mb-1">
                            <input type="number" className={`form-control form-control-sm ${theme.input}`} placeholder="Dur" value={warrantyDuration} onChange={e => setWarrantyDuration(e.target.value)} />
                            <select className={`form-select form-select-sm ${theme.input}`} value={warrantyUnit} onChange={e => setWarrantyUnit(e.target.value)} style={{maxWidth: '70px'}}>
                                <option value="Days">D</option>
                                <option value="Months">M</option>
                                <option value="Years">Y</option>
                            </select>
                        </div>
                        <div className="input-group input-group-sm">
                            <input type="file" className={`form-control ${theme.input}`} accept="image/*,application/pdf" onChange={handleImageSelect} />
                        </div>
                        {uploadedImageUrl && <div className="small text-success mt-1"><i className="bi bi-check-circle"></i> Proof Attached</div>}
                    </div>
                  )}

                  <div className="col-md-1 d-flex align-items-end flex-fill">
                    <button className="btn btn-primary w-100 fw-bold" disabled={!selectedProduct || getRealtimeStock(selectedProduct) <= 0}>
                        <i className="bi bi-plus-lg"></i>
                    </button>
                  </div>
                </div>
                
                {errorMsg && <div className="alert alert-danger py-1 px-2 mt-2 small">{errorMsg}</div>}
              </form>

              {/* 4. CART TABLE */}
              <div className={`table-responsive border rounded-3 mb-4 ${darkMode ? 'border-secondary' : ''}`}>
                <table className={`table table-hover mb-0 align-middle text-center ${darkMode ? 'table-dark' : ''}`}>
                  <thead className={`${theme.tableHead} small text-uppercase`}>
                    <tr>
                        <th className="text-start ps-4">Item</th>
                        <th className="text-start">Warranty</th> 
                        <th>Price</th>
                        <th>Qty</th>
                        <th className="text-end pe-4">Total</th>
                        <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.length === 0 ? (
                      <tr><td colSpan="6" className={`py-5 ${theme.subText}`}>No items added.</td></tr>
                    ) : (
                      cart.map((item, idx) => (
                        <tr key={idx} className={darkMode ? 'border-secondary' : ''}>
                          <td className={`text-start ps-4 fw-bold ${theme.text}`}>
                              {item.product_name}
                              <div className="small opacity-75 fw-normal">
                                {item.warranty_duration > 0 && <span className="text-success font-monospace">Warranty: {item.warranty_duration} {item.warranty_unit}</span>}
                              </div>
                          </td>
                          <td className="text-start" style={{minWidth: '160px'}}>
                              {item.warranty_image ? (
                                  <div className="d-flex align-items-center gap-2">
                                      <span className="badge bg-success small">Attached</span>
                                      <a href={item.warranty_image} target="_blank" rel="noreferrer" className="small text-decoration-none">View</a>
                                  </div>
                              ) : <span className="text-muted small">-</span>}
                          </td>
                          <td className={theme.text}>₹{item.unit_price}</td>
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
                            <span>Subtotal:</span><span className="fw-bold">₹{grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="input-group mb-2">
                            <span className={`input-group-text fw-bold ${theme.inputGroupText}`}>Paid ₹</span>
                            <input type="number" className={`form-control fw-bold ${theme.input} ${paidError ? 'is-invalid' : ''}`} value={paid} onChange={handlePaidChange} placeholder="0"/>
                        </div>
                        {paidError && <small className="text-danger d-block mb-2">{paidError}</small>}
                        <div className="d-flex justify-content-between border-top pt-2">
                            <span className="fs-5 fw-bold text-danger">Balance Due:</span><span className="fs-5 fw-bold text-danger">₹{balance.toLocaleString('en-IN')}</span>
                        </div>
                        <button className="btn btn-success w-100 mt-3 py-2 fw-bold shadow-sm" onClick={handleSubmit} disabled={isSubmitting || cart.length === 0}>
                            {isSubmitting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-check-lg me-2"></i>} GENERATE BILL
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
                    {todaysBills.length === 0 ? <div className={`text-center py-5 ${theme.subText}`}>No bills generated today.</div> : 
                        todaysBills.map(b => (
                            <div key={b.id} className={`list-group-item d-flex justify-content-between align-items-center py-3 ${theme.listGroupItem}`}>
                                <div><div className={`fw-bold ${theme.text}`}>{b.users?.name || 'Unknown'}</div><small className={theme.subText}>Inv: #{b.invoice_no}</small></div>
                                <div className="text-end">
                                    <div className={`fw-bold ${theme.text}`}>₹{b.total_amount.toLocaleString('en-IN')}</div>
                                    <span 
                                        onClick={() => toggleStatus(b.id)} 
                                        className={`badge ${b.invoice_status === 'Cancelled' ? 'bg-danger' : 'bg-success'}`}
                                        style={{cursor: 'pointer'}}
                                    >
                                        {b.invoice_status}
                                    </span>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? '#475569' : '#cbd5e1'}; border-radius: 10px; }`}</style>
    </div>
  );
};

export default Billing;