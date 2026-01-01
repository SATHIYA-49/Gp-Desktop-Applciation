import React, { useState, useEffect, useContext, useMemo } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const InventoryReports = () => {
  const { darkMode } = useContext(GlobalContext);

  // --- VIEW STATE ---
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'restock'

  // --- DATA STATE ---
  const [products, setProducts] = useState([]);
  const [restockLogs, setRestockLogs] = useState([]); 
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

  // --- SAFE FORMATTER ---
  const formatINR = (amount) => {
      const num = Number(amount);
      if (isNaN(num)) return "₹0";
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'overview') {
            const res = await apiClient.get('/inventory/products');
            setProducts(Array.isArray(res.data) ? res.data : []);
        }
        
        if (activeTab === 'restock') {
            const res = await apiClient.get(`/inventory/restock-history?period=${filterPeriod}`);
            setRestockLogs(Array.isArray(res.data) ? res.data : []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setProducts([]); 
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
      setProductHistory([]);
      try {
          const res = await apiClient.get(`/inventory/restock-history/${product.id}`);
          setProductHistory(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
          console.error("Failed to fetch product history", err);
      } finally {
          setHistoryLoading(false);
      }
  };

  // --- CALCULATIONS: OVERVIEW STATS ---
  const overviewStats = useMemo(() => {
    if (activeTab !== 'overview') return {};
    let totalValue = 0, totalItems = 0, lowStock = 0, outStock = 0;

    products.forEach(p => {
        const price = Number(p.net_price) || Number(p.purchase_price) || 0;
        const stock = Number(p.stock_quantity) || 0;
        const lowLimit = Number(p.low_stock_limit) || 5;

        const val = stock * price;
        totalItems += stock;
        totalValue += val;
        
        if (stock === 0) outStock++;
        else if (stock <= lowLimit) lowStock++;
    });

    return { totalValue, totalItems, lowStock, outStock };
  }, [products, activeTab]);


  // --- CALCULATIONS: RESTOCK CHART & TOTALS ---
  const restockStats = useMemo(() => {
      if (activeTab !== 'restock' || restockLogs.length === 0) return { chartData: [], totalQty: 0 };

      const grouped = {};
      let totalQty = 0;
      
      restockLogs.forEach(log => {
          const qty = Number(log.quantity_added) || 0;
          totalQty += qty;
          const dateStr = new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          grouped[dateStr] = (grouped[dateStr] || 0) + qty;
      });

      const chartData = Object.keys(grouped).map(date => ({
          date: date,
          Quantity: grouped[date]
      })).reverse(); 

      return { chartData, totalQty };

  }, [restockLogs, activeTab]);


  // --- FILTERED PRODUCTS FOR SEARCH ---
  const filteredProducts = products.filter(p => 
    (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
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
                <i className="bi bi-grid-fill me-2"></i>Overview
            </button>
            <button className={`btn btn-sm fw-bold px-4 ${activeTab === 'restock' ? theme.tabActive : theme.tabInactive}`} onClick={() => setActiveTab('restock')}>
                <i className="bi bi-clock-history me-2"></i>History
            </button>
        </div>
      </div>

      {loading && products.length === 0 && restockLogs.length === 0 ? (
          <div className={`text-center py-5 ${theme.text}`}>
              <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading data...</p>
          </div>
      ) : (
        <>
          {/* VIEW 1: STOCK OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="animate__animated animate__fadeIn">
                {/* Stats Cards */}
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className={`card h-100 p-4 ${theme.card}`} style={{ borderLeft: '5px solid #3b82f6', borderRadius: '8px' }}>
                            <h6 className="text-secondary fw-bold small">TOTAL ASSET VALUE</h6>
                            <h2 className={`fw-bold mb-0 ${theme.text}`}>{formatINR(overviewStats.totalValue)}</h2>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className={`card h-100 p-4 ${theme.card}`} style={{ borderLeft: '5px solid #8b5cf6', borderRadius: '8px' }}>
                            <h6 className="text-secondary fw-bold small">TOTAL UNITS</h6>
                            <h2 className={`fw-bold mb-0 ${theme.text}`}>{overviewStats.totalItems}</h2>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className={`card h-100 p-4 ${theme.card}`} style={{ borderLeft: '5px solid #f59e0b', borderRadius: '8px' }}>
                            <h6 className="text-secondary fw-bold small">LOW STOCK</h6>
                            <h2 className={`fw-bold mb-0 ${theme.text}`}>{overviewStats.lowStock}</h2>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className={`card h-100 p-4 ${theme.card}`} style={{ borderLeft: '5px solid #ef4444', borderRadius: '8px' }}>
                            <h6 className="text-secondary fw-bold small">OUT OF STOCK</h6>
                            <h2 className={`fw-bold mb-0 ${theme.text}`}>{overviewStats.outStock}</h2>
                        </div>
                    </div>
                </div>

                {/* FULL WIDTH TABLE */}
                <div className={`card rounded-3 h-100 ${theme.card} d-flex flex-column`}>
                    <div className={`card-header py-3 ${theme.card} border-bottom`}>
                        <div className="d-flex justify-content-between align-items-center">
                            <h6 className={`m-0 fw-bold ${theme.text}`}>All Products Stock List</h6>
                            <input 
                                type="text" 
                                className={`form-control form-control-sm ${theme.input}`} 
                                placeholder="Search Product or SKU..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{maxWidth: '300px'}}
                            />
                        </div>
                    </div>
                    <div className="table-responsive flex-grow-1" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        <table className="table mb-0 align-middle table-hover">
                            <thead className={theme.tableHeader} style={{position: 'sticky', top: 0, zIndex: 5}}>
                                <tr>
                                    <th className="ps-4">Product Name</th>
                                    <th>SKU</th>
                                    {/* CHANGED: Category -> Sell Price */}
                                    <th className="text-end">Sell Price</th> 
                                    <th className="text-end">Net Price</th>
                                    <th className="text-center">Stock Level</th>
                                    <th className="text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className={darkMode ? 'border-secondary' : ''}>
                                {filteredProducts.map(p => {
                                    // --- SAFE ROW VARIABLES ---
                                    const stock = Number(p.stock_quantity) || 0;
                                    const lowLimit = Number(p.low_stock_limit) || 5;
                                    
                                    // Prices
                                    const netPrice = Number(p.net_price) || Number(p.purchase_price) || 0;
                                    const sellPrice = Number(p.sell_price) || Number(p.selling_price) || 0;

                                    return (
                                        <tr key={p.id} className={theme.text} style={{cursor: 'pointer'}} onClick={() => handleRowClick(p)}>
                                            <td className="ps-4 fw-bold">{p.name || 'Unnamed Product'}</td>
                                            <td className={`small ${theme.subText}`}>{p.sku || '-'}</td>
                                            
                                            {/* CHANGED: Show Sell Price instead of Category */}
                                            <td className="text-end fw-bold">{formatINR(sellPrice)}</td>
                                            
                                            <td className="text-end text-secondary small">{formatINR(netPrice)}</td>
                                            
                                            <td className="text-center">
                                                <span className={`badge rounded-pill px-3 ${stock > lowLimit ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                                                    {stock}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                {stock === 0 ? (
                                                    <span className="badge bg-danger">Out of Stock</span>
                                                ) : stock <= lowLimit ? (
                                                    <span className="badge bg-warning text-dark">Low</span>
                                                ) : (
                                                    <span className="badge bg-success">Good</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredProducts.length === 0 && (
                                    <tr><td colSpan="6" className="text-center py-4 text-muted">No products found matching your search.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}

          {/* VIEW 2: RESTOCK HISTORY (GRAPH + FLAT LIST) */}
          {activeTab === 'restock' && (
            <div className="animate__animated animate__fadeIn">
               <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className={`fw-bold m-0 ${theme.text}`}>Restock Activity</h5>
                    <div className="d-flex gap-2">
                        <select className={`form-select form-select-sm ${theme.input}`} style={{width: '150px'}} value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
                            <option value="weekly">Last 7 Days</option>
                            <option value="monthly">Last 30 Days</option>
                            <option value="all">All Time</option>
                        </select>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => window.print()}><i className="bi bi-printer"></i></button>
                    </div>
                </div>

                <div className="row g-4">
                    {/* LEFT: GRAPH */}
                    <div className="col-lg-5">
                        <div className={`card rounded-3 p-4 h-100 ${theme.card}`}>
                            <h6 className={`fw-bold mb-4 ${theme.subText} text-uppercase`} style={{fontSize: '0.75rem'}}>Incoming Volume</h6>
                            <div style={{ height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={restockStats.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                        <XAxis dataKey="date" stroke={darkMode ? '#9ca3af' : '#4b5563'} tick={{fontSize: 12}} />
                                        <YAxis stroke={darkMode ? '#9ca3af' : '#4b5563'} tick={{fontSize: 12}} />
                                        <Tooltip 
                                            cursor={{fill: 'transparent'}}
                                            contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '8px', border: '1px solid #374151' }} 
                                        />
                                        <Bar name="Items Added" dataKey="Quantity" fill="#10b981" radius={[4,4,0,0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: FLAT DETAILED LIST */}
                    <div className="col-lg-7">
                        <div className={`card rounded-3 h-100 ${theme.card} d-flex flex-column`} style={{maxHeight: '600px'}}>
                            <div className={`card-header py-3 ${theme.card} border-bottom d-flex justify-content-between align-items-center`}>
                                <h6 className="m-0 fw-bold">Detailed Log</h6>
                                <div className="badge bg-success-subtle text-success border border-success-subtle">
                                    Total Added: {restockStats.totalQty}
                                </div>
                            </div>

                            <div className="flex-grow-1 overflow-auto custom-scrollbar">
                                <table className="table mb-0 align-middle table-hover">
                                    <thead className={theme.tableHeader} style={{position: 'sticky', top: 0, zIndex: 10}}>
                                        <tr>
                                            <th className="ps-4">Date</th>
                                            <th>Product Details</th>
                                            <th className="text-end pe-4">Restocked Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className={darkMode ? 'border-secondary' : ''}>
                                        {restockLogs.length === 0 ? (
                                            <tr><td colSpan="3" className="text-center py-5 text-muted">No records found.</td></tr>
                                        ) : (
                                            restockLogs.map(log => (
                                                <tr key={log.id} className={theme.text}>
                                                    <td className="ps-4">
                                                        <div className="fw-bold small">{new Date(log.created_at).toLocaleDateString()}</div>
                                                        <div className={`small ${theme.subText}`} style={{fontSize: '0.7rem'}}>
                                                            {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="fw-bold small">{log.products?.name || 'Unknown'}</div>
                                                        <div className={`small ${theme.subText}`} style={{fontSize: '0.7rem'}}>{log.products?.sku || '-'}</div>
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 px-3">
                                                            +{log.quantity_added}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </>
      )}

      {/* MODAL */}
      {selectedProduct && (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
            <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className={`modal-content ${theme.modalContent}`}>
                        <div className={`modal-header ${theme.modalHeader}`}>
                            <div>
                                <h5 className="modal-title fw-bold">{selectedProduct.name || 'Product Details'}</h5>
                                <span className={`badge ${theme.subText} border`}>{selectedProduct.sku || '-'}</span>
                            </div>
                            <button type="button" className={`btn-close ${theme.btnClose}`} onClick={() => setSelectedProduct(null)}></button>
                        </div>
                        <div className="modal-body p-4">
                            <div className="row g-2 mb-4 text-center">
                                <div className="col-4">
                                    <div className={`p-2 rounded border ${darkMode ? 'border-secondary' : ''}`}>
                                        <small className={theme.subText}>Stock</small>
                                        <div className="fw-bold fs-5 text-primary">{Number(selectedProduct.stock_quantity) || 0}</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className={`p-2 rounded border ${darkMode ? 'border-secondary' : ''}`}>
                                        <small className={theme.subText}>Net Price</small>
                                        <div className="fw-bold fs-5">{formatINR(selectedProduct.net_price || selectedProduct.purchase_price)}</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className={`p-2 rounded border ${darkMode ? 'border-secondary' : ''}`}>
                                        <small className={theme.subText}>Total Value</small>
                                        <div className="fw-bold fs-5 text-success">
                                            {formatINR((Number(selectedProduct.stock_quantity) || 0) * (Number(selectedProduct.net_price || selectedProduct.purchase_price) || 0))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <h6 className={`fw-bold mb-3 ${theme.text}`}>Restock History Log</h6>
                            
                            {historyLoading ? (
                                <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary"></div></div>
                            ) : productHistory.length === 0 ? (
                                <div className={`text-center py-4 border rounded ${darkMode ? 'border-secondary' : ''}`}>
                                    <p className={`small m-0 ${theme.subText}`}>No restock history found for this item.</p>
                                </div>
                            ) : (
                                <div className="table-responsive border rounded" style={{maxHeight: '250px'}}>
                                    <table className={`table table-sm mb-0 align-middle ${darkMode ? 'table-dark' : ''}`}>
                                        <thead className={theme.tableHeader} style={{position: 'sticky', top: 0}}>
                                            <tr>
                                                <th className="ps-3">Restock Date</th>
                                                <th className="text-end pe-4">Quantity Added</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productHistory.map(h => (
                                                <tr key={h.id}>
                                                    <td className="ps-3 small">
                                                        <div className="fw-bold">{new Date(h.created_at).toLocaleDateString()}</div>
                                                        <div className="text-secondary" style={{fontSize:'0.75rem'}}>
                                                            {new Date(h.created_at).toLocaleTimeString()}
                                                        </div>
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2">
                                                            <i className="bi bi-arrow-up me-1"></i>{h.quantity_added}
                                                        </span>
                                                    </td>
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