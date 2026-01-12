import React, { useContext, useEffect, useState, useMemo, useRef } from 'react';
import { GlobalContext } from '../context/GlobalState';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'; // 🔥 FIXED: Removed unused 'Legend' import
import toastr from 'toastr';
import 'toastr/build/toastr.min.css';

// --- STAT CARD COMPONENT ---
const StatCard = ({ title, value, icon, color, trend, trendValue, onClick }) => {
  const { darkMode } = useContext(GlobalContext);

  const cardStyle = {
    background: darkMode ? '#1e293b' : '#ffffff',
    border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
    boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.05)',
    borderRadius: '20px',
    transition: 'transform 0.3s ease',
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <div className="p-4 h-100 shadow-hover" style={cardStyle} onClick={onClick}>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h6 className="text-muted fw-bold text-uppercase mb-2" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>{title}</h6>
          <h2 className={`fw-bold mb-0 ${darkMode ? 'text-white' : 'text-dark'}`}>{value}</h2>
        </div>
        <div className="rounded-3 d-flex align-items-center justify-content-center" 
             style={{ width: '50px', height: '50px', background: `rgba(${color}, 0.15)`, color: `rgb(${color})` }}>
          <i className={icon + " fs-4"}></i>
        </div>
      </div>
      <div className="d-flex align-items-center small fw-bold">
        <i className={`bi bi-arrow-${trend === 'up' ? 'up' : 'down'}-right-circle-fill text-${trend === 'up' ? 'success' : 'danger'} me-2`}></i>
        <span className={`text-${trend === 'up' ? 'success' : 'danger'}`}>{trendValue}</span>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px', background: `rgb(${color})` }}></div>
    </div>
  );
};

const Dashboard = () => {
  const { darkMode, customers, billingHistory } = useContext(GlobalContext);
  const navigate = useNavigate();
  const hasAlerted = useRef(false);

  const [metrics, setMetrics] = useState({ customers: 0, sales: 0, profit: 0, services: 0, lowStock: 0 });
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // --- 1. TOASTR CONFIG ---
  useEffect(() => {
    toastr.options = {
        "closeButton": true,
        "progressBar": true,
        "positionClass": "toast-top-right",
        "timeOut": "8000",
        "showMethod": "slideDown"
    };
  }, []);

  // --- 2. NOTIFICATION TRIGGER ---
  useEffect(() => {
    if (upcomingTasks.length > 0 && !hasAlerted.current) {
        toastr.warning(`You have ${upcomingTasks.length} services scheduled for tomorrow!`, 'Service Alert');
        const audio = new Audio('/pop.mp3');
        audio.play().catch(err => console.log("Audio feedback: Interaction required"));
        hasAlerted.current = true;
    }
  }, [upcomingTasks]);

  // --- 3. DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
        let lowStockCount = 0;
        let activeTasksCount = 0;

        try {
            const invRes = await apiClient.get('/inventory/products?limit=1000');
            if (invRes.data?.data) lowStockCount = invRes.data.data.filter(p => p.stock_quantity <= 5).length;

            const srvRes = await apiClient.get('/services/upcoming');
            const data = Array.isArray(srvRes.data) ? srvRes.data : [];
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            const dueTomorrow = data.filter(s => s.next_service_date?.startsWith(tomorrowStr));
            setUpcomingTasks(dueTomorrow);
            activeTasksCount = data.length;

        } catch (e) { console.error("Fetch Error:", e); }

        const revenue = billingHistory?.reduce((acc, curr) => acc + (Number(curr.final_amount) || 0), 0) || 0;

        setMetrics({
            customers: customers.length,
            sales: revenue,
            profit: revenue * 0.2,
            services: activeTasksCount,
            lowStock: lowStockCount
        });
    };
    fetchData();
  }, [customers, billingHistory]);

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

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className={`p-4 custom-scrollbar`} 
         style={{ height: '100vh', overflowY: 'auto', background: darkMode ? '#0f172a' : '#f8fafc' }}>
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-5 mt-2">
        <div>
          <h2 className={`fw-bold m-0 ${darkMode ? 'text-white' : 'text-dark'}`}>Dashboard</h2>
          <p className="text-secondary m-0 small">Performance Overview</p>
        </div>

        <div className="position-relative" style={{ zIndex: 1100 }}>
            <button className={`btn btn-lg border-0 position-relative p-3 ${darkMode ? 'bg-slate-800 text-white' : 'bg-white shadow-sm'}`}
                    onClick={() => setShowNotifications(!showNotifications)}
                    style={{ borderRadius: '15px' }}>
                <i className="bi bi-bell-fill fs-5"></i>
                {upcomingTasks.length > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-circle bg-danger p-2 border border-2 border-white"></span>}
            </button>

            {showNotifications && (
                <div className="position-absolute end-0 mt-3 shadow-lg rounded-4 overflow-hidden animate__animated animate__fadeIn"
                    style={{ width: '320px', background: darkMode ? '#1e293b' : '#ffffff', border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                        <h6 className="fw-bold m-0">Alerts Center</h6>
                        <span className="badge bg-primary rounded-pill">{upcomingTasks.length}</span>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {upcomingTasks.length === 0 ? (
                            <div className="p-4 text-center text-muted small">No scheduled tasks for tomorrow.</div>
                        ) : upcomingTasks.map((t, i) => (
                            <div key={i} className="p-3 border-bottom hover-bg pointer" onClick={() => navigate('/services')}>
                                <div className="badge bg-warning-subtle text-warning-emphasis mb-1">TOMORROW</div>
                                <div className={`small fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>{t.users?.name}</div>
                                <div className="text-muted" style={{fontSize: '0.7rem'}}>{t.task_type}</div>
                            </div>
                        ))}
                    </div>
                    <div className="p-2 text-center bg-light border-top pointer small fw-bold text-primary" onClick={() => navigate('/services')}>View All Services</div>
                </div>
            )}
        </div>
      </div>

      {/* STATS ROW */}
      <div className="row g-4 mb-5">
        <div className="col-lg-3 col-sm-6"><StatCard title="Total Customers" value={metrics.customers} icon="bi bi-people" color="59, 130, 246" trend="up" trendValue="+8%" onClick={() => navigate('/customers')} /></div>
        <div className="col-lg-3 col-sm-6"><StatCard title="Total Sales" value={formatCurrency(metrics.sales)} icon="bi bi-currency-rupee" color="16, 185, 129" trend="up" trendValue="+5%" /></div>
        <div className="col-lg-3 col-sm-6"><StatCard title="Pending Services" value={metrics.services} icon="bi bi-tools" color="245, 158, 11" trend="down" trendValue="Check" onClick={() => navigate('/services')} /></div>
        <div className="col-lg-3 col-sm-6"><StatCard title="Profit Est." value={formatCurrency(metrics.profit)} icon="bi bi-graph-up-arrow" color="139, 92, 246" trend="up" trendValue="+15%" /></div>
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
                {metrics.lowStock > 0 ? (
                    <div className="text-center py-4">
                        <div className="display-4 fw-bold text-danger mb-2">{metrics.lowStock}</div>
                        <p className="text-muted small">Critical stock shortage. Restock immediately.</p>
                        <button className="btn btn-danger w-100 mt-3 rounded-pill fw-bold" onClick={() => navigate('/inventory')}>Execute Restock</button>
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
        #toast-container > .toast { border-radius: 12px !important; box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important; opacity: 1 !important; }
        #toast-container { z-index: 999999 !important; }
      `}</style>
    </div>
  );
};

export default Dashboard;