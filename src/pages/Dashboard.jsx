import React, { useContext, useEffect, useState, useMemo, useRef } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; 
import Swal from 'sweetalert2'; 

// 🔥 GLOBAL CACHE (Stays alive in memory even if you switch pages)
// This replaces the need for AppReducer
let dashboardCache = {
  data: null,
  timestamp: 0
};

// --- STAT CARD COMPONENT ---
const StatCard = ({ title, value, icon, color, trend, trendValue, onClick }) => {
  const { darkMode } = useContext(GlobalContext);
  return (
    <div className="p-4 h-100 shadow-hover" onClick={onClick} style={{
        background: darkMode ? '#1e293b' : '#ffffff',
        border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
        borderRadius: '20px', cursor: onClick ? 'pointer' : 'default', position: 'relative', overflow: 'hidden'
    }}>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h6 className="text-muted fw-bold text-uppercase mb-2" style={{fontSize:'0.7rem'}}>{title}</h6>
          <h2 className={`fw-bold mb-0 ${darkMode ? 'text-white' : 'text-dark'}`}>{value}</h2>
          {trendValue && (
            <div className={`small mt-1 ${darkMode ? 'text-gray-400' : 'text-muted'}`}>
              {trendValue}
            </div>
          )}
        </div>
        <div className="rounded-3 d-flex align-items-center justify-content-center" style={{width:'50px', height:'50px', background:`rgba(${color},0.15)`, color:`rgb(${color})`}}><i className={icon+" fs-4"}></i></div>
      </div>
      <div style={{position:'absolute', bottom:0, left:0, width:'100%', height:'4px', background:`rgb(${color})`}}></div>
    </div>
  );
};

