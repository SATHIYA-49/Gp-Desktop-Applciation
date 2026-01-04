import React, { useState, useEffect, useContext, useCallback } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

const WarrantyManager = () => {
  const { darkMode } = useContext(GlobalContext);

  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [search, setSearch] = useState('');

  const theme = {
    container: darkMode ? 'bg-dark' : 'bg-light',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-muted',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm',
    headerBg: darkMode ? 'bg-dark border-secondary' : 'bg-white border-bottom',
    tableHead: darkMode ? 'table-dark' : 'table-light',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-white border-light',
  };

  // 🔥 FIXED: Wrapped in useCallback to safely include in useEffect dependency
  const fetchWarranties = useCallback(async () => {
    setLoading(true);
    try {
      const queryStatus = statusFilter === 'Expired' ? 'all' : statusFilter;
      const res = await apiClient.get(`/warranty/list?status=${queryStatus}&search=${search}`);
      let data = res.data || [];

      if (statusFilter === 'Expired') {
        const today = new Date().toISOString().split('T')[0];
        data = data.filter(w => w.end_date && w.end_date < today && w.status === 'Active');
      }

      setWarranties(data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchWarranties();
    }, 300); 
    return () => clearTimeout(timer);
  }, [fetchWarranties]);

  const handleProcessClaim = async (warranty) => {
    const { value: formValues } = await Swal.fire({
      title: 'Process Warranty Claim',
      html:
        `<div class="mb-3 text-start">
            <label class="small fw-bold mb-1">Action</label>
            <select id="swal-status" class="swal2-input m-0 w-100">
                <option value="Claimed">✅ Approve Claim</option>
                <option value="Rejected">❌ Reject Claim</option>
                <option value="Active">🔄 Re-Activate</option>
            </select>
         </div>` +
        `<div class="text-start">
            <label class="small fw-bold mb-1">Technician Notes</label>
            <textarea id="swal-notes" class="swal2-textarea m-0 w-100" placeholder="e.g. Motor replaced...">${warranty.claim_notes || ''}</textarea>
         </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Update Status',
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

  const getStatusBadge = (w) => {
    const today = new Date().toISOString().split('T')[0];
    if (w.status === 'Claimed') return <span className="badge bg-primary">Claimed</span>;
    if (w.status === 'Rejected') return <span className="badge bg-danger">Rejected</span>;
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

  return (
    <div className={`container-fluid p-4 custom-scrollbar`} style={{ minHeight: '100vh', background: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa' }}>
      
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className={`fw-bold m-0 ${theme.text}`}>Warranty Management</h3>
          <p className={`small m-0 ${theme.subText}`}>Track expiries and process customer claims.</p>
        </div>

        <div className={`d-flex align-items-center gap-2 p-2 rounded border ${darkMode ? 'border-secondary' : 'bg-white'}`}>
            <select className={`form-select form-select-sm fw-bold border-0 ${theme.input}`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{width: '130px'}}>
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Claimed">Claimed</option>
            </select>
            <div className="vr opacity-25"></div>
            <div className="position-relative">
                <i className={`bi bi-search position-absolute top-50 start-0 translate-middle-y ms-2 ${theme.subText}`}></i>
                <input 
                    type="text" 
                    className={`form-control form-control-sm border-0 shadow-none ps-4 ${theme.input}`} 
                    placeholder="Search Bill, Product..." 
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{minWidth: '200px'}}
                />
            </div>
        </div>
      </div>

      <div className={`card overflow-hidden ${theme.card}`}>
        <div className="table-responsive">
            <table className={`table align-middle mb-0 ${darkMode ? 'table-dark' : 'table-hover'}`}>
                <thead className={theme.tableHead}>
                    <tr>
                        <th className="ps-4 py-3">Product / Bill</th>
                        <th>Customer</th>
                        <th>Warranty Period</th>
                        <th>Proof</th>
                        <th>Status</th>
                        <th className="text-end pe-4">Action</th>
                    </tr>
                </thead>
                <tbody className={darkMode ? 'border-secondary' : ''}>
                    {loading ? (
                        <tr><td colSpan="6" className="text-center py-5 text-muted">Loading warranties...</td></tr>
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
                                        <span>• {new Date(w.created_at).toLocaleDateString()}</span>
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
                                    {w.claim_notes && (
                                        <div className="d-flex align-items-center mt-1" title={w.claim_notes}>
                                            <i className="bi bi-info-circle me-1 small opacity-50"></i>
                                            <div className="small text-truncate" style={{maxWidth: '120px', fontSize: '0.75rem'}}>
                                                {w.claim_notes}
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td className="text-end pe-4">
                                    <button 
                                        className="btn btn-sm btn-outline-primary" 
                                        onClick={() => handleProcessClaim(w)}
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