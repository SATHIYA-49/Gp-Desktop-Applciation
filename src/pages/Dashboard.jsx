import React, { useContext, useEffect, useState, useMemo } from 'react';
import { GlobalContext } from '../context/GlobalState';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

// --- REUSABLE STAT CARD COMPONENT ---
const StatCard = ({ title, value, icon, color, trend, trendValue, onClick }) => {
  const { darkMode } = useContext(GlobalContext);

  const cardStyle = {
    background: darkMode ? 'linear-gradient(145deg, #1e293b, #0f172a)' : '#ffffff',
    border: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)',
    boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.05)',
    borderRadius: '16px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
    overflow: 'hidden'
  };

  const iconBoxStyle = {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    background: `rgba(${color}, 0.1)`,
    color: `rgb(${color})`
  };

  return (
    <div 
      className="p-4 h-100" 
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = darkMode ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = darkMode ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.05)';
      }}
      onClick={onClick}
    >
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h6 className="text-secondary fw-bold text-uppercase mb-1" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
            {title}
          </h6>
          <h2 className={`fw-bold mb-0 ${darkMode ? 'text-white' : 'text-dark'}`}>
            {value}
          </h2>
        </div>
        <div style={iconBoxStyle}>
          <i className={icon}></i>
        </div>
      </div>

      <div className="d-flex align-items-center">
        {trend === 'up' && <i className="bi bi-arrow-up-right-circle-fill text-success me-2"></i>}
        {trend === 'down' && <i className="bi bi-arrow-down-right-circle-fill text-danger me-2"></i>}
        <span className={`small fw-bold ${trend === 'up' ? 'text-success' : 'text-danger'}`}>
          {trendValue}
        </span>
        <span className="text-secondary small ms-2">since last month</span>
      </div>

      {/* Decorative Gradient Line at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4px',
        background: `linear-gradient(90deg, rgb(${color}) 0%, rgba(${color}, 0.2) 100%)`
      }}></div>
    </div>
  );
};

// --- MAIN DASHBOARD PAGE ---
const Dashboard = () => {
  const { darkMode, customers, products, billingHistory, reports, apiClient } = useContext(GlobalContext);
  const navigate = useNavigate();
  
  // 1. Initial State
  const [metrics, setMetrics] = useState({
    customers: 0, sales: 0, profit: 0, services: 0, lowStock: 0
  });

  // --- DATA PROCESSING FOR GRAPHS ---
  const chartData = useMemo(() => {
    if (!Array.isArray(billingHistory) || !Array.isArray(reports)) return [];

    const getMonthKey = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('default', { month: 'short' });
    };

    // 1. Group Revenue
    const revenueByMonth = {};
    billingHistory.forEach(bill => {
        const month = getMonthKey(bill.created_at || bill.date); 
        const amount = Number(bill.final_amount) || Number(bill.total_amount) || 0;
        revenueByMonth[month] = (revenueByMonth[month] || 0) + amount;
    });

    // 2. Group Profit
    const profitByMonth = {};
    reports.forEach(rep => {
        const month = getMonthKey(rep.payment_date || rep.date);
        const amount = Number(rep.amount) || 0;
        profitByMonth[month] = (profitByMonth[month] || 0) + amount;
    });

    // 3. Merge
    const allMonths = [...new Set([...Object.keys(revenueByMonth), ...Object.keys(profitByMonth)])];
    const monthOrder = { 'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12 };
    allMonths.sort((a, b) => monthOrder[a] - monthOrder[b]);

    return allMonths.map(month => ({
        name: month,
        Revenue: revenueByMonth[month] || 0,
        Profit: profitByMonth[month] || 0
    }));

  }, [billingHistory, reports]);

  // --- METRICS CALCULATION ---
  useEffect(() => {
    const calculateMetrics = async () => {
        const totalCustomers = Array.isArray(customers) ? customers.length : 0;
        const lowStockCount = Array.isArray(products) 
            ? products.filter(p => p.stock_quantity <= (p.low_stock_limit || 5)).length 
            : 0;
        const totalRevenue = Array.isArray(billingHistory) 
            ? billingHistory.reduce((acc, curr) => acc + (Number(curr.final_amount) || Number(curr.total_amount) || 0), 0)
            : 0;
        const totalProfit = Array.isArray(reports) 
            ? reports.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) 
            : 0;

        let serviceCount = 0;
        try {
            const res = await apiClient.get('/services/upcoming');
            if (Array.isArray(res.data)) serviceCount = res.data.length;
        } catch (error) { console.error("Failed to fetch dashboard service count", error); }

        setMetrics({ customers: totalCustomers, sales: totalRevenue, profit: totalProfit, services: serviceCount, lowStock: lowStockCount });
    };
    calculateMetrics();
  }, [customers, products, billingHistory, reports, apiClient]);

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  // --- CUSTOM TOOLTIP ---
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: darkMode ? '#1e293b' : '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}>
          <p className="label fw-bold mb-1">{label}</p>
          <p style={{ color: '#10b981', margin: 0 }}>Revenue: {formatCurrency(payload[0].value)}</p>
          <p style={{ color: '#8b5cf6', margin: 0 }}>Profit: {formatCurrency(payload[1].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      className={`container-fluid p-4 custom-scrollbar ${darkMode ? 'text-white' : 'text-dark'}`} 
      style={{ 
        height: '100vh', 
        overflowY: 'auto', // Enables internal scrolling
        overflowX: 'hidden'
      }}
    >
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-5 animate__animated animate__fadeInDown">
        <div>
          <h2 className="fw-bold m-0">Dashboard Overview</h2>
          <p className="text-secondary m-0">Real-time Data Updates</p>
        </div>
      </div>

      {/* STAT CARDS GRID */}
      <div className="row g-4 mb-5 animate__animated animate__fadeInUp">
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard title="Total Customers" value={metrics.customers} icon="bi bi-people-fill" color="59, 130, 246" trend="up" trendValue="Active" onClick={() => navigate('/customers')} />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard title="Total Revenue" value={formatCurrency(metrics.sales)} icon="bi bi-currency-rupee" color="16, 185, 129" trend="up" trendValue="Lifetime" onClick={() => navigate('/view-bills')} />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard title="Pending Services" value={metrics.services} icon="bi bi-tools" color="245, 158, 11" trend="down" trendValue="This Week" onClick={() => navigate('/services')} />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <StatCard title="Net Profit" value={formatCurrency(metrics.profit)} icon="bi bi-graph-up-arrow" color="139, 92, 246" trend="up" trendValue="Verified" onClick={() => navigate('/reports/financial')} />
        </div>
      </div>

      {/* --- GRAPHS SECTION --- */}
      <div className="row g-4 mb-5 animate__animated animate__fadeInUp" style={{ animationDelay: '0.1s' }}>
        
        {/* GRAPH 1 */}
        <div className="col-lg-8">
            <div className={`p-4 rounded-4 shadow-sm h-100 ${darkMode ? 'bg-dark border border-secondary border-opacity-25' : 'bg-white'}`}>
                <h5 className="fw-bold mb-4">Financial Performance</h5>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                            <XAxis dataKey="name" stroke={darkMode ? '#94a3b8' : '#64748b'} />
                            <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area type="monotone" dataKey="Revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" />
                            <Area type="monotone" dataKey="Profit" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorProf)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* GRAPH 2 */}
        <div className="col-lg-4">
            <div className={`p-4 rounded-4 shadow-sm h-100 ${darkMode ? 'bg-dark border border-secondary border-opacity-25' : 'bg-white'}`}>
                <h5 className="fw-bold mb-4">Monthly Overview</h5>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                            <XAxis dataKey="name" stroke={darkMode ? '#94a3b8' : '#64748b'} />
                            <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                            <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>

      {/* ALERTS SECTION */}
      <div className="row g-4 animate__animated animate__fadeInUp mb-5" style={{ animationDelay: '0.2s' }}>
        <div className="col-12"> 
            <div className={`p-4 rounded-4 shadow-sm h-100 ${darkMode ? 'bg-dark border border-secondary border-opacity-25' : 'bg-white'}`}>
                <h5 className="fw-bold mb-3">System Alerts</h5>
                {metrics.lowStock > 0 ? (
                    <div className="alert alert-danger d-flex align-items-center border-0 shadow-sm" role="alert">
                        <i className="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
                        <div>
                            <div className="fw-bold">Low Stock Warning</div>
                            <small>{metrics.lowStock} items are below safety levels. Please check inventory.</small>
                        </div>
                        <button className="btn btn-sm btn-outline-danger ms-auto" onClick={() => navigate('/inventory')}>View</button>
                    </div>
                ) : (
                    <div className="text-muted text-center py-4">
                        <i className="bi bi-check-circle-fill text-success fs-1 mb-2"></i>
                        <p className="m-0">All systems operational. No alerts.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- CSS FOR TRANSPARENT SCROLLBAR --- */}
      <style>
        {`
          /* For Webkit Browsers (Chrome, Edge, Safari) */
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px; /* Slim width */
          }
          
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent; /* Invisible track */
          }
          
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(150, 150, 150, 0.3); /* Subtle semi-transparent grey */
            border-radius: 20px; /* Rounded pill shape */
            border: 2px solid transparent; /* Creates padding around thumb */
            background-clip: content-box;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(150, 150, 150, 0.6); /* Slightly darker on hover */
          }

          /* Hide scrollbar for Firefox but keep scroll (Optional, Firefox support is limited) */
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(150, 150, 150, 0.3) transparent;
          }
        `}
      </style>

    </div>
  );
};

export default Dashboard;