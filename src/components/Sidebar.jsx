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
      boxShadow: isSidebarCollapsed ? 'none' : '10px 0 30px rgba(0,0,0,0.1)', 
      borderRight: darkMode ? '1px solid #1e293b' : '1px solid #fcd34d',
      color: darkMode ? '#e2e8f0' : '#4b5563',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif",
      // Smooth Transition for width and background
      transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease',
      overflowX: 'hidden',
      whiteSpace: 'nowrap' 
    },

    brandContainer: {
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      // FIXED ALIGNMENT: 20px padding ensures Logo aligns perfectly with Icons
      padding: '0 20px', 
      borderBottom: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(251, 191, 36, 0.2)',
      marginBottom: '10px',
      background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(251, 191, 36, 0.05)',
      transition: 'all 0.3s ease'
    },

    brandLogo: {
      minWidth: '40px',
      height: '40px',
      background: 'linear-gradient(135deg, #fbbf24, #b45309)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '1.2rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
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
      filter: 'drop-shadow(0 2px 4px rgba(251, 191, 36, 0.3))'
    },

    scrollArea: {
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingRight: '0px',
    },

    navItem: {
      marginBottom: '6px',
      padding: '0 12px', 
    },

    link: (isActive) => ({
      position: 'relative',
      height: '50px',
      color: isActive 
        ? (darkMode ? '#fff' : '#111827') 
        : (darkMode ? '#94a3b8' : '#6b7280'),
      background: isActive 
        ? 'linear-gradient(90deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.05))' 
        : 'transparent',
      borderLeft: isActive ? '4px solid #fbbf24' : '4px solid transparent',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      
      // --- THE FIX: ALWAYS LEFT ALIGNED ---
      // We set paddingLeft to 20px. This aligns the icon exactly under the Brand Logo.
      // Even when collapsed (80px width), the icon sits at 20px from the left.
      justifyContent: 'flex-start', 
      paddingLeft: '20px', 
      paddingRight: '0', 
      
      textDecoration: 'none',
      fontWeight: isActive ? '600' : '500',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      userSelect: 'none',
    }),

    icon: (isActive) => ({
      fontSize: '1.3rem',
      minWidth: '24px', 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isActive ? '#fbbf24' : (darkMode ? '#64748b' : '#9ca3af'),
      filter: isActive ? 'drop-shadow(0 0 5px rgba(251, 191, 36, 0.4))' : 'none',
      transition: 'all 0.3s ease'
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
      fontSize: '0.8rem',
      marginLeft: 'auto',
      marginRight: '10px', 
      opacity: isSidebarCollapsed ? 0 : 0.7,
      transition: 'transform 0.3s, opacity 0.2s',
      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)'
    }),

    subMenuContainer: (isOpen) => ({
      maxHeight: (isOpen && !isSidebarCollapsed) ? '300px' : '0', 
      opacity: (isOpen && !isSidebarCollapsed) ? 1 : 0,
      overflow: 'hidden',
      // Slide In/Out Animation
      transform: (isOpen && !isSidebarCollapsed) ? 'translateX(0)' : 'translateX(-10px)',
      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      
      background: darkMode ? '#020617' : '#fffbeb',
      boxShadow: isOpen ? (darkMode ? 'inset 0 4px 6px -1px rgba(0, 0, 0, 0.3)' : 'inset 0 2px 4px -1px rgba(251, 191, 36, 0.1)') : 'none',
      borderRadius: '8px',
      margin: (isOpen && !isSidebarCollapsed) ? '4px 12px 12px 12px' : '0 12px 0 12px', 
    }),

    subLink: (isActive) => ({
      padding: '10px 10px 10px 20px',
      fontSize: '0.9rem',
      color: isActive ? '#fbbf24' : (darkMode ? '#94a3b8' : '#6b7280'),
      textDecoration: 'none',
      display: 'block',
      fontWeight: isActive ? '600' : '400',
      borderLeft: isActive ? '2px solid #fbbf24' : '2px solid transparent',
      transition: 'color 0.2s ease',
      background: isActive ? (darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(251, 191, 36, 0.1)') : 'transparent',
      whiteSpace: 'nowrap'
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
        
        {/* 1. CUSTOMERS */}
        <li style={styles.navItem}>
          <NavLink to="/" style={({ isActive }) => styles.link(isActive)}>
            {({ isActive }) => (
              <>
                <i className="bi bi-people-fill" style={styles.icon(isActive)}></i>
                <span style={styles.linkLabel}>Customers</span>
              </>
            )}
          </NavLink>
        </li>

        {/* 2. INVENTORY (NEW) */}
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

        {/* 3. BILLING */}
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
            <div className="d-flex flex-column py-2">
              <NavLink to="/billing" style={({ isActive }) => styles.subLink(isActive)}>New Invoice</NavLink>
              <NavLink to="/view-bills" style={({ isActive }) => styles.subLink(isActive)}>Sales History</NavLink>
            </div>
          </div>
        </li>

        {/* 4. ACCOUNTS */}
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

        {/* 5. REPORTS */}
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
            <div className="d-flex flex-column py-2">
              <NavLink to="/reports/financial" style={({ isActive }) => styles.subLink(isActive)}>Financial Report</NavLink>
              <NavLink to="/reports/service" style={({ isActive }) => styles.subLink(isActive)}>Service Report</NavLink>
            </div>
          </div>
        </li>

        {/* 6. SETTINGS */}
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

      {/* FOOTER */}
      <div style={styles.footer}>
        <div style={{...styles.brandLogo, fontSize: '1rem'}}>A</div>
        <div style={styles.brandDetails}>
            <div style={{ color: darkMode ? '#fff' : '#111827', fontWeight: '600', fontSize: '0.9rem' }}>Admin User</div>
            <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>● Online</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;