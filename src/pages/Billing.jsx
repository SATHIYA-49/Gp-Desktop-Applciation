import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import Swal from 'sweetalert2'; 
import InvoicePreview from '../components/InvoicePreview'; 

const MY_COMPANY = {
    name: "GOLDEN POWER CARE",
    address: "No. 612, Neithal Street, New Housing Unit,\nAVP Azhagammal Nagar, Thanjavur - 613005",
    gstin: "33ABCDE1234F1Z5", 
    phone: "85115 49509",
    email: "support@goldenpowercare.com"
};

// --- Helper: SearchableSelect ---
const SearchableSelect = ({ options, value, onChange, placeholder, label, isTopLayer, theme, darkMode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);
    const safeOptions = Array.isArray(options) ? options : [];
    
    const filteredOptions = search.length > 0 
        ? safeOptions.filter(opt => 
            opt.label.toLowerCase().includes(search.toLowerCase()) || 
            (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
          )
        : [];

    const selectedItem = safeOptions.find(opt => opt.value === value);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) { setIsOpen(false); setSearch(''); }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="mb-1" ref={wrapperRef} style={{ position: 'relative' }}>
            <label className={`small fw-bold mb-2 d-block ${theme.subText}`}>{label}</label>
            <div className="position-relative">
                <div className={`input-group border shadow-sm rounded-3 overflow-hidden`} 
                     onClick={() => setIsOpen(true)} 
                     style={{ backgroundColor: darkMode ? '#2d3748' : '#fff', zIndex: isTopLayer ? 50 : 1, cursor: 'text', borderColor: darkMode ? '#4a5568' : '#dee2e6' }}>
                    <input type="text" className={`form-control border-0 shadow-none py-2 px-3 ${theme.text}`} 
                           placeholder={selectedItem ? selectedItem.label : placeholder} 
                           value={search} onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }} 
                           style={{ backgroundColor: 'transparent' }} />
                    <span className={`input-group-text border-0 bg-transparent ${theme.subText}`}><i className="bi bi-search small"></i></span>
                </div>
                {isOpen && search.length > 0 && (
                    <div className="position-absolute w-100 shadow-lg rounded-3 mt-1 overflow-auto custom-scrollbar border" 
                         style={{ maxHeight: '250px', zIndex: 9999, top: '100%', backgroundColor: darkMode ? '#1a202c' : '#fff', borderColor: darkMode ? '#4a5568' : '#dee2e6' }}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div key={opt.value} className={`p-3 border-bottom ${theme.text} item-hover`} style={{ cursor: 'pointer' }} onMouseDown={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}>
                                    <div className="fw-bold small">{opt.label}</div>
                                    {opt.subLabel && <div style={{ fontSize: '0.7rem' }} className={theme.subText}>{opt.subLabel}</div>}
                                </div>
                            ))
                        ) : <div className={`p-3 text-center small ${theme.subText}`}>No results found</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

