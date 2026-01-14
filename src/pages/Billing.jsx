import React, { useContext, useState, useEffect, useRef } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import Swal from 'sweetalert2'; 

// ==========================================
// 1. REUSABLE SEARCHABLE SELECT (No Changes)
// ==========================================
const SearchableSelect = ({ options, value, onChange, placeholder, label, theme, darkMode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    const safeOptions = Array.isArray(options) ? options : [];
    const selectedItem = safeOptions.find(opt => opt.value === value);

    const filteredOptions = safeOptions.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase()) || 
        (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
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
                    <div className="position-absolute w-100 shadow-lg rounded mt-1 overflow-auto custom-scrollbar" style={{maxHeight: '220px', zIndex: 1050, top: '100%', backgroundColor: darkMode ? '#1e293b' : '#fff', border: darkMode ? '1px solid #475569' : '1px solid #dee2e6'}}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div 
                                    key={opt.value} 
                                    className={`p-2 border-bottom ${theme.text}`}
                                    style={{cursor: 'pointer', backgroundColor: opt.value === value ? (darkMode ? '#334155' : '#e9ecef') : 'transparent'}}
                                    onMouseDown={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = opt.value === value ? (darkMode ? '#334155' : '#e9ecef') : 'transparent'}
                                >
                                    <div className="fw-bold small">{opt.label}</div>
                                    {opt.subLabel && <div style={{fontSize: '0.7rem'}} className={theme.subText}>{opt.subLabel}</div>}
                                </div>
                            ))
                        ) : <div className={`p-3 text-center small ${theme.subText}`}>No results found</div>}
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
  const { customers, loadBilling, loadDebtors, loadReports, darkMode } = useContext(GlobalContext);

  const [products, setProducts] = useState([]); 
  const [todaysBills, setTodaysBills] = useState([]); 
  
  // --- CUSTOMER SELECTION STATES ---
  const [billingMode, setBillingMode] = useState('registered'); // 'registered' or 'guest'
  const [custCategoryFilter, setCustCategoryFilter] = useState('All');
  const [custId, setCustId] = useState('');
  const [guestInfo, setGuestInfo] = useState({ name: 'Guest', phone: '' });

  // Cart States
  const [prodId, setProdId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);       
  const [discount, setDiscount] = useState('');
  const [applyDiscount, setApplyDiscount] = useState(false);
  
  // Warranty States
  const [enableWarranty, setEnableWarranty] = useState(false);
  const [warrantyDuration, setWarrantyDuration] = useState('');
  const [warrantyUnit, setWarrantyUnit] = useState('Months'); 
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null); 

  const [cart, setCart] = useState([]);
  const [paid, setPaid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [paidError, setPaidError] = useState(''); 

  // --- 1. DATA FETCHING ---
  const fetchProducts = async () => {
    try {
        const res = await apiClient.get('/inventory/products?limit=500&status=active');
        setProducts(res.data.data || []);
    } catch (err) { setProducts([]); }
  };

  const fetchTodaysActivity = async () => {
    try {
        const res = await apiClient.get('/billing/history?filter=today');
        setTodaysBills(res.data.data || []); 
    } catch (err) { console.error("History fetch error", err); }
  };

  useEffect(() => { 
      fetchProducts(); 
      fetchTodaysActivity(); 
  }, []);

  const theme = {
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-secondary',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm',
    cardHeader: darkMode ? 'bg-dark border-secondary' : 'bg-white border-0',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-white border-light',
    inputReadOnly: darkMode ? 'bg-dark text-white-50 border-secondary' : 'bg-light text-dark',
    inputGroupText: darkMode ? 'bg-dark text-white border-secondary' : 'bg-light text-dark',
    listGroupItem: darkMode ? 'bg-dark text-white border-secondary' : 'bg-white text-dark',
    badge: darkMode ? 'bg-secondary text-white' : 'bg-light text-dark',
    paymentBox: darkMode ? 'bg-dark border-secondary' : 'bg-light border'
  };

  // --- 2. DYNAMIC OPTIONS & FILTERS ---
  const filteredCustomers = (customers || []).filter(c => 
      custCategoryFilter === 'All' ? true : c.category === custCategoryFilter
  );

  const customerOptions = filteredCustomers.map(c => ({ 
      value: c.id, 
      label: c.name, 
      subLabel: `${c.phone} | ${c.category}` 
  }));
  
  const productOptions = (products || []).map(p => {
      const isLow = p.stock_quantity <= (p.low_stock_limit || 5);
      return { 
          value: p.id, 
          label: p.name, 
          subLabel: `${isLow ? '⚠️ ' : ''}Stock: ${p.stock_quantity}${isLow ? ' (Low)' : ''} | ₹${p.sell_price}` 
      };
  });

  const getRealtimeStock = (prod) => {
    if(!prod) return 0;
    const inCartQty = cart.reduce((total, item) => item.product_id === prod.id ? total + item.quantity : total, 0);
    return Math.max(0, prod.stock_quantity - inCartQty);
  };

  const handleProductSelect = (selectedId) => {
    setProdId(selectedId);
    const p = products.find(i => i.id === selectedId);
    if (p) { 
      setSelectedProduct(p); setPrice(p.sell_price); setDiscount(''); setQty(1); setErrorMsg(''); 
      setWarrantyDuration(''); setWarrantyUnit('Months'); setUploadedImageUrl(null);
    } else { 
      setSelectedProduct(null); setPrice(0); 
    }
  };

  const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);

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

  const addToCart = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    const requestedQty = parseInt(qty) || 1;
    const availableStock = getRealtimeStock(selectedProduct);

    if (requestedQty > availableStock) return setErrorMsg(`Insufficient Stock! Only ${availableStock} remaining.`);

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

    setCart(prev => [...prev, newItem]);
    // Reset Inputs
    setProdId(''); setQty(1); setPrice(0); setDiscount(''); 
    setWarrantyDuration(''); setEnableWarranty(false); setApplyDiscount(false);
    setUploadedImageUrl(null); setSelectedProduct(null); setErrorMsg('');
  };

  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));

  const handlePaidChange = (e) => {
      const val = e.target.value;
      if(val === '') { setPaid(''); setPaidError(''); return; }
      const numVal = parseFloat(val);
      setPaid(numVal);
      setPaidError(numVal > grandTotal ? `Paid amount cannot exceed Total` : '');
  };

  const handleImageSelect = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      try {
          Swal.showLoading();
          const res = await apiClient.post("/warranty/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
          setUploadedImageUrl(res.data.url);
          Swal.close();
      } catch (err) { Swal.fire('Error', 'Image upload failed.', 'error'); }
  };

  // 🔥 HANDLER: Billing Submission
  const handleSubmit = async () => {
    if (cart.length === 0) return Swal.fire('Error', "Cart is empty!", 'warning');
    
    // Validate Selection based on mode
    if (billingMode === 'registered' && !custId) return Swal.fire('Error', "Select a customer.", 'warning');
    if (billingMode === 'guest' && !guestInfo.name) return Swal.fire('Error', "Guest Name required.", 'warning');

    if ((parseFloat(paid) || 0) > grandTotal) return Swal.fire('Error', "Paid amount > Total!", 'error'); 
    
    setIsSubmitting(true);
    try {
      // 1. Prepare Data
      const billData = {
        items: cart, 
        paid_amount: parseFloat(paid) || 0,
        customer_id: billingMode === 'registered' ? custId : null,
        guest_name: billingMode === 'guest' ? guestInfo.name : null,
        guest_phone: billingMode === 'guest' ? guestInfo.phone : null,
        send_whatsapp: billingMode === 'registered' 
      };

      await apiClient.post('/billing/create', billData);
      
      // 3. REFRESH & RESET
      fetchTodaysActivity(); 
      fetchProducts();
      loadBilling(); loadDebtors(); loadReports(); 
      
      setCart([]); setPaid(''); setCustId('');
      setGuestInfo({name: 'Guest', phone: ''});
      
      Swal.fire({ 
          icon: 'success', 
          title: 'Success!', 
          text: billingMode === 'registered' ? 'Bill Created & WhatsApp Queued.' : 'Guest Bill Created.',
          timer: 2000, 
          showConfirmButton: false 
      });

    } catch (err) { 
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.detail || "Error" });
    } finally { setIsSubmitting(false); }
  };

  const getTodayStr = () => {
    return new Date().toLocaleDateString('en-IN');
  };

  const toggleStatus = async (saleId) => {
    const result = await Swal.fire({ title: 'Cancel Bill?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, Cancel' });
    if(result.isConfirmed) {
        try {
            await apiClient.put(`/billing/${saleId}/status`);
            fetchTodaysActivity(); 
            Swal.fire('Updated', 'Bill status changed.', 'success');
        } catch (err) { Swal.fire('Error', 'Update failed', 'error'); }
    }
  };

  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);
  const balance = Math.max(0, grandTotal - (parseFloat(paid) || 0));

  return (
    <div className={`container-fluid p-4 custom-scrollbar`} style={{ height: '100vh', overflowY: 'auto', background: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa' }}>
      
      <div className="d-flex justify-content-between mb-4">
        <h3 className={`fw-bold ${theme.text}`}>Billing Hub</h3>
        <div className={`small ${theme.subText}`}>Date: {getTodayStr()}</div>
      </div>

      <div className="row g-4">
        {/* LEFT: INVOICE BUILDER */}
        <div className="col-lg-8">
          <div className={`card h-100 ${theme.card}`}>
            <div className={`card-header pt-4 pb-0 ${theme.cardHeader}`}>
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold m-0"><i className="bi bi-receipt me-2 text-primary"></i>New Invoice</h5>
                    <div className="btn-group btn-group-sm">
                        <button className={`btn fw-bold ${billingMode === 'registered' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setBillingMode('registered')}>Registered</button>
                        <button className={`btn fw-bold ${billingMode === 'guest' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`} onClick={() => setBillingMode('guest')}>Guest / Walk-in</button>
                    </div>
                </div>
            </div>
            
            <div className="card-body p-4">
              
              {/* CUSTOMER SECTION */}
              <div className="row g-3 mb-4 align-items-end">
                
                {billingMode === 'registered' ? (
                    <>
                        <div className="col-md-3">
                            <label className={`small fw-bold mb-1 ${theme.subText}`}>Filter</label>
                            <select className={`form-select ${theme.input}`} value={custCategoryFilter} onChange={e => setCustCategoryFilter(e.target.value)}>
                                <option value="All">All Categories</option>
                                <option value="Customer">Customer</option>
                                <option value="Dealer">Dealer</option>
                                <option value="Technician">Technician</option>
                            </select>
                        </div>
                        <div className="col-md-9">
                            <SearchableSelect label="Select Client" placeholder="Search Name..." options={customerOptions} value={custId} onChange={setCustId} theme={theme} darkMode={darkMode} />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="col-md-6">
                            <label className={`small fw-bold mb-1 ${theme.subText}`}>Guest Name</label>
                            <input type="text" className={`form-control ${theme.input}`} placeholder="Enter Name" value={guestInfo.name} onChange={e => setGuestInfo({...guestInfo, name: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className={`small fw-bold mb-1 ${theme.subText}`}>Phone (Optional)</label>
                            <input type="text" className={`form-control ${theme.input}`} placeholder="Phone" value={guestInfo.phone} onChange={e => setGuestInfo({...guestInfo, phone: e.target.value})} />
                        </div>
                    </>
                )}
              </div>

              <hr className={theme.text} />

              {/* PRODUCT FORM */}
              <form onSubmit={addToCart} className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                    <h6 className={`fw-bold ${theme.text}`}>Add Items</h6>
                    <div className="d-flex gap-3">
                        <div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={applyDiscount} onChange={() => setApplyDiscount(!applyDiscount)} /><label className={`form-check-label small ${theme.subText}`}>Discount</label></div>
                        <div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={enableWarranty} onChange={() => setEnableWarranty(!enableWarranty)} /><label className={`form-check-label small ${theme.subText}`}>Warranty</label></div>
                    </div>
                </div>

                <div className="row g-3 align-items-end">
                  <div className={applyDiscount || enableWarranty ? "col-md-4" : "col-md-6"}>
                    <SearchableSelect label="Product" placeholder="Search..." options={productOptions} value={prodId} onChange={handleProductSelect} theme={theme} darkMode={darkMode} />
                    {selectedProduct && <div className={`small mt-1 ${getRealtimeStock(selectedProduct) < (selectedProduct.low_stock_limit || 5) ? 'text-warning' : 'text-success'}`}>Stock: {getRealtimeStock(selectedProduct)} | Net: ₹{selectedProduct.net_price}</div>}
                  </div>
                  <div className="col-md-2"><label className="small fw-bold">MRP</label><input type="text" className={`form-control ${theme.inputReadOnly}`} value={price} readOnly /></div>
                  <div className="col-md-2">
                      <label className="small fw-bold">Qty</label>
                      <div className="input-group">
                          <button type="button" className="btn btn-outline-secondary px-2" onClick={decrementQty}>-</button>
                          <input type="number" className={`form-control text-center px-1 ${theme.input}`} value={qty} onChange={(e) => handleQtyChange(e.target.value)} />
                          <button type="button" className="btn btn-outline-secondary px-2" onClick={incrementQty}>+</button>
                      </div>
                  </div>
                  
                  {applyDiscount && (
                      <div className="col-md-2">
                          <label className="small fw-bold">Disc</label>
                          <input type="number" className={`form-control ${theme.input}`} value={discount} onChange={handleDiscountChange} />
                      </div>
                  )}
                  
                  {enableWarranty && (
                    <div className="col-md-12 mt-2 row g-2">
                        <div className="col-4"><input type="number" className={`form-control form-control-sm ${theme.input}`} placeholder="Duration" value={warrantyDuration} onChange={e => setWarrantyDuration(e.target.value)} /></div>
                        <div className="col-4"><select className={`form-select form-select-sm ${theme.input}`} value={warrantyUnit} onChange={e => setWarrantyUnit(e.target.value)}><option>Months</option><option>Years</option></select></div>
                        <div className="col-4"><input type="file" className={`form-control form-control-sm ${theme.input}`} onChange={handleImageSelect} /></div>
                    </div>
                  )}

                  <div className="col-md-2"><button className="btn btn-primary w-100 fw-bold" disabled={!selectedProduct}><i className="bi bi-plus-lg"></i> Add</button></div>
                </div>
                {errorMsg && <div className="alert alert-danger py-1 mt-2 small">{errorMsg}</div>}
              </form>

              {/* CART TABLE */}
              <div className={`table-responsive border rounded-3 mb-4 ${darkMode ? 'border-secondary' : ''}`}>
                <table className={`table mb-0 align-middle ${darkMode ? 'table-dark' : ''}`}>
                  <thead className={theme.tableHead}><tr><th className="ps-3">Item</th><th>Price</th><th>Qty</th><th className="text-end">Total</th><th></th></tr></thead>
                  <tbody>
                    {cart.map((item, idx) => (
                        <tr key={idx}>
                            <td className="ps-3 fw-bold">{item.product_name}<br/><small className="fw-normal text-muted">{item.warranty_duration > 0 ? `Warranty: ${item.warranty_duration} ${item.warranty_unit}` : ''}</small></td>
                            <td>₹{item.unit_price}</td>
                            <td>{item.quantity}</td>
                            <td className="text-end fw-bold">₹{item.total}</td>
                            <td><button className="btn btn-sm text-danger" onClick={() => removeFromCart(idx)}><i className="bi bi-trash"></i></button></td>
                        </tr>
                    ))}
                    {cart.length === 0 && <tr><td colSpan="5" className="text-center py-4 text-muted">Cart is empty</td></tr>}
                  </tbody>
                </table>
              </div>

              {/* PAYMENT BOX */}
              <div className="row justify-content-end">
                <div className="col-md-5">
                    <div className={`p-3 rounded border ${theme.paymentBox}`}>
                        <div className={`d-flex justify-content-between mb-2 ${theme.text}`}><span>Total:</span><span className="fw-bold">₹{grandTotal}</span></div>
                        <div className="input-group mb-2"><span className={`input-group-text ${theme.inputGroupText}`}>Paid ₹</span><input type="number" className={`form-control fw-bold ${theme.input}`} value={paid} onChange={handlePaidChange} /></div>
                        {paidError && <small className="text-danger d-block mb-2">{paidError}</small>}
                        <div className="d-flex justify-content-between pt-2 border-top"><span className="text-danger fw-bold">Balance:</span><span className="text-danger fw-bold">₹{balance}</span></div>
                        <button className="btn btn-success w-100 mt-3 fw-bold" onClick={handleSubmit} disabled={isSubmitting || cart.length === 0}>Generate Bill</button>
                    </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT: RECENT BILLS */}
        <div className="col-lg-4">
          <div className={`card h-100 ${theme.card}`}>
            <div className={`card-header pt-3 ${theme.cardHeader} d-flex justify-content-between`}>
                <h6 className={`fw-bold m-0 ${theme.text}`}>Today's Activity</h6>
                <span className={`badge ${theme.badge}`}>{todaysBills.length} Bills</span>
            </div>
            <div className="card-body p-0 overflow-auto" style={{maxHeight: 'calc(100vh - 180px)'}}>
                {todaysBills.length === 0 ? <div className={`text-center py-5 ${theme.subText}`}>No sales yet today.</div> : 
                    todaysBills.map(b => (
                        <div key={b.id} className={`p-3 border-bottom d-flex justify-content-between align-items-center ${theme.listGroupItem}`}>
                            <div>
                                <div className={`fw-bold ${theme.text}`}>{b.users?.name || b.guest_name || 'Guest'}</div>
                                <small className={theme.subText}>#{b.invoice_no}</small>
                            </div>
                            <div className="text-end">
                                <div className={`fw-bold ${theme.text}`}>₹{b.total_amount}</div>
                                <span onClick={() => toggleStatus(b.id)} className={`badge ${b.invoice_status === 'Cancelled' ? 'bg-danger' : 'bg-success'}`} style={{cursor: 'pointer'}}>{b.invoice_status}</span>
                            </div>
                        </div>
                    ))
                }
            </div>
          </div>
        </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? '#475569' : '#cbd5e1'}; border-radius: 10px; }`}</style>
    </div>
  );
};

export default Billing;