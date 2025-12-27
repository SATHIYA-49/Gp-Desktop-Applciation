import React, { useState, useEffect, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import Swal from 'sweetalert2'; // Import SweetAlert2

// ==========================================
// 1. SUB-COMPONENT: EMPLOYEE FORM MODAL
// ==========================================
const EmployeeFormModal = ({ employee, onClose, onSuccess, theme, darkMode }) => {
  const [formData, setFormData] = useState({ name: '', phone: '', role: 'Technician' });
  const [loading, setLoading] = useState(false);

  // Load data if editing, reset if adding
  useEffect(() => {
    if (employee) {
      setFormData({ 
        name: employee.name, 
        phone: employee.phone, 
        role: employee.role || 'Technician' 
      });
    } else {
      setFormData({ name: '', phone: '', role: 'Technician' });
    }
  }, [employee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (employee) {
        // --- UPDATE (PUT) ---
        await apiClient.put(`/employees/${employee.id}`, formData);
        
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Employee details updated successfully.',
          background: darkMode ? '#1e293b' : '#fff',
          color: darkMode ? '#fff' : '#545454',
          confirmButtonColor: '#3085d6',
        });

      } else {
        // --- CREATE (POST) ---
        await apiClient.post('/employees', formData);

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'New staff member added successfully.',
          background: darkMode ? '#1e293b' : '#fff',
          color: darkMode ? '#fff' : '#545454',
          confirmButtonColor: '#3085d6',
        });
      }
      onSuccess(); // Refresh list
      onClose();   // Close modal
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: err.response?.data?.detail || "Operation failed",
        background: darkMode ? '#1e293b' : '#fff',
        color: darkMode ? '#fff' : '#545454',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050, backdropFilter: 'blur(2px)' }}></div>
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className={`modal-content ${theme.modalContent} border-0 shadow-lg`}>
            <div className={`modal-header ${theme.modalHeader}`}>
              <h5 className={`modal-title fw-bold ${theme.text}`}>
                {employee ? 'Edit Employee' : 'Add New Staff'}
              </h5>
              <button type="button" className={`btn-close ${theme.closeBtn}`} onClick={onClose}></button>
            </div>
            <div className={`modal-body p-4 ${theme.card}`}>
              <form onSubmit={handleSubmit}>
                {/* NAME INPUT */}
                <div className="mb-3">
                  <label className={`small fw-bold mb-1 ${theme.subText}`}>Name</label>
                  <input 
                    className={`form-control py-2 ${theme.input}`} 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="e.g. Ramesh Kumar" 
                    required 
                  />
                </div>
                
                {/* PHONE INPUT */}
                <div className="mb-3">
                  <label className={`small fw-bold mb-1 ${theme.subText}`}>Phone</label>
                  <input 
                    className={`form-control py-2 ${theme.input}`} 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    placeholder="9876543210" 
                    required 
                  />
                </div>
                
                {/* ROLE SELECT */}
                <div className="mb-4">
                  <label className={`small fw-bold mb-1 ${theme.subText}`}>Role</label>
                  <select 
                    className={`form-select py-2 ${theme.input}`} 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="Technician">Technician</option>
                    <option value="Manager">Manager</option>
                    <option value="Helper">Helper</option>
                  </select>
                </div>

                <button disabled={loading} className="btn btn-primary w-100 fw-bold py-2 rounded-pill shadow-sm">
                  {loading ? 'Saving...' : (employee ? 'Update Employee' : 'Save Employee')}
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
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // --- THEME ENGINE ---
  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-muted',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-light border-0 text-dark',
    tableHeader: darkMode ? 'table-dark' : 'table-light',
    modalContent: darkMode ? 'bg-dark text-white' : 'bg-white',
    modalHeader: darkMode ? 'border-secondary' : 'border-bottom',
    closeBtn: darkMode ? 'btn-close-white' : ''
  };

  // --- FETCH DATA ---
  const loadEmployees = async () => {
    try {
      const res = await apiClient.get('/employees');
      setEmployees(res.data);
    } catch (err) { 
      console.error(err); 
    }
  };

  useEffect(() => { loadEmployees(); }, []);

  // --- HANDLERS ---
  const handleAddClick = () => {
    setEditingEmployee(null); // Clear editing state for "Add" mode
    setShowModal(true);
  };

  const handleEditClick = (emp) => {
    setEditingEmployee(emp); // Load employee data for "Edit" mode
    setShowModal(true);
  };

  // --- DELETE WITH SWEETALERT ---
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      background: darkMode ? '#1e293b' : '#fff',
      color: darkMode ? '#fff' : '#545454'
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/employees/${id}`);
        loadEmployees(); // Refresh list
        Swal.fire({
            title: 'Deleted!',
            text: 'Employee has been removed.',
            icon: 'success',
            background: darkMode ? '#1e293b' : '#fff',
            color: darkMode ? '#fff' : '#545454'
        });
      } catch (err) { 
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.response?.data?.detail || "Delete failed",
            background: darkMode ? '#1e293b' : '#fff',
            color: darkMode ? '#fff' : '#545454'
        });
      }
    }
  };

  return (
    <div className="container-fluid p-4" style={{ minHeight: '100vh', background: theme.container }}>
      
      {/* MODAL (Rendered conditionally) */}
      {showModal && (
        <EmployeeFormModal 
          employee={editingEmployee} 
          onClose={() => setShowModal(false)} 
          onSuccess={loadEmployees}
          theme={theme} 
          darkMode={darkMode}
        />
      )}

      {/* PAGE HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h3 className={`fw-bold m-0 ${theme.text}`}>Employee Management</h3>
            <p className={`small m-0 ${theme.subText}`}>Manage your staff and technicians.</p>
        </div>
        <button onClick={handleAddClick} className="btn btn-primary fw-bold px-4 rounded-pill shadow-sm">
            <i className="bi bi-person-plus-fill me-2"></i>Add Staff
        </button>
      </div>
      
      {/* EMPLOYEE LIST CARD */}
      <div className={`card h-100 ${theme.card}`}>
        <div className="table-responsive">
            <table className="table mb-0 align-middle">
            <thead className={theme.tableHeader}>
                <tr>
                <th className="ps-4 py-3">Name</th>
                <th>Role</th>
                <th>Phone</th>
                <th className="text-end pe-4">Actions</th>
                </tr>
            </thead>
            <tbody className={darkMode ? 'border-secondary' : 'border-light'}>
                {employees.length === 0 ? (
                    <tr><td colSpan="4" className={`text-center py-5 ${theme.subText}`}>No employees found.</td></tr>
                ) : (
                employees.map(e => (
                    <tr key={e.id} className={theme.text}>
                        <td className="ps-4 fw-bold">
                            <div className="d-flex align-items-center">
                                {/* Initials Avatar */}
                                <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-10 text-primary fw-bold me-3" style={{width:'35px', height:'35px'}}>
                                    {e.name.charAt(0).toUpperCase()}
                                </div>
                                {e.name}
                            </div>
                        </td>
                        <td><span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 px-3 py-2 rounded-pill">{e.role}</span></td>
                        <td>{e.phone}</td>
                        <td className="text-end pe-4">
                            <button onClick={() => handleEditClick(e)} className="btn btn-sm btn-outline-warning border-0 rounded-circle me-2" title="Edit">
                                <i className="bi bi-pencil-square"></i>
                            </button>
                            <button onClick={() => handleDelete(e.id)} className="btn btn-sm btn-outline-danger border-0 rounded-circle" title="Remove">
                                <i className="bi bi-trash-fill"></i>
                            </button>
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

export default Employees;