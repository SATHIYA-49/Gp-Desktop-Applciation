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
        : 'linear-gradient(180deg, #ffffff 40%, #f8fafc 100%)',
      boxShadow: isSidebarCollapsed ? 'none' : '4px 0 30px rgba(0,0,0,0.05)', 
      borderRight: darkMode ? '1px solid #1e293b' : '1px solid rgba(0,0,0,0.05)',
      color: darkMode ? '#e2e8f0' : '#4b5563',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif",
      transition: 'width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
      overflow: 'hidden', 
      whiteSpace: 'nowrap' 
    },

    brandContainer: {
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px', 
      marginBottom: '10px',
      flexShrink: 0 
    },

    brandLogo: {
      minWidth: '40px', 
      height: '40px',
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: '800',
      fontSize: '1.2rem',
      boxShadow: '0 8px 16px -4px rgba(245, 158, 11, 0.4)',
      zIndex: 2,
    },

    brandDetails: {
      opacity: isSidebarCollapsed ? 0 : 1,
      transform: isSidebarCollapsed ? 'translateX(-15px)' : 'translateX(0)',
      width: isSidebarCollapsed ? 0 : 'auto',
      marginLeft: '14px',
      transition: 'opacity 0.2s ease, transform 0.3s ease', 
      pointerEvents: isSidebarCollapsed ? 'none' : 'auto'
    },

    scrollArea: {
      flex: 1, 
      overflowY: 'auto', 
      overflowX: 'hidden',
      paddingRight: '0px',
      paddingTop: '10px',
      display: 'block' // Ensures list behaves like a block
    },

    // FIX: Force block display to prevent flex-row collision
    navItem: {
      marginBottom: '6px',
      padding: '0 16px',
      display: 'block', 
      width: '100%'
    },

    link: (isActive) => ({
      position: 'relative',
      height: '50px',
      color: isActive 
        ? (darkMode ? '#fff' : '#0f172a') 
        : (darkMode ? '#94a3b8' : '#64748b'),
      background: isActive 
        ? (darkMode ? 'rgba(255,255,255,0.08)' : '#fff')
        : 'transparent',
      boxShadow: isActive && !darkMode ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: isSidebarCollapsed ? '12px' : '16px', 
      paddingRight: '12px', 
      textDecoration: 'none',
      fontWeight: isActive ? '600' : '500',
      transition: 'all 0.25s ease',
      cursor: 'pointer',
      userSelect: 'none',
      width: '100%' // Ensure full width
    }),

    icon: (isActive) => ({
      fontSize: '1.25rem',
      minWidth: '24px', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isActive ? '#f59e0b' : (darkMode ? '#64748b' : '#9ca3af'),
      filter: isActive ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.3))' : 'none',
      transition: 'color 0.3s ease'
    }),

    linkLabel: {
      marginLeft: '14px',
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
      transition: 'transform 0.3s ease',
      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)'
    }),

    // SIMPLIFIED ANIMATION TO PREVENT CRASH
    subMenuContainer: (isOpen) => ({
      height: (isOpen && !isSidebarCollapsed) ? 'auto' : '0',
      maxHeight: (isOpen && !isSidebarCollapsed) ? '500px' : '0',
      opacity: (isOpen && !isSidebarCollapsed) ? 1 : 0,
      overflow: 'hidden',
      transition: 'max-height 0.4s ease, opacity 0.3s ease', // Removed transform to fix stacking issues
      marginBottom: (isOpen && !isSidebarCollapsed) ? '10px' : '0', 
    }),

    subLink: (isActive) => ({
      padding: '10px 12px 10px 54px', 
      fontSize: '0.9rem',
      color: isActive ? '#f59e0b' : (darkMode ? '#94a3b8' : '#6b7280'),
      textDecoration: 'none',
      display: 'block',
      fontWeight: isActive ? '600' : '400',
      transition: 'all 0.2s ease',
      borderRadius: '8px',
      background: isActive ? (darkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)') : 'transparent',
      margin: '2px 0 2px 16px' 
    }),
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
            <div style={{...styles.brandText, color: darkMode ? '#fff' : '#000'}}>GOLDEN POWER</div>
            <div style={{ fontSize: '0.7rem', fontWeight: '500', color: '#f59e0b', marginTop: '-2px' }}>
                ENTERPRISE
            </div>
        </div>
      </div>

      {/* NAVIGATION */}
      {/* Removed 'nav' class to prevent Bootstrap interference */}
      <ul className="list-unstyled mb-auto sidebar-scroll" style={styles.scrollArea}>
        
        {/* 1. DASHBOARD */}
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
        <li style={{...styles.navItem, padding: 0}}>
          <div style={{padding: '0 16px'}}>
            <div 
                style={styles.link(activeMenu === 'billing')} 
                onClick={() => handleMenuClick('billing')}
            >
                <i className="bi bi-receipt" style={styles.icon(activeMenu === 'billing')}></i>
                <span style={{...styles.linkLabel, flex: 1}}>Billing / POS</span>
                <i className="bi bi-chevron-right" style={styles.arrow(activeMenu === 'billing')}></i>
            </div>
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
        <li style={{...styles.navItem, padding: 0}}>
          <div style={{padding: '0 16px'}}>
            <div 
                style={styles.link(activeMenu === 'reports')} 
                onClick={() => handleMenuClick('reports')}
            >
                <i className="bi bi-bar-chart-fill" style={styles.icon(activeMenu === 'reports')}></i>
                <span style={{...styles.linkLabel, flex: 1}}>Reports</span>
                <i className="bi bi-chevron-right" style={styles.arrow(activeMenu === 'reports')}></i>
            </div>
          </div>

          <div style={styles.subMenuContainer(activeMenu === 'reports')}>
            <div className="d-flex flex-column">
              <NavLink to="/reports/financial" style={({ isActive }) => styles.subLink(isActive)}>Financial Report</NavLink>
              <NavLink to="/reports/inventory" style={({ isActive }) => styles.subLink(isActive)}>Inventory Report</NavLink>
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

      {/* --- INJECT CSS TO HIDE SCROLLBAR --- */}
      <style>
        {`
          .sidebar-scroll::-webkit-scrollbar {
            display: none;
          }
          .sidebar-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
    </div>
  );
};

export default Sidebar;