import React, { useContext, useState, useEffect } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';

const Services = () => {
  const { darkMode, customers, loadCustomers } = useContext(GlobalContext);

  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // --- VIEW STATE ---
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'history'

  // --- MODAL STATES ---
  const [showModal, setShowModal] = useState(false); 
  const [isEditing, setIsEditing] = useState(false); 
  const [currentTaskId, setCurrentTaskId] = useState(null); 

  // Form Data
  const [formData, setFormData] = useState({ 
    customer_id: '', 
    employee_id: '', 
    service_date: '', 
    task_type: 'General Service',
    notes: '' 
  });

  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-light border-0',
    modalContent: darkMode ? 'bg-dark text-white border border-secondary' : 'bg-white shadow-lg border-0',
    // Tab Styles
    tabActive: darkMode ? 'bg-primary text-white' : 'bg-dark text-white',
    tabInactive: darkMode ? 'bg-transparent text-secondary border-secondary' : 'bg-light text-muted border',
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [srvRes, empRes] = await Promise.all([
        apiClient.get('/services'),   
        apiClient.get('/employees')   
      ]);
      setServices(srvRes.data);
      setEmployees(empRes.data);
      if(customers.length === 0) loadCustomers(); 
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { 
    loadData(); 
    // eslint-disable-next-line
  }, []);

  // --- HANDLERS ---
  const openCreateModal = () => {
    setIsEditing(false);
    setFormData({ customer_id: '', employee_id: '', service_date: '', task_type: 'General Service', notes: '' });
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
            alert("Task Updated Successfully!");
        } else {
            await apiClient.post('/services/assign', formData);
            alert("Task Created Successfully!");
        }
        setShowModal(false);
        loadData();
    } catch (err) { alert("Operation Failed."); }
  };

  const markComplete = async (id) => {
    if(!window.confirm("Mark this task as COMPLETED? It will move to History.")) return;
    try {
      await apiClient.put(`/services/${id}/complete`); 
      loadData();
    } catch (err) { alert("Error updating status"); }
  };

  // --- FILTER LOGIC ---
  const filteredList = services.filter(s => {
    if (viewMode === 'active') return s.status !== 'Completed';
    if (viewMode === 'history') return s.status === 'Completed';
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
                        <h5 className="modal-title fw-bold">{isEditing ? 'Edit Task' : 'New Task'}</h5>
                        <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={() => setShowModal(false)}></button>
                    </div>
                    <div className="modal-body p-4">
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="small fw-bold mb-1">Customer</label>
                                <select className={`form-select ${theme.input}`} value={formData.customer_id} onChange={e=>setFormData({...formData, customer_id: e.target.value})} required disabled={isEditing}>
                                    <option value="">Select...</option>
                                    {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="row g-2 mb-3">
                                <div className="col-6">
                                    <label className="small fw-bold mb-1">Technician</label>
                                    <select className={`form-select ${theme.input}`} value={formData.employee_id} onChange={e=>setFormData({...formData, employee_id: e.target.value})}>
                                        <option value="">Unassigned</option>
                                        {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-6">
                                    <label className="small fw-bold mb-1">Type</label>
                                    <select className={`form-select ${theme.input}`} value={formData.task_type} onChange={e=>setFormData({...formData, task_type: e.target.value})}>
                                        <option>General Service</option>
                                        <option>Installation</option>
                                        <option>Repair</option>
                                        <option>Inspection</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="small fw-bold mb-1">Date</label>
                                <input type="date" className={`form-control ${theme.input}`} value={formData.service_date} onChange={e=>setFormData({...formData, service_date: e.target.value})} required />
                            </div>
                            <div className="mb-3">
                                <label className="small fw-bold mb-1">Notes</label>
                                <textarea className={`form-control ${theme.input}`} rows="2" value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} />
                            </div>
                            <button className="btn btn-primary w-100 fw-bold py-2 rounded-pill">Save Changes</button>
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

      {/* TABS & LIST */}
      <div className={`card overflow-hidden h-100 rounded-4 ${theme.card}`}>
        
        {/* TAB NAVIGATION */}
        <div className="card-header border-0 pb-0 pt-3 bg-transparent px-4">
            <ul className="nav nav-pills card-header-pills">
                <li className="nav-item">
                    <button 
                        className={`nav-link fw-bold rounded-pill px-4 me-2 ${viewMode === 'active' ? theme.tabActive : theme.tabInactive}`} 
                        onClick={() => setViewMode('active')}
                    >
                        Active Tasks
                    </button>
                </li>
                <li className="nav-item">
                    <button 
                        className={`nav-link fw-bold rounded-pill px-4 ${viewMode === 'history' ? theme.tabActive : theme.tabInactive}`} 
                        onClick={() => setViewMode('history')}
                    >
                        History
                    </button>
                </li>
            </ul>
        </div>

        <div className="card-body p-0 mt-3">
            <div className="table-responsive">
                <table className="table mb-0 align-middle">
                    <thead className={darkMode ? 'table-dark' : 'table-light'}>
                        <tr>
                            <th className="ps-4 py-3">Scheduled</th>
                            <th>Customer</th>
                            <th>Type</th>
                            <th>Technician</th>
                            {viewMode === 'active' && <th className="text-end pe-4">Actions</th>}
                            {viewMode === 'history' && <th className="text-end pe-4">Status</th>}
                        </tr>
                    </thead>
                    <tbody className={darkMode ? 'border-secondary' : 'border-light'}>
                        {loading ? (
                            <tr><td colSpan="5" className={`text-center py-5 ${theme.text}`}>Loading...</td></tr>
                        ) : filteredList.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-5 text-muted">No {viewMode} tasks found.</td></tr>
                        ) : (
                            filteredList.map((item) => (
                                <tr key={item.id} className={theme.text} style={{ opacity: item.status === 'Completed' ? 0.7 : 1 }}>
                                    <td className="ps-4 fw-bold">{item.service_date}</td>
                                    <td>
                                        <div>{item.users?.name}</div>
                                        <small className="text-muted" style={{fontSize:'0.7rem'}}>{item.notes || '-'}</small>
                                    </td>
                                    <td>
                                        <span className={`badge ${item.status === 'Completed' ? 'bg-secondary' : 'bg-info text-dark'}`}>
                                            {item.task_type || 'General'}
                                        </span>
                                    </td>
                                    
                                    {/* Technician Column */}
                                    <td>
                                        {item.employees ? (
                                            <span className="text-primary fw-bold small"><i className="bi bi-person-fill me-1"></i>{item.employees.name}</span>
                                        ) : (
                                            <span className="text-muted small fst-italic">Unassigned</span>
                                        )}
                                    </td>

                                    {/* Actions Column */}
                                    <td className="text-end pe-4">
                                        {viewMode === 'active' ? (
                                            <div className="d-flex justify-content-end gap-2">
                                                <button className="btn btn-sm btn-light border" onClick={() => openEditModal(item)} title="Edit">
                                                    <i className="bi bi-pencil"></i>
                                                </button>
                                                <button className="btn btn-sm btn-success fw-bold px-3" onClick={() => markComplete(item.id)}>
                                                    <i className="bi bi-check-lg"></i> Done
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="badge bg-success"><i className="bi bi-check-circle-fill me-1"></i>Completed</span>
                                        )}
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