const Billing = () => {
    const { customers, loadCustomers, darkMode } = useContext(GlobalContext);
    const [products, setProducts] = useState([]); 
    const [todaysBills, setTodaysBills] = useState([]); 
    const [billingMode, setBillingMode] = useState('registered'); 
    const [custId, setCustId] = useState('');
    const [guestInfo, setGuestInfo] = useState({ name: '', phone: '', gstin: '', address: '', serviceNo: '' });
    const [registeredGstin, setRegisteredGstin] = useState(''); 
    const [gstLoading, setGstLoading] = useState(false); // ✅ Now used in JSX
    const [fetchedGstPreview, setFetchedGstPreview] = useState(null);
    const [showPreview, setShowPreview] = useState(false); 
    const [prodId, setProdId] = useState('');
    const [qty, setQty] = useState(1);
    const [price, setPrice] = useState(0);       
    const [extraDiscount, setExtraDiscount] = useState('');
    const [cart, setCart] = useState([]);
    const [paid, setPaid] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [paidError, setPaidError] = useState(''); 

    const theme = {
        background: darkMode ? '#0f172a' : '#f4f7fe',
        cardBg: darkMode ? '#1e293b' : '#ffffff',
        inputBg: darkMode ? '#2d3748' : '#f8f9fa',
        text: darkMode ? 'text-white' : 'text-dark',
        subText: darkMode ? 'text-white-50' : 'text-secondary',
        border: darkMode ? 'border-secondary' : 'border-light',
        tableHead: darkMode ? 'bg-dark' : 'bg-light',
        input: darkMode ? 'bg-dark text-white border-secondary shadow-none' : 'bg-white text-dark border-light shadow-none'
    };

    const loadAllData = useCallback(async () => {
        try {
            if(loadCustomers) loadCustomers(); 
            const [prodRes, histRes] = await Promise.all([
                apiClient.get('/inventory/products?limit=500&status=active'),
                apiClient.get('/billing/history?filter=today')
            ]);
            setProducts(prodRes.data.data || []);
            setTodaysBills(histRes.data.data || []);
        } catch (err) { console.error(err); }
    }, [loadCustomers]);

    useEffect(() => { loadAllData(); }, [loadAllData]);

    const handleGstChange = async (e, type) => {
        const val = e.target.value.toUpperCase();
        if(type === 'guest') setGuestInfo(prev => ({ ...prev, gstin: val }));
        else setRegisteredGstin(val);
        
        if (val.length === 15) {
            setGstLoading(true);
            try {
                const res = await apiClient.get(`/tax/gst-lookup?gstin=${val}`);
                if(res.data?.valid) {
                    const tradeName = res.data.trade_name || "Verified User";
                    setFetchedGstPreview({ trade_name: tradeName, address: res.data.address });
                    if(type === 'guest') setGuestInfo(p => ({ ...p, name: tradeName, address: res.data.address }));
                }
            } catch (err) { setFetchedGstPreview(null); } finally { setGstLoading(false); }
        } else { setFetchedGstPreview(null); }
    };

    const handleProductSelect = (id) => {
        setProdId(id);
        const p = products.find(i => i.id === id);
        if (p) { setSelectedProduct(p); setPrice(p.sell_price); setQty(1); setErrorMsg(''); }
    };

    const removeFromCart = (index) => setCart(prev => prev.filter((_, i) => i !== index));

    const addToCart = (e) => {
        e.preventDefault();
        if (!selectedProduct) return;
        if (billingMode !== 'service' && parseInt(qty) > selectedProduct.stock_quantity) return setErrorMsg("Out of Stock!");
        setCart([...cart, {
            product_id: prodId, product_name: selectedProduct.name, quantity: parseInt(qty), 
            unit_price: parseFloat(price), total: parseFloat(price) * parseInt(qty)
        }]);
        setProdId(''); setSelectedProduct(null); setErrorMsg('');
    };

    const toggleBillStatus = async (billId, currentStatus) => {
        const newStatus = currentStatus === 'Accepted' ? 'Cancelled' : 'Accepted';
        try {
            await apiClient.put(`/billing/${billId}/status`, { status: newStatus });
            loadAllData();
            Swal.fire({ icon: 'success', title: 'Updated', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        } catch (err) { Swal.fire('Error', 'Update failed', 'error'); }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const finalData = {
                customer_id: billingMode === 'registered' ? custId : null,
                guest_name: billingMode !== 'registered' ? guestInfo.name : '',
                guest_phone: billingMode !== 'registered' ? guestInfo.phone : '',
                service_no: billingMode === 'service' ? guestInfo.serviceNo : '',
                items: cart, paid_amount: parseFloat(paid) || 0, extra_discount: parseFloat(extraDiscount) || 0,
                invoice_type: billingMode === 'service' ? 'Service' : 'Sales'
            };
            await apiClient.post('/billing/create', finalData);
            setCart([]); setPaid(''); setExtraDiscount(''); setShowPreview(false);
            loadAllData();
            Swal.fire({ icon: 'success', title: 'Invoice Saved!', showConfirmButton: false, timer: 1500 });
        } catch (err) { Swal.fire('Error', 'Failed to save', 'error'); }
        finally { setIsSubmitting(false); }
    };

    const subTotal = cart.reduce((acc, item) => acc + item.total, 0);
    const grandTotal = Math.max(0, subTotal - (parseFloat(extraDiscount) || 0));
    const balance = Math.max(0, grandTotal - (parseFloat(paid) || 0));

    const previewCustomer = billingMode === 'registered' 
        ? { name: customers.find(c => c.id === custId)?.name || 'Client', phone: '', gstin: registeredGstin }
        : { name: guestInfo.name || 'Guest', phone: guestInfo.phone, gstin: guestInfo.gstin, serviceNo: guestInfo.serviceNo };

    return (
        <div className="container-fluid" style={{ background: theme.background, height: '100vh', overflow: 'hidden' }}>
            <div className="row h-100 g-0">
                
                {/* LEFT: BILLING SECTION */}
                <div className="col-lg-9 h-100 custom-scrollbar" style={{ overflowY: 'auto', padding: '1.5rem' }}>
                    
                    <div className="card mb-4 border-0 rounded-4 overflow-visible shadow-sm" style={{ backgroundColor: theme.cardBg, zIndex: 1100 }}>
                        <div className="card-header bg-primary p-3 border-0 d-flex justify-content-between align-items-center text-white">
                            <h6 className="fw-bold m-0">Billing Details</h6>
                            <div className="btn-group p-1 bg-white bg-opacity-10 rounded-3">
                                <button className={`btn btn-sm fw-bold border-0 px-3 rounded-2 ${billingMode === 'registered' ? 'bg-white text-primary shadow-sm' : 'text-white'}`} onClick={() => setBillingMode('registered')}>Registered</button>
                                <button className={`btn btn-sm fw-bold border-0 px-3 rounded-2 ${billingMode === 'guest' ? 'bg-white text-primary shadow-sm' : 'text-white'}`} onClick={() => setBillingMode('guest')}>Guest</button>
                                <button className={`btn btn-sm fw-bold border-0 px-3 rounded-2 ${billingMode === 'service' ? 'bg-white text-primary shadow-sm' : 'text-white'}`} onClick={() => setBillingMode('service')}>Service</button>
                            </div>
                        </div>
                        <div className="card-body p-4 overflow-visible">
                            <div className="row g-3">
                                {billingMode === 'registered' && (
                                    <>
                                        <div className="col-md-8"><SearchableSelect label="Select Client" options={(customers || []).map(c => ({ value: c.id, label: c.name, subLabel: c.phone }))} value={custId} onChange={setCustId} darkMode={darkMode} isTopLayer={true} theme={theme} /></div>
                                        <div className="col-md-4">
                                            <label className={`small fw-bold mb-2 ${theme.subText}`}>GSTIN</label>
                                            <div className="position-relative">
                                                <input type="text" className={`form-control border rounded-3 text-uppercase ${theme.input} ${theme.text}`} value={registeredGstin} onChange={(e) => handleGstChange(e, 'registered')} maxLength={15} />
                                                {gstLoading && <div className="spinner-border spinner-border-sm text-primary position-absolute end-0 top-50 translate-middle me-3"></div>}
                                            </div>
                                        </div>
                                    </>
                                )}
                                {billingMode === 'guest' && (
                                    <>
                                        <div className="col-md-5"><label className={`small fw-bold mb-2 ${theme.subText}`}>Guest Name</label><input type="text" className={`form-control border rounded-3 ${theme.input}`} value={guestInfo.name} onChange={e => setGuestInfo({...guestInfo, name: e.target.value})} /></div>
                                        <div className="col-md-4"><label className={`small fw-bold mb-2 ${theme.subText}`}>Phone</label><input type="text" className={`form-control border rounded-3 ${theme.input}`} value={guestInfo.phone} onChange={e => setGuestInfo({...guestInfo, phone: e.target.value})} /></div>
                                        <div className="col-md-3">
                                            <label className={`small fw-bold mb-2 ${theme.subText}`}>GSTIN</label>
                                            <div className="position-relative">
                                                <input type="text" className={`form-control border rounded-3 text-uppercase ${theme.input}`} value={guestInfo.gstin} onChange={(e) => handleGstChange(e, 'guest')} maxLength={15} />
                                                {gstLoading && <div className="spinner-border spinner-border-sm text-primary position-absolute end-0 top-50 translate-middle me-3"></div>}
                                            </div>
                                        </div>
                                    </>
                                )}
                                {billingMode === 'service' && (
                                    <>
                                        <div className="col-md-4"><label className={`small fw-bold mb-2 ${theme.subText}`}>Service</label><input type="text" className={`form-control border rounded-3 text-uppercase ${theme.input}`} value={guestInfo.serviceNo} onChange={e => setGuestInfo({...guestInfo, serviceNo: e.target.value.toUpperCase()})} /></div>
                                        <div className="col-md-4"><label className={`small fw-bold mb-2 ${theme.subText}`}>Customer Name</label><input type="text" className={`form-control border rounded-3 ${theme.input}`} value={guestInfo.name} onChange={e => setGuestInfo({...guestInfo, name: e.target.value})} /></div>
                                        <div className="col-md-4"><label className={`small fw-bold mb-2 ${theme.subText}`}>Phone</label><input type="text" className={`form-control border rounded-3 ${theme.input}`} value={guestInfo.phone} onChange={e => setGuestInfo({...guestInfo, phone: e.target.value})} /></div>
                                    </>
                                )}
                            </div>
                            {fetchedGstPreview && billingMode !== 'service' && (
                                <div className="mt-3 p-3 rounded-3 bg-success bg-opacity-10 border border-success animate__animated animate__fadeIn"><small className="text-success fw-bold d-block">Verified: {fetchedGstPreview.trade_name}</small><small className={theme.subText}>{fetchedGstPreview.address}</small></div>
                            )}
                        </div>
                    </div>

                    {/* ITEMS TABLE */}
                    <div className="card border-0 rounded-4 shadow-sm" style={{ backgroundColor: theme.cardBg, zIndex: 1000 }}>
                        <div className={`card-header p-3 border-0 d-flex justify-content-between align-items-center ${darkMode ? 'bg-dark' : 'bg-light'}`}>
                            <h6 className={`fw-bold m-0 ${theme.text}`}><i className="bi bi-tools me-2 text-warning"></i>{billingMode === 'service' ? 'Service / Maintenance Items' : 'Billing Items'}</h6>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={addToCart} className="row g-3 align-items-end mb-4">
                                <div className="col-md-6"><SearchableSelect label="Search Item" options={(products || []).map(p => ({ value: p.id, label: p.name, subLabel: `Stock: ${p.stock_quantity}` }))} value={prodId} onChange={handleProductSelect} darkMode={darkMode} isTopLayer={false} theme={theme} /></div>
                                <div className="col-md-3">
                                    <label className={`small fw-bold mb-2 text-center d-block ${theme.subText}`}>Quantity</label>
                                    <div className="input-group rounded-3 overflow-hidden border shadow-sm">
                                        <button type="button" className="btn btn-light" onClick={() => setQty(q => Math.max(1, q - 1))}><i className="bi bi-dash"></i></button>
                                        <input type="number" className={`form-control border-0 text-center fw-bold ${theme.input}`} value={qty} onChange={(e) => setQty(e.target.value)} />
                                        <button type="button" className="btn btn-light" onClick={() => setQty(q => parseInt(q)+1)}><i className="bi bi-plus"></i></button>
                                    </div>
                                </div>
                                <div className="col-md-3"><button className="btn btn-primary w-100 py-2 rounded-3 fw-bold shadow-sm" disabled={!selectedProduct}>ADD</button></div>
                                {errorMsg && <div className="col-12 mt-2 text-danger small fw-bold text-center animate__animated animate__shakeX">{errorMsg}</div>}
                            </form>

                            <table className={`table align-middle ${darkMode ? 'table-dark' : 'table-hover'}`}>
                                <thead className={`${theme.tableHead} ${theme.subText} small uppercase`}>
                                    <tr><th className="ps-3 border-0 py-3">Description</th><th className="border-0">Price</th><th className="border-0 text-center">Qty</th><th className="text-end border-0 pe-3">Total</th><th className="border-0"></th></tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, idx) => (
                                        <tr key={idx} className={`border-bottom ${theme.border}`}>
                                            <td className={`ps-3 fw-bold ${theme.text}`}>{item.product_name}</td>
                                            <td className={theme.subText}>₹{item.unit_price}</td>
                                            <td className="text-center"><span className={`badge ${darkMode ? 'bg-secondary' : 'bg-light text-dark'} px-3 rounded-pill`}>{item.quantity}</span></td>
                                            <td className={`text-end fw-bold pe-3 ${theme.text}`}>₹{item.total}</td>
                                            <td className="text-end pe-3"><button className="btn btn-sm btn-outline-danger border-0 rounded-circle" onClick={() => removeFromCart(idx)}><i className="bi bi-trash-fill"></i></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {cart.length > 0 && (
                                <div className="mt-5 d-flex justify-content-end w-100 pb-4">
                                    <div className="p-4 rounded-4 shadow-sm border" style={{ backgroundColor: theme.inputBg, minWidth: '350px', width: '45%' }}>
                                        <div className="d-flex justify-content-between mb-3"><span className={theme.subText}>Subtotal</span><span className={`fw-bold ${theme.text}`}>₹{subTotal}</span></div>
                                        <div className="mb-3 d-flex justify-content-between align-items-center">
                                            <span className="text-success small fw-bold uppercase">Discount</span>
                                            <input type="number" className={`form-control form-control-sm border-0 bg-white rounded-2 shadow-sm text-end fw-bold ${theme.input}`} style={{width:'100px'}} value={extraDiscount} onChange={e => setExtraDiscount(e.target.value)} />
                                        </div>
                                        <div className="p-3 bg-primary text-white rounded-3 mb-3 d-flex justify-content-between align-items-center shadow-sm">
                                            <span className="fw-bold small">PAYABLE</span><h4 className="m-0 fw-bold">₹{grandTotal}</h4>
                                        </div>
                                        <div className="mb-3">
                                            <label className={`small fw-bold mb-1 ${theme.subText}`}>Amount Received</label>
                                            <input type="number" className={`form-control border-0 shadow-sm rounded-3 py-2 fw-bold ${theme.input}`} value={paid} onChange={(e) => { setPaid(e.target.value); setPaidError(parseFloat(e.target.value) > grandTotal ? "Exceeds total" : ""); }} />
                                            {paidError && <small className="text-danger fw-bold d-block mt-1">{paidError}</small>}
                                        </div>
                                        <div className="d-flex justify-content-between p-3 bg-danger bg-opacity-20 text-danger rounded-3 mb-4 fw-bold border border-danger border-opacity-25"><span>Balance Due</span><span>₹{balance}</span></div>
                                        <button className="btn btn-success w-100 py-3 rounded-3 fw-bold shadow-lg" onClick={() => setShowPreview(true)} disabled={isSubmitting}>
                                            {isSubmitting ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-file-earmark-check-fill me-2"></i>}
                                            GENERATE {billingMode === 'service' ? 'SERVICE' : 'SALES'} BILL
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: ACTIVITY SECTION */}
                <div className="col-lg-3 h-100 border-start shadow-sm" style={{ backgroundColor: theme.cardBg, overflowY: 'auto' }}>
                    <div className="sticky-top p-3 border-bottom d-flex justify-content-between align-items-center shadow-sm" style={{ backgroundColor: theme.cardBg, zIndex: 10 }}>
                        <h6 className={`fw-bold m-0 small uppercase ${theme.text}`}>Today's Activity</h6>
                        <span className="badge bg-primary rounded-pill px-3">{todaysBills.length}</span>
                    </div>
                    {todaysBills.map(b => (
                        <div key={b.id} className={`p-3 border-bottom d-flex justify-content-between align-items-center transition-all ${darkMode ? 'bg-dark bg-opacity-10 border-secondary' : 'bg-white border-light'}`}>
                            <div className="text-truncate" style={{maxWidth: '65%'}}>
                                <small className={`fw-bold d-block text-truncate text-uppercase ${theme.text}`}>{b.guest_name || b.users?.name || 'Client'}</small>
                                <small className={theme.subText}>{b.service_no ? `SN: ${b.service_no}` : `#${b.invoice_no}`}</small>
                            </div>
                            <div className="text-end">
                                <small className={`fw-bold d-block ${theme.text}`}>₹{b.total_amount}</small>
                                <span onClick={() => toggleBillStatus(b.id, b.invoice_status)} className={`badge rounded-pill border cursor-pointer ${b.invoice_status === 'Cancelled' ? 'bg-danger-subtle text-danger border-danger' : 'bg-success-subtle text-success border-success'}`} style={{fontSize:'0.65rem'}}>{b.invoice_status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <InvoicePreview show={showPreview} onClose={() => setShowPreview(false)} onSave={handleSubmit} company={MY_COMPANY} data={{ invoice_no: "DRAFT", date: new Date(), customer_name: previewCustomer.name, customer_phone: previewCustomer.phone, customer_gstin: previewCustomer.gstin, items: cart, sub_total: subTotal, extra_discount: parseFloat(extraDiscount)||0, grand_total: grandTotal, paid_amount: parseFloat(paid) || 0, balance: balance, serviceNo: previewCustomer.serviceNo }} />
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } .rounded-4 { border-radius: 18px !important; } .item-hover:hover { background-color: ${darkMode ? '#2d3748' : '#f8f9fa'} !important; }`}</style>
        </div>
    );
};

export default Billing;