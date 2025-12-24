import React, { useState, useEffect, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';

const Employees = () => {
  const { darkMode } = useContext(GlobalContext);
  const [employees, setEmployees] = useState([]);
  
  // 1. Role defaults to 'Technician'
  const [formData, setFormData] = useState({ name: '', phone: '', role: 'Technician' });
  const [loading, setLoading] = useState(false);

  // --- THEME ENGINE ---
  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-muted',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-light border-0',
    tableHeader: darkMode ? 'table-dark' : 'table-light',
  };

  // --- FETCH DATA ---
  const loadEmployees = async () => {
    try {
      const res = await apiClient.get('/employees');
      setEmployees(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadEmployees(); }, []);

  // --- HANDLERS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/employees', formData);
      setFormData({ name: '', phone: '', role: 'Technician' }); // Reset form
      loadEmployees();
      alert("Employee Added Successfully!");
    } catch (err) {
      alert("Failed to add employee");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Remove employee?")) return;
    try {
      await apiClient.delete(`/employees/${id}`);
      loadEmployees();
    } catch (err) { alert("Error deleting"); }
  };

  return (
    <div className="container-fluid p-4" style={{ minHeight: '100vh', background: theme.container }}>
      <h3 className={`fw-bold mb-4 ${theme.text}`}>Employee Management</h3>
      
      <div className="row g-4">
        {/* LEFT: ADD FORM */}
        <div className="col-md-4">
          <div className={`card p-4 h-100 ${theme.card}`}>
            <h5 className="fw-bold mb-3"><i className="bi bi-person-plus-fill me-2 text-primary"></i>Add Staff</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className={`small fw-bold mb-1 ${theme.subText}`}>Name</label>
                <input 
                    className={`form-control py-2 ${theme.input}`} 
                    value={formData.name} 
                    onChange={e=>setFormData({...formData, name: e.target.value})} 
                    placeholder="e.g. Ramesh Kumar" 
                    required 
                />
              </div>
              <div className="mb-3">
                <label className={`small fw-bold mb-1 ${theme.subText}`}>Phone</label>
                <input 
                    className={`form-control py-2 ${theme.input}`} 
                    value={formData.phone} 
                    onChange={e=>setFormData({...formData, phone: e.target.value})} 
                    placeholder="9876543210" 
                    required 
                />
              </div>
              
              {/* RESTRICTED ROLE SELECTION */}
              <div className="mb-3">
                <label className={`small fw-bold mb-1 ${theme.subText}`}>Role</label>
                <select 
                    className={`form-select py-2 ${theme.input}`} 
                    value={formData.role} 
                    onChange={e=>setFormData({...formData, role: e.target.value})}
                    disabled // Optional: Disable if you don't want them to even click it
                >
                  <option value="Technician">Technician</option>
                </select>
              </div>

              <button disabled={loading} className="btn btn-primary w-100 fw-bold py-2 rounded-pill shadow-sm">
                {loading ? 'Saving...' : 'Save Employee'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: LIST */}
        <div className="col-md-8">
          <div className={`card h-100 ${theme.card}`}>
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className={theme.tableHeader}>
                  <tr>
                    <th className="ps-4 py-3">Name</th>
                    <th>Role</th>
                    <th>Phone</th>
                    <th className="text-end pe-4">Action</th>
                  </tr>
                </thead>
                <tbody className={darkMode ? 'border-secondary' : 'border-light'}>
                  {employees.length === 0 ? (
                      <tr><td colSpan="4" className={`text-center py-5 ${theme.subText}`}>No employees found.</td></tr>
                  ) : (
                    employees.map(e => (
                        <tr key={e.id} className={theme.text}>
                            <td className="ps-4 fw-bold">{e.name}</td>
                            <td><span className="badge bg-secondary bg-opacity-25 text-body border">{e.role}</span></td>
                            <td>{e.phone}</td>
                            <td className="text-end pe-4">
                                <button onClick={() => handleDelete(e.id)} className="btn btn-sm btn-outline-danger border-0 rounded-circle">
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
      </div>
    </div>
  );
};

export default Employees;