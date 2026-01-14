import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import apiClient from '../api/client';
import { GlobalContext } from '../context/GlobalState';
import LowStockAlert from '../components/LowStockAlert'; 
import ProductView from '../components/ProductView'; 
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; 

// --- 1. TOAST CONFIGURATION (The "Small Confirmation") ---
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer)
    toast.addEventListener('mouseleave', Swal.resumeTimer)
  }
});

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
  const hasFetchedMasterData = useRef(false);

  // --- FILTERS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); 
  const debouncedSearch = useDebounce(searchTerm, 500);

  // --- UI STATE ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, type: null, title: '' });
  const [viewProduct, setViewProduct] = useState(null); 

  // --- FORM DATA ---
  const [newProduct, setNewProduct] = useState({
    name: '', brand_id: '', category_id: '', sub_category_id: '', 
    net_price: '', sell_price: '', warranty_details: '', 
    low_stock_limit: '', 
    is_active: true,
    specifications: { 
        capacity: '', capacity_unit: 'Ah', 
        input_voltage: '', voltage_unit: 'V',   
        application: '', weight: '' 
    }
  });

  const [filteredSubs, setFilteredSubs] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null); 
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
    table: darkMode ? 'table-dark' : 'table-hover', 
    tableHeaderBg: darkMode ? '#212529' : '#f8f9fa', 
    tableHeaderText: darkMode ? 'text-white' : 'text-secondary',
    modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    modalHeader: darkMode ? 'border-secondary bg-dark' : 'border-bottom bg-white',
    listGroupItem: darkMode ? 'bg-dark text-white border-secondary' : 'bg-white text-dark',
    btnGhost: darkMode ? 'btn-outline-light' : 'btn-outline-dark',
    inputGroupText: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-light text-muted border',
    unitSelect: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-light text-dark border',
  };

  // --- FETCH PRODUCTS ---
  const fetchProducts = useCallback(async (page = 1, isBackground = false) => {
    if (!isBackground) setLoading(true); // Only show spinner for initial load or big changes
    try {
      const res = await apiClient.get('/inventory/products', {
        params: { page, limit: 5, status: activeTab, search: debouncedSearch }
      });
      setProductsData(res.data.data || []); 
      setPagination(res.data.pagination || { current_page: 1, total_pages: 1, total_items: 0 });
    } catch (error) {
      console.error("Fetch Products Error:", error);
    } finally {
      if (!isBackground) setLoading(false); 
    }
  }, [activeTab, debouncedSearch]);

  // --- LOAD MASTER DATA ---
  useEffect(() => {
    if (brands.length > 0) return;
    if (hasFetchedMasterData.current === true) return;
    hasFetchedMasterData.current = true; 
    loadInventoryData();
  }, [brands.length, loadInventoryData]); 

  useEffect(() => { fetchProducts(1); }, [fetchProducts]); 

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) fetchProducts(newPage);
  };

  // --- HANDLER FOR SPECS ---
  const handleSpecChange = (e) => {
      let { name, value } = e.target;
      if (name === 'capacity' || name === 'input_voltage' || name === 'weight') {
          value = value.replace(/\D/g, ''); 
      }
      setNewProduct(prev => ({
          ...prev,
          specifications: { ...prev.specifications, [name]: value }
      }));
  };

  // --- FORM HANDLERS ---
  const openCreateModal = () => {
      setEditingProduct(null);
      setNewProduct({ 
          name: '', brand_id: '', category_id: '', sub_category_id: '', 
          net_price: '', sell_price: '', warranty_details: '', low_stock_limit: '', 
          is_active: true,
          specifications: { 
              capacity: '', capacity_unit: 'Ah', input_voltage: '', voltage_unit: 'V', application: '', weight: '' 
          }
      });
      setFilteredSubs([]);
      setShowAddModal(true);
  };

  const openEditModal = (product) => {
      setEditingProduct(product);
      const specs = product.specifications || {};
      setNewProduct({
          name: product.name, brand_id: product.brand_id, category_id: product.category_id,
          sub_category_id: product.sub_category_id || '', net_price: product.net_price || '', 
          sell_price: product.sell_price || '', warranty_details: product.warranty_details || '', 
          low_stock_limit: product.low_stock_limit || '', is_active: product.is_active ?? true,
          specifications: {
              capacity: specs.capacity || '', capacity_unit: specs.capacity_unit || 'Ah',
              input_voltage: specs.input_voltage || '', voltage_unit: specs.voltage_unit || 'V',
              application: specs.application || '', weight: specs.weight || ''
          }
      });
      setFilteredSubs(subCategories.filter(s => String(s.category_id) === String(product.category_id)));
      setShowAddModal(true);
  };

  const handleCategoryChange = (e) => {
    const catId = e.target.value; 
    setNewProduct({ ...newProduct, category_id: catId, sub_category_id: '' });
    setFilteredSubs(subCategories.filter(s => String(s.category_id) === String(catId)));
  };

  // 🔥 UPDATED: SUBMIT PRODUCT WITH TOAST
  const submitProduct = async (e) => {
    e.preventDefault();
    
    // Validation
    if(!newProduct.name || !newProduct.brand_id || !newProduct.category_id || !newProduct.net_price || !newProduct.low_stock_limit) 
        return Swal.fire({ icon: 'warning', title: 'Missing Data', text: "Please fill all required fields." });
    
    if (!newProduct.specifications.capacity || !newProduct.specifications.input_voltage) {
        return Swal.fire({ icon: 'warning', title: 'Missing Specs', text: "Capacity and Voltage are required!" });
    }

    const cleanSpecs = Object.fromEntries(Object.entries(newProduct.specifications).filter(([_, v]) => v !== '' && v !== null));

    try {
      const payload = { 
        ...newProduct, sku: editingProduct ? null : null, 
        brand_id: String(newProduct.brand_id), category_id: String(newProduct.category_id),
        sub_category_id: newProduct.sub_category_id ? String(newProduct.sub_category_id) : null,
        net_price: parseFloat(newProduct.net_price), sell_price: parseFloat(newProduct.sell_price),
        low_stock_limit: parseInt(newProduct.low_stock_limit), specifications: cleanSpecs 
      };

      if (editingProduct) { 
          await apiClient.put(`/inventory/products/${editingProduct.id}`, payload); 
          Toast.fire({ icon: 'success', title: 'Product Updated' }); // 🔥 TOAST
      } else { 
          await apiClient.post('/inventory/products', payload); 
          Toast.fire({ icon: 'success', title: 'Product Created' }); // 🔥 TOAST
      }
      setShowAddModal(false); 
      fetchProducts(pagination.current_page, true); // Background refresh
      
    } catch (err) { 
        console.error("Submit Error:", err);
        const errorDetail = err.response?.data?.detail;
        let displayMsg = "Failed to save product.";
        if (Array.isArray(errorDetail)) displayMsg = errorDetail.map(e => `• ${e.msg}`).join('<br>');
        else if (typeof errorDetail === 'string') displayMsg = errorDetail;

        Swal.fire({ icon: 'error', title: 'Validation Error', html: `<div class="text-start text-danger fw-bold">${displayMsg}</div>` });
    }
  };

  // --- RESTOCK & MASTER HANDLERS ---
  const openRestockModal = (p) => { 
      setRestockData({ id: p.id, name: p.name, qty: '', received_date: new Date().toISOString().split('T')[0] }); 
      setShowRestockModal(true); 
  };
  
  const submitRestock = async () => { 
    const qty = parseInt(restockData.qty);
    if (!qty || qty <= 0) return Swal.fire('Error', "Enter valid quantity", 'warning');
    try {
      await apiClient.post('/inventory/restock', { product_id: String(restockData.id), quantity_arrived: qty, received_date: restockData.received_date });
      
      setShowRestockModal(false); 
      Toast.fire({ icon: 'success', title: 'Stock Updated Successfully' }); // 🔥 TOAST
      fetchProducts(pagination.current_page, true); 
    } catch (err) { Swal.fire('Error', "Restock Failed", 'error'); }
  };

  const handleMasterSubmit = async () => { 
    if (!masterInput.trim()) return;
    try {
      const endpoint = masterTab === 'brand' ? 'brands' : masterTab === 'category' ? 'categories' : 'sub-categories';
      const payload = { name: masterInput };
      if (masterTab === 'sub-category') {
          const catId = editingMaster ? editingMaster.category_id : selectedParentCat;
          if (!catId) return Swal.fire('Warning', "Select Parent Category", 'warning');
          payload.category_id = String(catId);
      }
      if (editingMaster) { 
          await apiClient.put(`/inventory/${endpoint}/${editingMaster.id}`, payload); 
          Toast.fire({ icon: 'success', title: `${masterTab} Updated` }); // 🔥 TOAST
      } 
      else { 
          await apiClient.post(`/inventory/${endpoint}`, payload); 
          Toast.fire({ icon: 'success', title: `${masterTab} Added` }); // 🔥 TOAST
      }
      setMasterInput(''); setEditingMaster(null); loadInventoryData();
    } catch (err) { Swal.fire('Error', "Action Failed", 'error'); }
  };

  const promptDelete = (id, type, name) => setConfirmModal({ show: true, id, type, title: name });
  
  const executeDelete = async () => { 
      const { id, type } = confirmModal;
      setConfirmModal({ show: false, id: null, type: null, title: '' });
      try {
          const endpoint = `/inventory/${type === 'product' ? 'products' : type + 's'}/${id}`;
          await apiClient.delete(endpoint);
          
          Toast.fire({ icon: 'success', title: 'Item Deleted' }); // 🔥 TOAST
          
          if(type === 'product') fetchProducts(pagination.current_page, true);
          else loadInventoryData();
      } catch (err) { Swal.fire('Error', "Delete failed.", 'error'); }
  };

  const getBrandName = (id) => brands.find(b => b.id === id)?.name || 'Unknown';
  const getCatName = (id) => categories.find(c => c.id === id)?.name || 'Unknown';
  const getSubName = (id) => subCategories.find(s => s.id === id)?.name || '-';
  
  const toggleActiveStatus = async (product) => { 
      try {
          const newStatus = !product.is_active;
          // Optimistic Update
          setProductsData(prev => prev.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p));
          await apiClient.patch(`/inventory/products/${product.id}/status`, { is_active: newStatus });
          Toast.fire({ icon: 'success', title: `Product ${newStatus ? 'Activated' : 'Deactivated'}` }); // 🔥 TOAST
      } catch (err) {
          fetchProducts(pagination.current_page);
          Toast.fire({ icon: 'error', title: 'Status Update Failed' });
      }
  };

  // --- MASTER DATA FILTER EFFECT ---
  useEffect(() => {
    setMasterInput(''); setEditingMaster(null); 
    if (masterTab === 'brand') setMasterList(brands);
    else if (masterTab === 'category') setMasterList(categories);
    else if (masterTab === 'sub-category') {
        if(selectedParentCat) setMasterList(subCategories.filter(s => String(s.category_id) === String(selectedParentCat)));
        else setMasterList([]);
    }
  }, [masterTab, selectedParentCat, brands, categories, subCategories]);

  return (
    <div className={`container-fluid p-4 ${theme.text}`} style={{ minHeight: '100vh', background: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa', position: 'relative' }}>
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div><h3 className="fw-bold m-0">Inventory</h3><p className={`small m-0 ${theme.subText}`}>Manage your products.</p></div>
        <div className="d-flex gap-2">
            <button className={`btn ${theme.btnGhost} fw-bold`} onClick={() => setShowMasterModal(true)}><i className="bi bi-tags me-2"></i>Brands / Categories</button>
            <button className="btn btn-primary fw-bold shadow-sm" onClick={openCreateModal}><i className="bi bi-plus-lg me-2"></i> New Product</button>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
        <div className="d-flex gap-2">
            <button className={`btn fw-bold px-4 rounded-pill shadow-sm ${activeTab === 'active' ? 'btn-primary' : 'btn-light border'}`} onClick={() => setActiveTab('active')}>Active</button>
            <button className={`btn fw-bold px-4 rounded-pill shadow-sm ${activeTab === 'inactive' ? 'btn-secondary' : 'btn-light border'}`} onClick={() => setActiveTab('inactive')}>Inactive</button>
        </div>
        <div className="d-flex gap-2">
            <div className="position-relative" style={{ width: '300px' }}>
                <i className={`bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 ${theme.subText}`}></i>
                <input type="text" className={`form-control rounded-pill ps-5 ${theme.input} shadow-sm`} placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button className="btn btn-outline-primary shadow-sm" onClick={() => navigate('/inventory/history')}>
                <i className="bi bi-clock-history"></i> History
            </button>
        </div>
      </div>

      <div style={{ position: 'absolute', top: '90px', right: '20px', zIndex: 1050, maxWidth: '350px', width: '100%' }}>
          <LowStockAlert onRestockClick={openRestockModal} />
      </div>

      {/* TABLE SECTION */}
      <div className={`card shadow-sm border-0 ${theme.card}`} style={{ height: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column' }}>
        <div className="table-responsive flex-grow-1" style={{ overflow: 'auto' }}>
            <table className={`table align-middle mb-0 text-nowrap ${theme.table}`}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: theme.tableHeaderBg }}>
                    <tr className={theme.tableHeaderText}>
                        <th className="ps-4 py-3" style={{ backgroundColor: theme.tableHeaderBg }}>Product Name</th>
                        <th className="py-3" style={{ backgroundColor: theme.tableHeaderBg }}>Brand</th>
                        <th className="py-3" style={{ backgroundColor: theme.tableHeaderBg }}>Category</th>
                        <th className="py-3" style={{ backgroundColor: theme.tableHeaderBg }}>Sub-Cat</th>
                        <th className="py-3" style={{ backgroundColor: theme.tableHeaderBg }}>Status</th>
                        <th className="py-3" style={{ backgroundColor: theme.tableHeaderBg }}>Stock</th>
                        <th className="py-3" style={{ backgroundColor: theme.tableHeaderBg }}>Price</th>
                        <th className="text-end pe-4 py-3" style={{ backgroundColor: theme.tableHeaderBg }}>Actions</th>
                    </tr>
                </thead>
                <tbody className={darkMode ? 'border-secondary' : ''}>
                    {loading ? (
                        <tr><td colSpan="8" className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></td></tr>
                    ) : productsData.length === 0 ? (
                        <tr><td colSpan="8" className="text-center py-5 text-muted">No products found.</td></tr>
                    ) : productsData.map(p => (
                        <tr key={p.id} className={!p.is_active ? 'opacity-50' : ''}>
                            <td className="ps-4"><div className="fw-bold">{p.name}</div><div className="small opacity-50">{p.sku}</div></td>
                            <td>{getBrandName(p.brand_id)}</td>
                            <td>{getCatName(p.category_id)}</td>
                            <td>{getSubName(p.sub_category_id)}</td>
                            <td><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={p.is_active ?? true} onChange={() => toggleActiveStatus(p)} /></div></td>
                            <td><span className={`badge rounded-pill px-3 py-2 ${p.stock_quantity <= p.low_stock_limit ? 'bg-danger animate__animated animate__flash' : 'bg-success-subtle text-success'}`}>{p.stock_quantity}</span></td>
                            <td className="fw-bold">₹{p.sell_price}</td>
                            <td className="text-end pe-4">
                                <button className="btn btn-sm btn-outline-primary me-2" onClick={() => setViewProduct(p)} title="View"><i className="bi bi-eye"></i></button>
                                <button className="btn btn-sm btn-outline-warning me-2" onClick={() => openRestockModal(p)} title="Restock"><i className="bi bi-box-arrow-in-down"></i></button>
                                <button className="btn btn-sm btn-outline-info me-2" onClick={() => openEditModal(p)} title="Edit"><i className="bi bi-pencil-square"></i></button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => promptDelete(p.id, 'product', p.name)} title="Delete"><i className="bi bi-trash"></i></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div className="card-footer border-top d-flex justify-content-between align-items-center py-2 bg-transparent">
            <small className={theme.subText}>Page {pagination.current_page} of {pagination.total_pages}</small>
            <div className="btn-group">
                <button className="btn btn-sm btn-outline-secondary" disabled={pagination.current_page === 1} onClick={() => handlePageChange(pagination.current_page - 1)}>Prev</button>
                <button className="btn btn-sm btn-outline-secondary" disabled={pagination.current_page === pagination.total_pages} onClick={() => handlePageChange(pagination.current_page + 1)}>Next</button>
            </div>
        </div>
      </div>

      {/* MODAL: ADD/EDIT PRODUCT */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className={`modal-content ${theme.modalContent}`}>
                    <div className={`modal-header ${theme.modalHeader}`}><h5 className="modal-title fw-bold">{editingProduct ? 'Edit' : 'New'} Product</h5><button className="btn-close" onClick={() => setShowAddModal(false)}></button></div>
                    <div className="modal-body p-4">
                        <form onSubmit={submitProduct}>
                            <div className="row g-3">
                                <div className="col-12"><label className="form-label small fw-bold">Name <span className="text-danger">*</span></label><input type="text" className={`form-control ${theme.input}`} required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} /></div>
                                <div className="col-md-6"><label className="form-label small fw-bold">Brand <span className="text-danger">*</span></label><select className={`form-select ${theme.input}`} required value={newProduct.brand_id} onChange={e => setNewProduct({...newProduct, brand_id: e.target.value})}><option value="">Select Brand...</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                                <div className="col-md-6"><label className="form-label small fw-bold">Category <span className="text-danger">*</span></label><select className={`form-select ${theme.input}`} required value={newProduct.category_id} onChange={handleCategoryChange}><option value="">Select Category...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                <div className="col-md-6"><label className="form-label small fw-bold">Sub-Category</label><select className={`form-select ${theme.input}`} value={newProduct.sub_category_id} onChange={e => setNewProduct({...newProduct, sub_category_id: e.target.value})}><option value="">None</option>{filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                <div className="col-md-6"><label className="form-label small fw-bold">Buy Price <span className="text-danger">*</span></label><input type="number" step="0.01" className={`form-control ${theme.input}`} required value={newProduct.net_price} onChange={e => setNewProduct({...newProduct, net_price: e.target.value})} /></div>
                                <div className="col-md-6"><label className="form-label small fw-bold">Sell Price <span className="text-danger">*</span></label><input type="number" step="0.01" className={`form-control ${theme.input}`} required value={newProduct.sell_price} onChange={e => setNewProduct({...newProduct, sell_price: e.target.value})} /></div> 
                                
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Capacity <span className="text-danger">*</span></label>
                                    <div className="input-group">
                                        <input type="text" name="capacity" className={`form-control ${theme.input}`} required placeholder="e.g. 150" value={newProduct.specifications.capacity} onChange={handleSpecChange} />
                                        <select name="capacity_unit" className={`form-select ${theme.unitSelect}`} style={{maxWidth: '90px'}} value={newProduct.specifications.capacity_unit} onChange={handleSpecChange}>
                                            <option value="Ah">Ah</option><option value="VA">VA</option><option value="kVA">kVA</option><option value="Watts">Watts</option><option value="kW">kW</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Input Voltage <span className="text-danger">*</span></label>
                                    <div className="input-group">
                                        <input type="text" name="input_voltage" className={`form-control ${theme.input}`} required placeholder="e.g. 12" value={newProduct.specifications.input_voltage} onChange={handleSpecChange} />
                                        <select name="voltage_unit" className={`form-select ${theme.unitSelect}`} style={{maxWidth: '80px'}} value={newProduct.specifications.voltage_unit} onChange={handleSpecChange}>
                                            <option value="V">V</option><option value="kV">kV</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Weight <span className="text-muted fw-normal">(Optional)</span></label>
                                    <div className="input-group">
                                        <input type="text" name="weight" className={`form-control ${theme.input}`} placeholder="e.g. 25" value={newProduct.specifications.weight} onChange={handleSpecChange} />
                                        <span className={`input-group-text ${theme.inputGroupText}`}>kg</span>
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label small fw-bold">Application <span className="text-muted fw-normal">(Optional)</span></label>
                                    <select name="application" className={`form-select ${theme.input}`} value={newProduct.specifications.application} onChange={handleSpecChange}>
                                        <option value="">Select Usage...</option><option value="Home Power Backup">Home Power Backup</option><option value="Office / Commercial">Office / Commercial</option><option value="Solar Power System">Solar Power System</option><option value="Automotive / Vehicle">Automotive / Vehicle</option><option value="Heavy Industrial">Heavy Industrial</option>
                                    </select>
                                </div>

                                <div className="col-md-6"><label className="form-label small fw-bold text-warning">Low Stock Limit <span className="text-danger">*</span></label><input type="number" className={`form-control ${theme.input} border-warning`} required placeholder="e.g. 5" value={newProduct.low_stock_limit} onChange={e => setNewProduct({...newProduct, low_stock_limit: e.target.value})} /></div>
                                <div className="col-12 mt-3"><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={newProduct.is_active} onChange={e => setNewProduct({...newProduct, is_active: e.target.checked})} /><label className="form-check-label fw-bold ms-2">Active Product</label></div></div>
                            </div>
                            <button type="submit" className="btn btn-primary w-100 mt-4 py-2 fw-bold shadow-sm">{editingProduct ? 'Update Product' : 'Create Product'}</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {showRestockModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className={`modal-content ${theme.modalContent}`}>
                    <div className={`modal-header ${theme.modalHeader}`}><h5 className="modal-title">Restock</h5><button className="btn-close" onClick={() => setShowRestockModal(false)}></button></div>
                    <div className="modal-body p-4 text-center">
                        <h5 className="fw-bold">{restockData.name}</h5>
                        <div className="text-start mb-3"><label className="form-label small fw-bold">Received Date</label><input type="date" className={`form-control ${theme.input}`} value={restockData.received_date} onChange={e => setRestockData({...restockData, received_date: e.target.value})} /></div>
                        <div className="text-start mb-4"><label className="form-label small fw-bold">Quantity Arrived</label><input type="number" className={`form-control ${theme.input}`} placeholder="Enter Quantity" value={restockData.qty} onChange={e => setRestockData({...restockData, qty: e.target.value})} /></div>
                        <button className="btn btn-success w-100" onClick={submitRestock}>Confirm Restock</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MASTER DATA MODAL */}
      {showMasterModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className={`modal-content ${theme.modalContent}`}>
                    <div className={`modal-header ${theme.modalHeader}`}><h5 className="modal-title fw-bold">Manage Brands And Categories</h5><button className="btn-close" onClick={() => setShowMasterModal(false)}></button></div>
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

      {/* CONFIRM DELETE MODAL */}
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

      <ProductView show={!!viewProduct} product={viewProduct} onClose={() => setViewProduct(null)} theme={theme} darkMode={darkMode} />
    </div>
  );
};

export default Inventory;