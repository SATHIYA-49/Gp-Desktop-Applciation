import React, { useState, useEffect, useMemo } from 'react';

const TechnicianServiceDetails = ({ show, onClose, technicianName, tasks, theme, darkMode }) => {
    
    // --- STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 7; 

    // --- RESET STATE ON OPEN ---
    useEffect(() => {
        if (show) {
            setCurrentPage(1);
            setSearchTerm('');
        }
    }, [show]);

    // --- FILTER LOGIC (Updated for DDMMYYYY) ---
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const term = searchTerm.toLowerCase().trim();
            if (!term) return true;

            // 1. Text Fields
            const customer = (task.users?.name || '').toLowerCase();
            const type = (task.task_type || '').toLowerCase();
            const status = (task.status || '').toLowerCase();
            const notes = (task.notes || '').toLowerCase();

            // 2. Date Formats
            const rawDate = task.service_date || ''; // "2026-01-01"
            let dateDDMMYYYY = '';
            
            // Convert YYYY-MM-DD to DDMMYYYY (e.g., "01012026")
            const parts = rawDate.split('-');
            if (parts.length === 3) {
                dateDDMMYYYY = `${parts[2]}${parts[1]}${parts[0]}`;
            }

            return (
                customer.includes(term) || 
                type.includes(term) || 
                status.includes(term) || 
                notes.includes(term) ||
                rawDate.includes(term) ||      // Matches "2026-01-01"
                dateDDMMYYYY.includes(term)    // Matches "01012026"
            );
        });
    }, [tasks, searchTerm]);

    // --- PAGINATION LOGIC ---
    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTasks = filteredTasks.slice(indexOfFirstItem, indexOfLastItem);

    // --- COUNTS ---
    const totalCount = filteredTasks.length;
    const completedCount = filteredTasks.filter(t => t.status === 'Completed').length;
    const pendingCount = totalCount - completedCount;

    if (!show) return null;

    return (
        <>
            {/* BACKDROP */}
            <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>

            {/* MODAL */}
            <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className={`modal-content rounded-4 shadow-lg ${theme.modalContent}`} style={{ border: darkMode ? '1px solid #475569' : 'none' }}>
                        
                        {/* HEADER */}
                        <div className={`modal-header border-bottom py-3 px-4 ${theme.cardHeader}`}>
                            <div>
                                <h5 className="modal-title fw-bold">Service History</h5>
                                <div className="d-flex align-items-center gap-2 mt-1">
                                    <i className="bi bi-person-badge-fill text-primary"></i>
                                    <span className={`small ${theme.subText}`}>{technicianName}</span>
                                </div>
                            </div>
                            <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={onClose}></button>
                        </div>

                        {/* BODY */}
                        <div className="modal-body p-0">
                            
                            {/* TOOLBAR */}
                            <div className={`p-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 border-bottom ${darkMode ? 'border-secondary' : 'border-light'}`}>
                                
                                {/* Search Input */}
                                <div className="position-relative w-100" style={{ maxWidth: '300px' }}>
                                    <i className={`bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 ${theme.subText}`}></i>
                                    <input 
                                        type="text" 
                                        className={`form-control rounded-pill ps-5 ${theme.input}`} 
                                        placeholder="Search Date (01012026) or Name..." 
                                        value={searchTerm}
                                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    />
                                </div>

                                {/* Mini Stats */}
                                <div className="d-flex gap-3">
                                    <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill">
                                        Total: {totalCount}
                                    </span>
                                    <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill">
                                        Done: {completedCount}
                                    </span>
                                    <span className="badge bg-warning bg-opacity-10 text-warning px-3 py-2 rounded-pill">
                                        Pending: {pendingCount}
                                    </span>
                                </div>
                            </div>

                            {/* TABLE */}
                            <div className="table-responsive" style={{ minHeight: '350px' }}>
                                <table className={`table align-middle mb-0 ${darkMode ? 'table-dark' : 'table-hover'}`}>
                                    <thead className={darkMode ? 'table-dark' : 'bg-light'}>
                                        <tr>
                                            <th className="ps-4 py-3 text-secondary small text-uppercase">Date</th>
                                            <th className="py-3 text-secondary small text-uppercase">Customer</th>
                                            <th className="py-3 text-secondary small text-uppercase">Type</th>
                                            <th className="text-end pe-4 py-3 text-secondary small text-uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className={darkMode ? 'border-secondary' : 'border-light'}>
                                        {currentTasks.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="text-center py-5">
                                                    <div className="d-flex flex-column align-items-center opacity-50">
                                                        <i className="bi bi-inbox fs-1 mb-2"></i>
                                                        <p>No records found.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            currentTasks.map(task => (
                                                <tr key={task.id} className={theme.text}>
                                                    <td className="ps-4 small fw-bold text-nowrap" style={{width: '120px'}}>
                                                        {task.service_date}
                                                    </td>
                                                    <td>
                                                        <div className="fw-bold">{task.users?.name || 'Unknown'}</div>
                                                        <div className={`small text-truncate ${theme.subText}`} style={{maxWidth: '200px'}}>
                                                            {task.notes || '-'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-secondary bg-opacity-25 text-body border border-secondary border-opacity-25">
                                                            {task.task_type}
                                                        </span>
                                                    </td>
                                                    <td className="text-end pe-4">
                                                        {task.status === 'Completed' ? (
                                                            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3">
                                                                <i className="bi bi-check-circle-fill me-1"></i> Completed
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-warning-subtle text-warning border border-warning-subtle rounded-pill px-3">
                                                                <i className="bi bi-hourglass-split me-1"></i> Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* FOOTER & PAGINATION */}
                        <div className={`modal-footer ${theme.cardHeader} py-3 justify-content-between`}>
                            <div className={`small ${theme.subText}`}>
                                Showing {currentTasks.length > 0 ? indexOfFirstItem + 1 : 0} - {Math.min(indexOfLastItem, totalCount)} of {totalCount}
                            </div>

                            {totalPages > 1 && (
                                <nav>
                                    <ul className="pagination pagination-sm mb-0">
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button 
                                                className={`page-link border-0 ${darkMode ? 'bg-transparent text-white' : 'text-dark'}`} 
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            >
                                                <i className="bi bi-chevron-left"></i>
                                            </button>
                                        </li>
                                        <li className="page-item disabled">
                                            <span className={`page-link border-0 fw-bold ${darkMode ? 'bg-transparent text-white' : 'text-dark'}`}>
                                                Page {currentPage} of {totalPages}
                                            </span>
                                        </li>
                                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                            <button 
                                                className={`page-link border-0 ${darkMode ? 'bg-transparent text-white' : 'text-dark'}`} 
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            >
                                                <i className="bi bi-chevron-right"></i>
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            )}

                            {totalPages <= 1 && (
                                <button className="btn btn-sm btn-secondary px-4" onClick={onClose}>Close</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TechnicianServiceDetails;