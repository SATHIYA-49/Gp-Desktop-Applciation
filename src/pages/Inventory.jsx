import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { GlobalContext } from '../context/GlobalState';
import LowStockAlert from '../components/LowStockAlert'; 

const Inventory = () => {
  const { products, brands, categories, subCategories, loadInventoryData, darkMode } = useContext(GlobalContext);

  // --- LOCAL STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  // 🔥 CHANGED: Default is now 'active' instead of 'all'
  const [activeTab, setActiveTab] = useState('active'); 
  
  // --- PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 

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
  
  // --- EDIT PRODUCT STATE ---
  const [editingProduct, setEditingProduct] = useState(null); 

  // Restock (with Date)
  const [restockData, setRestockData] = useState({ id: null, name: '', qty: '', received_date: '' });

  // Master Data
  const [masterTab, setMasterTab] = useState('brand');
  const [masterInput, setMasterInput] = useState('');
  const [selectedParentCat, setSelectedParentCat] = useState(''); 
  const [masterList, setMasterList] = useState([]);
  const [editingMaster, setEditingMaster] = useState(null); 

  // --- THEME CONSTANTS ---
  const theme = {
    bg: darkMode ? 'bg-dark' : 'bg-light',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-secondary' : 'text-muted',
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

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    loadInventoryData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  // --- HELPER: SHOW ALERT ---
  const showAlert = (type, message) => {
    setAlertInfo({ show: true, type, message });
    setTimeout(() => setAlertInfo({ show: false, type: '', message: '' }), 2500);
  };

  // --- 2. DATA HELPERS ---
  const getBrandName = (id) => brands.find(b => b.id === id)?.name || 'Unknown';
  const getCatName = (id) => categories.find(c => c.id === id)?.name || 'Unknown';
  const getSubName = (id) => subCategories.find(s => s.id === id)?.name || '-';

  // --- 3. DELETE LOGIC ---
  const promptDelete = (id, type, name) => {
      setConfirmModal({ show: true, id, type, title: name });
  };

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
          loadInventoryData();
          showAlert('success', response.data.message || 'Item deleted.');
      } catch (err) {
          const errorMsg = err.response?.data?.detail || "Delete failed. Item might be in use.";
          showAlert('danger', errorMsg);
      }
  };

  // --- 4. TOGGLE ACTIVE STATUS LOGIC ---
  const toggleActiveStatus = async (product) => {
      try {
          const newStatus = !product.is_active; 
          
          // Optimistic update
          product.is_active = newStatus; 
          
          await apiClient.patch(`/inventory/products/${product.id}/status`, { 
              is_active: newStatus 
          });

          loadInventoryData(); 
          showAlert('success', `Product marked as ${newStatus ? 'Active' : 'Inactive'}`);
      } catch (err) {
          console.error(err);
          product.is_active = !product.is_active; 
          showAlert('danger', "Failed to update status");
      }
  };

  // --- 5. ADD / UPDATE PRODUCT LOGIC ---
  const openCreateModal = () => {
      setEditingProduct(null);
      setNewProduct({ name: '', sku: '', brand_id: '', category_id: '', sub_category_id: '', net_price: '', sell_price: '', warranty_details: '', is_active: true });
      setFilteredSubs([]);
      setShowAddModal(true);
  };

  const openEditModal = (product) => {
      setEditingProduct(product);
      setNewProduct({
          name: product.name,
          sku: product.sku || '',
          brand_id: product.brand_id,
          category_id: product.category_id,
          sub_category_id: product.sub_category_id || '',
          net_price: product.net_price || '',
          sell_price: product.sell_price || '',
          warranty_details: product.warranty_details || '',
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
    if(!newProduct.name || !newProduct.brand_id || !newProduct.category_id || !newProduct.net_price) {
        return showAlert('warning', "Please fill in all required fields.");
    }

    try {
      const payload = {
        name: newProduct.name,
        sku: newProduct.sku || null,
        brand_id: String(newProduct.brand_id),
        category_id: String(newProduct.category_id),
        sub_category_id: newProduct.sub_category_id ? String(newProduct.sub_category_id) : null,
        net_price: parseFloat(newProduct.net_price),
        sell_price: parseFloat(newProduct.sell_price),
        warranty_details: newProduct.warranty_details || "",
        is_active: newProduct.is_active 
      };

      if (editingProduct) {
          await apiClient.put(`/inventory/products/${editingProduct.id}`, payload);
          showAlert('success', 'Product Updated!');
      } else {
          await apiClient.post('/inventory/products', payload);
          showAlert('success', 'Product Created!');
      }

      setNewProduct({ name: '', sku: '', brand_id: '', category_id: '', sub_category_id: '', net_price: '', sell_price: '', warranty_details: '', is_active: true });
      setFilteredSubs([]);
      loadInventoryData();
      setShowAddModal(false);
      setEditingProduct(null);
    } catch (err) {
      showAlert('danger', err.response?.data?.detail || "Failed to save product");
    }
  };

  // --- 6. RESTOCK LOGIC ---
  const openRestockModal = (product) => {
      const today = new Date().toISOString().split('T')[0];
      setRestockData({ id: product.id, name: product.name, qty: '', received_date: today });
      setShowRestockModal(true);
  };

  const submitRestock = async () => {
    const qty = parseInt(restockData.qty);
    if (!qty || qty <= 0) return showAlert('warning', "Enter a valid quantity");

    try {
      await apiClient.post('/inventory/restock', {
        product_id: String(restockData.id),
        quantity_arrived: qty,
        received_date: restockData.received_date
      });
      showAlert('success', 'Stock Updated!');
      setRestockData({ id: null, name: '', qty: '', received_date: '' });
      loadInventoryData();
      setShowRestockModal(false);
    } catch (err) { 
        showAlert('danger', err.response?.data?.detail || "Restock Failed"); 
    }
  };

  // --- 7. MASTER DATA LOGIC ---
  useEffect(() => {
    setMasterInput('');
    setEditingMaster(null); 
    if (masterTab === 'brand') setMasterList(brands);
    else if (masterTab === 'category') setMasterList(categories);
    else if (masterTab === 'sub-category') {
        if(selectedParentCat) {
            setMasterList(subCategories.filter(s => String(s.category_id) === String(selectedParentCat)));
        } else {
            setMasterList([]);
        }
    }
  }, [masterTab, selectedParentCat, brands, categories, subCategories]);

  const startEdit = (item) => {
      setEditingMaster(item);
      setMasterInput(item.name);
      if(masterTab === 'sub-category') setSelectedParentCat(item.category_id);
  };

  const cancelEdit = () => {
      setEditingMaster(null);
      setMasterInput('');
  };

  const handleMasterSubmit = async () => {
    if (!masterInput.trim()) return;
    try {
      const endpoint = masterTab === 'brand' ? 'brands' : masterTab === 'category' ? 'categories' : 'sub-categories';
      const payload = { name: masterInput };
      
      if (masterTab === 'sub-category') {
          const catId = editingMaster ? editingMaster.category_id : selectedParentCat;
          if (!catId) return showAlert('warning', "Select Parent Category first");
          payload.category_id = String(catId);
      }

      if (editingMaster) {
          await apiClient.put(`/inventory/${endpoint}/${editingMaster.id}`, payload);
          showAlert('success', `${masterTab} updated!`);
      } else {
          await apiClient.post(`/inventory/${endpoint}`, payload);
          showAlert('success', `${masterTab} added!`);
      }
      setMasterInput('');
      setEditingMaster(null);
      loadInventoryData(); 
    } catch (err) { 
        showAlert('danger', "Action Failed: " + (err.response?.data?.detail || "Error")); 
    }
  };

  // --- FILTERING & PAGINATION LOGIC ---
  const searchFiltered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 🔥 REMOVED 'ALL' OPTION HERE
  const finalFilteredProducts = searchFiltered.filter(p => {
      if (activeTab === 'active') return p.is_active === true;
      if (activeTab === 'inactive') return p.is_active === false;
      return p.is_active === true; // Default safety fallback
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = finalFilteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPages = Math.ceil(finalFilteredProducts.length / itemsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div 
        className={`container-fluid p-4 ${theme.text}`} 
        style={{ 
            minHeight: '100vh', 
            transition: 'background 0.3s ease-in-out',
            background: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
            position: 'relative' 
        }}
    >
      
      {/* ALERT TOAST */}
      {alertInfo.show && (
        <div 
            className="shadow-lg rounded"
            style={{ 
                position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', 
                zIndex: 10000, minWidth: '320px',
                backgroundColor: darkMode ? '#2c3034' : '#fff',
                color: darkMode ? '#fff' : '#000',
                borderLeft: `5px solid ${alertInfo.type === 'success' ? '#198754' : (alertInfo.type === 'warning' ? '#ffc107' : '#dc3545')}`,
                display: 'flex', alignItems: 'center', padding: '12px 20px',
                animation: 'slideDown 0.3s ease-out'
            }}
        >
            <i className={`bi ${alertInfo.type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning'} fs-5 me-3`}></i>
            <span className="fw-bold" style={{fontSize: '0.95rem'}}>{alertInfo.message}</span>
        </div>
      )}

      {/* --- LOW STOCK ALERT (Top Right Modal) --- */}
      <div 
          style={{
              position: 'absolute',
              top: '90px', 
              right: '20px',
              zIndex: 1050,
              maxWidth: '350px',
              width: '100%'
          }}
      >
          <LowStockAlert onRestockClick={openRestockModal} />
      </div>

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold m-0">Inventory</h3>
          <p className={`small m-0 ${theme.subText}`}>Manage your products and stock.</p>
        </div>
        <div className="d-flex gap-2">
            <button className={`btn ${theme.btnGhost} fw-bold`} onClick={() => setShowMasterModal(true)}>
                <i className="bi bi-tags me-2"></i> Brands / Categories
            </button>
            <button className="btn btn-primary fw-bold shadow-sm" onClick={openCreateModal}>
                <i className="bi bi-plus-lg me-2"></i> New Product
            </button>
        </div>
      </div>

      {/* CONTROL BAR: TABS (REMOVED 'ALL') & SEARCH */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        
        {/* LEFT: STATUS TABS */}
        <div className="btn-group shadow-sm" role="group">
            {/* 🔥 REMOVED THE 'ALL' BUTTON */}
            <button 
                type="button" 
                className={`btn fw-bold px-4 ${activeTab === 'active' ? 'btn-success text-white' : (darkMode ? 'btn-dark border-secondary' : 'btn-light border')}`}
                onClick={() => setActiveTab('active')}
            >
                Active
            </button>
            <button 
                type="button" 
                className={`btn fw-bold px-4 ${activeTab === 'inactive' ? 'btn-secondary' : (darkMode ? 'btn-dark border-secondary' : 'btn-light border')}`}
                onClick={() => setActiveTab('inactive')}
            >
                Inactive
            </button>
        </div>

        {/* RIGHT: MINIMIZED SEARCH */}
        <div className="position-relative" style={{ width: '300px' }}>
            <i className={`bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 ${theme.subText}`} style={{zIndex: 5}}></i>
            <input 
                type="text" 
                className={`form-control rounded-pill ps-5 ${theme.input} shadow-sm`}
                placeholder="Search products..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{height: '45px'}}
            />
            {searchTerm && (
                <button 
                    className={`btn btn-sm position-absolute top-50 end-0 translate-middle-y me-2 rounded-circle ${darkMode ? 'text-white' : 'text-secondary'}`} 
                    onClick={() => setSearchTerm('')}
                >
                    <i className="bi bi-x-circle-fill"></i>
                </button>
            )}
        </div>
      </div>

      {/* TABLE */}
      <div className={`card overflow-hidden ${theme.card}`}>
        <div className="table-responsive">
            <table className={`table align-middle mb-0 ${theme.table}`}>
                <thead className={theme.tableHeader}>
                    <tr>
                        <th className="ps-4 py-3">Product Name / SKU</th>
                        <th>Brand</th>
                        <th>Category</th>
                        <th>Sub-Cat</th>
                        <th>Status</th>
                        <th>Stock</th>
                        <th>Sell Price</th>
                        <th className="text-end pe-4">Actions</th>
                    </tr>
                </thead>
                <tbody className={darkMode ? 'border-secondary' : ''}>
                    {currentProducts.length === 0 ? (
                        <tr><td colSpan="8" className="text-center py-5 opacity-50">No products found.</td></tr>
                    ) : (
                        currentProducts.map(p => (
                            <tr key={p.id} className={`${theme.tableRowText} ${!p.is_active ? 'opacity-50' : ''}`}>
                                <td className="ps-4">
                                    <div className="fw-bold">{p.name}</div>
                                    <div className={`small font-monospace ${theme.subText}`}>{p.sku || 'N/A'}</div>
                                </td>
                                <td><span className={`badge ${darkMode ? 'bg-secondary' : 'bg-light text-dark border'}`}>{getBrandName(p.brand_id)}</span></td>
                                <td><span className={`badge ${darkMode ? 'bg-secondary' : 'bg-light text-dark border'}`}>{getCatName(p.category_id)}</span></td>
                                <td><span className={`small ${theme.subText}`}>{getSubName(p.sub_category_id)}</span></td>
                                
                                <td>
                                    <div className="form-check form-switch">
                                        <input 
                                            className="form-check-input" 
                                            type="checkbox" 
                                            role="switch" 
                                            checked={p.is_active ?? true} 
                                            onChange={() => toggleActiveStatus(p)}
                                            style={{cursor: 'pointer'}}
                                        />
                                        <label className={`form-check-label small fw-bold ms-1 ${p.is_active ? 'text-success' : 'text-danger'}`}>
                                            {p.is_active ? 'Active' : 'Inactive'}
                                        </label>
                                    </div>
                                </td>

                                <td>
                                    <span className={`badge rounded-pill px-3 ${p.stock_quantity > 10 ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                                        {p.stock_quantity} Units
                                    </span>
                                </td>
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

        {/* PAGINATION */}
        {totalPages > 1 && (
            <div className={`card-footer border-top-0 d-flex justify-content-between align-items-center py-3 ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
                <div className={`small ${theme.subText}`}>
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, finalFilteredProducts.length)} of {finalFilteredProducts.length} entries
                </div>
                <nav>
                    <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button className={`page-link ${darkMode ? 'bg-secondary text-light border-dark' : ''}`} onClick={() => paginate(currentPage - 1)}>Prev</button>
                        </li>
                        {[...Array(totalPages)].map((_, i) => (
                            <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                                <button className={`page-link ${darkMode ? 'bg-primary border-primary text-light' : ''}`} onClick={() => paginate(i + 1)}>{i + 1}</button>
                            </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button className={`page-link ${darkMode ? 'bg-secondary text-light border-dark' : ''}`} onClick={() => paginate(currentPage + 1)}>Next</button>
                        </li>
                    </ul>
                </nav>
            </div>
        )}
      </div>

      {/* ================= MODALS ================= */}
      
      {/* 1. ADD / EDIT PRODUCT */}
      {showAddModal && (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
            <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className={`modal-content ${theme.modalContent}`}>
                        <div className={`modal-header ${theme.modalHeader} pb-0`}>
                            <h5 className="modal-title fw-bold">{editingProduct ? 'Edit Product' : 'New Product'}</h5>
                            <button type="button" className={`btn-close ${theme.btnClose}`} onClick={() => setShowAddModal(false)}></button>
                        </div>
                        <div className="modal-body p-4">
                            <form onSubmit={submitProduct}>
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className={`form-label small fw-bold ${theme.subText}`}>Product Name</label>
                                        <input type="text" className={`form-control ${theme.input}`} required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                                    </div>
                                    <div className="col-12">
                                        <label className={`form-label small fw-bold ${theme.subText}`}>SKU (Optional)</label>
                                        <input type="text" className={`form-control ${theme.input}`} placeholder="Auto-Generate" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className={`form-label small fw-bold ${theme.subText}`}>Brand</label>
                                        <select className={`form-select ${theme.input}`} required value={newProduct.brand_id} onChange={e => setNewProduct({...newProduct, brand_id: e.target.value})}>
                                            <option value="">Select...</option>
                                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className={`form-label small fw-bold ${theme.subText}`}>Category</label>
                                        <select className={`form-select ${theme.input}`} required value={newProduct.category_id} onChange={handleCategoryChange}>
                                            <option value="">Select...</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className={`form-label small fw-bold ${theme.subText}`}>Sub-Category</label>
                                        <select className={`form-select ${theme.input}`} value={newProduct.sub_category_id} onChange={e => setNewProduct({...newProduct, sub_category_id: e.target.value})}>
                                            <option value="">None</option>
                                            {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className={`form-label small fw-bold ${theme.subText}`}>Net Price (Buy)</label>
                                        <input type="number" step="0.01" className={`form-control ${theme.input}`} required value={newProduct.net_price} onChange={e => setNewProduct({...newProduct, net_price: e.target.value})} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className={`form-label small fw-bold ${theme.subText}`}>Sell Price (MRP)</label>
                                        <input type="number" step="0.01" className={`form-control ${theme.input}`} required value={newProduct.sell_price} onChange={e => setNewProduct({...newProduct, sell_price: e.target.value})} />
                                    </div>
                                    <div className="col-12">
                                        <label className={`form-label small fw-bold ${theme.subText}`}>Warranty Details</label>
                                        <textarea className={`form-control ${theme.input}`} rows="2" value={newProduct.warranty_details} onChange={e => setNewProduct({...newProduct, warranty_details: e.target.value})}></textarea>
                                    </div>
                                    
                                    {/* Active Checkbox in Form */}
                                    <div className="col-12 mt-3">
                                        <div className="form-check form-switch">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                id="isActiveSwitch"
                                                checked={newProduct.is_active} 
                                                onChange={e => setNewProduct({...newProduct, is_active: e.target.checked})} 
                                            />
                                            <label className="form-check-label fw-bold" htmlFor="isActiveSwitch">Available for Sale?</label>
                                        </div>
                                    </div>

                                </div>
                                <button type="submit" className="btn btn-primary w-100 mt-4 fw-bold">{editingProduct ? 'Update Product' : 'Create Product'}</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* 2. RESTOCK MODAL */}
      {showRestockModal && (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
            <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className={`modal-content ${theme.modalContent}`}>
                        <div className={`modal-header ${theme.modalHeader} pb-0`}>
                            <h5 className="modal-title fw-bold">Restock Inventory</h5>
                            <button type="button" className={`btn-close ${theme.btnClose}`} onClick={() => setShowRestockModal(false)}></button>
                        </div>
                        <div className="modal-body p-4">
                            <p className={`mb-1 ${theme.subText}`}>Adding stock for:</p>
                            <h5 className="fw-bold mb-4">{restockData.name}</h5>
                            
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className={`form-label small fw-bold ${theme.subText}`}>Qty Received</label>
                                    <input type="number" className={`form-control form-control-lg ${theme.input}`} placeholder="e.g. 50" value={restockData.qty} onChange={e => setRestockData({...restockData, qty: e.target.value})} />
                                </div>
                                <div className="col-md-6">
                                    <label className={`form-label small fw-bold ${theme.subText}`}>Received Date</label>
                                    <input 
                                        type="date" 
                                        className={`form-control form-control-lg ${theme.input}`} 
                                        value={restockData.received_date} 
                                        onChange={e => setRestockData({...restockData, received_date: e.target.value})}
                                        style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                                    />
                                </div>
                            </div>
                            <button className="btn btn-success w-100 fw-bold mt-4" onClick={submitRestock}>Confirm Restock</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* 3. MASTER DATA MODAL */}
      {showMasterModal && (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
            <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className={`modal-content ${theme.modalContent}`}>
                        <div className={`modal-header ${theme.modalHeader}`}>
                            <h5 className="modal-title fw-bold">Brands / Categories</h5>
                            <button type="button" className={`btn-close ${theme.btnClose}`} onClick={() => setShowMasterModal(false)}></button>
                        </div>
                        <div className="modal-body p-4">
                            <ul className="nav nav-pills mb-4 gap-2">
                                {['brand', 'category', 'sub-category'].map(tab => (
                                    <li className="nav-item" key={tab}>
                                        <button className={`nav-link text-capitalize ${masterTab === tab ? 'active' : theme.text}`} onClick={()=>setMasterTab(tab)}>{tab.replace('-', ' ')}</button>
                                    </li>
                                ))}
                            </ul>

                            <div className="d-flex gap-2 mb-3">
                                {masterTab === 'sub-category' && (
                                    <select className={`form-select ${theme.input}`} style={{maxWidth: '200px'}} value={selectedParentCat} onChange={e => setSelectedParentCat(e.target.value)}>
                                        <option value="">Select Parent...</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                )}
                                <input type="text" className={`form-control ${theme.input}`} placeholder={`New ${masterTab} name...`} value={masterInput} onChange={e => setMasterInput(e.target.value)} />
                                {editingMaster ? (
                                    <>
                                        <button className="btn btn-warning text-white fw-bold" onClick={handleMasterSubmit}>Update</button>
                                        <button className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                                    </>
                                ) : (
                                    <button className="btn btn-success" onClick={handleMasterSubmit}>Add</button>
                                )}
                            </div>

                            <ul className="list-group" style={{maxHeight: '300px', overflowY: 'auto'}}>
                                {masterList.length === 0 && <li className={`list-group-item text-center ${theme.listGroupItem}`}>No items found.</li>}
                                {masterList.map(item => (
                                    <li key={item.id} className={`list-group-item d-flex justify-content-between align-items-center ${theme.listGroupItem} ${editingMaster?.id === item.id ? 'border-warning' : ''}`}>
                                        {item.name}
                                        <div>
                                            <button className="btn btn-sm btn-outline-warning border-0 me-1" onClick={() => startEdit(item)}><i className="bi bi-pencil-square"></i></button>
                                            <button className="btn btn-sm btn-outline-danger border-0" onClick={() => promptDelete(item.id, masterTab, item.name)}><i className="bi bi-trash"></i></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* 4. CONFIRM DELETE MODAL */}
      {confirmModal.show && (
        <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1070 }}></div>
            <div className="modal fade show d-block" style={{ zIndex: 1080 }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                    <div className={`modal-content rounded-3 ${theme.modalContent}`}>
                        <div className={`modal-header border-bottom-0 py-3 ${theme.modalHeader}`}>
                            <h6 className="modal-title fw-bold">Confirm Deletion</h6>
                            <button type="button" className={`btn-close ${theme.btnClose}`} onClick={() => setConfirmModal({ ...confirmModal, show: false })}></button>
                        </div>
                        <div className="modal-body p-4 text-center">
                            <div className="mb-3 text-warning"><i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2.5rem' }}></i></div>
                            <p className="mb-1">Are you sure you want to delete:</p>
                            <h5 className="fw-bold text-break">"{confirmModal.title}"?</h5>
                            <p className={`small mt-2 mb-0 ${theme.subText}`}>This action cannot be undone.</p>
                        </div>
                        <div className={`modal-footer border-top-0 justify-content-center pb-3 ${darkMode ? 'border-secondary' : 'bg-light'}`}>
                            <button className="btn btn-secondary border px-4 me-2" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>Cancel</button>
                            <button className="btn btn-danger px-4 fw-bold" onClick={executeDelete}>Delete Item</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
      )}

    </div>
  );
};

export default Inventory;