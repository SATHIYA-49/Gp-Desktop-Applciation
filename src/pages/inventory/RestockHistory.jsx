import React, { useState, useContext, useEffect, useCallback } from 'react';
import { GlobalContext } from '../../context/GlobalState';
import apiClient from '../../api/client';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

// --- 1. TOAST CONFIGURATION ---
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
});

const RestockHistory = () => {
    // ✅ FIX: Removed unused 'loadInventoryData' and 'brands' to clear ESLint warnings
    const { darkMode } = useContext(GlobalContext); 
    const navigate = useNavigate();
    
    // Local State
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [historyLogs, setHistoryLogs] = useState([]); 
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(true);

    const theme = {
        text: darkMode ? 'text-white' : 'text-dark',
        subText: darkMode ? 'text-white-50' : 'text-muted',
        card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
        itemActive: darkMode ? 'bg-primary text-white shadow' : 'bg-light border-primary text-primary shadow-sm',
        itemInactive: darkMode ? 'bg-transparent text-secondary border-0' : 'bg-white text-dark border-0',
        input: darkMode ? 'bg-secondary text-white border-secondary shadow-none' : 'bg-light border-0',
        btnBack: darkMode ? 'btn-outline-light' : 'btn-outline-dark',
        tableHead: darkMode ? 'bg-secondary bg-opacity-25' : 'bg-light'
    };

    // 1. Load Products on Mount (Backend Sync: res.data.object.items)
    const fetchAllProducts = useCallback(async () => {
        setLoadingProducts(true);
        try {
            const res = await apiClient.get('/inventory/products', {
                params: { limit: 1000, page: 1, status: 'all' } 
            });
            // ✅ Sync with backend wrapper structure
            const productList = res.data.object?.items || res.data.data || [];
            setProducts(productList);
        } catch (err) {
            console.error("Failed to load products", err);
            Toast.fire({ icon: 'error', title: 'Could not load product list' });
        } finally {
            setLoadingProducts(false);
        }
    }, []);

    useEffect(() => {
        fetchAllProducts();
    }, [fetchAllProducts]);

    // 2. Fetch History when a product is clicked (Backend Sync: res.data.object.data)
    const handleProductClick = async (product) => {
        setSelectedProduct(product);
        setLoadingHistory(true);
        setHistoryLogs([]); 
        
        try {
            const res = await apiClient.get(`/inventory/history/${product.id}`);
            // ✅ Sync with backend wrapper structure
            const logs = res.data.object?.data || res.data.data || []; 
            setHistoryLogs(Array.isArray(logs) ? logs : []);
        } catch (err) {
            const errorMsg = err.response?.data?.detail || "Could not retrieve history logs.";
            Swal.fire({ icon: 'error', title: 'History Fetch Failed', text: errorMsg });
            setHistoryLogs([]); 
        } finally {
            setLoadingHistory(false);
        }
    };

    // Filter Logic
    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="container-fluid p-0" style={{ height: '100vh', overflow: 'hidden', background: darkMode ? '#0f172a' : '#f8f9fa' }}>
            
            <div className="p-4 h-100 d-flex flex-column">
                
                {/* HEADER */}
                <div className="d-flex align-items-center mb-4">
                    <button onClick={() => navigate(-1)} className={`btn btn-sm rounded-pill px-3 ${theme.btnBack} me-3`}>
                        <i className="bi bi-arrow-left me-2"></i>Back
                    </button>
                    <div>
                        <h4 className={`fw-bold m-0 ${theme.text}`}>Stock Arrival Logs</h4>
                        <p className={`small m-0 ${theme.subText}`}>Audit history for additions.</p>
                    </div>
                </div>

                <div className="row g-4 flex-grow-1 overflow-hidden">
                    
                    {/* LEFT PANEL: PRODUCT LIST */}
                    <div className="col-md-4 col-lg-3 h-100">
                        <div className={`card h-100 rounded-4 border-0 shadow-sm ${theme.card} d-flex flex-column`}>
                            <div className="p-3 border-bottom border-secondary border-opacity-10">
                                <div className="position-relative">
                                    <i className={`bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 ${theme.subText}`}></i>
                                    <input 
                                        type="text" 
                                        className={`form-control form-control-sm rounded-pill ps-5 ${theme.input}`} 
                                        placeholder="Find product..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-grow-1 overflow-auto p-2 custom-scrollbar">
                                {loadingProducts ? (
                                    <div className="text-center py-5"><div className="spinner-border spinner-border-sm text-primary"></div></div>
                                ) : (
                                    <div className="list-group">
                                        {filteredProducts.map(prod => (
                                            <button 
                                                key={prod.id}
                                                onClick={() => handleProductClick(prod)}
                                                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0 rounded-3 mb-2 py-3 transition-all ${selectedProduct?.id === prod.id ? theme.itemActive : theme.itemInactive}`}
                                            >
                                                <div className="text-start overflow-hidden">
                                                    <div className="fw-bold small text-truncate">{prod.name}</div>
                                                    <small className="opacity-50 font-monospace" style={{fontSize: '0.65rem'}}>{prod.sku || 'NO-SKU'}</small>
                                                </div>
                                                <i className="bi bi-chevron-right small opacity-50"></i>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: HISTORY DETAILS */}
                    <div className="col-md-8 col-lg-9 h-100">
                        <div className={`card h-100 rounded-4 border-0 shadow-sm ${theme.card} d-flex flex-column overflow-hidden`}>
                            <div className="card-body p-0 d-flex flex-column h-100">
                                {!selectedProduct ? (
                                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center opacity-25">
                                        <i className="bi bi-clock-history display-1 mb-3"></i>
                                        <h5 className="fw-bold">Select a product to view logs</h5>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-4 border-bottom border-secondary border-opacity-10 bg-primary bg-opacity-10">
                                            <div className="row align-items-center">
                                                <div className="col border-end border-secondary border-opacity-10">
                                                    <span className={`text-uppercase small fw-bold ${theme.subText}`}>Selected Asset</span>
                                                    <h5 className={`fw-bold m-0 mt-1 ${theme.text}`}>{selectedProduct.name}</h5>
                                                    <span className="badge bg-primary rounded-pill mt-2">SKU: {selectedProduct.sku || 'N/A'}</span>
                                                </div>
                                                <div className="col-auto text-center px-4">
                                                    <span className={`text-uppercase small fw-bold ${theme.subText}`}>Current Stock</span>
                                                    <h2 className="fw-bold text-success m-0">{selectedProduct.stock_quantity}</h2>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-grow-1 overflow-auto custom-scrollbar">
                                            {loadingHistory ? (
                                                <div className="text-center py-5">
                                                    <div className="spinner-border text-primary" role="status"></div>
                                                </div>
                                            ) : historyLogs.length === 0 ? (
                                                <div className={`text-center py-5 ${theme.subText}`}>
                                                    No restock entries found.
                                                </div>
                                            ) : (
                                                <table className={`table align-middle mb-0 ${darkMode ? 'table-dark' : 'table-hover'}`}>
                                                    <thead className={`${theme.tableHead} sticky-top shadow-sm`} style={{zIndex: 5}}>
                                                        <tr>
                                                            <th className="ps-4 py-3 border-0 small text-uppercase">Arrival Date</th>
                                                            <th className="border-0 small text-uppercase">Quantity Added</th>
                                                            <th className="border-0 small text-uppercase">System Time</th>
                                                            <th className="text-end pe-4 border-0 small text-uppercase">Log ID</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {historyLogs.map((log) => (
                                                            <tr key={log.id} className="border-bottom border-secondary border-opacity-10">
                                                                <td className="ps-4">
                                                                    <div className="fw-bold">{new Date(log.received_date || log.created_at).toLocaleDateString()}</div>
                                                                </td>
                                                                <td>
                                                                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 fw-bold">
                                                                        +{log.quantity} units
                                                                    </span>
                                                                </td>
                                                                <td className="small opacity-75">
                                                                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </td>
                                                                <td className="text-end pe-4">
                                                                    <small className="font-monospace opacity-50">#{log.id.split('-')[0]}</small>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #64748b; border-radius: 10px; }
                .transition-all { transition: all 0.2s ease; }
            `}</style>
        </div>
    );
};

export default RestockHistory;