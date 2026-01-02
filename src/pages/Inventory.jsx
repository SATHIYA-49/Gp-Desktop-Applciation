import React, { useState, useEffect, useContext, useCallback } from 'react';
import apiClient from '../api/client';
import { GlobalContext } from '../context/GlobalState';
import LowStockAlert from '../components/LowStockAlert'; 

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
  const [newProduct, setNewProduct] = useState({
    name: '', sku: '', brand_id: '', category_id: '', sub_category_id: '', 
    net_price: '', sell_price: '', warranty_details: '', is_active: true
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
        params: {
          page: page,
          limit: 10,
          status: activeTab,
          search: debouncedSearch
        }
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

  const getBrandName = (id) => brands.find(b => b.id === id)?.name || 'Unknown';
  const getCatName = (id) => categories.find(c => c.id === id)?.name || 'Unknown';
  const getSubName = (id) => subCategories.find(s => s.id === id)?.name || '-';

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) fetchProducts(newPage);
  };

  const promptDelete = (id, type, name) => setConfirmModal({ show: true, id, type, title: name });

  const executeDelete = async () => {
      const { id, type } = confirmModal;
      setConfirmModal({ show: false, id: null, type: null, title: '' });
      try {
          let endpoint = '';
          if (type === 'product') endpoint = `/inventory/products/${id}`;
          else if (type === 'brand') endpoint = `/inventory/brands/${id}`;
          else if (type === 'category') endpoint = `/inventory/categories/${id}`;
          else if (type === 'sub-category') endpoint = `/inventory/sub-categories/${id}`;

          const response = await apiClient.delete(endpoint);
          if(type === 'product') fetchProducts(pagination.current_page);
          else loadInventoryData();
          showAlert('success', response.data.message || 'Item deleted.');
      } catch (err) { showAlert('danger', err.response?.data?.detail || "Delete failed."); }
  };

  const toggleActiveStatus = async (product) => {
      try {
          const newStatus = !product.is_active;
          setProductsData(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p));
          await apiClient.patch(`/inventory/products/${product.id}/status`, { is_active: newStatus });
          fetchProducts(pagination.current_page); 
          showAlert('success', `Status updated!`);
      } catch (err) {
          fetchProducts(pagination.current_page);
          showAlert('danger', "Failed to update status");
      }
  };

  // --- MODAL HANDLERS ---
  const openCreateModal = () => {
      setEditingProduct(null);
      setNewProduct({ name: '', sku: '', brand_id: '', category_id: '', sub_category_id: '', net_price: '', sell_price: '', warranty_details: '', is_active: true });
      setFilteredSubs([]);
      setShowAddModal(true);
  };

  const openEditModal = (product) => {
      setEditingProduct(product);
      setNewProduct({
          name: product.name, sku: product.sku || '', brand_id: product.brand_id, category_id: product.category_id,
          sub_category_id: product.sub_category_id || '', net_price: product.net_price || '', sell_price: product.sell_price || '',
          warranty_details: product.warranty_details || '', is_active: product.is_active ?? true
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
    if(!newProduct.name || !newProduct.brand_id || !newProduct.category_id || !newProduct.net_price) return showAlert('warning', "Please fill required fields.");
    try {
      const payload = { ...newProduct, 
        sku: newProduct.sku || null, brand_id: String(newProduct.brand_id), category_id: String(newProduct.category_id),
        sub_category_id: newProduct.sub_category_id ? String(newProduct.sub_category_id) : null,
        net_price: parseFloat(newProduct.net_price), sell_price: parseFloat(newProduct.sell_price)
      };
      if (editingProduct) { await apiClient.put(`/inventory/products/${editingProduct.id}`, payload); showAlert('success', 'Product Updated!'); } 
      else { await apiClient.post('/inventory/products', payload); showAlert('success', 'Product Created!'); }
      setShowAddModal(false); fetchProducts(pagination.current_page);
    } catch (err) { showAlert('danger', "Failed to save product"); }
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

  return (
    <div className={`container-fluid p-4 ${theme.text}`} style={{ minHeight: '100vh', background: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa', position: 'relative' }}>
      
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
            {/* 🔥 BLUE TABS */}
            <button className={`btn fw-bold px-4 rounded-pill shadow-sm ${activeTab === 'active' ? 'btn-primary text-white' : (darkMode ? 'btn-dark border-secondary text-secondary' : 'btn-light border text-muted')}`} onClick={() => setActiveTab('active')}>Active Products</button>
            <button className={`btn fw-bold px-4 rounded-pill shadow-sm ${activeTab === 'inactive' ? 'btn-secondary text-white' : (darkMode ? 'btn-dark border-secondary text-secondary' : 'btn-light border text-muted')}`} onClick={() => setActiveTab('inactive')}>Inactive / Archived</button>
        </div>
        <div className="position-relative" style={{ width: '300px' }}>
            <i className={`bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 ${theme.subText}`} style={{zIndex: 5}}></i>
            <input type="text" className={`form-control rounded-pill ps-5 ${theme.input} shadow-sm`} placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{height: '45px'}} />
            {searchTerm && <button className={`btn btn-sm position-absolute top-50 end-0 translate-middle-y me-2 rounded-circle ${darkMode ? 'text-white' : 'text-secondary'}`} onClick={() => setSearchTerm('')}><i className="bi bi-x-circle-fill"></i></button>}
        </div>
      </div>

      {/* TABLE */}
      <div className={`card overflow-hidden ${theme.card}`}>
        <div className="table-responsive">
            <table className={`table align-middle mb-0 ${theme.table}`}>
                <thead className={theme.tableHeader}>
                    <tr><th className="ps-4 py-3">Product Name / SKU</th><th>Brand</th><th>Category</th><th>Sub-Cat</th><th>Status</th><th>Stock</th><th>Sell Price</th><th className="text-end pe-4">Actions</th></tr>
                </thead>
                <tbody className={darkMode ? 'border-secondary' : ''}>
                    {loading ? ( <tr><td colSpan="8" className="text-center py-5">Loading data...</td></tr> ) : (productsData || []).length === 0 ? ( <tr><td colSpan="8" className="text-center py-5 opacity-50">No products found.</td></tr> ) : (
                        (productsData || []).map(p => (
                            <tr key={p.id} className={`${theme.tableRowText} ${!p.is_active ? 'opacity-50' : ''}`}>
                                <td className="ps-4"><div className="fw-bold">{p.name}</div><div className={`small font-monospace ${theme.subText}`}>{p.sku || 'N/A'}</div></td>
                                <td><span className={`badge ${darkMode ? 'bg-secondary' : 'bg-light text-dark border'}`}>{getBrandName(p.brand_id)}</span></td>
                                <td><span className={`badge ${darkMode ? 'bg-secondary' : 'bg-light text-dark border'}`}>{getCatName(p.category_id)}</span></td>
                                <td><span className={`small ${theme.subText}`}>{getSubName(p.sub_category_id)}</span></td>
                                <td>
                                    {/* 🔥 BLUE STATUS TOGGLE */}
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" role="switch" checked={p.is_active ?? true} onChange={() => toggleActiveStatus(p)} style={{cursor: 'pointer'}} />
                                        <label className={`form-check-label small fw-bold ms-1 ${p.is_active ? 'text-primary' : 'text-danger'}`}>{p.is_active ? 'Active' : 'Inactive'}</label>
                                    </div>
                                </td>
                                <td><span className={`badge rounded-pill px-3 ${p.stock_quantity > 10 ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>{p.stock_quantity} Units</span></td>
                                <td className="fw-bold">${p.sell_price}</td>
                                <td className="text-end pe-4">
                                    <button className="btn btn-sm btn-outline-warning me-2" onClick={() => openRestockModal(p)} title="Restock"><i className="bi bi-box-arrow-in-down"></i></button>
                                    <button className="btn btn-sm btn-outline-info me-2" onClick={() => openEditModal(p)} title="Edit"><i className="bi bi-pencil-square"></i></button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => promptDelete(p.id, 'product', p.name)} title="Delete"><i className="bi bi-trash"></i></button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        <div className={`card-footer border-top-0 d-flex justify-content-between align-items-center py-3 ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
            <div className={`small ${theme.subText}`}>Page {pagination.current_page} of {pagination.total_pages} ({pagination.total_items} items)</div>
            <nav>
                <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}><button className={`page-link ${darkMode ? 'bg-secondary text-light border-dark' : ''}`} onClick={() => handlePageChange(pagination.current_page - 1)}>Prev</button></li>
                    <li className="page-item active"><span className="page-link bg-primary border-primary text-light">{pagination.current_page}</span></li>
                    <li className={`page-item ${pagination.current_page >= pagination.total_pages ? 'disabled' : ''}`}><button className={`page-link ${darkMode ? 'bg-secondary text-light border-dark' : ''}`} onClick={() => handlePageChange(pagination.current_page + 1)}>Next</button></li>
                </ul>
            </nav>
        </div>
      </div>

      {/* MODALS RENDER */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className={`modal-content ${theme.modalContent}`}>
                    <div className={`modal-header ${theme.modalHeader}`}><h5 className="modal-title fw-bold">{editingProduct ? 'Edit Product' : 'New Product'}</h5><button className={`btn-close ${theme.btnClose}`} onClick={() => setShowAddModal(false)}></button></div>
                    <div className="modal-body p-4">
                        <form onSubmit={submitProduct}>
                            <div className="row g-3">
                                <div className="col-12"><label className={`form-label small fw-bold ${theme.subText}`}>Product Name</label><input type="text" className={`form-control ${theme.input}`} required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                                <div className="col-12"><label className={`form-label small fw-bold ${theme.subText}`}>SKU</label><input type="text" className={`form-control ${theme.input}`} value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} /></div>
                                <div className="col-md-4"><label className={`form-label small fw-bold ${theme.subText}`}>Brand</label><select className={`form-select ${theme.input}`} required value={newProduct.brand_id} onChange={e => setNewProduct({...newProduct, brand_id: e.target.value})}><option value="">Select...</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                                <div className="col-md-4"><label className={`form-label small fw-bold ${theme.subText}`}>Category</label><select className={`form-select ${theme.input}`} required value={newProduct.category_id} onChange={handleCategoryChange}><option value="">Select...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                <div className="col-md-4"><label className={`form-label small fw-bold ${theme.subText}`}>Sub-Category</label><select className={`form-select ${theme.input}`} value={newProduct.sub_category_id} onChange={e => setNewProduct({...newProduct, sub_category_id: e.target.value})}><option value="">None</option>{filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                <div className="col-md-6"><label className={`form-label small fw-bold ${theme.subText}`}>Buy Price</label><input type="number" step="0.01" className={`form-control ${theme.input}`} required value={newProduct.net_price} onChange={e => setNewProduct({...newProduct, net_price: e.target.value})} /></div>
                                <div className="col-md-6"><label className={`form-label small fw-bold ${theme.subText}`}>Sell Price</label><input type="number" step="0.01" className={`form-control ${theme.input}`} required value={newProduct.sell_price} onChange={e => setNewProduct({...newProduct, sell_price: e.target.value})} /></div>
                                <div className="col-12 mt-3"><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={newProduct.is_active} onChange={e => setNewProduct({...newProduct, is_active: e.target.checked})} /><label className="form-check-label fw-bold ms-2">Active Product?</label></div></div>
                            </div>
                            <button type="submit" className="btn btn-primary w-100 mt-4 fw-bold">{editingProduct ? 'Update' : 'Create'}</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showRestockModal && (
        <div className="modal fade show d-block" style={{ zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className={`modal-content ${theme.modalContent}`}>
                    <div className={`modal-header ${theme.modalHeader}`}><h5 className="modal-title fw-bold">Restock</h5><button className={`btn-close ${theme.btnClose}`} onClick={() => setShowRestockModal(false)}></button></div>
                    <div className="modal-body p-4">
                        <h5 className="fw-bold mb-3">{restockData.name}</h5>
                        <input type="number" className={`form-control mb-3 ${theme.input}`} placeholder="Qty" value={restockData.qty} onChange={e => setRestockData({...restockData, qty: e.target.value})} />
                        <button className="btn btn-success w-100" onClick={submitRestock}>Confirm</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showMasterModal && (
        <div className="modal fade show d-block" style={{ zIndex: 1060, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className={`modal-content ${theme.modalContent}`}>
                    <div className={`modal-header ${theme.modalHeader}`}><h5 className="modal-title fw-bold">Manage Data</h5><button className={`btn-close ${theme.btnClose}`} onClick={() => setShowMasterModal(false)}></button></div>
                    <div className="modal-body p-4">
                        <div className="d-flex gap-2 mb-3">
                            {['brand', 'category', 'sub-category'].map(t => <button key={t} className={`btn btn-sm ${masterTab === t ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMasterTab(t)}>{t.toUpperCase()}</button>)}
                        </div>
                        <div className="input-group mb-3">
                            {masterTab === 'sub-category' && <select className={`form-select ${theme.input}`} value={selectedParentCat} onChange={e => setSelectedParentCat(e.target.value)}><option value="">Select Parent...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
                            <input className={`form-control ${theme.input}`} placeholder="New Item Name..." value={masterInput} onChange={e => setMasterInput(e.target.value)} />
                            <button className="btn btn-success" onClick={handleMasterSubmit}>Add</button>
                        </div>
                        <ul className="list-group">
                            {masterList.map(m => (
                                <li key={m.id} className={`list-group-item d-flex justify-content-between ${theme.listGroupItem}`}>
                                    {m.name}
                                    <div>
                                        <button className="btn btn-sm btn-outline-warning me-2" onClick={() => { setEditingMaster(m); setMasterInput(m.name); }}><i className="bi bi-pencil"></i></button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => promptDelete(m.id, masterTab, m.name)}><i className="bi bi-trash"></i></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="modal fade show d-block" style={{ zIndex: 1080, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                <div className={`modal-content rounded-3 ${theme.modalContent}`}>
                    <div className="modal-body p-4 text-center">
                        <h5 className="fw-bold mb-3">Delete "{confirmModal.title}"?</h5>
                        <div className="d-flex gap-2 justify-content-center">
                            <button className="btn btn-secondary" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>Cancel</button>
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