const Dashboard = () => {
  const { darkMode, billingHistory } = useContext(GlobalContext);
  const navigate = useNavigate();
  const hasAlerted = useRef(false);

  const [metrics, setMetrics] = useState(() => {
    const base = { customers: 0, employees: 0, lowStock: 0, outOfStock: 0 };
    return dashboardCache.data?.metrics ? { ...base, ...dashboardCache.data.metrics } : base;
  });
  const [revenueSummary, setRevenueSummary] = useState(
    dashboardCache.data?.revenueSummary || { todayRevenue: 0, monthRevenue: 0, billsToday: 0 }
  );
  const [upcomingTasks, setUpcomingTasks] = useState(dashboardCache.data?.upcomingTasks || []);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Only show loading if cache is empty
  const [loading, setLoading] = useState(!dashboardCache.data); 

  // --- NOTIFICATION ALERT (On Load) ---
  useEffect(() => {
    if (!loading && upcomingTasks.length > 0 && !hasAlerted.current) {
        // Sound
        const audio = new Audio('/pop.mp3');
        audio.play().catch(() => {});

        // Toast Notification (SweetAlert Mixin)
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 5000, timerProgressBar: true,
            didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
        });

        Toast.fire({ icon: 'warning', title: 'Service Alert', text: `You have ${upcomingTasks.length} services scheduled for tomorrow!` });
        hasAlerted.current = true;
    }
  }, [upcomingTasks, loading]);

  // --- DATA FETCHING (CACHE LOGIC) ---
  useEffect(() => {
    const fetchData = async () => {
      const isCacheValid = (Date.now() - dashboardCache.timestamp) < 300000;

      if (dashboardCache.data && isCacheValid) {
        setMetrics(dashboardCache.data.metrics);
        setRevenueSummary(dashboardCache.data.revenueSummary);
        setUpcomingTasks(dashboardCache.data.upcomingTasks || []);
        setLoading(false);
        return;
      }

      try {
        const [dashRes, srvRes] = await Promise.all([
          apiClient.get('/dashboard/metrics'),
          apiClient.get('/services/upcoming')
        ]);

        const obj = dashRes.data?.object || {};
        const metricsPayload = {
          customers: obj.customers || 0,
          employees: obj.employees || 0,
          lowStock: obj.inventory?.low_stock || 0,
          outOfStock: obj.inventory?.out_of_stock || 0
        };
        const revenuePayload = {
          todayRevenue: obj.billing?.today_revenue || 0,
          monthRevenue: obj.billing?.month_revenue || 0,
          billsToday: obj.billing?.bills_today || 0
        };

        const data = Array.isArray(srvRes.data) ? srvRes.data : [];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const dueTomorrow = data.filter(s => s.service_date?.startsWith(tomorrowStr));

        setMetrics(metricsPayload);
        setRevenueSummary(revenuePayload);
        setUpcomingTasks(dueTomorrow);

        dashboardCache = {
          data: {
            metrics: metricsPayload,
            revenueSummary: revenuePayload,
            upcomingTasks: dueTomorrow
          },
          timestamp: Date.now()
        };
      } catch (e) {
        console.error('Dashboard Fetch Error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- CHART LOGIC ---
  const chartData = useMemo(() => {
    if (!Array.isArray(billingHistory)) return [];
    const revenueByMonth = {};
    billingHistory.forEach(bill => {
        const month = new Date(bill.created_at || bill.date).toLocaleString('default', { month: 'short' });
        revenueByMonth[month] = (revenueByMonth[month] || 0) + (Number(bill.final_amount) || 0);
    });
    const order = { 'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12 };
    return Object.keys(revenueByMonth).sort((a,b)=>order[a]-order[b]).map(m => ({ name: m, Revenue: revenueByMonth[m] }));
  }, [billingHistory]);

  return (
    <div className={`p-4 custom-scrollbar`} style={{ height: '100vh', overflowY: 'auto', background: darkMode ? '#0f172a' : '#f8fafc' }}>
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-5 mt-2">
        <div>
          <h2 className={`fw-bold m-0 ${darkMode ? 'text-white' : 'text-dark'}`}>Dashboard</h2>
          <p className="text-secondary m-0 small">
            Today ₹{revenueSummary.todayRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} • This Month ₹{revenueSummary.monthRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* NOTIFICATION BELL */}
        <div className="position-relative" style={{ zIndex: 1100 }}>
            <button className={`btn btn-lg border-0 position-relative p-3 ${darkMode ? 'bg-slate-800 text-white' : 'bg-white shadow-sm'}`}
                    onClick={() => setShowNotifications(!showNotifications)}
                    style={{ borderRadius: '15px' }}>
                <i className={`bi ${upcomingTasks.length > 0 ? 'bi-bell-fill' : 'bi-bell'} fs-5`}></i>
                {upcomingTasks.length > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-circle bg-danger p-2 border border-2 border-white animate__animated animate__pulse animate__infinite"></span>}
            </button>

            {/* DROPDOWN MENU */}
            {showNotifications && (
                <div className="position-absolute end-0 mt-3 shadow-lg rounded-4 overflow-hidden animate__animated animate__fadeIn"
                    style={{ width: '340px', background: darkMode ? '#1e293b' : '#ffffff', border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                    
                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-opacity-10 bg-primary">
                        <h6 className={`fw-bold m-0 ${darkMode ? 'text-white' : 'text-dark'}`}>Notifications</h6>
                        <span className="badge bg-primary rounded-pill">{upcomingTasks.length} New</span>
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {upcomingTasks.length === 0 ? (
                            <div className="p-5 text-center text-muted"><small>No tasks scheduled for tomorrow.</small></div>
                        ) : upcomingTasks.map((t, i) => (
                            <div key={i} className="p-3 border-bottom hover-bg pointer d-flex align-items-start" onClick={() => navigate('/services')}>
                                <div className="me-3 mt-1"><div className="rounded-circle bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center" style={{width:'35px', height:'35px'}}><i className="bi bi-clock-history"></i></div></div>
                                <div>
                                    <div className={`small fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>{t.users?.name || 'Unknown Client'}</div>
                                    <div className="text-muted small mb-1">{t.task_type} due tomorrow</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-2 text-center bg-light border-top pointer small fw-bold text-primary" onClick={() => navigate('/services')}>View Full Schedule</div>
                </div>
            )}
        </div>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-md-6 col-xl-3">
          <StatCard
            title="Total Customers"
            value={metrics.customers}
            icon="bi bi-people"
            color="59, 130, 246"
            trend="up"
            trendValue="Customer base"
            onClick={() => navigate('/customers')}
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <StatCard
            title="Total Employees"
            value={loading ? '...' : metrics.employees}
            icon="bi bi-person-badge"
            color="16, 185, 129"
            trend="up"
            trendValue="Active staff"
            onClick={() => navigate('/employees')}
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <StatCard
            title="Bills Today"
            value={revenueSummary.billsToday}
            icon="bi bi-receipt"
            color="234, 179, 8"
            trend="up"
            trendValue={`Today ₹${revenueSummary.todayRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            onClick={() => navigate('/billing')}
          />
        </div>
        <div className="col-md-6 col-xl-3">
          <StatCard
            title="Upcoming Services"
            value={upcomingTasks.length}
            icon="bi bi-wrench"
            color="239, 68, 68"
            trend="up"
            trendValue="Due tomorrow"
            onClick={() => navigate('/services')}
          />
        </div>
      </div>

      {/* DATA VISUALIZATION */}
      <div className="row g-4 mb-5">
        <div className="col-lg-8">
            <div className={`p-4 rounded-4 shadow-sm h-100 ${darkMode ? 'bg-slate-900 border border-secondary border-opacity-20' : 'bg-white'}`}>
                <h5 className="fw-bold mb-4">Revenue Flow</h5>
                <div style={{ height: 320 }}>
                    <ResponsiveContainer>
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                            <YAxis tick={{fontSize: 12}} />
                            <Tooltip contentStyle={{borderRadius: '10px'}} />
                            <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        <div className="col-lg-4">
            <div className={`p-4 rounded-4 shadow-sm h-100 ${darkMode ? 'bg-slate-900 border border-secondary border-opacity-20' : 'bg-white'}`}>
                <h5 className="fw-bold mb-4">Stock Integrity</h5>
                {loading ? (
                    <div className="text-center py-5 text-muted">Checking stock...</div>
                ) : (metrics.outOfStock > 0 || metrics.lowStock > 0) ? (
                    <div className="text-center py-4">
                        <div className="display-5 fw-bold text-danger mb-2">{metrics.outOfStock}</div>
                        <p className="text-muted small mb-1">Out of stock items</p>
                        <div className="h5 fw-bold text-warning mb-2">{metrics.lowStock}</div>
                        <p className="text-muted small">Low stock items nearing their limit.</p>
                        <button className="btn btn-danger w-100 mt-3 rounded-pill fw-bold" onClick={() => navigate('/inventory')}>Review Inventory</button>
                    </div>
                ) : (
                    <div className="text-center py-5">
                        <i className="bi bi-shield-check text-success display-2 opacity-50"></i>
                        <h6 className="mt-3 fw-bold">Inventory Safe</h6>
                    </div>
                )}
            </div>
        </div>
      </div>

      <style>{`
        .shadow-hover:hover { transform: translateY(-5px); transition: 0.3s; }
        .hover-bg:hover { background: rgba(0,0,0,0.05); }
        .pointer { cursor: pointer; }
      `}</style>
    </div>
  );
};

export default Dashboard;
