import React, { useState, useEffect, useContext, useMemo } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const InventoryReports = () => {
  const { darkMode } = useContext(GlobalContext);

  // --- VIEW STATE ---
  const [activeTab, setActiveTab] = useState('overview');

  // --- DATA STATE ---
  const [products, setProducts] = useState([]);
  const [restockLogs, setRestockLogs] = useState([]); 
  // Removed unused 'loading' state if not used in render logic significantly, or kept if needed for UI
  const [loading, setLoading] = useState(true);

  // --- FILTERS ---
  const [filterPeriod, setFilterPeriod] = useState('monthly'); 
  const [searchQuery, setSearchQuery] = useState('');

  // --- MODAL STATE ---
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productHistory, setProductHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // --- THEME ---
  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-secondary',
    card: darkMode ? 'bg-dark border border-secondary' : 'bg-white border shadow-sm',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-white',
    tableHeader: darkMode ? 'table-dark' : 'table-light',
    modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    modalHeader: darkMode ? 'border-secondary bg-dark' : 'border-bottom bg-white',
    btnClose: darkMode ? 'btn-close-white' : '',
    tabActive: 'btn-primary',
    tabInactive: 'btn-outline-secondary'
  };

  const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'overview') {
            const res = await apiClient.get('/inventory/products');
            setProducts(res.data);
        } else {
            const res = await apiClient.get(`/inventory/restock-history?period=${filterPeriod}`);
            setRestockLogs(res.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, filterPeriod]);

  // --- FETCH SPECIFIC PRODUCT HISTORY ---
  const handleRowClick = async (product) => {
      setSelectedProduct(product);
      setHistoryLoading(true);
      try {
          const res = await apiClient.get(`/inventory/restock-history/${product.id}`);
          setProductHistory(res.data);
      } catch (err) {
          console.error("Failed to fetch product history", err);
      } finally {
          setHistoryLoading(false);
      }
  };

  // --- CALCULATIONS (Overview) ---
  const overviewStats = useMemo(() => {
    if (activeTab !== 'overview') return {};
    let totalValue = 0, totalItems = 0, lowStock = 0, outStock = 0;
    const categoryData = {};

    products.forEach(p => {
        const stock = p.stock_quantity || 0;
        const val = stock * (p.purchase_price || 0);
        totalItems += stock;
        totalValue += val;
        if (stock === 0) outStock++;
        else if (stock <= (p.low_stock_limit || 5)) lowStock++;

        const cat = p.category_name || 'Other';
        categoryData[cat] = (categoryData[cat] || 0) + val;
    });

    const chartData = Object.keys(categoryData)
        .map(k => ({ name: k, Value: categoryData[k] }))
        .sort((a,b) => b.Value - a.Value).slice(0,8);

    return { totalValue, totalItems, lowStock, outStock, chartData };
  }, [products, activeTab]);

  // --- FILTERED PRODUCTS FOR SEARCH ---
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="container-fluid p-4 custom-scrollbar" style={{ height: '100vh', background: theme.container, overflowY: 'auto' }}>
      
      {/* HEADER & TABS */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 animate__animated animate__fadeInDown">
        <div>
          <h3 className={`fw-bold m-0 ${theme.text}`}>Inventory Reports</h3>
          <p className={`small m-0 ${theme.subText}`}>Manage stock levels & restock history</p>
        </div>
        
        <div className="btn-group shadow-sm">
            <button className={`btn btn-sm fw-bold px-4 ${activeTab === 'overview' ? theme.tabActive : theme.tabInactive}`} onClick={() => setActiveTab('overview')}>
                <i className="bi bi-grid-fill me-2"></i>Stock Overview
            </button>
            <button className={`btn btn-sm fw-bold px-4 ${activeTab === 'restock' ? theme.tabActive : theme.tabInactive}`} onClick={() => setActiveTab('restock')}>
                <i className="bi bi-clock-history me-2"></i>Restock History
            </button>
        </div>
      </div>

      {loading && activeTab === 'overview' && products.length === 0 ? (
          <div className={`text-center py-5 ${theme.text}`}>Loading data...</div>
      ) : (
        <>
          {/* VIEW 1: STOCK OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="animate__animated animate__fadeIn">
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className={`card h-100 p-4 ${theme.card}`} style={{ borderLeft: '5px solid #3b82f6', borderRadius: '8px' }}>
                            <h6 className="text-secondary fw-bold small">TOTAL ASSET VALUE</h6>
                            <h2 className={`fw-bold mb-0 ${theme.text}`}>{formatINR(overviewStats.totalValue || 0)}</h2>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className={`card h-100 p-4 ${theme.card}`} style={{ borderLeft: '5px solid #8b5cf6', borderRadius: '8px' }}>
                            <h6 className="text-secondary fw-bold small">TOTAL UNITS</h6>
                            <h2 className={`fw-bold mb-0 ${theme.text}`}>{overviewStats.totalItems || 0}</h2>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className={`card h-100 p-4 ${theme.card}`} style={{ borderLeft: '5px solid #f59e0b', borderRadius: '8px' }}>
                            <h6 className="text-secondary fw-bold small">LOW STOCK</h6>
                            <h2 className={`fw-bold mb-0 ${theme.text}`}>{overviewStats.lowStock || 0}</h2>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className={`card h-100 p-4 ${theme.card}`} style={{ borderLeft: '5px solid #ef4444', borderRadius: '8px' }}>
                            <h6 className="text-secondary fw-bold small">OUT OF STOCK</h6>
                            <h2 className={`fw-bold mb-0 ${theme.text}`}>{overviewStats.outStock || 0}</h2>
                        </div>
                    </div>
                </div>

                <div className="row g-4">
                    {/* CHART SECTION */}
                    <div className="col-lg-8">
                        <div className={`card rounded-3 p-4 h-100 ${theme.card}`}>
                            <h5 className={`fw-bold mb-3 ${theme.text}`}>Stock Value by Category</h5>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={overviewStats.chartData || []}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                        <XAxis dataKey="name" stroke={darkMode ? '#9ca3af' : '#4b5563'} />
                                        <YAxis stroke={darkMode ? '#9ca3af' : '#4b5563'} />
                                        <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '8px' }} />
                                        <Bar dataKey="Value" fill="#3b82f6" radius={[4,4,0,0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* SEARCHABLE TABLE SECTION */}
                    <div className="col-lg-4">
                        <div className={`card rounded-3 h-100 ${theme.card} d-flex flex-column`}>
                            <div className={`card-header py-3 ${theme.card} border-bottom`}>
                                <input 
                                    type="text" 
                                    className={`form-control form-control-sm ${theme.input}`} 
                                    placeholder="Search Product to view history..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="table-responsive flex-grow-1" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <table className="table mb-0 align-middle table-hover">
                                    <thead className={theme.tableHeader} style={{position: 'sticky', top: 0}}>
                                        <tr>
                                            <th className="ps-3">Product</th>
                                            <th className="text-center">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className={darkMode ? 'border-secondary' : ''}>
                                        {filteredProducts.map(p => (
                                            <tr 
                                                key={p.id} 
                                                className={theme.text} 
                                                style={{cursor: 'pointer'}} 
                                                onClick={() => handleRowClick(p)}
                                            >
                                                <td className="ps-3">
                                                    <div className="fw-bold small">{p.name}</div>
                                                    <div className={`small ${theme.subText}`} style={{fontSize: '0.7rem'}}>{p.sku}</div>
                                                </td>
                                                <td className="text-center">
                                                    <span className={`badge rounded-pill ${p.stock_quantity > 5 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                                        {p.stock_quantity}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* VIEW 2: RESTOCK HISTORY (ALL) */}
          {activeTab === 'restock' && (
            <div className="animate__animated animate__fadeIn">
                <div className="d-flex justify-content-end mb-3 gap-2">
                    <select className={`form-select form-select-sm ${theme.input}`} style={{width: '150px'}} value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
                        <option value="weekly">Last 7 Days</option>
                        <option value="monthly">Last 30 Days</option>
                        <option value="all">All Time</option>
                    </select>
                    <button className="btn btn-outline-primary btn-sm" onClick={() => window.print()}><i className="bi bi-printer"></i></button>
                </div>

                <div className={`card rounded-3 ${theme.card}`}>
                    <div className={`card-header py-3 ${theme.card} border-bottom`}>
                        <h6 className="m-0 fw-bold">Recent Restock Logs</h6>
                    </div>
                    <div className="table-responsive">
                        <table className="table mb-0 align-middle">
                            <thead className={theme.tableHeader}>
                                <tr>
                                    <th className="ps-4">Date</th>
                                    <th>Product Name</th>
                                    <th className="text-center">Qty Added</th>
                                </tr>
                            </thead>
                            <tbody className={darkMode ? 'border-secondary' : ''}>
                                {restockLogs.map(log => (
                                    <tr key={log.id} className={theme.text}>
                                        <td className="ps-4 text-secondary small">{new Date(log.created_at).toLocaleString()}</td>
                                        <td className="fw-bold">{log.products?.name}</td>
                                        <td className="text-center text-success fw-bold">+{log.quantity_added}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}
        </>
      )}

      {/* =========================================
          PRODUCT DETAILS MODAL
         ========================================= */}
      {selectedProduct && (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
            <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className={`modal-content ${theme.modalContent}`}>
                        <div className={`modal-header ${theme.modalHeader}`}>
                            <div>
                                <h5 className="modal-title fw-bold">{selectedProduct.name}</h5>
                                <span className={`badge ${theme.subText} border`}>{selectedProduct.sku}</span>
                            </div>
                            <button type="button" className={`btn-close ${theme.btnClose}`} onClick={() => setSelectedProduct(null)}></button>
                        </div>
                        <div className="modal-body p-4">
                            {/* Stats */}
                            <div className="row g-2 mb-4 text-center">
                                <div className="col-4">
                                    <div className={`p-2 rounded border ${darkMode ? 'border-secondary' : ''}`}>
                                        <small className={theme.subText}>Current Stock</small>
                                        <div className="fw-bold fs-5 text-primary">{selectedProduct.stock_quantity}</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className={`p-2 rounded border ${darkMode ? 'border-secondary' : ''}`}>
                                        <small className={theme.subText}>Net Price</small>
                                        <div className="fw-bold fs-5">{formatINR(selectedProduct.purchase_price || 0)}</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className={`p-2 rounded border ${darkMode ? 'border-secondary' : ''}`}>
                                        <small className={theme.subText}>Total Value</small>
                                        <div className="fw-bold fs-5 text-success">
                                            {formatINR((selectedProduct.stock_quantity || 0) * (selectedProduct.purchase_price || 0))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* History Table */}
                            <h6 className={`fw-bold mb-3 ${theme.text}`}>Restock History</h6>
                            {historyLoading ? (
                                <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary"></div></div>
                            ) : productHistory.length === 0 ? (
                                <p className={`text-center small py-3 ${theme.subText}`}>No restock history found.</p>
                            ) : (
                                <div className="table-responsive border rounded" style={{maxHeight: '200px'}}>
                                    <table className={`table table-sm mb-0 ${darkMode ? 'table-dark' : ''}`}>
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="ps-3">Date</th>
                                                <th className="text-end pe-3">Qty Added</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productHistory.map(h => (
                                                <tr key={h.id}>
                                                    <td className="ps-3 small">{new Date(h.created_at).toLocaleDateString()}</td>
                                                    <td className="text-end pe-3 fw-bold text-success">+{h.quantity_added}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 8px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(150, 150, 150, 0.3); border-radius: 20px; }`}</style>
    </div>
  );
};

export default InventoryReports;