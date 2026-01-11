import React, { useState, useEffect, useContext, useCallback } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

// --- DEBOUNCE HOOK ---
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const WarrantyManager = () => {
  const { darkMode } = useContext(GlobalContext);

  // --- STATE ---
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // Matches backend 'status'
  const [specialFilter, setSpecialFilter] = useState('all'); // Matches backend 'filter_type'
  
  // Search
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // --- THEME CONFIG ---
  const theme = {
    container: darkMode ? 'bg-dark' : 'bg-light',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-muted',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm',
    headerBg: darkMode ? 'bg-dark border-secondary' : 'bg-white border-bottom',
    tableHead: darkMode ? 'table-dark' : 'table-light',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-white border-light',
  };

  // --- 1. FETCH DATA (Synced with Backend) ---
  const fetchWarranties = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: limit,
        search: debouncedSearch,  // Sends clean string to backend
        status: statusFilter,     // 'all', 'Active', 'Claimed', etc.
        filter_type: specialFilter // 'all', 'expiring', 'expired'
      };

      const res = await apiClient.get('/warranty/list', { params });
      
      // Handle Response: { data: [...], total: 50, page: 1, limit: 10 }
      setWarranties(res.data.data || []);
      setTotalCount(res.data.total || 0);

    } catch (err) {
      console.error("Fetch Error:", err);
      setWarranties([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter, specialFilter]);

  useEffect(() => {
    fetchWarranties();
  }, [fetchWarranties]);

  // --- 2. ACTIONS ---
  const handleProcessClaim = async (warranty) => {
    const { value: formValues } = await Swal.fire({
      title: 'Process Warranty Claim',
      html:
        `<div class="mb-3 text-start">
            <label class="small fw-bold mb-1">Update Status</label>
            <select id="swal-status" class="swal2-input m-0 w-100">
                <option value="Claimed" ${warranty.status === 'Claimed' ? 'selected' : ''}>✅ Approve Claim</option>
                <option value="Resolved" ${warranty.status === 'Resolved' ? 'selected' : ''}>🔧 Issue Resolved</option>
                <option value="Rejected" ${warranty.status === 'Rejected' ? 'selected' : ''}>❌ Reject Claim</option>
                <option value="Active" ${warranty.status === 'Active' ? 'selected' : ''}>🔄 Re-Activate</option>
            </select>
         </div>` +
        `<div class="text-start">
            <label class="small fw-bold mb-1">Technician Notes</label>
            <textarea id="swal-notes" class="swal2-textarea m-0 w-100" placeholder="Motor replaced, Board repaired...">${warranty.claim_notes || ''}</textarea>
         </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save Changes',
      confirmButtonColor: '#3b82f6',
      background: darkMode ? '#1e293b' : '#fff',
      color: darkMode ? '#fff' : '#545454',
      preConfirm: () => {
        return {
          status: document.getElementById('swal-status').value,
          notes: document.getElementById('swal-notes').value
        };
      }
    });

    if (formValues) {
      try {
        await apiClient.put(`/warranty/${warranty.id}`, formValues);
        Swal.fire({ 
            icon: 'success', 
            title: 'Updated', 
            toast: true, 
            position: 'top-end', 
            showConfirmButton: false, 
            timer: 2000 
        });
        fetchWarranties(); 
      } catch (err) {
        Swal.fire('Error', 'Failed to update warranty.', 'error');
      }
    }
  };

  // --- 3. HELPERS & VISUALS ---
  const getStatusBadge = (w) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Priority: Explicit Status > Expiry Date
    if (w.status === 'Claimed') return <span className="badge bg-primary">Claimed</span>;
    if (w.status === 'Resolved') return <span className="badge bg-info text-dark">Resolved</span>;
    if (w.status === 'Rejected') return <span className="badge bg-danger">Rejected</span>;
    
    // If Active, check if strictly expired based on date
    if (w.end_date && w.end_date < today) return <span className="badge bg-secondary">Expired</span>;
    
    return <span className="badge bg-success">Active</span>;
  };

  const calculateDaysLeft = (endDate) => {
    if (!endDate) return <span className="text-muted small">Lifetime</span>;
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays < 0) return <span className="text-muted small fw-bold">Expired</span>;
    if (diffDays === 0) return <span className="text-danger small fw-bold">Expires Today</span>;
    if (diffDays < 30) return <span className="text-danger small fw-bold">{diffDays} Days Left</span>;
    return <span className="text-success small fw-bold">{diffDays} Days Left</span>;
  };

  // --- 4. RENDER ---
  return (
    <div className={`container-fluid p-4 custom-scrollbar`} style={{ minHeight: '100vh', background: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className={`fw-bold m-0 ${theme.text}`}>Warranty Management</h3>
          <p className={`small m-0 ${theme.subText}`}>Track expiries, validate proofs, and process claims.</p>
        </div>

        <div className={`d-flex flex-wrap align-items-center gap-2 p-2 rounded border ${darkMode ? 'border-secondary' : 'bg-white shadow-sm'}`}>
            
            {/* Status Filter */}
            <select 
                className={`form-select form-select-sm fw-bold border-0 ${theme.input}`} 
                value={statusFilter} 
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} 
                style={{width: '130px'}}
            >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Claimed">Claimed</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
            </select>

            <div className="vr opacity-25"></div>

            {/* Business Logic Filter */}
            <select 
                className={`form-select form-select-sm fw-bold border-0 ${theme.input}`} 
                value={specialFilter} 
                onChange={(e) => { setSpecialFilter(e.target.value); setCurrentPage(1); }} 
                style={{width: '140px'}}
            >
                <option value="all">Any Time</option>
                <option value="expiring">⚠️ Expiring Soon</option>
                <option value="expired">❌ Expired</option>
            </select>

            <div className="vr opacity-25"></div>

            {/* Search Input */}
            <div className="position-relative">
                <i className={`bi bi-search position-absolute top-50 start-0 translate-middle-y ms-2 ${theme.subText}`}></i>
                <input 
                    type="text" 
                    className={`form-control form-control-sm border-0 shadow-none ps-4 ${theme.input}`} 
                    placeholder="Inv # or Product..." 
                    value={search} 
                    onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} // 🔥 Reset Page on Type
                    style={{minWidth: '200px'}}
                />
            </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className={`card overflow-hidden ${theme.card}`}>
        <div className="table-responsive" style={{minHeight: '400px'}}>
            <table className={`table align-middle mb-0 ${darkMode ? 'table-dark' : 'table-hover'}`}>
                <thead className={theme.tableHead}>
                    <tr>
                        <th className="ps-4 py-3">Product / Bill</th>
                        <th>Customer</th>
                        <th>Timeline</th>
                        <th>Proof</th>
                        <th>Status</th>
                        <th className="text-end pe-4">Action</th>
                    </tr>
                </thead>
                <tbody className={darkMode ? 'border-secondary' : ''}>
                    {loading ? (
                        <tr><td colSpan="6" className="text-center py-5 text-muted">
                            <div className="spinner-border spinner-border-sm me-2"></div>Loading data...
                        </td></tr>
                    ) : warranties.length === 0 ? (
                        <tr><td colSpan="6" className="text-center py-5 text-muted">No warranty records found.</td></tr>
                    ) : (
                        warranties.map(w => (
                            <tr key={w.id}>
                                <td className="ps-4">
                                    <div className={`fw-bold ${theme.text}`}>{w.product_name}</div>
                                    <div className="small font-monospace opacity-75 d-flex align-items-center gap-2">
                                        <span className={`badge ${darkMode ? 'bg-secondary' : 'bg-light text-dark border'}`}>
                                            #{w.sales?.invoice_no || 'N/A'}
                                        </span>
                                        <span className={theme.subText}>• {new Date(w.created_at).toLocaleDateString()}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className={`small fw-bold ${theme.text}`}>{w.users?.name || 'Unknown'}</div>
                                    <div className={`small ${theme.subText}`}>{w.users?.phone || '-'}</div>
                                </td>
                                <td>
                                    <div className="small">
                                        {w.start_date ? new Date(w.start_date).toLocaleDateString() : 'N/A'} 
                                        <i className="bi bi-arrow-right mx-1 opacity-50"></i> 
                                        {w.end_date ? new Date(w.end_date).toLocaleDateString() : 'N/A'}
                                    </div>
                                    <div className="mt-1">{calculateDaysLeft(w.end_date)}</div>
                                </td>
                                <td>
                                    {w.warranty_image ? (
                                        <a href={w.warranty_image} target="_blank" rel="noreferrer" title="View Proof">
                                            <img src={w.warranty_image} alt="proof" className="rounded border shadow-sm" style={{width: '40px', height: '40px', objectFit: 'cover'}} />
                                        </a>
                                    ) : <span className="text-muted small">-</span>}
                                </td>
                                <td>
                                    {getStatusBadge(w)}
                                </td>
                                <td className="text-end pe-4">
                                    <button 
                                        className="btn btn-sm btn-outline-primary" 
                                        onClick={() => handleProcessClaim(w)}
                                        title="Update Status / Add Notes"
                                    >
                                        <i className="bi bi-pencil-square me-1"></i> Manage
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className={`card-footer py-3 d-flex justify-content-between align-items-center ${theme.headerBg}`}>
            <small className={theme.subText}>
                Showing {warranties.length > 0 ? (currentPage - 1) * limit + 1 : 0} - {Math.min(currentPage * limit, totalCount)} of {totalCount} records
            </small>
            
            <div className="btn-group btn-group-sm">
                <button 
                    className="btn btn-outline-secondary" 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)}
                >
                    <i className="bi bi-chevron-left"></i> Prev
                </button>
                <button 
                    className="btn btn-outline-secondary" 
                    // 🔥 Logic: Disable if we reached the total count
                    disabled={currentPage * limit >= totalCount} 
                    onClick={() => setCurrentPage(p => p + 1)}
                >
                    Next <i className="bi bi-chevron-right"></i>
                </button>
            </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? '#475569' : '#cbd5e1'}; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default WarrantyManager;