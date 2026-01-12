import React, { useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import Swal from 'sweetalert2';
import TechnicianServiceDetails from '../components/TechnicianServiceDetails'; 
import ServiceHeatmap from '../components/ServiceHeatmap';

// --- HELPER: Debounce Hook ---
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

// ==========================================
// 1. SEARCHABLE SELECT COMPONENT
// ==========================================
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
                    className={`input-group ${theme.input} border rounded overflow-hidden shadow-sm`} 
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
                        className="position-absolute w-100 shadow-lg rounded mt-1 overflow-auto custom-scrollbar animate__animated animate__fadeIn" 
                        style={{
                            maxHeight: '220px', 
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
    
    // --- STATE MANAGEMENT ---
    const [services, setServices] = useState([]); 
    const [employees, setEmployees] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // View & Pagination
    const [viewMode, setViewMode] = useState('active'); 
    const [timeFilter, setTimeFilter] = useState('all'); 
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8; 
    
    // Search
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);

    // Modals
    const [showModal, setShowModal] = useState(false); 
    const [isEditing, setIsEditing] = useState(false); 
    const [currentTaskId, setCurrentTaskId] = useState(null); 
    const [showTechModal, setShowTechModal] = useState(false);
    const [selectedTechName, setSelectedTechName] = useState('');
    const [selectedTechTasks, setSelectedTechTasks] = useState([]);

    const [formData, setFormData] = useState({ 
        customer_id: '', 
        employee_id: '', 
        service_date: new Date().toISOString().split('T')[0], 
        task_type: 'General Service',
        notes: '' 
    });

    // --- THEME ---
    const theme = {
        container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
        text: darkMode ? 'text-white' : 'text-dark',
        subText: darkMode ? 'text-white-50' : 'text-muted',
        card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
        input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-light border-0',
        modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    };

    // --- OPTIONS ---
    const customerOptions = customers.map(c => ({ value: c.id, label: c.name, subLabel: c.phone }));
    const activeEmployees = employees.filter(e => e.is_active !== false);
    const employeeOptions = activeEmployees.map(e => ({ value: e.id, label: e.name, subLabel: e.role || 'Technician' }));
    const employeeOptionsWithNone = [{ value: '', label: 'Unassigned', subLabel: 'No technician' }, ...employeeOptions];

    // --- DATA LOADING ---
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [empRes] = await Promise.allSettled([apiClient.get('/employees/')]);
            if (empRes.status === 'fulfilled') setEmployees(empRes.value.data);
            if(customers.length === 0) loadCustomers(); 

            // 🔥 Fetch "all" services to populate Heatmap and Stats (Limit increased to 500)
            const srvRes = await apiClient.get(`/services/`, {
                params: { view_mode: 'all', page: 1, limit: 500 }
            });

            const rawData = srvRes.data;
            const safeData = rawData.data ? rawData.data : (Array.isArray(rawData) ? rawData : []);
            setServices(safeData);

        } catch (err) { 
            console.error("Network Error:", err);
            setServices([]); 
        } finally { 
            setLoading(false); 
        }
    }, [customers.length, loadCustomers]);

    useEffect(() => { loadData(); }, [loadData]); 
    useEffect(() => { setCurrentPage(1); }, [debouncedSearch, timeFilter]);

    // --- CALCULATE PENDING COUNTS (Month-Wise) ---
    const pendingCounts = useMemo(() => {
        const counts = {};
        const safeServices = Array.isArray(services) ? services : [];
        
        safeServices.forEach(s => {
            const rawStatus = s.status || s.service_status || 'Pending';
            const status = rawStatus.toString().toLowerCase(); 
            const isCompleted = status === 'completed' || status === 'done';

            // Only count if NOT completed and has a date
            if (!isCompleted && s.service_date) {
                const date = new Date(s.service_date);
                const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                counts[monthYear] = (counts[monthYear] || 0) + 1;
            }
        });
        
        return Object.entries(counts).map(([month, count]) => ({ month, count }));
    }, [services]);


    // --- HANDLERS ---
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

    const handleTechClick = (techName) => {
        const safeServices = Array.isArray(services) ? services : [];
        const techTasks = safeServices.filter(t => {
            const name = t.employees?.name || 'Unassigned';
            return name === techName;
        });
        setSelectedTechName(techName);
        setSelectedTechTasks(techTasks);
        setShowTechModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await apiClient.put(`/services/${currentTaskId}`, formData);
                Swal.fire({ icon: 'success', title: 'Updated', timer: 1500, showConfirmButton: false });
            } else {
                await apiClient.post('/services/assign', formData);
                Swal.fire({ icon: 'success', title: 'Assigned', timer: 1500, showConfirmButton: false });
            }
            setShowModal(false);
            loadData();
        } catch (err) { 
            Swal.fire({ icon: 'error', title: 'Action Failed', text: err.response?.data?.detail });
        }
    };

    const markComplete = async (id) => {
        const result = await Swal.fire({
            title: 'Complete Task?', text: "Move to history?",
            icon: 'question', showCancelButton: true, confirmButtonText: 'Yes',
        });
        if (result.isConfirmed) {
            try {
                await apiClient.put(`/services/${id}/complete`); 
                loadData();
                Swal.fire({ icon: 'success', title: 'Completed!', timer: 1500, showConfirmButton: false });
            } catch(e) { 
                Swal.fire('Error', 'Could not update status', 'error'); 
            }
        }
    };

    const handleSendAlert = async (service) => {
        const result = await Swal.fire({
            title: 'Send Urgent Alert?',
            text: `Notify technician for task on ${service.service_date}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '🚀 Send',
            confirmButtonColor: '#dc3545',
            background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#545454'
        });

        if (result.isConfirmed) {
            try {
                await apiClient.post(`/services/${service.id}/notify-overdue`);
                Swal.fire({ icon: 'success', title: 'Alert Sent!', timer: 2000, showConfirmButton: false });
            } catch (err) {
                Swal.fire('Error', 'Failed to send alert.', 'error');
            }
        }
    };

    const isOverdue = (dateString, status) => {
        const s = (status || "").toLowerCase();
        if (s === 'completed') return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const serviceDate = new Date(dateString);
        return serviceDate < today;
    };

    // --- FILTER LOGIC (Client Side) ---
    const safeServicesList = Array.isArray(services) ? services : [];
    
    const filteredList = safeServicesList.filter(s => {
        const rawStatus = s.status || s.service_status || 'Pending';
        const status = rawStatus.toString().toLowerCase(); 
        const isCompleted = status === 'completed' || status === 'done';
        
        if (viewMode === 'active' && isCompleted) return false;
        if (viewMode === 'history' && !isCompleted) return false;

        if (timeFilter !== 'all') {
            const sDate = new Date(s.service_date);
            const now = new Date();
            if (timeFilter === 'thisMonth') {
                if (sDate.getMonth() !== now.getMonth() || sDate.getFullYear() !== now.getFullYear()) return false;
            } 
            else if (timeFilter === 'thisWeek') {
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0,0,0,0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23,59,59,999);
                if (sDate < startOfWeek || sDate > endOfWeek) return false;
            }
        }

        if (debouncedSearch) {
            const lowerTerm = debouncedSearch.toLowerCase();
            return (s.users?.name?.toLowerCase() || '').includes(lowerTerm) || 
                   (s.employees?.name?.toLowerCase() || '').includes(lowerTerm) ||
                   (s.task_type?.toLowerCase() || '').includes(lowerTerm);
        }
        return true;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredList.length / itemsPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div 
            className="container-fluid p-4 custom-scrollbar" 
            style={{ 
                height: '100vh', 
                overflowY: 'auto', 
                background: theme.container,
            }}
        >      
            {/* CSS Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.5);
                    border-radius: 20px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.8); }
            `}</style>

            <TechnicianServiceDetails 
                show={showTechModal} onClose={() => setShowTechModal(false)}
                technicianName={selectedTechName} tasks={selectedTechTasks}
                theme={theme} darkMode={darkMode}
            />

            {/* --- ADD/EDIT MODAL --- */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className={`modal-content rounded-4 ${theme.modalContent}`}>
                            <div className="modal-header border-0 pb-0">
                                <h5 className={`modal-title fw-bold ${theme.text}`}>{isEditing ? 'Edit Task' : 'New Task'}</h5>
                                <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <form onSubmit={handleSubmit}>
                                    <SearchableSelect 
                                        label="Customer" placeholder="Search customer..."
                                        options={customerOptions} value={formData.customer_id}
                                        onChange={(val) => setFormData({...formData, customer_id: val})}
                                        theme={theme} darkMode={darkMode} required={true}
                                    />
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <SearchableSelect 
                                                label="Technician" placeholder="Search technician..."
                                                options={employeeOptionsWithNone} value={formData.employee_id}
                                                onChange={(val) => setFormData({...formData, employee_id: val})}
                                                theme={theme} darkMode={darkMode}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className={`small fw-bold mb-1 ${theme.text}`}>Type</label>
                                            <select className={`form-select ${theme.input}`} value={formData.task_type} onChange={e=>setFormData({...formData, task_type: e.target.value})}>
                                                <option>General Service</option><option>Installation</option><option>Repair</option><option>Inspection</option>
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
                                    <button className="btn btn-primary w-100 fw-bold py-2 rounded-pill shadow-sm">Save & Notify</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PAGE LAYOUT GRID --- */}
            <div className="row g-4 h-100">
                
                {/* --- LEFT COLUMN (35% Width) --- */}
                {/* 🔥 FIXED: Added height: 100% and overflow: hidden so this column stays fixed and doesn't scroll properly */}
                <div className="col-lg-4 d-flex flex-column gap-4" style={{ height: '100%', overflow: 'hidden' }}>
                    
                    {/* 1. TOP LEFT: CALENDAR (HEATMAP) */}
                    <div className="flex-shrink-0">
                        <ServiceHeatmap 
                            services={services} 
                            theme={theme} 
                            darkMode={darkMode} 
                        />
                    </div>

                    {/* 2. BOTTOM LEFT: PENDING COUNTS */}
                    {/* 🔥 FLEXBOX SCROLL FIX: Used flex:1 and overflow:hidden to contain scrolling HERE */}
                    <div className={`card shadow-sm border-0 ${theme.card}`} 
                         style={{ 
                             flex: '1', 
                             display: 'flex', 
                             flexDirection: 'column', 
                             overflow: 'hidden',
                             minHeight: '200px'
                         }}>
                        <div className="card-header bg-transparent border-0 pt-3 flex-shrink-0">
                            <h6 className={`fw-bold m-0 ${theme.text}`}>Pending Services</h6>
                            <small className={theme.subText}>By Month</small>
                        </div>
                        {/* List scrolls internally */}
                        <div className="card-body p-0 overflow-auto custom-scrollbar" style={{ flex: '1' }}>
                            {pendingCounts.length > 0 ? (
                                <ul className="list-group list-group-flush">
                                    {pendingCounts.map((item, idx) => (
                                        <li key={idx} className={`list-group-item d-flex justify-content-between align-items-center ${darkMode ? 'bg-dark text-white border-secondary' : 'bg-white'}`}>
                                            <span className="fw-medium">{item.month}</span>
                                            <span className="badge bg-danger rounded-pill">{item.count} Tasks</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-4 text-muted small">No pending services.</div>
                            )}
                        </div>
                    </div>

                </div>

                {/* --- RIGHT COLUMN (65% Width): ACTIVE SERVICES LIST --- */}
                <div className="col-lg-8">
                    <div className={`card overflow-hidden h-100 shadow-sm border-0 ${theme.card}`}>
                        
                        {/* HEADER & CONTROLS */}
                        <div className="card-header border-0 pb-0 pt-3 bg-transparent px-4 d-flex justify-content-between flex-wrap align-items-center gap-3">
                            <div>
                                <h5 className={`fw-bold m-0 ${theme.text}`}>Service List</h5>
                                <div className="d-flex gap-2 mt-2">
                                    <button className={`btn btn-sm rounded-pill px-3 fw-bold ${viewMode === 'active' ? 'btn-primary' : 'btn-light text-muted'}`} onClick={() => setViewMode('active')}>Active</button>
                                    <button className={`btn btn-sm rounded-pill px-3 fw-bold ${viewMode === 'history' ? 'btn-primary' : 'btn-light text-muted'}`} onClick={() => setViewMode('history')}>History</button>
                                </div>
                            </div>
                            
                            <div className="d-flex flex-column gap-2 align-items-end">
                                <button className="btn btn-sm btn-primary fw-bold rounded-pill px-3 shadow-sm" onClick={openCreateModal}>
                                    <i className="bi bi-plus-lg me-1"></i> New Task
                                </button>
                                <div className="d-flex gap-2">
                                    <select className={`form-select form-select-sm ${theme.input}`} style={{width: '120px'}} value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                                        <option value="all">All Time</option><option value="thisWeek">This Week</option><option value="thisMonth">This Month</option>
                                    </select>
                                    <input type="text" className={`form-control form-select-sm rounded-pill ps-3 ${theme.input}`} style={{width: '180px'}} placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* TABLE */}
                        <div className="card-body p-0 mt-3 d-flex flex-column">
                            <div className="table-responsive flex-grow-1 custom-scrollbar">
                                <table className="table mb-0 align-middle table-hover">
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
                                        ) : currentItems.length === 0 ? (
                                            <tr><td colSpan="5" className="text-center py-5 text-muted">No records found.</td></tr>
                                        ) : (
                                            currentItems.map((item) => {
                                                const overdue = isOverdue(item.service_date, item.status);
                                                return (
                                                <tr key={item.id} className={theme.text} style={{
                                                    backgroundColor: overdue && viewMode === 'active' ? (darkMode ? 'rgba(220, 53, 69, 0.15)' : '#fff5f5') : 'transparent'
                                                }}>
                                                    <td className="ps-4">
                                                        <div className="fw-bold">{item.service_date}</div>
                                                        {overdue && viewMode === 'active' && (
                                                            <span className="badge bg-danger mt-1"><i className="bi bi-exclamation-triangle-fill me-1"></i> Overdue</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="fw-bold">{item.users?.name || "Unknown"}</div>
                                                        <small className="text-muted" style={{fontSize:'0.7rem'}}>{item.notes || '-'}</small>
                                                    </td>
                                                    <td><span className="badge bg-info text-dark bg-opacity-25 border border-info">{item.task_type}</span></td>
                                                    <td 
                                                        style={{cursor: 'pointer'}} 
                                                        onClick={() => handleTechClick(item.employees?.name)} 
                                                        title="View Technician History"
                                                    >
                                                        {item.employees?.name ? <span className="text-primary small fw-bold text-decoration-underline">{item.employees.name}</span> : <span className="text-muted small fst-italic">Unassigned</span>}
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        {viewMode === 'active' ? (
                                                            <div className="d-flex justify-content-end gap-2">
                                                                {overdue && (
                                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleSendAlert(item)} title="Send Alert">
                                                                        <i className="bi bi-bell-fill"></i>
                                                                    </button>
                                                                )}
                                                                <button className="btn btn-sm btn-light border" onClick={() => openEditModal(item)}><i className="bi bi-pencil"></i></button>
                                                                <button className="btn btn-sm btn-success" onClick={() => markComplete(item.id)}><i className="bi bi-check-lg"></i></button>
                                                            </div>
                                                        ) : <span className="badge bg-success">Done</span>}
                                                    </td>
                                                </tr>
                                            )})
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className={`card-footer border-top-0 d-flex justify-content-between align-items-center py-2 ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
                                    <div className={`small ${theme.subText}`}>Page {currentPage} of {totalPages}</div>
                                    <nav>
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}><button className={`page-link ${darkMode ? 'bg-secondary text-light border-dark' : ''}`} onClick={() => paginate(currentPage - 1)}>Prev</button></li>
                                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}><button className={`page-link ${darkMode ? 'bg-secondary text-light border-dark' : ''}`} onClick={() => paginate(currentPage + 1)}>Next</button></li>
                                        </ul>
                                    </nav>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Services;