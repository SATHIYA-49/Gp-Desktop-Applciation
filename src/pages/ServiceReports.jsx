import React, { useState, useEffect, useContext } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';

const ServiceReports = () => {
  const { darkMode } = useContext(GlobalContext);
  
  // --- STATE ---
  const [tasks, setTasks] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // --- FILTER STATE ---
  const [filter, setFilter] = useState('today'); 
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // --- THEME ---
  const theme = {
    container: darkMode ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : '#f8f9fa',
    text: darkMode ? 'text-white' : 'text-dark',
    subText: darkMode ? 'text-white-50' : 'text-muted',
    card: darkMode ? 'bg-dark border-secondary text-white' : 'bg-white border-0 shadow-sm text-dark',
    cardHeader: darkMode ? 'border-secondary' : 'border-light',
    tableHeader: darkMode ? 'table-dark' : 'table-light',
    input: darkMode ? 'bg-secondary text-white border-secondary' : 'bg-white border-secondary',
    chartBar: darkMode ? 'bg-secondary' : 'bg-light',
  };

  // --- HELPER: GET LOCAL DATE STRING (YYYY-MM-DD) ---
  const getLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- LOAD DATA ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let params = { filter_type: filter };

        if (filter === 'today') {
            params.start_date = getLocalDate(); 
        }
        else if (filter === 'custom') {
            params.start_date = customStart;
            params.end_date = customEnd;
        }

        const res = await apiClient.get(`/reports/services`, { params });
        setTasks(res.data); 
        setCurrentPage(1); // Reset pagination on filter change

      } catch (err) {
        console.error("Failed to load reports", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filter, customStart, customEnd]);

  // --- CALCULATE STATS ---
  const totalTasks = tasks.length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const pending = tasks.filter(t => t.status === 'Pending').length;
  const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

  // Group by Technician
  const techStats = {};
  tasks.forEach(t => {
    const name = t.employees?.name || 'Unassigned';
    if (!techStats[name]) techStats[name] = { total: 0, completed: 0 };
    techStats[name].total += 1;
    if (t.status === 'Completed') techStats[name].completed += 1;
  });

  // Group by Task Type
  const typeStats = {};
  tasks.forEach(t => {
    const type = t.task_type || 'General';
    typeStats[type] = (typeStats[type] || 0) + 1;
  });

  // --- PAGINATION LOGIC (Technician Table) ---
  const techNames = Object.keys(techStats);
  const totalPages = Math.ceil(techNames.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTechs = techNames.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container-fluid p-4" style={{ minHeight: '100vh', background: theme.container }}>
      
      {/* HEADER & CONTROLS */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className={`fw-bold m-0 ${theme.text}`}>Service Analytics</h3>
          <p className={`small m-0 ${theme.subText}`}>Performance overview.</p>
        </div>
        
        {/* FILTER BAR */}
        <div className="d-flex flex-wrap gap-2 align-items-center">
            {filter === 'custom' && (
                <div className="d-flex gap-2 animate__animated animate__fadeIn">
                    <input type="date" className={`form-control form-control-sm fw-bold ${theme.input}`} value={customStart} onChange={e => setCustomStart(e.target.value)} />
                    <span className={theme.text}>-</span>
                    <input type="date" className={`form-control form-control-sm fw-bold ${theme.input}`} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                </div>
            )}

            <select className={`form-select fw-bold shadow-sm ${theme.input}`} value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: '160px' }}>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
            </select>
        </div>
      </div>

      {/* 1. METRIC CARDS */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
            <div className={`card p-3 h-100 ${theme.card}`}>
                <div className="d-flex justify-content-between">
                    <div>
                        <div className={`small fw-bold text-uppercase ${theme.subText}`}>Total Jobs</div>
                        <h2 className="fw-bold m-0">{loading ? '...' : totalTasks}</h2>
                    </div>
                    <div className="rounded-circle bg-primary bg-opacity-10 p-3 text-primary d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                        <i className="bi bi-briefcase-fill fs-5"></i>
                    </div>
                </div>
            </div>
        </div>
        <div className="col-md-3">
            <div className={`card p-3 h-100 ${theme.card}`}>
                <div className="d-flex justify-content-between">
                    <div>
                        <div className={`small fw-bold text-uppercase ${theme.subText}`}>Completed</div>
                        <h2 className="fw-bold m-0 text-success">{loading ? '...' : completed}</h2>
                    </div>
                    <div className="rounded-circle bg-success bg-opacity-10 p-3 text-success d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                        <i className="bi bi-check-lg fs-5"></i>
                    </div>
                </div>
            </div>
        </div>
        <div className="col-md-3">
            <div className={`card p-3 h-100 ${theme.card}`}>
                <div className="d-flex justify-content-between">
                    <div>
                        <div className={`small fw-bold text-uppercase ${theme.subText}`}>Pending</div>
                        <h2 className="fw-bold m-0 text-warning">{loading ? '...' : pending}</h2>
                    </div>
                    <div className="rounded-circle bg-warning bg-opacity-10 p-3 text-warning d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                        <i className="bi bi-clock-history fs-5"></i>
                    </div>
                </div>
            </div>
        </div>
        <div className="col-md-3">
            <div className={`card p-3 h-100 ${theme.card}`}>
                <div className="d-flex justify-content-between">
                    <div>
                        <div className={`small fw-bold text-uppercase ${theme.subText}`}>Success Rate</div>
                        <h2 className="fw-bold m-0 text-info">{loading ? '...' : completionRate}%</h2>
                    </div>
                    <div className="rounded-circle bg-info bg-opacity-10 p-3 text-info d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                        <i className="bi bi-graph-up-arrow fs-5"></i>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="row g-4">
        
        {/* 2. TECHNICIAN PERFORMANCE (PAGINATED) */}
        <div className="col-lg-6">
            <div className={`card h-100 ${theme.card}`}>
                <div className={`card-header py-3 ${theme.cardHeader} d-flex justify-content-between align-items-center`}>
                    <h6 className="fw-bold m-0">Technician Performance</h6>
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="btn-group btn-group-sm">
                            <button className={`btn ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'}`} disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}><i className="bi bi-chevron-left"></i></button>
                            <span className={`btn ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'} disabled fw-bold`} style={{opacity: 1}}>{currentPage} / {totalPages}</span>
                            <button className={`btn ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'}`} disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}><i className="bi bi-chevron-right"></i></button>
                        </div>
                    )}
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table mb-0 align-middle">
                            <thead className={theme.tableHeader}>
                                <tr>
                                    <th className="ps-4">Technician</th>
                                    <th className="text-center">Assigned</th>
                                    <th className="text-center">Completed</th>
                                    <th className="text-end pe-4">Performance</th>
                                </tr>
                            </thead>
                            <tbody className={darkMode ? 'border-secondary' : ''}>
                                {techNames.length === 0 ? (
                                    <tr><td colSpan="4" className={`text-center py-4 ${theme.subText}`}>No data for selected period.</td></tr>
                                ) : (
                                    currentTechs.map(tech => {
                                        const stats = techStats[tech];
                                        const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                                        return (
                                            <tr key={tech} className={theme.text}>
                                                <td className="ps-4 fw-bold">{tech}</td>
                                                <td className="text-center">{stats.total}</td>
                                                <td className="text-center text-success fw-bold">{stats.completed}</td>
                                                <td className="pe-4">
                                                    <div className="d-flex align-items-center justify-content-end gap-2">
                                                        <div className="progress" style={{width: '60px', height: '6px'}}>
                                                            <div className="progress-bar bg-success" role="progressbar" style={{width: `${rate}%`}}></div>
                                                        </div>
                                                        <small className="fw-bold">{rate}%</small>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        {/* 3. TASK DISTRIBUTION */}
        <div className="col-lg-6">
            <div className={`card h-100 ${theme.card}`}>
                <div className={`card-header py-3 ${theme.cardHeader}`}>
                    <h6 className="fw-bold m-0">Task Types Distribution</h6>
                </div>
                <div className="card-body p-4" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    {Object.keys(typeStats).length === 0 ? (
                        <p className={`text-center my-5 ${theme.subText}`}>No tasks found for selected period.</p>
                    ) : (
                        Object.keys(typeStats).map(type => {
                            const count = typeStats[type];
                            const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                            return (
                                <div key={type} className="mb-4">
                                    <div className="d-flex justify-content-between mb-1">
                                        <span className="fw-bold small">{type}</span>
                                        <span className={`small fw-bold ${theme.subText}`}>{count} jobs ({percentage}%)</span>
                                    </div>
                                    <div className={`progress ${theme.chartBar}`} style={{height: '10px', borderRadius: '10px'}}>
                                        <div 
                                            className="progress-bar" 
                                            role="progressbar" 
                                            style={{
                                                width: `${percentage}%`, 
                                                background: type === 'Installation' ? '#0d6efd' : type === 'Repair' ? '#dc3545' : '#198754'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ServiceReports;