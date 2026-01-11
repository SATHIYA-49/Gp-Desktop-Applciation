import React, { useState, useEffect, useContext, useCallback } from 'react';
import apiClient from '../api/client';
import { GlobalContext } from '../context/GlobalState';
import LowStockAlert from '../components/LowStockAlert'; 
import { useNavigate } from 'react-router-dom';
// --- DEBOUNCE HOOK ---
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const Inventory = () => {
  const navigate = useNavigate();
  const { brands, categories, subCategories, loadInventoryData, darkMode } = useContext(GlobalContext);

  // --- STATE ---
  const [productsData, setProductsData] = useState([]); 
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_items: 0 });
  const [loading, setLoading] = useState(false);

  // --- FILTERS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); 
  const debouncedSearch = useDebounce(searchTerm, 500);

  // --- UI STATE ---
  const [alertInfo, setAlertInfo] = useState({ show: false, type: '', message: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, type: null, title: '' });

  // --- FORM DATA ---
  // 🔥 SKU Removed, low_stock_limit Added
  const [newProduct, setNewProduct] = useState({
    name: '', brand_id: '', category_id: '', sub_category_id: '', 
    net_price: '', sell_price: '', warranty_details: '', 
    low_stock_limit: '', 
    is_active: true
  });
  const [filteredSubs, setFilteredSubs] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null); 

  // Restock Data
  const [restockData, setRestockData] = useState({ id: null, name: '', qty: '', received_date: '' });

  // Master Data State
  const [masterTab, setMasterTab] = useState('brand');
  const [masterInput, setMasterInput] = useState('');
  const [selectedParentCat, setSelectedParentCat] = useState(''); 
  const [masterList, setMasterList] = useState([]);
  const [editingMaster, setEditingMaster] = useState(null); 

  // --- THEME ---
  const theme = {
    bg: darkMode ? 'bg-dark' : 'bg-light',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-muted',
    card: darkMode ? 'bg-dark border-secondary' : 'bg-white shadow-sm border-0',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-white text-dark border',
    table: darkMode ? 'table-dark' : '', 
    tableHeader: darkMode ? 'table-dark' : 'table-light',
    tableRowText: darkMode ? 'text-white' : 'text-dark',
    modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    modalHeader: darkMode ? 'border-secondary bg-dark' : 'border-bottom bg-white',
    listGroupItem: darkMode ? 'bg-dark text-white border-secondary' : 'bg-white text-dark',
    btnGhost: darkMode ? 'btn-outline-light' : 'btn-outline-dark',
    btnClose: darkMode ? 'btn-close-white' : ''
  };

  // --- 1. FETCH PRODUCTS ---
  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/inventory/products', {
        params: { page, limit: 10, status: activeTab, search: debouncedSearch }
      });
      setProductsData(res.data.data || []); 
      setPagination(res.data.pagination || { current_page: 1, total_pages: 1, total_items: 0 });
    } catch (error) {
      setProductsData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    loadInventoryData(); 
    fetchProducts(1);    
  }, [fetchProducts, loadInventoryData]); 

  const showAlert = (type, message) => {
    setAlertInfo({ show: true, type, message });
    setTimeout(() => setAlertInfo({ show: false, type: '', message: '' }), 2500);
  };

  // --- HELPER FUNCTIONS ---
  const getBrandName = (id) => brands.find(b => b.id === id)?.name || 'Unknown';
  const getCatName = (id) => categories.find(c => c.id === id)?.name || 'Unknown';
  const getSubName = (id) => subCategories.find(s => s.id === id)?.name || '-';

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) fetchProducts(newPage);
  };

  const toggleActiveStatus = async (product) => {
      try {
          const newStatus = !product.is_active;
          setProductsData(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p));
          await apiClient.patch(`/inventory/products/${product.id}/status`, { is_active: newStatus });
          showAlert('success', `Status updated!`);
      } catch (err) {
          fetchProducts(pagination.current_page);
          showAlert('danger', "Failed to update status");
      }
  };

  // --- FORM HANDLERS ---
  const openCreateModal = () => {
      setEditingProduct(null);
      // 🔥 Reset form with no SKU
      setNewProduct({ name: '', brand_id: '', category_id: '', sub_category_id: '', net_price: '', sell_price: '', warranty_details: '', low_stock_limit: '', is_active: true });
      setFilteredSubs([]);
      setShowAddModal(true);
  };

  const openEditModal = (product) => {
      setEditingProduct(product);
      setNewProduct({
          name: product.name, 
          // SKU is intentionally omitted here as it's auto-generated/readonly
          brand_id: product.brand_id, 
          category_id: product.category_id,
          sub_category_id: product.sub_category_id || '', 
          net_price: product.net_price || '', 
          sell_price: product.sell_price || '',
          warranty_details: product.warranty_details || '', 
          low_stock_limit: product.low_stock_limit || '', // 🔥 Load existing threshold
          is_active: product.is_active ?? true
      });
      setFilteredSubs(subCategories.filter(s => String(s.category_id) === String(product.category_id)));
      setShowAddModal(true);
  };

  const handleCategoryChange = (e) => {
    const catId = e.target.value; 
    setNewProduct({ ...newProduct, category_id: catId, sub_category_id: '' });
    setFilteredSubs(subCategories.filter(s => String(s.category_id) === String(catId)));
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    if(!newProduct.name || !newProduct.brand_id || !newProduct.category_id || !newProduct.net_price || !newProduct.low_stock_limit) 
        return showAlert('warning', "Please fill required fields.");
    
    try {
      const payload = { 
        ...newProduct, 
        sku: null, // 🔥 Backend will auto-generate
        brand_id: String(newProduct.brand_id), 
        category_id: String(newProduct.category_id),
        sub_category_id: newProduct.sub_category_id ? String(newProduct.sub_category_id) : null,
        net_price: parseFloat(newProduct.net_price), 
        sell_price: parseFloat(newProduct.sell_price),
        low_stock_limit: parseInt(newProduct.low_stock_limit), // 🔥 Parse threshold as INT
        specifications: editingProduct ? editingProduct.specifications : {}
      };

      if (editingProduct) { 
          await apiClient.put(`/inventory/products/${editingProduct.id}`, payload); 
          showAlert('success', 'Product Updated!'); 
      } else { 
          await apiClient.post('/inventory/products', payload); 
          showAlert('success', 'Product Created!'); 
      }
      setShowAddModal(false); fetchProducts(pagination.current_page);
    } catch (err) { showAlert('danger', err.response?.data?.detail || "Failed to save product"); }
  };

  const openRestockModal = (product) => {
      const today = new Date().toISOString().split('T')[0];
      setRestockData({ id: product.id, name: product.name, qty: '', received_date: today });
      setShowRestockModal(true);
  };

  const submitRestock = async () => {
    const qty = parseInt(restockData.qty);
    if (!qty || qty <= 0) return showAlert('warning', "Enter valid qty");
    try {
      await apiClient.post('/inventory/restock', { product_id: String(restockData.id), quantity_arrived: qty, received_date: restockData.received_date });
      showAlert('success', 'Stock Updated!'); setShowRestockModal(false); fetchProducts(pagination.current_page);
    } catch (err) { showAlert('danger', "Restock Failed"); }
  };

  // --- MASTER DATA LOGIC ---
  useEffect(() => {
    setMasterInput(''); setEditingMaster(null); 
    if (masterTab === 'brand') setMasterList(brands);
    else if (masterTab === 'category') setMasterList(categories);
    else if (masterTab === 'sub-category') {
        if(selectedParentCat) setMasterList(subCategories.filter(s => String(s.category_id) === String(selectedParentCat)));
        else setMasterList([]);
    }
  }, [masterTab, selectedParentCat, brands, categories, subCategories]);

  const handleMasterSubmit = async () => {
    if (!masterInput.trim()) return;
    try {
      const endpoint = masterTab === 'brand' ? 'brands' : masterTab === 'category' ? 'categories' : 'sub-categories';
      const payload = { name: masterInput };
      if (masterTab === 'sub-category') {
          const catId = editingMaster ? editingMaster.category_id : selectedParentCat;
          if (!catId) return showAlert('warning', "Select Parent Category");
          payload.category_id = String(catId);
      }
      if (editingMaster) { await apiClient.put(`/inventory/${endpoint}/${editingMaster.id}`, payload); showAlert('success', `${masterTab} updated!`); } 
      else { await apiClient.post(`/inventory/${endpoint}`, payload); showAlert('success', `${masterTab} added!`); }
      setMasterInput(''); setEditingMaster(null); loadInventoryData();
    } catch (err) { showAlert('danger', "Action Failed"); }
  };

  const promptDelete = (id, type, name) => setConfirmModal({ show: true, id, type, title: name });

  const executeDelete = async () => {
      const { id, type } = confirmModal;
      setConfirmModal({ show: false, id: null, type: null, title: '' });
      try {
          const endpoint = `/inventory/${type === 'product' ? 'products' : type + 's'}/${id}`;
          await apiClient.delete(endpoint);
          if(type === 'product') fetchProducts(pagination.current_page);
          else loadInventoryData();
          showAlert('success', 'Item deleted.');
      } catch (err) { showAlert('danger', "Delete failed."); }
  };

  return (
    <div className={`container-fluid p-4 ${theme.text}`} style={{ minHeight: '100vh', background: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa', position: 'relative' }}>
      <button 
       className="btn btn-outline-primary" 
       onClick={() => navigate('/inventory/history')}
    >
       <i className="bi bi-clock-history me-2"></i> View Restock History
    </button>
      {/* ALERTS & WIDGETS */}
      {alertInfo.show && (
        <div className="shadow-lg rounded animate__animated animate__slideInDown" style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, backgroundColor: darkMode ? '#2c3034' : '#fff', borderLeft: `5px solid ${alertInfo.type === 'success' ? '#198754' : '#dc3545'}`, padding: '12px 20px', display: 'flex', alignItems: 'center' }}>
            <i className={`bi ${alertInfo.type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning'} fs-5 me-3`}></i><span className="fw-bold">{alertInfo.message}</span>
        </div>
      )}
      <div style={{ position: 'absolute', top: '90px', right: '20px', zIndex: 1050, maxWidth: '350px', width: '100%' }}>
          <LowStockAlert onRestockClick={openRestockModal} />
      </div>

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h3 className="fw-bold m-0">Inventory</h3><p className={`small m-0 ${theme.subText}`}>Manage your products and stock.</p></div>
        <div className="d-flex gap-2">
            <button className={`btn ${theme.btnGhost} fw-bold`} onClick={() => setShowMasterModal(true)}><i className="bi bi-tags me-2"></i> Brands/Category</button>
            <button className="btn btn-primary fw-bold shadow-sm" onClick={openCreateModal}><i className="bi bi-plus-lg me-2"></i> New Product</button>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div className="d-flex gap-2">
            <button className={`btn fw-bold px-4 rounded-pill shadow-sm ${activeTab === 'active' ? 'btn-primary' : 'btn-light border'}`} onClick={() => setActiveTab('active')}>Active</button>
            <button className={`btn fw-bold px-4 rounded-pill shadow-sm ${activeTab === 'inactive' ? 'btn-secondary' : 'btn-light border'}`} onClick={() => setActiveTab('inactive')}>Inactive</button>
        </div>
        <div className="position-relative" style={{ width: '300px' }}>
            <i className={`bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 ${theme.subText}`}></i>
            <input type="text" className={`form-control rounded-pill ps-5 ${theme.input} shadow-sm`} placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* TABLE */}
      <div className={`card overflow-hidden ${theme.card}`}>
        <div className="table-responsive">
            <table className={`table align-middle mb-0 ${theme.table}`}>
                <thead className={theme.tableHeader}>
                    <tr><th className="ps-4">Product Name</th><th>Brand</th><th>Category</th><th>Sub-Cat</th><th>Status</th><th>Stock</th><th>Price</th><th className="text-end pe-4">Actions</th></tr>
                </thead>
                <tbody className={darkMode ? 'border-secondary' : ''}>
                    {loading ? ( <tr><td colSpan="8" className="text-center py-5">Loading...</td></tr> ) : productsData.map(p => (
                        <tr key={p.id} className={!p.is_active ? 'opacity-50' : ''}>
                            {/* 🔥 SKU Removed from display */}
                            <td className="ps-4"><div className="fw-bold">{p.name}</div><div className="small opacity-50">{p.sku}</div></td>
                            <td>{getBrandName(p.brand_id)}</td>
                            <td>{getCatName(p.category_id)}</td>
                            <td>{getSubName(p.sub_category_id)}</td>
                            <td>
                              <div className="form-check form-switch">
                                <input className="form-check-input" type="checkbox" checked={p.is_active ?? true} onChange={() => toggleActiveStatus(p)} />
                              </div>
                            </td>
                            {/* 🔥 DYNAMIC LOW STOCK INDICATOR */}
                            <td>
                                <span className={`badge rounded-pill px-3 py-2 ${p.stock_quantity <= p.low_stock_limit ? 'bg-danger animate__animated animate__flash animate__infinite' : 'bg-success-subtle text-success'}`}>
                                    {p.stock_quantity} Units
                                </span>
                                {p.stock_quantity <= p.low_stock_limit && (
                                  <div className="text-danger x-small fw-bold mt-1">Reorder Now</div>
                                )}
                            </td>
                            <td className="fw-bold">₹{p.sell_price}</td>
                            <td className="text-end pe-4">
                                <button className="btn btn-sm btn-outline-warning me-2" onClick={() => openRestockModal(p)}><i className="bi bi-box-arrow-in-down"></i></button>
                                <button className="btn btn-sm btn-outline-info me-2" onClick={() => openEditModal(p)}><i className="bi bi-pencil-square"></i></button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => promptDelete(p.id, 'product', p.name)}><i className="bi bi-trash"></i></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center py-3">
          <small className={theme.subText}>Page {pagination.current_page} of {pagination.total_pages}</small>
          <div className="btn-group">
            <button className="btn btn-sm btn-outline-secondary" disabled={pagination.current_page === 1} onClick={() => handlePageChange(pagination.current_page - 1)}>Prev</button>
            <button className="btn btn-sm btn-outline-secondary" disabled={pagination.current_page === pagination.total_pages} onClick={() => handlePageChange(pagination.current_page + 1)}>Next</button>
          </div>
        </div>
      </div>

      {/* MODAL: ADD/EDIT */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className={`modal-content ${theme.modalContent}`}>
                    <div className={`modal-header ${theme.modalHeader}`}><h5 className="modal-title fw-bold">{editingProduct ? 'Edit' : 'New'} Product</h5><button className="btn-close" onClick={() => setShowAddModal(false)}></button></div>
                    <div className="modal-body p-4">
                        <form onSubmit={submitProduct}>
                            <div className="row g-3">
                                <div className="col-12"><label className="form-label small fw-bold">Name</label><input type="text" className={`form-control ${theme.input}`} required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                                {/* 🔥 SKU INPUT REMOVED */}
                                <div className="col-md-6"><label className="form-label small fw-bold">Brand</label><select className={`form-select ${theme.input}`} required value={newProduct.brand_id} onChange={e => setNewProduct({...newProduct, brand_id: e.target.value})}><option value="">Select Brand...</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                                <div className="col-md-6"><label className="form-label small fw-bold">Category</label><select className={`form-select ${theme.input}`} required value={newProduct.category_id} onChange={handleCategoryChange}><option value="">Select Category...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                <div className="col-md-6"><label className="form-label small fw-bold">Sub-Category</label><select className={`form-select ${theme.input}`} value={newProduct.sub_category_id} onChange={e => setNewProduct({...newProduct, sub_category_id: e.target.value})}><option value="">None</option>{filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                <div className="col-md-6"><label className="form-label small fw-bold text-warning">Low Stock Limit</label><input type="number" className={`form-control ${theme.input} border-warning`} required placeholder="e.g. 5" value={newProduct.low_stock_limit} onChange={e => setNewProduct({...newProduct, low_stock_limit: e.target.value})} /></div>
                                <div className="col-md-6"><label className="form-label small fw-bold">Buy Price</label><input type="number" step="0.01" className={`form-control ${theme.input}`} required value={newProduct.net_price} onChange={e => setNewProduct({...newProduct, net_price: e.target.value})} /></div>
                                <div className="col-md-6"><label className="form-label small fw-bold">Sell Price</label><input type="number" step="0.01" className={`form-control ${theme.input}`} required value={newProduct.sell_price} onChange={e => setNewProduct({...newProduct, sell_price: e.target.value})} /></div>
                                <div className="col-12 mt-3"><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={newProduct.is_active} onChange={e => setNewProduct({...newProduct, is_active: e.target.checked})} /><label className="form-check-label fw-bold ms-2">Active</label></div></div>
                            </div>
                            <button type="submit" className="btn btn-primary w-100 mt-4 py-2 fw-bold shadow-sm">{editingProduct ? 'Update Inventory' : 'Create Product'}</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: RESTOCK */}
      {showRestockModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className={`modal-content ${theme.modalContent}`}>
                    <div className={`modal-header ${theme.modalHeader}`}><h5 className="modal-title">Restock</h5><button className="btn-close" onClick={() => setShowRestockModal(false)}></button></div>
                    <div className="modal-body p-4 text-center">
                        <h5 className="fw-bold">{restockData.name}</h5>
                        <input type="number" className={`form-control my-3 ${theme.input}`} placeholder="Qty Arrived" value={restockData.qty} onChange={e => setRestockData({...restockData, qty: e.target.value})} />
                        <button className="btn btn-success w-100" onClick={submitRestock}>Confirm Restock</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: MASTER DATA */}
      {showMasterModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className={`modal-content ${theme.modalContent}`}>
                    <div className={`modal-header ${theme.modalHeader}`}><h5 className="modal-title fw-bold">Manage Data</h5><button className="btn-close" onClick={() => setShowMasterModal(false)}></button></div>
                    <div className="modal-body p-4">
                        <div className="d-flex gap-2 mb-3">
                            {['brand', 'category', 'sub-category'].map(t => (
                                <button key={t} className={`btn btn-sm ${masterTab === t ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMasterTab(t)}>{t.toUpperCase()}</button>
                            ))}
                        </div>
                        <div className="input-group mb-3">
                            {masterTab === 'sub-category' && <select className={`form-select ${theme.input}`} value={selectedParentCat} onChange={e => setSelectedParentCat(e.target.value)}><option value="">Parent Category...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
                            <input className={`form-control ${theme.input}`} placeholder="New Name" value={masterInput} onChange={e => setMasterInput(e.target.value)} />
                            <button className="btn btn-success" onClick={handleMasterSubmit}>Add</button>
                        </div>
                        <ul className="list-group">
                            {masterList.map(m => (
                                <li key={m.id} className={`list-group-item d-flex justify-content-between ${theme.listGroupItem}`}>
                                    {m.name}
                                    <div>
                                        <button className="btn btn-sm btn-link" onClick={() => { setEditingMaster(m); setMasterInput(m.name); }}>Edit</button>
                                        <button className="btn btn-sm btn-link text-danger" onClick={() => promptDelete(m.id, masterTab, m.name)}>Delete</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE */}
      {confirmModal.show && (
        <div className="modal fade show d-block" style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                <div className={`modal-content border-danger ${theme.modalContent}`}>
                    <div className="modal-body p-4 text-center">
                        <h5 className="fw-bold">Delete "{confirmModal.title}"?</h5>
                        <div className="d-flex gap-2 justify-content-center mt-4">
                            <button className="btn btn-light border" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>Cancel</button>
                            <button className="btn btn-danger" onClick={executeDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;