import React, { useState, useEffect, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import Swal from 'sweetalert2';
import TechnicianServiceDetails from '../components/TechnicianServiceDetails';

// ==========================================
// 1. SUB-COMPONENT: EMPLOYEE FORM MODAL
// ==========================================
const EmployeeFormModal = ({ employee, onClose, onSuccess, theme, darkMode }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    role: 'Technician', 
    is_active: true 
  });
  const [loading, setLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({ 
        name: employee.name, 
        phone: employee.phone, 
        role: 'Technician',
        is_active: employee.is_active !== undefined ? employee.is_active : true 
      });
    } else {
      setFormData({ name: '', phone: '', role: 'Technician', is_active: true });
    }
  }, [employee]);

  const checkPhoneExistence = async (phone) => {
      if (employee && employee.phone === phone) return;
      setCheckingPhone(true);
      try {
          const res = await apiClient.get(`/employees/check-phone?phone=${phone}`);
          if (res.data.exists) {
              Swal.fire({
                  icon: 'warning', title: 'Duplicate Phone', text: `Registered to ${res.data.employee_name}.`,
                  background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#545454'
              });
          }
      } catch (err) { console.error(err); } finally { setCheckingPhone(false); }
  };

  const handlePhoneChange = (e) => {
      const val = e.target.value.replace(/\D/g, '');
      if (val.length <= 10) {
          setFormData({...formData, phone: val});
          if (val.length === 10) checkPhoneExistence(val);
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.phone.length !== 10) return Swal.fire({ icon: 'warning', title: 'Invalid Phone', text: 'Must be 10 digits.' });

    setLoading(true);
    try {
      if (employee) {
        await apiClient.put(`/employees/${employee.id}`, formData);
        Swal.fire({ icon: 'success', title: 'Updated!', background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#545454' });
      } else {
        await apiClient.post('/employees', formData);
        Swal.fire({ icon: 'success', title: 'Success!', background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#545454' });
      }
      onSuccess();
      onClose();
    } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: "Operation failed" }); } finally { setLoading(false); }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className={`modal-content ${theme.modalContent} border-0 shadow-lg`}>
            <div className={`modal-header ${theme.modalHeader}`}>
              <h5 className={`modal-title fw-bold ${theme.text}`}>{employee ? 'Edit Employee' : 'Add New Staff'}</h5>
              <button type="button" className={`btn-close ${theme.closeBtn}`} onClick={onClose}></button>
            </div>
            <div className={`modal-body p-4 ${theme.card}`}>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className={`small fw-bold mb-1 ${theme.subText}`}>Name</label>
                  <input className={`form-control py-2 ${theme.input}`} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Ramesh Kumar" required />
                </div>
                <div className="mb-4 position-relative">
                  <label className={`small fw-bold mb-1 ${theme.subText}`}>Phone</label>
                  <div className="input-group">
                      <span className={`input-group-text ${theme.input}`}>+91</span>
                      <input type="text" inputMode="numeric" className={`form-control py-2 ${theme.input}`} value={formData.phone} onChange={handlePhoneChange} placeholder="9876543210" required />
                  </div>
                  {checkingPhone && <div className="text-info small mt-1">Checking availability...</div>}
                </div>
                
                {/* STATUS TOGGLE */}
                <div className={`mb-4 p-3 rounded border ${darkMode ? 'border-secondary bg-secondary bg-opacity-10' : 'border-light bg-light'}`}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <label className={`fw-bold mb-0 ${theme.text}`}>Employee Status</label>
                      <div className={`small mt-1 ${formData.is_active ? 'text-success' : 'text-secondary'}`}>
                        {formData.is_active ? '● Active (Can login & work)' : '● Inactive (Access suspended)'}
                      </div>
                    </div>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" role="switch" style={{ width: '3em', height: '1.5em', cursor: 'pointer' }} checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
                    </div>
                  </div>
                </div>

                <button disabled={loading || checkingPhone} className="btn btn-primary w-100 fw-bold py-2 rounded-pill shadow-sm">
                  {loading ? 'Saving...' : 'Save Employee'}
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
// 2. MAIN COMPONENT: EMPLOYEES PAGE
// ==========================================
const Employees = () => {
  const { darkMode } = useContext(GlobalContext);
  
  const [employees, setEmployees] = useState([]);
  const [allServices, setAllServices] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🔥 NEW: Filter State ('active' or 'inactive')
  const [statusFilter, setStatusFilter] = useState('active'); 

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; 

  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTechName, setSelectedTechName] = useState('');
  const [selectedTechTasks, setSelectedTechTasks] = useState([]);

  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-muted',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-white border-0 shadow-sm text-dark',
    tableHeader: darkMode ? 'table-dark' : 'table-light',
    modalContent: darkMode ? 'bg-dark text-white' : 'bg-white',
    modalHeader: darkMode ? 'border-secondary' : 'border-bottom',
    cardHeader: darkMode ? 'border-secondary' : 'border-light',
    btnClose: darkMode ? 'btn-close-white' : '',
    closeBtn: darkMode ? 'btn-close-white' : ''
  };

  const loadData = async () => {
    try {
      const empRes = await apiClient.get('/employees');
      setEmployees(empRes.data);
      const srvRes = await apiClient.get('/services/');
      setAllServices(Array.isArray(srvRes.data) ? srvRes.data : []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddClick = () => { setEditingEmployee(null); setShowModal(true); };
  const handleEditClick = (e, emp) => { e.stopPropagation(); setEditingEmployee(emp); setShowModal(true); };
  
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Are you sure?', text: "You won't be able to revert this!", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Yes, delete it!',
      background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#545454'
    });
    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/employees/${id}`);
        loadData();
        Swal.fire({ title: 'Deleted!', icon: 'success', background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#545454' });
      } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: "Delete failed" }); }
    }
  };

  const handleRowClick = (employee) => {
      const techTasks = allServices.filter(t => t.assigned_employee_id === employee.id);
      setSelectedTechName(employee.name);
      setSelectedTechTasks(techTasks);
      setShowDetailsModal(true);
  };

  const getStats = (empId) => {
      const tasks = allServices.filter(t => t.assigned_employee_id === empId);
      const completed = tasks.filter(t => t.status === 'Completed').length;
      return { total: tasks.length, completed };
  };

  // ==========================================
  // 🔥 CATEGORIZED FILTER & SORT
  // ==========================================
  const filteredEmployees = employees
      .filter(e => {
          // 1. Check Search Term
          const term = searchTerm.toLowerCase() || '';
          const name = (e.name || '').toLowerCase();
          const phone = (e.phone || '').toString();
          const matchesSearch = name.includes(term) || phone.includes(term);
          
          // 2. Check Status Category
          const isActive = e.is_active !== false; // Default true
          const matchesStatus = statusFilter === 'active' ? isActive : !isActive;

          return matchesSearch && matchesStatus;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  return (
    <div className="container-fluid p-4" style={{ minHeight: '100vh', background: theme.container }}>
      
      {showModal && <EmployeeFormModal employee={editingEmployee} onClose={() => setShowModal(false)} onSuccess={loadData} theme={theme} darkMode={darkMode} />}
      <TechnicianServiceDetails show={showDetailsModal} onClose={() => setShowDetailsModal(false)} technicianName={selectedTechName} tasks={selectedTechTasks} theme={theme} darkMode={darkMode} />

      {/* HEADER */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
            <h3 className={`fw-bold m-0 ${theme.text}`}>Employee Management</h3>
            <p className={`small m-0 ${theme.subText}`}>Manage staff and view performance.</p>
        </div>
        <div className="d-flex flex-column flex-md-row gap-3 align-items-center w-100 w-md-auto">
            <div className="position-relative w-100" style={{ maxWidth: '300px' }}>
                <input type="text" className={`form-control ${theme.input} ps-5`} style={{ borderRadius: '66px', height: '45px' }} placeholder="Search name, phone..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                <i className={`bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 ${theme.subText}`} style={{ fontSize: '1.1rem' }}></i>
            </div>
            <button onClick={handleAddClick} className="btn btn-primary fw-bold px-4 rounded-pill shadow-sm text-nowrap" style={{ height: '45px' }}><i className="bi bi-person-plus-fill me-2"></i>Add Staff</button>
        </div>
      </div>
      
      {/* 🔥 TABS FOR CATEGORIZATION */}
      <ul className="nav nav-pills mb-3">
          <li className="nav-item">
              <button 
                className={`nav-link fw-bold px-4 rounded-pill me-2 ${statusFilter === 'active' ? 'active' : ''} ${statusFilter !== 'active' && darkMode ? 'text-white' : 'text-dark'}`}
                onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
              >
                Active Staff
              </button>
          </li>
          <li className="nav-item">
              <button 
                className={`nav-link fw-bold px-4 rounded-pill ${statusFilter === 'inactive' ? 'active bg-secondary' : ''} ${statusFilter !== 'inactive' && darkMode ? 'text-white' : 'text-dark'}`}
                onClick={() => { setStatusFilter('inactive'); setCurrentPage(1); }}
              >
                Inactive Staff
              </button>
          </li>
      </ul>

      {/* LIST CARD */}
      <div className={`card h-100 ${theme.card}`}>
        <div className="table-responsive">
            <table className="table mb-0 align-middle table-hover">
            <thead className={theme.tableHeader}>
                <tr>
                <th className="ps-4 py-3">Name</th>
                <th>Status</th>
                <th>Phone</th>
                <th className="text-center">Performance</th>
                <th className="text-end pe-4">Actions</th>
                </tr>
            </thead>
            <tbody className={darkMode ? 'border-secondary' : 'border-light'}>
                {currentEmployees.length === 0 ? (
                    <tr><td colSpan="5" className={`text-center py-5 ${theme.subText}`}>
                      {searchTerm 
                        ? 'No employees match your search.' 
                        : (statusFilter === 'active' ? 'No active employees found.' : 'No inactive employees found.')}
                    </td></tr>
                ) : (
                currentEmployees.map(e => {
                    const stats = getStats(e.id);
                    const isActive = e.is_active !== false; 
                    
                    return (
                        <tr key={e.id} className={theme.text} style={{cursor: 'pointer', opacity: isActive ? 1 : 0.7}} onClick={() => handleRowClick(e)} title="Click to view history">
                            <td className="ps-4 fw-bold">
                                <div className="d-flex align-items-center">
                                    <div className={`d-flex align-items-center justify-content-center rounded-circle ${isActive ? 'bg-primary text-primary' : 'bg-secondary text-secondary'} bg-opacity-10 fw-bold me-3`} style={{width:'35px', height:'35px'}}>
                                        {e.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      {e.name}
                                      <div className={`small ${theme.subText}`} style={{fontSize: '0.75rem'}}>Technician</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                              {isActive ? (
                                <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 rounded-pill">Active</span>
                              ) : (
                                <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1 rounded-pill">Inactive</span>
                              )}
                            </td>
                            <td>{e.phone}</td>
                            <td className="text-center">
                                <span className="badge bg-secondary bg-opacity-25 text-body me-2"><i className="bi bi-list-task me-1"></i> {stats.total}</span>
                                <span className="badge bg-success bg-opacity-25 text-success"><i className="bi bi-check-circle-fill me-1"></i> {stats.completed}</span>
                            </td>
                            <td className="text-end pe-4">
                                <button onClick={(evt) => handleEditClick(evt, e)} className="btn btn-sm btn-outline-warning border-0 rounded-circle me-2"><i className="bi bi-pencil-square"></i></button>
                                <button onClick={(evt) => handleDelete(evt, e.id)} className="btn btn-sm btn-outline-danger border-0 rounded-circle"><i className="bi bi-trash-fill"></i></button>
                            </td>
                        </tr>
                    );
                })
                )}
            </tbody>
            </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
            <div className={`card-footer border-top-0 d-flex justify-content-between align-items-center py-3 ${darkMode ? 'bg-dark border-secondary' : 'bg-white'}`}>
                <div className={`small ${theme.subText}`}>Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredEmployees.length)} of {filteredEmployees.length}</div>
                <nav>
                    <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button className={`page-link ${darkMode ? 'bg-secondary text-light border-dark' : ''}`} onClick={() => setCurrentPage(prev => prev - 1)}>Prev</button>
                        </li>
                        <li className="page-item active">
                            <span className="page-link bg-primary border-primary text-light">{currentPage}</span>
                        </li>
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button className={`page-link ${darkMode ? 'bg-secondary text-light border-dark' : ''}`} onClick={() => setCurrentPage(prev => prev + 1)}>Next</button>
                        </li>
                    </ul>
                </nav>
            </div>
        )}
        </div>
    </div>
  );
};

export default Employees;