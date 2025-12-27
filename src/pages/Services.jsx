import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

// ... (SearchableSelect component remains exactly the same as before) ...
const SearchableSelect = ({ options, value, onChange, placeholder, label, theme, darkMode, required }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    const selectedItem = options.find(opt => opt.value === value);
    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase()) || 
        (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
    );

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearch('');
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="mb-3" ref={wrapperRef}>
            <label className={`small fw-bold mb-1 ${theme.text}`}>{label}</label>
            <div className="position-relative">
                <div 
                    className={`input-group ${theme.input} border rounded overflow-hidden`} 
                    onClick={() => setIsOpen(!isOpen)} 
                    style={{cursor: 'text'}}
                >
                    <input 
                        type="text" 
                        className={`form-control border-0 shadow-none ${theme.input}`} 
                        placeholder={selectedItem ? selectedItem.label : placeholder}
                        value={isOpen ? search : (selectedItem ? selectedItem.label : '')}
                        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        style={{backgroundColor: 'transparent'}}
                        required={required && !value} 
                    />
                    <span className={`input-group-text border-0 bg-transparent ${theme.text}`}>
                        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
                    </span>
                </div>
                {isOpen && (
                    <div 
                        className="position-absolute w-100 shadow-lg rounded mt-1 overflow-auto custom-scrollbar" 
                        style={{
                            maxHeight: '200px', 
                            zIndex: 1060, 
                            top: '100%', 
                            backgroundColor: darkMode ? '#1e293b' : '#fff', 
                            border: darkMode ? '1px solid #475569' : '1px solid #dee2e6'
                        }}
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div 
                                    key={opt.value} 
                                    className={`p-2 border-bottom ${theme.text}`}
                                    style={{
                                        cursor: 'pointer', 
                                        backgroundColor: opt.value === value ? (darkMode ? '#334155' : '#e9ecef') : 'transparent'
                                    }}
                                    onMouseDown={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#334155' : '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = opt.value === value ? (darkMode ? '#334155' : '#e9ecef') : 'transparent'}
                                >
                                    <div className="small fw-bold">{opt.label}</div>
                                    {opt.subLabel && <div className={theme.subText} style={{fontSize: '0.75rem'}}>{opt.subLabel}</div>}
                                </div>
                            ))
                        ) : (
                            <div className={`p-3 text-center small ${theme.text}`}>No matches found</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// 2. MAIN SERVICES COMPONENT
// ==========================================
const Services = () => {
  const { darkMode, customers, loadCustomers } = useContext(GlobalContext);

  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('active'); 
  const [showModal, setShowModal] = useState(false); 
  const [isEditing, setIsEditing] = useState(false); 
  const [currentTaskId, setCurrentTaskId] = useState(null); 

  const [formData, setFormData] = useState({ 
    customer_id: '', 
    employee_id: '', 
    service_date: new Date().toISOString().split('T')[0], 
    task_type: 'General Service',
    notes: '' 
  });

  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-muted',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-light border-0',
    modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    tabActive: darkMode ? 'bg-primary text-white' : 'bg-dark text-white',
    tabInactive: darkMode ? 'bg-transparent text-secondary border-secondary' : 'bg-light text-muted border',
  };

  const customerOptions = customers.map(c => ({ value: c.id, label: c.name, subLabel: c.phone }));
  const employeeOptions = employees.map(e => ({ value: e.id, label: e.name, subLabel: e.role || 'Technician' }));
  const employeeOptionsWithNone = [{ value: '', label: 'Unassigned', subLabel: 'No technician' }, ...employeeOptions];

  // --- FIXED: Wrapped in useCallback to satisfy dependency rules ---
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [srvRes, empRes] = await Promise.allSettled([
        apiClient.get('/services/'),   
        apiClient.get('/employees/')   
      ]);

      if (srvRes.status === 'fulfilled') setServices(srvRes.value.data);
      if (empRes.status === 'fulfilled') setEmployees(empRes.value.data);
      
      // Checking length avoids unnecessary API calls, loadCustomers is now stable via Context
      if(customers.length === 0) loadCustomers(); 

    } catch (err) { 
        console.error("Network Error:", err); 
    } finally { 
        setLoading(false); 
    }
  }, [customers.length, loadCustomers]); // Correct dependencies

  // --- FIXED: Added dependency array ---
  useEffect(() => { 
    loadData(); 
  }, [loadData]); 

  // ... (Handlers: openCreateModal, openEditModal, etc. - No changes needed) ...
  const openCreateModal = () => {
    setIsEditing(false);
    setFormData({ customer_id: '', employee_id: '', service_date: new Date().toISOString().split('T')[0], task_type: 'General Service', notes: '' });
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setIsEditing(true);
    setCurrentTaskId(task.id);
    setFormData({
        customer_id: task.customer_id,
        employee_id: task.assigned_employee_id || '',
        service_date: task.service_date,
        task_type: task.task_type || 'General Service',
        notes: task.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        if (isEditing) {
            await apiClient.put(`/services/${currentTaskId}`, formData);
            Swal.fire({
                icon: 'success',
                title: 'Updated Successfully',
                background: darkMode ? '#1e293b' : '#fff',
                color: darkMode ? '#fff' : '#545454',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            // FIX: Removed unused 'const response ='
            await apiClient.post('/services/assign', formData);
            
            Swal.fire({
                icon: 'success',
                title: 'Task Assigned!',
                text: `Technician notified for ${formData.task_type}`,
                background: darkMode ? '#1e293b' : '#fff',
                color: darkMode ? '#fff' : '#545454',
                timer: 1500,
                showConfirmButton: false
            });

            if (Notification.permission === 'granted') {
                new Notification('New Job Assigned', {
                    body: `${formData.task_type} scheduled for ${formData.service_date}`,
                    icon: '/logo192.png'
                });
            }
        }
        setShowModal(false);
        loadData();
    } catch (err) { 
        Swal.fire({
            icon: 'error',
            title: 'Action Failed',
            text: err.response?.data?.detail || "Could not save changes.",
            background: darkMode ? '#1e293b' : '#fff',
            color: darkMode ? '#fff' : '#545454'
        });
    }
  };

  const markComplete = async (id) => {
    const result = await Swal.fire({
        title: 'Complete Task?',
        text: "This will move the task to history.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Complete',
        background: darkMode ? '#1e293b' : '#fff',
        color: darkMode ? '#fff' : '#545454'
    });

    if (result.isConfirmed) {
        try {
            await apiClient.put(`/services/${id}/complete`); 
            loadData();
            Swal.fire({
                icon: 'success',
                title: 'Completed!',
                timer: 1500,
                showConfirmButton: false,
                background: darkMode ? '#1e293b' : '#fff',
                color: darkMode ? '#fff' : '#545454'
            });
        } catch(e) { 
            Swal.fire('Error', 'Could not update status', 'error'); 
        }
    }
  };

  const filteredList = services.filter(s => {
    const status = s.status || s.service_status || 'Pending';
    if (viewMode === 'active') return status !== 'Completed';
    if (viewMode === 'history') return status === 'Completed';
    return true;
  });

  return (
    <div className="container-fluid p-4" style={{ minHeight: '100vh', background: theme.container }}>
      
      {/* MODAL */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className={`modal-content rounded-4 ${theme.modalContent}`}>
                    <div className="modal-header border-0 pb-0">
                        <h5 className={`modal-title fw-bold ${theme.text}`}>{isEditing ? 'Edit Task' : 'New Task'}</h5>
                        <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={() => setShowModal(false)}></button>
                    </div>
                    <div className="modal-body p-4">
                        <form onSubmit={handleSubmit}>
                            
                            <SearchableSelect 
                                label="Customer"
                                placeholder="Search customer..."
                                options={customerOptions}
                                value={formData.customer_id}
                                onChange={(val) => setFormData({...formData, customer_id: val})}
                                theme={theme}
                                darkMode={darkMode}
                                required={true}
                            />

                            <div className="row g-2 mb-3">
                                <div className="col-6">
                                    <SearchableSelect 
                                        label="Technician"
                                        placeholder="Search technician..."
                                        options={employeeOptionsWithNone}
                                        value={formData.employee_id}
                                        onChange={(val) => setFormData({...formData, employee_id: val})}
                                        theme={theme}
                                        darkMode={darkMode}
                                    />
                                </div>
                                <div className="col-6">
                                    <label className={`small fw-bold mb-1 ${theme.text}`}>Type</label>
                                    <select className={`form-select ${theme.input}`} value={formData.task_type} onChange={e=>setFormData({...formData, task_type: e.target.value})}>
                                        <option>General Service</option>
                                        <option>Installation</option>
                                        <option>Repair</option>
                                        <option>Inspection</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="mb-3">
                                <label className={`small fw-bold mb-1 ${theme.text}`}>Date</label>
                                <input type="date" className={`form-control ${theme.input}`} value={formData.service_date} onChange={e=>setFormData({...formData, service_date: e.target.value})} required />
                            </div>
                            
                            <div className="mb-3">
                                <label className={`small fw-bold mb-1 ${theme.text}`}>Notes</label>
                                <textarea className={`form-control ${theme.input}`} rows="2" value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} />
                            </div>
                            
                            <button className="btn btn-primary w-100 fw-bold py-2 rounded-pill">Save & Notify</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h3 className={`fw-bold m-0 ${theme.text}`}>Service Management</h3>
            <p className="text-secondary small m-0">Track active jobs and history.</p>
        </div>
        <button className="btn btn-primary fw-bold rounded-pill px-4 shadow-sm" onClick={openCreateModal}>
            <i className="bi bi-plus-lg me-2"></i> New Task
        </button>
      </div>

      {/* LIST */}
      <div className={`card overflow-hidden h-100 rounded-4 ${theme.card}`}>
        <div className="card-header border-0 pb-0 pt-3 bg-transparent px-4">
            <ul className="nav nav-pills card-header-pills">
                <li className="nav-item"><button className={`nav-link fw-bold rounded-pill px-4 me-2 ${viewMode === 'active' ? theme.tabActive : theme.tabInactive}`} onClick={() => setViewMode('active')}>Active Tasks</button></li>
                <li className="nav-item"><button className={`nav-link fw-bold rounded-pill px-4 ${viewMode === 'history' ? theme.tabActive : theme.tabInactive}`} onClick={() => setViewMode('history')}>History</button></li>
            </ul>
        </div>

        <div className="card-body p-0 mt-3">
            <div className="table-responsive">
                <table className="table mb-0 align-middle">
                    <thead className={darkMode ? 'table-dark' : 'table-light'}>
                        <tr>
                            <th className="ps-4 py-3">Date</th><th>Customer</th><th>Type</th><th>Technician</th>
                            {viewMode === 'active' && <th className="text-end pe-4">Actions</th>}
                            {viewMode === 'history' && <th className="text-end pe-4">Status</th>}
                        </tr>
                    </thead>
                    <tbody className={darkMode ? 'border-secondary' : 'border-light'}>
                        {loading ? (
                            <tr><td colSpan="5" className={`text-center py-5 ${theme.text}`}>Loading...</td></tr>
                        ) : filteredList.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-5 text-muted">No records found.</td></tr>
                        ) : (
                            filteredList.map((item) => (
                                <tr key={item.id} className={theme.text}>
                                    <td className="ps-4 fw-bold">{item.service_date}</td>
                                    <td>
                                        <div className="fw-bold">{item.users?.name || "Unknown"}</div>
                                        <small className="text-muted" style={{fontSize:'0.7rem'}}>{item.notes || '-'}</small>
                                    </td>
                                    <td><span className="badge bg-info text-dark">{item.task_type}</span></td>
                                    <td>{item.employees?.name ? <span className="text-primary small fw-bold">{item.employees.name}</span> : <span className="text-muted small fst-italic">Unassigned</span>}</td>
                                    <td className="text-end pe-4">
                                        {viewMode === 'active' ? (
                                            <div>
                                                <button className="btn btn-sm btn-light border me-2" onClick={() => openEditModal(item)}><i className="bi bi-pencil"></i></button>
                                                <button className="btn btn-sm btn-success" onClick={() => markComplete(item.id)}><i className="bi bi-check-lg"></i></button>
                                            </div>
                                        ) : <span className="badge bg-success">Done</span>}
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
  );
};

export default Services;