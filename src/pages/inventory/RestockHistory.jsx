import React, { useState, useContext, useEffect } from 'react';
import { GlobalContext } from '../../context/GlobalState';
import apiClient from '../../api/client';
import { useNavigate } from 'react-router-dom';

const RestockHistory = () => {
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
        itemActive: darkMode ? 'bg-primary text-white' : 'bg-light border-primary text-primary',
        itemInactive: darkMode ? 'bg-transparent text-secondary' : 'bg-white text-dark',
        input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-light border-0',
        btnBack: darkMode ? 'btn-outline-light' : 'btn-outline-dark'
    };

    // 1. Load Products on Mount
    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                const res = await apiClient.get('/inventory/products', {
                    params: { limit: 1000, page: 1, status: 'all' } 
                });
                const productList = res.data.data || []; 
                setProducts(productList);
            } catch (err) {
                console.error("Failed to load products", err);
            } finally {
                setLoadingProducts(false);
            }
        };
        fetchProducts();
    }, []);

    // 2. Fetch History when a product is clicked
    const handleProductClick = async (product) => {
        setSelectedProduct(product);
        setLoadingHistory(true);
        setHistoryLogs([]); 
        
        try {
            const res = await apiClient.get(`/inventory/history/${product.id}`);
            const logs = res.data.data || []; 
            setHistoryLogs(Array.isArray(logs) ? logs : []);
        } catch (err) {
            console.error(err);
            setHistoryLogs([]); 
        } finally {
            setLoadingHistory(false);
        }
    };

    // Filter Products
    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="container-fluid p-4" style={{ minHeight: '100vh', background: darkMode ? '#0f172a' : '#f8f9fa' }}>
            
            {/* PAGE HEADER WITH BACK BUTTON */}
            <div className="d-flex align-items-center mb-4">
                <button 
                    onClick={() => navigate(-1)} 
                    className={`btn me-3 ${theme.btnBack}`}
                    title="Go Back"
                >
                    <i className="bi bi-arrow-left fs-5"></i>
                </button>

                <div>
                    <h3 className={`fw-bold m-0 ${theme.text}`}>Restock History</h3>
                    <p className={`small m-0 ${theme.subText}`}>Track inventory additions.</p>
                </div>
            </div>

            <div className="row g-4 h-100">
                
                {/* LEFT PANEL: PRODUCT LIST */}
                <div className="col-md-4 col-lg-3">
                    <div className={`card h-100 ${theme.card}`} style={{maxHeight: '80vh'}}>
                        <div className="card-header border-0 bg-transparent p-3">
                            <input 
                                type="text" 
                                className={`form-control ${theme.input}`} 
                                placeholder="Search Product..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="card-body p-2 overflow-auto custom-scrollbar">
                            {loadingProducts ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className={`text-center py-4 ${theme.subText}`}>No products found.</div>
                            ) : (
                                <div className="list-group">
                                    {filteredProducts.map(prod => (
                                        <button 
                                            key={prod.id}
                                            onClick={() => handleProductClick(prod)}
                                            className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0 rounded mb-2 py-3 ${selectedProduct?.id === prod.id ? theme.itemActive : theme.itemInactive}`}
                                        >
                                            <div className="text-start">
                                                <div className="fw-bold mb-1 text-truncate" style={{maxWidth: '180px'}}>{prod.name}</div>
                                                <small style={{opacity: 0.7}}>Current Stock: {prod.stock_quantity}</small>
                                            </div>
                                            <i className="bi bi-chevron-right"></i>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: HISTORY DETAILS */}
                <div className="col-md-8 col-lg-9">
                    <div className={`card h-100 ${theme.card}`}>
                        <div className="card-body p-4">
                            {!selectedProduct ? (
                                // EMPTY STATE
                                <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center opacity-50">
                                    <i className="bi bi-box-seam display-1 mb-3"></i>
                                    <h5>Select a product to view history</h5>
                                </div>
                            ) : (
                                // HISTORY VIEW
                                <>
                                    <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3 border-secondary">
                                        <div>
                                            <h4 className={`fw-bold m-0 ${theme.text}`}>{selectedProduct.name}</h4>
                                            <span className="badge bg-primary mt-2">SKU: {selectedProduct.sku || 'N/A'}</span>
                                        </div>
                                        <div className="text-end">
                                            <div className={theme.subText}>Current Stock</div>
                                            <h2 className="fw-bold text-success m-0">{selectedProduct.stock_quantity}</h2>
                                        </div>
                                    </div>

                                    {loadingHistory ? (
                                        <div className="text-center py-5">
                                            <div className="spinner-border text-primary" role="status"></div>
                                            <div className="mt-2 small">Loading records...</div>
                                        </div>
                                    ) : historyLogs.length === 0 ? (
                                        <div className={`text-center py-5 ${theme.subText}`}>
                                            No restock history found for this product.
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className={`table align-middle ${darkMode ? 'table-dark' : 'table-hover'}`}>
                                                <thead>
                                                    <tr className={theme.subText}>
                                                        <th className="py-3">Date & Time</th>
                                                        <th>Quantity Added</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {historyLogs.map((log) => (
                                                        <tr key={log.id}>
                                                            <td className="fw-bold">
                                                                {new Date(log.created_at).toLocaleDateString()} 
                                                                <small className="d-block fw-normal text-muted">
                                                                    {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                </small>
                                                            </td>
                                                            <td>
                                                                <span className="badge bg-success bg-opacity-10 text-success border border-success px-3 py-2">
                                                                    <i className="bi bi-arrow-up-circle-fill me-2"></i>
                                                                    +{log.quantity_added}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

            </div>
            
            {/* Scrollbar CSS */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #888; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
            `}</style>
        </div>
    );
};

export default RestockHistory;