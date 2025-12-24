import React, { useState, useEffect, useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { GlobalContext } from '../context/GlobalState';

const Sidebar = () => {
  const { darkMode, isSidebarCollapsed, openSidebar, closeSidebar } = useContext(GlobalContext);
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState(null);

  // --- AUTO-OPEN LOGIC ---
  useEffect(() => {
    if (!isSidebarCollapsed) {
        if (location.pathname.includes('/billing') || location.pathname.includes('/view-bills')) {
            setActiveMenu('billing');
        } else if (location.pathname.includes('/reports')) {
            setActiveMenu('reports');
        }
    } else {
        setActiveMenu(null);
    }
  }, [location.pathname, isSidebarCollapsed]);

  const handleMenuClick = (menuName) => {
    if (isSidebarCollapsed) return; 
    setActiveMenu(prev => (prev === menuName ? null : menuName));
  };

  // --- STYLES ---
  const styles = {
    sidebar: {
      width: isSidebarCollapsed ? '80px' : '280px', 
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1000,
      background: darkMode 
        ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' 
        : 'linear-gradient(180deg, #ffffff 40%, #fffbeb 100%)',
      boxShadow: isSidebarCollapsed ? 'none' : '4px 0 24px rgba(0,0,0,0.08)', 
      borderRight: darkMode ? '1px solid #1e293b' : '1px solid rgba(251, 191, 36, 0.3)',
      color: darkMode ? '#e2e8f0' : '#4b5563',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif",
      transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease',
      overflowX: 'hidden',
      whiteSpace: 'nowrap' 
    },

    brandContainer: {
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px', 
      borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(251, 191, 36, 0.2)',
      marginBottom: '16px',
      background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(251, 191, 36, 0.05)',
      transition: 'all 0.3s ease'
    },

    brandLogo: {
      minWidth: '40px', 
      height: '40px',
      background: 'linear-gradient(135deg, #fbbf24, #b45309)',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: '800',
      fontSize: '1.2rem',
      boxShadow: '0 4px 6px rgba(251, 191, 36, 0.3)',
      zIndex: 2,
    },

    brandDetails: {
      opacity: isSidebarCollapsed ? 0 : 1,
      transform: isSidebarCollapsed ? 'translateX(-10px)' : 'translateX(0)',
      width: isSidebarCollapsed ? 0 : 'auto',
      marginLeft: '12px',
      transition: 'all 0.25s ease',
      pointerEvents: isSidebarCollapsed ? 'none' : 'auto'
    },

    brandText: {
      background: 'linear-gradient(to right, #fbbf24, #d97706)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontSize: '1.1rem',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },

    scrollArea: {
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingRight: '0px',
    },

    navItem: {
      marginBottom: '4px',
      padding: '0 12px', 
    },

    link: (isActive) => ({
      position: 'relative',
      height: '48px',
      color: isActive 
        ? (darkMode ? '#fff' : '#111827') 
        : (darkMode ? '#94a3b8' : '#6b7280'),
      background: isActive 
        ? 'linear-gradient(90deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.02))' 
        : 'transparent',
      borderLeft: isActive ? '4px solid #fbbf24' : '4px solid transparent',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start', 
      paddingLeft: '20px', 
      paddingRight: '12px', 
      textDecoration: 'none',
      fontWeight: isActive ? '600' : '500',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      userSelect: 'none',
    }),

    icon: (isActive) => ({
      fontSize: '1.25rem',
      minWidth: '40px', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isActive ? '#fbbf24' : (darkMode ? '#64748b' : '#9ca3af'),
      filter: isActive ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.3))' : 'none',
      transition: 'all 0.3s ease'
    }),

    linkLabel: {
      marginLeft: '10px',
      opacity: isSidebarCollapsed ? 0 : 1,
      width: isSidebarCollapsed ? 0 : 'auto', 
      transform: isSidebarCollapsed ? 'translateX(-10px)' : 'translateX(0)',
      transition: 'opacity 0.2s ease, transform 0.2s ease', 
      whiteSpace: 'nowrap'
    },

    arrow: (isOpen) => ({
      fontSize: '0.75rem',
      marginLeft: 'auto',
      opacity: isSidebarCollapsed ? 0 : 0.6,
      transition: 'transform 0.3s, opacity 0.2s',
      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)'
    }),

    subMenuContainer: (isOpen) => ({
      maxHeight: (isOpen && !isSidebarCollapsed) ? '300px' : '0', 
      opacity: (isOpen && !isSidebarCollapsed) ? 1 : 0,
      overflow: 'hidden',
      transform: (isOpen && !isSidebarCollapsed) ? 'translateY(0)' : 'translateY(-5px)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      marginBottom: (isOpen && !isSidebarCollapsed) ? '8px' : '0', 
    }),

    subLink: (isActive) => ({
      padding: '8px 12px 8px 70px', 
      fontSize: '0.85rem',
      color: isActive ? '#fbbf24' : (darkMode ? '#94a3b8' : '#6b7280'),
      textDecoration: 'none',
      display: 'block',
      fontWeight: isActive ? '600' : '400',
      transition: 'all 0.2s ease',
      borderRadius: '8px',
      background: isActive ? (darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'transparent',
      margin: '2px 0'
    }),

    footer: {
      padding: '20px 0',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '20px', 
      borderTop: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(251, 191, 36, 0.2)',
      background: darkMode ? '#0b1120' : '#fffbeb',
      transition: 'all 0.3s ease',
      overflow: 'hidden'
    }
  };

  return (
    <div 
      style={styles.sidebar} 
      onMouseEnter={openSidebar} 
      onMouseLeave={closeSidebar} 
    >
      
      {/* BRAND HEADER */}
      <div style={styles.brandContainer}>
        <div style={styles.brandLogo}>GP</div>
        <div style={styles.brandDetails}>
            <div style={styles.brandText}>GOLDEN POWER</div>
            <div style={{ fontSize: '0.65rem', letterSpacing: '2px', color: darkMode ? '#64748b' : '#9ca3af' }}>
                ENTERPRISE
            </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <ul className="nav flex-column mb-auto" style={styles.scrollArea}>
        
        {/* 1. DASHBOARD (NEW) */}
        <li style={styles.navItem}>
          <NavLink to="/dashboard" style={({ isActive }) => styles.link(isActive)}>
            {({ isActive }) => (
              <>
                <i className="bi bi-grid-fill" style={styles.icon(isActive)}></i>
                <span style={styles.linkLabel}>Dashboard</span>
              </>
            )}
          </NavLink>
        </li>

        {/* 2. CUSTOMERS */}
        <li style={styles.navItem}>
          <NavLink to="/customers" style={({ isActive }) => styles.link(isActive)}>
            {({ isActive }) => (
              <>
                <i className="bi bi-people-fill" style={styles.icon(isActive)}></i>
                <span style={styles.linkLabel}>Customers</span>
              </>
            )}
          </NavLink>
        </li>

        {/* 3. INVENTORY */}
        <li style={styles.navItem}>
          <NavLink to="/inventory" style={({ isActive }) => styles.link(isActive)}>
            {({ isActive }) => (
              <>
                <i className="bi bi-box-seam" style={styles.icon(isActive)}></i>
                <span style={styles.linkLabel}>Inventory</span>
              </>
            )}
          </NavLink>
        </li>

        {/* 4. SERVICE MANAGEMENT */}
        <li style={styles.navItem}>
          <NavLink to="/services" style={({ isActive }) => styles.link(isActive)}>
            {({ isActive }) => (
              <>
                <i className="bi bi-tools" style={styles.icon(isActive)}></i>
                <span style={styles.linkLabel}>Service Mgmt</span>
              </>
            )}
          </NavLink>
        </li>

        {/* 5. EMPLOYEE MANAGEMENT */}
        <li style={styles.navItem}>
          <NavLink to="/employees" style={({ isActive }) => styles.link(isActive)}>
            {({ isActive }) => (
              <>
                <i className="bi bi-person-badge" style={styles.icon(isActive)}></i>
                <span style={styles.linkLabel}>Employees</span>
              </>
            )}
          </NavLink>
        </li>

        {/* 6. BILLING (DROPDOWN) */}
        <li style={styles.navItem}>
          <div 
            style={styles.link(activeMenu === 'billing')} 
            onClick={() => handleMenuClick('billing')}
          >
            <i className="bi bi-receipt" style={styles.icon(activeMenu === 'billing')}></i>
            <span style={{...styles.linkLabel, flex: 1}}>Billing / POS</span>
            <i className="bi bi-chevron-right" style={styles.arrow(activeMenu === 'billing')}></i>
          </div>

          <div style={styles.subMenuContainer(activeMenu === 'billing')}>
            <div className="d-flex flex-column">
              <NavLink to="/billing" style={({ isActive }) => styles.subLink(isActive)}>Create Bill</NavLink>
              <NavLink to="/view-bills" style={({ isActive }) => styles.subLink(isActive)}>Sales History</NavLink>
            </div>
          </div>
        </li>

        {/* 7. ACCOUNTS */}
        <li style={styles.navItem}>
          <NavLink to="/accounts" style={({ isActive }) => styles.link(isActive)}>
            {({ isActive }) => (
              <>
                <i className="bi bi-wallet2" style={styles.icon(isActive)}></i>
                <span style={styles.linkLabel}>Accounts</span>
              </>
            )}
          </NavLink>
        </li>

        {/* 8. REPORTS (DROPDOWN) */}
        <li style={styles.navItem}>
          <div 
            style={styles.link(activeMenu === 'reports')} 
            onClick={() => handleMenuClick('reports')}
          >
            <i className="bi bi-bar-chart-fill" style={styles.icon(activeMenu === 'reports')}></i>
            <span style={{...styles.linkLabel, flex: 1}}>Reports</span>
            <i className="bi bi-chevron-right" style={styles.arrow(activeMenu === 'reports')}></i>
          </div>

          <div style={styles.subMenuContainer(activeMenu === 'reports')}>
            <div className="d-flex flex-column">
              <NavLink to="/reports/financial" style={({ isActive }) => styles.subLink(isActive)}>Financial Report</NavLink>
              <NavLink to="/reports/service" style={({ isActive }) => styles.subLink(isActive)}>Service Report</NavLink>
            </div>
          </div>
        </li>

        {/* 9. SETTINGS */}
        <li style={styles.navItem}>
          <NavLink to="/settings" style={({ isActive }) => styles.link(isActive)}>
            {({ isActive }) => (
              <>
                <i className="bi bi-gear-fill" style={styles.icon(isActive)}></i>
                <span style={styles.linkLabel}>Settings</span>
              </>
            )}
          </NavLink>
        </li>

      </ul>
    </div>
  );
};

export default Sidebar;