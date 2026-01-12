import React, { useContext, useState, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import CustomerLedgerModal from '../components/CustomerLedgerModal';
import { toast } from 'react-hot-toast'; 
import Swal from 'sweetalert2'; // 🔥 IMPORT SWEETALERT

// ==========================================
// 1. SUB-COMPONENT: ADD/EDIT FORM MODAL
// ==========================================
const CustomerFormModal = ({ customer, onClose, onSuccess, theme }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    address: '' 
  });
  const [phoneStatus, setPhoneStatus] = useState({ loading: false, error: null, valid: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // POPULATE FORM ON OPEN
  useEffect(() => {
    if (customer) {
      setFormData({ 
        name: customer.name, 
        phone: customer.phone, 
        address: customer.address || '' 
      });
      setPhoneStatus({ loading: false, error: null, valid: true });
    } else {
      setFormData({ name: '', phone: '', address: '' });
      setPhoneStatus({ loading: false, error: null, valid: false });
    }
  }, [customer]);

  // --- LIVE CHECK FUNCTION ---
  const checkPhoneExistence = async (phone) => {
    // If editing and phone is same as original, it's valid
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
      setPhoneStatus({ loading: false, error: null, valid: false });
    }
  };

  // --- HANDLE TYPING ---
  const handlePhoneChange = (e) => {
      // 1. Regex: Allow only digits
      const val = e.target.value.replace(/\D/g, '');
      
      // 2. Limit to 10 digits
      if (val.length <= 10) {
          setFormData({ ...formData, phone: val });

          // 3. Reset status if incomplete
          if (val.length < 10) {
              setPhoneStatus({ loading: false, error: null, valid: false });
          }

          // 4. Trigger check exactly at 10
          if (val.length === 10) {
              checkPhoneExistence(val);
          }
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final validation before submit
    if (formData.phone.length !== 10) {
        toast.error("Phone number must be exactly 10 digits.");
        return;
    }
    if (phoneStatus.error) {
        toast.error(phoneStatus.error);
        return;
    }

    setIsSubmitting(true);
    try {
      if (customer) {
        await apiClient.put(`/customers/${customer.id}`, formData);
        toast.success("Customer Updated Successfully!");
      } else {
        await apiClient.post('/customers', formData);
        toast.success("Customer Added Successfully!");
      }
      onSuccess(); 
      onClose();   
    } catch (err) {
      toast.error(err.response?.data?.detail || "Operation failed");
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
              <h5 className="modal-title fw-bold">{customer ? 'Edit Customer' : 'New Customer'}</h5>
              <button type="button" className={`btn-close ${theme.closeBtn}`} onClick={onClose}></button>
            </div>
            <div className="modal-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className={`small fw-bold mb-1 ${theme.subText}`}>Full Name</label>
                  <input type="text" className={`form-control py-2 ${theme.input}`} placeholder="e.g. John Doe" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                
                {/* PHONE INPUT */}
                <div className="mb-3">
                  <label className={`small fw-bold mb-1 ${theme.subText}`}>Phone Number (10 Digits)</label>
                  <div className="input-group">
                    <span className={`input-group-text ${theme.inputIcon}`}>+91</span>
                    <input 
                        type="text" 
                        inputMode="numeric"
                        className={`form-control py-2 ${theme.input} ${phoneStatus.error ? 'is-invalid' : ''} ${phoneStatus.valid ? 'is-valid' : ''}`} 
                        placeholder="9876543210" 
                        value={formData.phone} 
                        onChange={handlePhoneChange} 
                        required 
                    />
                    {phoneStatus.loading && <span className={`input-group-text ${theme.inputIcon}`}><div className="spinner-border spinner-border-sm"></div></span>}
                  </div>
                  {/* Validation Messages */}
                  <div className="d-flex justify-content-between mt-1">
                      {phoneStatus.error && <small className="text-danger fw-bold">{phoneStatus.error}</small>}
                      {phoneStatus.valid && <small className="text-success fw-bold"></small>}
                  </div>
                </div>

                <div className="mb-4">
                  <label className={`small fw-bold mb-1 ${theme.subText}`}>Address</label>
                  <textarea className={`form-control py-2 ${theme.input}`} rows="3" placeholder="Address..." value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>
                <button disabled={isSubmitting || phoneStatus.error || formData.phone.length !== 10} className="btn btn-primary w-100 fw-bold py-2 rounded-pill shadow-sm">
                  {isSubmitting ? 'Saving...' : (customer ? 'Update Changes' : 'Save Customer')}
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
// 2. MAIN COMPONENT: CUSTOMERS LIST
// ==========================================
const Customers = () => {
  const { customers, loadCustomers, darkMode } = useContext(GlobalContext);
  
  // --- STATE ---
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null); 
  
  // --- VIEW STATE ---
  const [viewMode, setViewMode] = useState('all'); 
  const [debtorsList, setDebtorsList] = useState([]);
  const [loadingDebtors, setLoadingDebtors] = useState(false);
  const [sortOrder, setSortOrder] = useState('highToLow'); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [viewLedgerId, setViewLedgerId] = useState(null);
  
  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('');

  // --- THEME ENGINE ---
  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-muted',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
    cardHeader: darkMode ? 'border-secondary' : 'border-bottom',
    searchBg: darkMode ? 'bg-secondary' : 'bg-white',
    searchText: darkMode ? 'text-white' : 'text-dark',
    searchPlaceholder: darkMode ? 'placeholder-white-50' : 'placeholder-secondary',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-light border-0 text-dark',
    inputIcon: darkMode ? 'bg-dark border-secondary text-white' : 'bg-light border-0 text-muted',
    trayBg: darkMode ? 'bg-secondary border-secondary' : 'bg-light border',
    trayBtnActive: darkMode ? 'bg-primary text-white shadow-sm' : 'bg-white text-dark shadow-sm',
    trayBtnInactive: darkMode ? 'text-white-50' : 'text-muted',
    tableHeader: darkMode ? 'table-dark' : 'table-light',
    tableBorder: darkMode ? 'border-secondary' : 'border-light',
    paginationBtn: darkMode ? 'btn-outline-light' : 'btn-outline-secondary',
    modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    modalHeader: darkMode ? 'border-secondary bg-dark' : 'border-bottom bg-white',
    closeBtn: darkMode ? 'btn-close-white' : ''
  };

  // --- LOAD DATA ON START ---
  useEffect(() => {
    loadCustomers(); 
  }, [loadCustomers]);

  // --- LOAD DEBTORS WHEN SWITCHING TABS ---
  const loadDebtors = () => {
      setLoadingDebtors(true);
      apiClient.get('/customers/debtors').then(res => {
          setDebtorsList(res.data);
          setLoadingDebtors(false);
      });
  };

  useEffect(() => {
    if (viewMode === 'debtors') {
      loadDebtors();
    }
  }, [viewMode]);

  // --- ACTIONS ---
  const handleAddClick = () => {
      setEditingCustomer(null);
      setShowModal(true);
  };

  const handleEditClick = (e, customer) => {
      e.stopPropagation();
      setEditingCustomer(customer);
      setShowModal(true);
  };

  // 🔥 UPDATED: DELETE WITH SWEET ALERT 2
  const handleDelete = async (e, id) => {
    e.stopPropagation(); 
    
    // Customizing SweetAlert to match Dark/Light mode
    const swalColors = {
        bg: darkMode ? '#1e293b' : '#fff',
        text: darkMode ? '#fff' : '#545454'
    };

    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        background: swalColors.bg,
        color: swalColors.text,
        iconColor: '#dc3545'
    });

    if (result.isConfirmed) {
        try {
            await apiClient.delete(`/customers/${id}`);
            loadCustomers();
            
            // Success Alert
            Swal.fire({
                title: 'Deleted!',
                text: 'Customer has been removed.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                background: swalColors.bg,
                color: swalColors.text
            });
        } catch (err) {
            // Error Alert
            Swal.fire({
                title: 'Error!',
                text: err.response?.data?.detail || "Delete failed.",
                icon: 'error',
                background: swalColors.bg,
                color: swalColors.text
            });
        }
    }
  };

  const handleModalSuccess = () => {
    loadCustomers();
    if (viewMode === 'debtors') {
        loadDebtors();
    }
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'highToLow' ? 'lowToHigh' : 'highToLow');
  };

  // --- FILTER & SORT LOGIC ---
  const getDisplayList = () => {
    // 1. SELECT LIST BASED ON VIEW MODE
    let list = viewMode === 'all' ? customers : debtorsList;

    // 2. APPLY SEARCH
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        list = list.filter(c => 
            c.name.toLowerCase().includes(query) || 
            c.phone.includes(query)
        );
    }

    // 3. APPLY SORT (ONLY FOR DEBTORS)
    if (viewMode === 'debtors') {
        list = [...list].sort((a, b) => {
            const valA = a.total_due || 0;
            const valB = b.total_due || 0;
            return sortOrder === 'highToLow' ? valB - valA : valA - valB;
        });
    }
    
    return list;
  };

  const displayList = getDisplayList();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = displayList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(displayList.length / itemsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="container-fluid p-4" style={{ minHeight: '100vh', background: theme.container, transition: 'background 0.3s ease' }}>
      
      {viewLedgerId && <CustomerLedgerModal customerId={viewLedgerId} onClose={() => setViewLedgerId(null)} />}

      {showModal && (
        <CustomerFormModal 
            customer={editingCustomer} 
            onClose={() => setShowModal(false)} 
            onSuccess={handleModalSuccess}
            theme={theme}
        />
      )}

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className={`fw-bold m-0 ${theme.text}`}>Customer Management</h3>
          <p className={`small m-0 ${theme.subText}`}>Manage your client database.</p>
        </div>
        
        <div className="d-flex w-100 w-md-auto align-items-center gap-3 flex-column flex-md-row">
            <div className={`input-group shadow-sm rounded-pill overflow-hidden ${theme.searchBg}`} style={{ maxWidth: '400px', width: '100%' }}>
                <span className={`input-group-text border-0 ps-3 bg-transparent ${theme.searchText}`}>
                    <i className="bi bi-search"></i>
                </span>
                <input 
                    type="text" 
                    className={`form-control border-0 shadow-none bg-transparent ${theme.searchText} ${theme.searchPlaceholder}`} 
                    placeholder="Search name or phone..." 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
                {searchQuery && (
                    <button className={`btn border-0 bg-transparent ${theme.searchText}`} onClick={() => {setSearchQuery(''); setCurrentPage(1);}}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                )}
            </div>

            <button className="btn btn-primary fw-bold px-4 rounded-pill shadow-sm d-flex align-items-center gap-2 flex-shrink-0" onClick={handleAddClick}>
                <i className="bi bi-plus-lg"></i> Add Client
            </button>
        </div>
      </div>

      <div className={`card overflow-hidden h-100 rounded-4 ${theme.card}`}>
        <div className={`card-header py-3 d-flex justify-content-between align-items-center ${theme.cardHeader}`}>
            <div className={`p-1 rounded-pill d-inline-flex ${theme.trayBg}`}>
                <button className={`btn btn-sm rounded-pill fw-bold px-3 transition-all ${viewMode === 'all' ? theme.trayBtnActive : theme.trayBtnInactive}`} onClick={() => { setViewMode('all'); setCurrentPage(1); }}>All Clients</button>
                <button className={`btn btn-sm rounded-pill fw-bold px-3 transition-all ${viewMode === 'debtors' ? 'bg-danger text-white shadow-sm' : theme.trayBtnInactive}`} onClick={() => { setViewMode('debtors'); setCurrentPage(1); }}>Active Accounts</button>
            </div>
            <div className="btn-group btn-group-sm">
                <button className={`btn ${theme.paginationBtn}`} onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}><i className="bi bi-chevron-left"></i></button>
                <button className={`btn ${theme.paginationBtn}`} disabled>{currentPage} / {totalPages || 1}</button>
                <button className={`btn ${theme.paginationBtn}`} onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}><i className="bi bi-chevron-right"></i></button>
            </div>
        </div>
        
        <div className="table-responsive">
            <table className="table mb-0 align-middle">
            <thead className={`${theme.tableHeader} small text-uppercase`}>
                <tr>
                <th className="ps-4 py-3 fw-bold">Customer Profile</th>
                <th className="fw-bold text-center">Phone</th>
                {viewMode === 'debtors' ? (
                    <th className="text-end pe-4" onClick={toggleSort} style={{cursor: 'pointer'}}>
                        <span className="fw-bold text-danger me-1">TOTAL DUE</span>
                        <i className={`bi ${sortOrder === 'highToLow' ? 'bi-arrow-down' : 'bi-arrow-up'} text-danger`}></i>
                    </th>
                ) : (
                    <th className="text-end pe-4 fw-bold">Actions</th>
                )}
                </tr>
            </thead>
            <tbody className={theme.tableBorder}>
                {loadingDebtors ? (
                    <tr><td colSpan="3" className={`text-center py-5 ${theme.text}`}>Loading...</td></tr>
                ) : currentItems.length === 0 ? (
                    <tr><td colSpan="3" className={`text-center py-5 ${theme.subText}`}>{searchQuery ? 'No matching customers found.' : 'No records found.'}</td></tr>
                ) : (
                currentItems.map((c) => (
                    <tr key={c.id} style={{cursor: 'pointer'}} onClick={() => setViewLedgerId(c.id)} className={theme.text}>
                    <td className="ps-4 py-3">
                        <div className="d-flex align-items-center">
                        <div className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold me-3 shadow-sm" style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>{getInitials(c.name)}</div>
                        <div>
                            <div className={`fw-bold ${theme.text}`}>{c.name}</div>
                            <small className={`d-block text-truncate ${theme.subText}`} style={{ maxWidth: '200px' }}>{c.address || 'No Address'}</small>
                        </div>
                        </div>
                    </td>
                    <td className={`fw-medium text-center ${theme.text}`}>{c.phone}</td>
                    <td className="text-end pe-4">
                        {viewMode === 'debtors' ? (
                            <span className={`badge ${darkMode ? 'bg-danger text-white' : 'bg-danger bg-opacity-10 text-danger'} px-3 py-2 rounded-pill fw-bold`}>₹{c.total_due?.toFixed(2)}</span>
                        ) : (
                            <div>
                                <button className="btn btn-sm btn-outline-warning border-0 rounded-circle p-2 me-1" onClick={(e) => handleEditClick(e, c)} title="Edit"><i className="bi bi-pencil-square"></i></button>
                                <button className="btn btn-sm btn-outline-danger border-0 rounded-circle p-2" onClick={(e) => handleDelete(e, c.id)} title="Delete"><i className="bi bi-trash-fill"></i></button>
                            </div>
                        )}
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
        </div>
        <div className={`card-footer border-top-0 py-3 text-end ${theme.card}`}>
            <small className={theme.subText}>Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, displayList.length)} of {displayList.length}</small>
        </div>
      </div>
    </div>
  );
};

export default Customers;