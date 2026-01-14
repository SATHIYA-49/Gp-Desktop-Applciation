import React, { useContext, useState, useEffect, useCallback } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import Swal from 'sweetalert2'; // 🔥 Standardized Alert System

// --- 1. TOAST CONFIGURATION ---
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

// --- DEBOUNCE HOOK ---
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// ==========================================
// 2. SUB-COMPONENT: ADD/EDIT FORM MODAL
// ==========================================
const CustomerFormModal = ({ customer, onClose, onSuccess, theme }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    address: '',
    category: 'Customer' 
  });
  
  const [phoneStatus, setPhoneStatus] = useState({ loading: false, error: null, valid: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data on Edit
  useEffect(() => {
    if (customer) {
      setFormData({ 
        name: customer.name, 
        phone: customer.phone, 
        address: customer.address || '',
        category: customer.category || 'Customer'
      });
      setPhoneStatus({ loading: false, error: null, valid: true });
    } else {
      setFormData({ name: '', phone: '', address: '', category: 'Customer' });
      setPhoneStatus({ loading: false, error: null, valid: false });
    }
  }, [customer]);

  // 🔥 Real-time Phone Duplicate Check
  const checkPhoneExistence = async (phone) => {
    if (customer && customer.phone === phone) {
        setPhoneStatus({ loading: false, error: null, valid: true });
        return;
    }
    setPhoneStatus({ loading: true, error: null, valid: false });
    try {
      const res = await apiClient.get(`/customers/check-phone?phone=${phone}`);
      if (res.data.exists) {
        setPhoneStatus({ loading: false, error: `Taken by: ${res.data.customer_name}`, valid: false });
      } else {
        setPhoneStatus({ loading: false, error: null, valid: true });
      }
    } catch (err) {
      // Backend validation error (e.g. not 10 digits)
      setPhoneStatus({ loading: false, error: null, valid: false });
    }
  };

  const handlePhoneChange = (e) => {
      const val = e.target.value.replace(/\D/g, ''); // Numbers only
      if (val.length <= 10) {
          setFormData({ ...formData, phone: val });
          
          if (val.length < 10) setPhoneStatus({ loading: false, error: null, valid: false });
          if (val.length === 10) checkPhoneExistence(val);
      }
  };

  // 🔥 ROBUST SUBMIT HANDLER (Handles Pydantic Errors)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client Side Validation
    if (formData.phone.length !== 10) return Swal.fire({ icon: 'warning', title: 'Invalid Phone', text: 'Phone number must be exactly 10 digits.' });
    if (phoneStatus.error) return Swal.fire({ icon: 'warning', title: 'Duplicate Phone', text: phoneStatus.error });
    if (!formData.name.trim()) return Swal.fire({ icon: 'warning', title: 'Missing Name', text: 'Customer name is required.' });

    setIsSubmitting(true);
    
    // Clean Payload (Empty strings -> null)
    const payload = {
        ...formData,
        address: formData.address.trim() === '' ? null : formData.address,
        category: formData.category || 'Customer'
    };

    try {
      if (customer) {
        await apiClient.put(`/customers/${customer.id}`, payload);
        Toast.fire({ icon: 'success', title: 'Customer Updated' });
      } else {
        await apiClient.post('/customers', payload);
        Toast.fire({ icon: 'success', title: 'Customer Added' });
      }
      onSuccess(); 
      onClose();   
    } catch (err) {
      console.error("Submit Error:", err);
      const errorDetail = err.response?.data?.detail;
      let displayMsg = "Operation failed.";

      // 🛑 HANDLE BACKEND ERRORS (Array vs String)
      if (Array.isArray(errorDetail)) {
          displayMsg = errorDetail.map(e => `• ${e.msg}`).join('<br>');
      } else if (typeof errorDetail === 'string') {
          displayMsg = errorDetail;
      }

      Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          html: `<div class="text-start text-danger fw-bold">${displayMsg}</div>`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050, backdropFilter: 'blur(2px)' }}></div>
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className={`modal-content rounded-4 ${theme.modalContent}`}>
            <div className={`modal-header py-3 ${theme.modalHeader}`}>
              <h5 className="modal-title fw-bold">{customer ? 'Edit Client' : 'New Client'}</h5>
              <button type="button" className={`btn-close ${theme.closeBtn}`} onClick={onClose}></button>
            </div>
            <div className="modal-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row g-3 mb-3">
                    <div className="col-md-7">
                        <label className={`small fw-bold mb-1 ${theme.subText}`}>Full Name <span className="text-danger">*</span></label>
                        <input type="text" className={`form-control py-2 ${theme.input}`} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div className="col-md-5">
                        <label className={`small fw-bold mb-1 ${theme.subText}`}>Category</label>
                        <select className={`form-select py-2 ${theme.input}`} value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                            <option value="Customer">Customer</option>
                            <option value="Dealer">Dealer</option>
                            <option value="Technician">Technician</option>
                        </select>
                    </div>
                </div>
                
                <div className="mb-3">
                  <label className={`small fw-bold mb-1 ${theme.subText}`}>Phone Number <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className={`input-group-text ${theme.inputIcon}`}>+91</span>
                    <input 
                        type="text" 
                        inputMode="numeric" 
                        className={`form-control py-2 ${theme.input} ${phoneStatus.error ? 'is-invalid border-danger' : ''} ${phoneStatus.valid ? 'is-valid border-success' : ''}`} 
                        placeholder="9876543210" 
                        value={formData.phone} 
                        onChange={handlePhoneChange} 
                        required 
                    />
                    {phoneStatus.loading && <span className={`input-group-text ${theme.inputIcon}`}><div className="spinner-border spinner-border-sm"></div></span>}
                  </div>
                  <div className="d-flex justify-content-between mt-1">
                      {phoneStatus.error && <small className="text-danger fw-bold"><i className="bi bi-exclamation-circle me-1"></i>{phoneStatus.error}</small>}
                      {phoneStatus.valid && !customer && <small className="text-success fw-bold"><i className="bi bi-check-circle me-1"></i>Available</small>}
                  </div>
                </div>

                <div className="mb-4">
                  <label className={`small fw-bold mb-1 ${theme.subText}`}>Address <span className="text-muted fw-normal">(Optional)</span></label>
                  <textarea className={`form-control py-2 ${theme.input}`} rows="3" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>

                <button disabled={isSubmitting || phoneStatus.error || formData.phone.length !== 10} className="btn btn-primary w-100 fw-bold py-2 rounded-pill shadow-sm">
                  {isSubmitting ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
                  {isSubmitting ? 'Saving...' : (customer ? 'Update Client' : 'Save Client')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ==========================================
// 3. MAIN COMPONENT: CUSTOMERS LIST
// ==========================================
const Customers = () => {
  const { darkMode } = useContext(GlobalContext);
  
  // --- STATE ---
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null); 
  const [customersData, setCustomersData] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_items: 0 });
  const [loading, setLoading] = useState(false);

  // --- FILTERS ---
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [categoryFilter, setCategoryFilter] = useState('All'); 

  // --- THEME CONFIG (Identical to Inventory) ---
  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-muted',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
    cardHeader: darkMode ? 'border-secondary' : 'border-bottom',
    searchBg: darkMode ? 'bg-secondary' : 'bg-white',
    searchText: darkMode ? 'text-white' : 'text-dark',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-light border-0 text-dark',
    inputIcon: darkMode ? 'bg-dark border-secondary text-white' : 'bg-light border-0 text-muted',
    tableHeader: darkMode ? 'table-dark' : 'table-light',
    paginationBtn: darkMode ? 'btn-outline-light' : 'btn-outline-secondary',
    modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    modalHeader: darkMode ? 'border-secondary bg-dark' : 'border-bottom bg-white',
    closeBtn: darkMode ? 'btn-close-white' : ''
  };

  // --- FETCH DATA ---
  const fetchCustomers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
        const res = await apiClient.get('/customers/', {
          params: { page, limit: 5, search: debouncedSearch, category: categoryFilter } // Added Category Filter to API
        });
        
        setCustomersData(res.data.data || []);
        const total = res.data.total || 0;
        setPagination({
          current_page: page,
          total_pages: Math.ceil(total / res.data.limit),
          total_items: total
        });
    } catch (error) {
      console.error("Fetch Error:", error);
      Toast.fire({ icon: 'error', title: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryFilter]);

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  // --- HANDLERS ---
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) fetchCustomers(newPage);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Delete Client?',
      text: "This will remove the client and their history permanently.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/customers/${id}`);
        Toast.fire({ icon: 'success', title: 'Deleted successfully' });
        fetchCustomers(pagination.current_page);
      } catch (err) {
        // Handle Foreign Key Error (e.g., Cannot delete because of sales)
        const errorDetail = err.response?.data?.detail;
        Swal.fire('Delete Failed', errorDetail || "Something went wrong", 'error');
      }
    }
  };

  const handleAddClick = () => { setEditingCustomer(null); setShowModal(true); };
  const handleEditClick = (e, c) => { e.stopPropagation(); setEditingCustomer(c); setShowModal(true); };
  const handleModalSuccess = () => { fetchCustomers(pagination.current_page); };

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';
  const getCategoryBadge = (cat) => {
      if(cat === 'Dealer') return <span className="badge bg-info text-dark ms-2" style={{fontSize:'0.6em'}}>DEALER</span>;
      if(cat === 'Technician') return <span className="badge bg-warning text-dark ms-2" style={{fontSize:'0.6em'}}>TECH</span>;
      return null;
  };

  return (
    <div className="container-fluid p-4" style={{ minHeight: '100vh', background: theme.container }}>
      
      {showModal && (
        <CustomerFormModal 
            customer={editingCustomer} 
            onClose={() => setShowModal(false)} 
            onSuccess={handleModalSuccess}
            theme={theme}
        />
      )}

      {/* HEADER & CONTROLS */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className={`fw-bold m-0 ${theme.text}`}>Customer Management</h3>
          <p className={`small m-0 ${theme.subText}`}>Manage your database.</p>
        </div>
        
        <div className="d-flex gap-2 align-items-center">
            {/* SEARCH */}
            <div className={`input-group shadow-sm rounded-pill overflow-hidden ${theme.searchBg}`} style={{ maxWidth: '200px' }}>
                <span className={`input-group-text border-0 ps-3 bg-transparent ${theme.searchText}`}><i className="bi bi-search"></i></span>
                <input 
                    type="text" 
                    className={`form-control border-0 shadow-none bg-transparent ${theme.searchText}`} 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* CATEGORY */}
            <select 
                className={`form-select rounded-pill shadow-sm ${theme.input}`} 
                style={{maxWidth: '140px', cursor:'pointer'}}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
            >
                <option value="All">All Types</option>
                <option value="Customer">Customers</option>
                <option value="Dealer">Dealers</option>
                <option value="Technician">Techs</option>
            </select>

            <button className="btn btn-primary fw-bold px-4 rounded-pill shadow-sm" onClick={handleAddClick}>
                <i className="bi bi-plus-lg me-2"></i>Add
            </button>
        </div>
      </div>

      {/* CARD & TABLE */}
      <div className={`card overflow-hidden h-100 rounded-4 ${theme.card}`}>
        <div className={`card-header py-3 d-flex justify-content-between align-items-center ${theme.cardHeader}`}>
            <span className={`fw-bold ${theme.subText}`}>Total: {pagination.total_items}</span>
            <div className="btn-group btn-group-sm">
                <button className={`btn ${theme.paginationBtn}`} onClick={() => handlePageChange(pagination.current_page - 1)} disabled={pagination.current_page === 1}>Prev</button>
                <button className={`btn ${theme.paginationBtn}`} disabled>{pagination.current_page} / {pagination.total_pages}</button>
                <button className={`btn ${theme.paginationBtn}`} onClick={() => handlePageChange(pagination.current_page + 1)} disabled={pagination.current_page === pagination.total_pages}>Next</button>
            </div>
        </div>
        
        <div className="table-responsive">
            <table className="table mb-0 align-middle">
            <thead className={`${theme.tableHeader} small text-uppercase`}>
                <tr>
                <th className="ps-4 py-3 fw-bold">Client Profile</th>
                <th className="fw-bold text-center">Phone</th>
                <th className="text-end pe-4 fw-bold">Actions</th>
                </tr>
            </thead>
            <tbody className={darkMode ? 'border-secondary' : ''}>
                {loading ? (
                    <tr><td colSpan="3" className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr>
                ) : customersData.length === 0 ? (
                    <tr><td colSpan="3" className={`text-center py-5 ${theme.subText}`}>No records found.</td></tr>
                ) : (
                customersData.map((c) => (
                    <tr key={c.id} className={theme.text}>
                    <td className="ps-4 py-3">
                        <div className="d-flex align-items-center">
                        <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold me-3 shadow-sm" style={{ width: '40px', height: '40px', background: '#6366f1' }}>{getInitials(c.name)}</div>
                        <div>
                            <div className={`fw-bold ${theme.text}`}>{c.name} {getCategoryBadge(c.category)}</div>
                            <small className={`d-block text-truncate ${theme.subText}`} style={{ maxWidth: '200px' }}>{c.address || 'No Address'}</small>
                        </div>
                        </div>
                    </td>
                    <td className={`fw-medium text-center ${theme.text}`}>{c.phone}</td>
                    <td className="text-end pe-4">
                        <button className="btn btn-sm btn-outline-warning border-0 rounded-circle me-1" onClick={(e) => handleEditClick(e, c)}><i className="bi bi-pencil-square"></i></button>
                        <button className="btn btn-sm btn-outline-danger border-0 rounded-circle" onClick={(e) => handleDelete(e, c.id)}><i className="bi bi-trash"></i></button>
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Customers;